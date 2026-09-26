---
id: moduli
tipo: modulo
titolo: Mappa moduli e instradamento
entita: []
stato: attivo
aggiornato: 2026-09-26
validato: true
tags: [router]
---
## Sintesi
Ogni richiesta → 1 modulo principale, max 2 secondari.

| Modulo | Cartella | Trigger tipici |
|---|---|---|
| Fisco Italia | [[fisco-it]] | IRPEF, IVA IT, INPS, F24, forfettario, srl, IMU, cedolare |
| Fisco Spagna + intl | [[fisco-es-intl]] | autónomo, IRPF, 303/130, RETA, IBI, residenza, convenzioni, altri paesi |
| Immobili + edilizia | [[immobili-edilizia]] | affitti, licenze turistiche, catasto, cantieri, bonus edilizi |
| Nautica | [[nautica]] | barche, charter, registri, ormeggi, assicurazioni, equipaggio |
| Contabilità + finanza | [[contabilita-finanza]] | cash flow, bilanci, budget, banche, prima nota |
| Startup + bandi | [[startup-bandi]] | startup, business plan, finanziamenti, agevolazioni |
| Coaching | [[coaching]] | obiettivi, priorità, abitudini, decisioni personali |

## Regole incrocio
- Acquisto asset → nautica/immobili + fisco dell'entità acquirente + contabilità.
- Residenza/doppia attività IT-ES → fisco-es-intl principale, fisco-it secondario.
- Bando → startup-bandi + fisco del soggetto beneficiario.
