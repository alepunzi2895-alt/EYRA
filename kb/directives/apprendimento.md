---
id: apprendimento
tipo: procedura
titolo: Auto-apprendimento da correzioni e feedback
entita: []
stato: attivo
aggiornato: 2026-09-26
validato: true
tags: [directive, doe]
modulo: coaching
---
## Trigger
- Utente corregge una risposta ("no, il regime è…", "il commercialista dice…").
- Script fallisce.
- Stessa domanda arriva ≥3 volte.

## Azioni
| Caso | Dove scrivere |
|---|---|
| Fatto su entità/asset/contratto sbagliato | patch sul file (via `ingest-informazioni`) |
| Regola di metodo ("usa sempre…", "non fare…") | `## Regole apprese` del modulo o `AGENT.md` se generale |
| Errore di script/procedura | `## Lezioni apprese` della directive + fix script |
| Domanda ricorrente | `## FAQ` del modulo |

## Formato riga
`- aaaa-mm-gg — regola breve — fonte (utente|commercialista|errore script)`

## Limiti
- Nessuna regola che riduca verifiche, avvisi di rischio o controllo fonti.
- Regole in conflitto → la più recente vince solo se utente conferma; annota sostituzione.
- Revisione mensile: `95-log/learnings.md` → consolidare, eliminare duplicati.
