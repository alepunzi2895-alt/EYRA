import assert from 'node:assert/strict';
import { sourceAllowed, matches, inspect, collect, check } from './system-docs.mjs';

for (const p of ['.env', '.env.local', 'kb-demo/persona.md', 'kb/10-entita/persona.md', 'kb/00-router/onboarding.md', 'output/pdf/eyra-system.json', 'docs/system/source-state.json', 'app/../.env', 'docs/.env.json']) assert.equal(sourceAllowed(p), false, p);
for (const p of ['lib/agent.ts', 'app/api/chat/route.ts', 'kb/AGENT.md', 'kb/50-moduli/coaching/coaching.md']) assert.equal(sourceAllowed(p), true, p);
assert.equal(matches('app/api/**', 'app/api/audio/transcribe/route.ts'), true);
assert.equal(matches('lib/*.ts', 'lib/deeper/file.ts'), false);
assert.equal(matches('lib/config.ts', 'lib/configXts'), false);
const sample = inspect('fixture.ts', `
// export function falso() {} is a comment.
const privateHelper = () => {};
export async function real(arg: string) { return process.env.TEST_NAME; }
export const arrow = (value: number) => value;
export class Worker { private hidden() {} run(input: string) {} }
export type Choice = 'one' | 'two';
`);
assert.deepEqual(sample.symbols.map(s => s.name), ['real', 'arrow', 'Worker', 'Worker.run', 'Choice']);
assert.deepEqual(sample.env, ['TEST_NAME']);
const data = collect();
check(data);
assert.ok(data.tools.some(t => t.name === 'patch_applica' && t.input_schema.required.includes('code')));
assert.equal(data.specialists.length, 9);
assert.ok(data.routes.some(r => r.path === '/api/audio/transcribe' && r.methods.includes('POST')));
assert.ok(data.pages.some(r => r.path === '/'));
assert.ok(data.tables.some(t => t.name === 'webhook_events'));
assert.ok(data.config.every(c => !('value' in c) && !('def' in c)));
assert.ok(data.secretNames.every(s => Object.keys(s).every(k => ['name','label','group'].includes(k))));
assert.throws(() => check({ ...data, digest: 'changed', hashes: { ...data.hashes, 'lib/agent.ts': 'changed' } }), /lib\/agent.ts/);
console.log('✓ documentazione: esclusione dati privati, parsing AST, route, schede, schema e rilevamento sorgenti modificate');
