# Knowledge base agente gestionale

Markdown puro. Nessuna app richiesta. Fonte unica dell'assistente. Vive su Google Drive; l'app la legge e scrive via API.

## Regole d'oro
1. **1 file = 1 cosa** (un immobile, un contratto, una scadenza, una decisione).
2. **Frontmatter YAML obbligatorio** → schema in `CONVENTIONS.md`.
3. **Link per id**: `[[mia-srl]]`. Id = nome file senza `.md`.
4. **Dati operativi in frontmatter, ragionamento nel corpo.**
5. **Mai credenziali, IBAN completi, documenti d'identità** nei file.
6. **`validato: false`** finché commercialista/gestoría non conferma.
7. **Scritture solo tramite modifiche approvate** (sezione Da approvare / «ok CODICE»).

## Struttura
| Cartella | Contenuto |
|---|---|
| `00-router/` | mappa moduli, regole instradamento |
| `10-entita/` | soggetti fiscali (persone, P.IVA, società) |
| `20-asset/` | immobili, barche |
| `30-contratti/` | affitti, mutui, assicurazioni, ormeggi, fornitori |
| `40-scadenze/` | ricorrenti (fiscali) + singole |
| `50-moduli/` | conoscenza per area: normativa, fonti, FAQ |
| `60-procedure/` | checklist operative passo-passo |
| `70-decisioni/` | log decisioni datato (ADR) |
| `80-documenti/` | indice documenti con link Drive (non i PDF) |
| `directives/` | SOP DOE: ingest, apprendimento |
| `90-inbox/` | input grezzi + patch in attesa |
| `95-log/` | changelog automatico + learnings |
| `_templates/` | modelli da copiare |
| `_backup/` | export settimanale zip |

