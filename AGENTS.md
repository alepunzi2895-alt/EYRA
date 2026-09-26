# AGENTS.md — EYRA

Assistente gestionale personale (fisco IT/ES, immobili, barche, contabilità, bandi, coaching) della **titolare**.
Stack: Next.js 15 (App Router) su Vercel · Google Drive come archivio markdown · Turso · Gmail · Codex API · WhatsApp Cloud API.

Il progetto e l'assistente si chiamano **EYRA**, sempre in maiuscolo nei testi. `eyra` è l'identificatore tecnico per pacchetti, file e template. Il nome è fisso: `APP_NAME` è una costante in `lib/config.ts`, esclusa dalle impostazioni modificabili. Non accetta override da `/setup`, database o variabili d’ambiente. Nell'interfaccia usa `brand()` / `settings().APP_NAME` e nei prompt `{{NOME}}`, senza duplicare il nome nel codice. Ogni occorrenza visibile del marchio usa il logo `Wordmark`, anche nei titoli, nella navigazione e nel testo (`inline`); conserva il nome testuale negli attributi accessibili, nei metadati e nei valori tecnici. L'occhio principale è un modello 3D geometrico; `public/eyra.png` è il riferimento visivo originale.

## Regole non negoziabili
1. **Mai dati reali nel repo.** Le chiavi e i token stanno in `.env`, che è ignorato da git. Lo sviluppo usa `npm run dev:demo` con `kb-demo/` per l'archivio; il database è sempre Turso.
2. **Ogni scrittura nell'archivio passa da patch approvata.** `patch_proponi` → approvazione (web o «ok CODICE» su WhatsApp) → `patch_applica`. Il controllo del codice in `lib/agent.ts` (`patch_applica`) non va rimosso né aggirato.
3. **Mai salvare credenziali personali** (SPID, Cl@ve, certificati, password, PIN, IBAN completi). Le chiavi API stanno solo in `.env`: mai in Turso né in `DEFS` di `lib/config.ts` (lo verifica `npm run check`).
4. Whitelist WhatsApp + firma `X-Hub-Signature-256` sempre verificate.
5. `npm run check` deve passare prima di ogni push.

## Comandi
```bash
npm install
npm run dev:demo   # http://localhost:3000 — archivio finto kb-demo/, DB Turso da .env
npm run check      # typecheck + test su kb-demo e Turso da .env
npm run build
```

## Architettura
| Percorso | Ruolo |
|---|---|
| `lib/drive.ts` | Drive API; con `KB_LOCAL_DIR` usa cartella locale (dev/test) |
| `lib/db.ts` | client Turso/libSQL; tabella `settings` creata al primo uso |
| `lib/config.ts` | impostazioni non segrete: DB > env > default; `SECRETS` = elenco env mostrate solo come stato |
| `lib/kb.ts` | frontmatter, validazione, scadenze ricorrenti, ricerca |
| `lib/patch.ts` | set/append/create, diff, conflitti, changelog, storage patch in `90-inbox/` |
| `lib/agent.ts` | loop Codex + tool; system prompt = `AGENT.md` + router + directive dalla KB su Drive |
| `lib/gmail.ts` | import email con etichetta `GMAIL_LABEL` (PEC inoltrata a Gmail) |
| `lib/fattura.ts` | parsing FatturaPA `.xml` / `.xml.p7m` |
| `lib/reminders.ts` | promemoria a `REMINDER_DAYS` via template WhatsApp |
| `lib/backup.ts` | zip settimanale in `_backup/` (ultimi 8) |
| `lib/seed.ts` | crea su Drive la cartella col nome dell'assistente da `kb/` |
| `app/api/whatsapp` | webhook Meta (risponde 200 subito, elabora con `after()`) |
| `app/api/cron/daily` | unico cron (limite Hobby): promemoria + email + backup domenica |
| `app/setup` | Impostazioni: sottotitolo, modello, Drive/Gmail, WhatsApp, promemoria; stato segreti; verifiche di collegamento |
| `kb/` | template archivio vuoto (va in produzione) |
| `kb-demo/` | archivio con dati finti (solo sviluppo) |

La logica del dominio (procedure, onboarding, regole) sta nei **markdown della KB**, non nel codice: si migliora l'agente modificando `AGENT.md` e `directives/`.

## Backlog (in ordine)
1. Test end-to-end su staging con account di prova (non della titolare).
2. Trascrizione vocali WhatsApp (servizio speech-to-text, da scegliere).
3. PEC via IMAP diretto (alternativa all'inoltro su Gmail).
4. Gmail push (Pub/Sub) invece del polling giornaliero.
5. Google Calendar: sync scadenze.
6. Dedup webhook persistente (oggi in memoria per istanza) — ora si può fare su Turso.
7. Paginazione e ricerca full-text migliore quando l'archivio cresce (>500 file).
8. Pagina modifica manuale file con anteprima (sempre via patch).

## Convenzioni codice
- TypeScript strict, niente dipendenze pesanti senza motivo.
- UI: CSS in `app/globals.css` con variabili; font Bricolage Grotesque (UI) e Source Serif 4 (testi). Italiano, frasi brevi, verbi attivi.
- Testi agente e directive in italiano.
- Identità visiva EYRA: tema scuro, accenti verde smeraldo (`#10b981`, `#34d399`, `#6ee7b7`). L'avatar è un occhio 3D con geometrie in `lib/eye-model.ts`, visualizzato da `Eye3D` e animato da `eye-scene.ts`. `public/eyra.png` è solo il riferimento originale: non applicarlo a una sfera. Struttura nera lucida con riflessi discreti, iride smeraldo organica e luminosa: evitare un effetto cromato uniforme. Nessuno slogan nel modello. Vista ampliata in `/occhio`; `npm run model:export` rigenera `public/eyra-eye.glb`. Rispettare `prefers-reduced-motion`, sospendere il rendering fuori schermo e liberare le risorse GPU allo smontaggio.

- Occhio centrato e simmetrico a riposo, tre lamelle speculari per lato. Fondo cosmico: `public/eyra-cosmos.png`; bulbo con nebulose e stelle tridimensionali. Scritta del riferimento ricostruita in `public/eyra-wordmark.svg` tramite `Wordmark` in dashboard, sidebar e login. Dettagli asset: `docs/eyra-visual-assets.md`.

## Significato del nome e del logo

**EYE + RA → EYRA**: EYE osserva, RA illumina, EYRA comprende. L’occhio cosmico rappresenta un’intelligenza multidisciplinare: pupilla come nucleo, iride come rete di conoscenza e orbite come ecosistemi collegati. Il principio è **osservare → connettere → comprendere → anticipare → agire**. Emerald Teal luminoso, nero e grafite esprimono conoscenza, crescita, equilibrio e profondità. La spiegazione completa approvata dalla titolare è in [Identità visiva EYRA](docs/eyra-visual-assets.md).
