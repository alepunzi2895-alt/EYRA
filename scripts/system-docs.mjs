import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import ts from 'typescript';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = 'docs/system/catalog.json', statePath = 'docs/system/source-state.json';
const text = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const sha = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const allowedRoot = /^(app\/|lib\/|scripts\/|docs\/|\.github\/|kb\/(?:AGENT\.md$|CONVENTIONS\.md$|00-router\/moduli\.md$|directives\/|50-moduli\/|60-procedure\/|_templates\/)|(?:middleware\.ts|package(?:-lock)?\.json|next\.config\.mjs|vercel\.json|AGENTS\.md|CLAUDE\.md|README\.md|\.gitignore)$)/;
export function sourceAllowed(p) {
  return allowedRoot.test(p) && !p.split('/').some(s => s === '..' || s.startsWith('.env')) && p !== statePath && !p.includes('__pycache__') && /(?:\.(?:tsx?|mjs|py|md|json|css|ya?ml|txt)|\.gitignore)$/.test(p);
}
export function matches(pattern, p) {
  const expr = pattern.split('**').map(part => part.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${expr}$`).test(p);
}
export function sources() {
  return [...new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0'))].filter(p => sourceAllowed(p) && fs.existsSync(path.join(root, p))).sort();
}
function unwrap(n) { while (n && (ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isParenthesizedExpression(n))) n = n.expression; return n; }
export function literal(node) {
  const n = unwrap(node);
  if (!n) return undefined;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
  if (ts.isObjectLiteralExpression(n)) return Object.fromEntries(n.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText().replace(/^['"]|['"]$/g, ''), literal(p.initializer)]));
  return undefined;
}
const declaration = (source, name) => {
  for (const statement of source.statements) if (ts.isVariableStatement(statement)) for (const d of statement.declarationList.declarations) if (d.name.getText() === name) return literal(d.initializer);
};
export function inspect(p, raw) {
  const source = ts.createSourceFile(p, raw, ts.ScriptTarget.Latest, true, p.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const symbols = [], env = new Set();
  function add(name, node, kind) {
    const comment = (ts.getJSDocCommentsAndTags(node) || []).map(d => typeof d.comment === 'string' ? d.comment : '').filter(Boolean).join(' ');
    const parameters = node.parameters?.map(p => p.name.getText()).join(', ') || '';
    symbols.push({ name, kind, parameters, comment, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
  }
  for (const s of source.statements) {
    const exported = s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isFunctionDeclaration(s)) add(s.name?.text || 'default', s, 'funzione');
    if (ts.isClassDeclaration(s)) {
      add(s.name?.text || 'default', s, 'classe');
      for (const m of s.members) if (ts.isMethodDeclaration(m) && !m.modifiers?.some(v => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword].includes(v.kind))) add(`${s.name?.text}.${m.name.getText()}`, m, 'metodo');
    }
    if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) if (d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) add(d.name.getText(), d.initializer, 'funzione');
    if (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) add(s.name.text, s, 'tipo');
  }
  function walk(n) {
    if (ts.isPropertyAccessExpression(n) && n.expression.getText(source) === 'process.env') env.add(n.name.text);
    if (ts.isElementAccessExpression(n) && n.expression.getText(source) === 'process.env' && ts.isStringLiteral(n.argumentExpression)) env.add(n.argumentExpression.text);
    ts.forEachChild(n, walk);
  }
  walk(source);
  return { source, symbols, env: [...env].sort() };
}
export function collect() {
  const catalog = JSON.parse(text(catalogPath));
  const files = sources();
  const errors = [];
  const ids = new Set();
  for (const f of catalog.features) {
    if (!f.id || ids.has(f.id)) errors.push(`Identificatore scheda duplicato o vuoto: ${f.id}`);
    ids.add(f.id);
    for (const key of ['title', 'purpose', 'trigger', 'inputs', 'outputs', 'storage', 'limits', 'verification']) if (typeof f[key] !== 'string' || !f[key].trim()) errors.push(`${f.id}: manca ${key}`);
    if (!f.process?.length || !f.patterns?.length) errors.push(`${f.id}: mancano processo o sorgenti`);
    for (const pattern of f.patterns || []) if (!files.some(p => matches(pattern, p))) errors.push(`${f.id}: riferimento senza sorgenti: ${pattern}`);
  }
  const hashes = {}, modules = [], routes = [], pages = [], env = new Set();
  let tools = [], specialists = [], config = [], secretNames = [], tables = [];
  for (const p of files) {
    const raw = text(p); hashes[p] = sha(raw);
    const owners = catalog.features.filter(f => f.patterns.some(pattern => matches(pattern, p))).map(f => f.id);
    if (!owners.length) errors.push(`Sorgente non documentata: ${p}`);
    if (!/^(app\/|lib\/|middleware\.ts$)/.test(p) || !/\.tsx?$/.test(p)) continue;
    const info = inspect(p, raw);
    info.env.forEach(k => env.add(k));
    modules.push({ path: p, owners, symbols: info.symbols });
    if (p.endsWith('/route.ts')) routes.push({ path: p.slice(3, -9) || '/', source: p, methods: info.symbols.filter(s => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(s.name)).map(s => s.name), owners });
    if (/\/page\.tsx$/.test(p)) pages.push({ path: p.slice(3, -9) || '/', source: p, owners });
    if (p === 'lib/agent.ts') tools = declaration(info.source, 'tools') || [];
    if (p === 'lib/dna.ts') specialists = declaration(info.source, 'SPECIALISTS') || [];
    if (p === 'lib/config.ts') {
      config = Object.entries(declaration(info.source, 'DEFS') || {}).map(([name, d]) => ({ name, label: d.label, group: d.group, help: d.help || '' }));
      secretNames = (declaration(info.source, 'SECRETS') || []).map(s => ({ name: s.key, label: s.label, group: s.group }));
    }
    if (p === 'lib/db.ts') tables = [...raw.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([^"\n]+)\)/g)].map(m => ({ name: m[1], schema: m[2] }));
  }
  for (const s of specialists) for (const p of s.sources || []) if (!fs.existsSync(path.join(root, p))) errors.push(`Specialità ${s.id}: fonte mancante ${p}`);
  if (!tools.length || !specialists.length || !tables.length || !config.length) errors.push('Estrazione strutturale incompleta: controllare agente, DNA, database e configurazione.');
  if (errors.length) throw new Error(errors.join('\n'));
  const digest = sha(JSON.stringify(hashes));
  return { catalog, hashes, digest, modules, routes, pages, tools, specialists, config, secretNames, env: [...env].sort(), tables,
    procedures: files.filter(p => /^kb\/(directives|50-moduli|60-procedure)\//.test(p)).map(p => ({ path: p, headings: [...text(p).matchAll(/^#{1,3}\s+(.+)$/gm)].map(m => m[1]) })),
    versions: Object.fromEntries(Object.entries(JSON.parse(text('package-lock.json')).packages || {}).filter(([p]) => ['node_modules/next','node_modules/react','node_modules/@anthropic-ai/sdk','node_modules/@libsql/client','node_modules/three'].includes(p)).map(([p,v]) => [p.slice(13), v.version])),
    cron: JSON.parse(text('vercel.json')).crons,
  };
}
export function check(data) {
  if (!fs.existsSync(path.join(root, statePath))) throw new Error('Manca la revisione documentale. Rivedi le schede e usa npm run docs:update.');
  const state = JSON.parse(text(statePath));
  const changed = [...new Set([...Object.keys(state.hashes || {}), ...Object.keys(data.hashes)])].filter(p => state.hashes?.[p] !== data.hashes[p]);
  if (state.digest !== data.digest || changed.length) throw new Error(`Documentazione da rivedere per:\n${changed.map(p => `- ${p}`).join('\n')}\nAggiorna le spiegazioni interessate, poi npm run docs:update. Non basta aggiornare l’impronta senza rivedere il contenuto.`);
}
export function main(mode = process.argv[2] || '--check') {
  const data = collect();
  if (mode === '--update') {
    fs.writeFileSync(path.join(root, statePath), JSON.stringify({ version: 1, digest: data.digest, hashes: data.hashes }, null, 2) + '\n');
    console.log(`Revisione documentale registrata: ${Object.keys(data.hashes).length} sorgenti. La revisione semantica delle schede resta responsabilità di chi sviluppa.`);
    return;
  }
  check(data);
  if (mode === '--check') { console.log(`Documentazione coerente: ${data.catalog.features.length} schede, ${data.routes.length} API, ${data.tools.length} strumenti, ${data.specialists.length} specialità.`); return; }
  if (!['--inventory', '--pdf'].includes(mode)) throw new Error(`Opzione sconosciuta: ${mode}`);
  const out = path.join(root, 'output/pdf'); fs.mkdirSync(out, { recursive: true });
  const inventory = { ...data, generatedAt: new Date().toISOString(), revision: git('rev-parse', 'HEAD'), dirty: !!git('status', '--porcelain'), branch: git('branch', '--show-current') };
  fs.writeFileSync(path.join(out, 'eyra-system.json'), JSON.stringify(inventory, null, 2) + '\n');
  if (mode === '--pdf') {
    const python = process.env.DOCS_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const result = spawnSync(python, ['scripts/render-system-pdf.py'], { cwd: root, stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error('Generazione PDF fallita. Installa scripts/requirements-docs.txt; DOCS_PYTHON può indicare l’eseguibile Python.');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
