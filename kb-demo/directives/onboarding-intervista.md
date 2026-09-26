---
id: onboarding-intervista
tipo: procedura
titolo: Onboarding a intervista
entita: []
stato: attivo
aggiornato: 2026-09-26
validato: true
tags: [directive, doe, onboarding]
modulo: coaching
---
## Obiettivo
Costruire l'archivio con la titolare, un blocco alla volta, senza moduli da compilare.

## Regole
- **Max 3 domande per messaggio.** Su WhatsApp brevi.
- Accetta risposte libere, vocali trascritti, foto e PDF (visure, modelli 036/037, dichiarazioni, contratti): estrai tu.
- Dopo ogni blocco: `patch_proponi` con file creati/aggiornati → riepilogo → «ok CODICE».
- A blocco approvato: `patch_proponi` su `onboarding` (spunta `- [x]`, `append` in Note).
- Risposta "non so" → annota in `## Rischi / da verificare` del file e prosegui.
- Mai chiedere credenziali, PIN, password, numeri completi di carte o IBAN.
- La titolare può interrompere e riprendere: riparti dal primo blocco non spuntato.

## Blocco 1 — Soggetti e residenza
- Quali soggetti gestiamo? (persona fisica, autónomo ES, P.IVA IT, società, startup)
- Per ognuno: nome, paese, forma, identificativo fiscale (NIE / P.IVA / CIF), data inizio.
- Residenza fiscale oggi IT o ES? Iscrizione AIRE? Mesi l'anno in Spagna?
→ `create` file in `10-entita/` da template `entita`.

## Blocco 2 — Regimi e professionisti
- Autónomo: epígrafe IAE, regime, gestoría (nome, email).
- P.IVA IT: attiva o dormiente, regime, ATECO, commercialista.
- Contributi: RETA, INPS o entrambi? (segnala rischio doppia contribuzione, Reg. UE 883/2004)
- Società: soci/quote, amministratore, chiusura esercizio.
→ `set` su entità.

## Blocco 3 — Scadenze ricorrenti
- Mostra le scadenze in `40-scadenze/ricorrenti/` (stato bozza). Per ognuna chiedi se si applica e a quale entità.
→ `set stato: attivo` + `set entita` solo su quelle confermate.

## Blocco 4 — Immobili e contratti
- Per ogni immobile: paese, comune, intestatario, uso, licenza turistica, mutuo.
- Per ogni contratto: tipo, controparte, canone, scadenza, deposito.
→ `create` in `20-asset/immobili/` e `30-contratti/`; scadenze collegate in `40-scadenze/singole/`.

## Blocco 5 — Barche
- Modello, lunghezza, bandiera, lista, uso, base/ormeggio, intestatario, licenza charter, assicurazione.
- Acquisti in corso?
→ `create` in `20-asset/barche/` + contratti (ormeggio, assicurazione).

## Blocco 6 — Banche e flussi
- Banche per entità (nome, ultime 4 cifre del conto).
- Come arrivano gli estratti (caricamento mensile)? Spese fisse principali?
→ `append` su entità, sezione Dettagli.

## Blocco 7 — Startup, bandi, obiettivi
- Startup: stato, forma, soci, fase, ricavi.
- Obiettivi a 12 mesi (numeri). Priorità. Stile di coaching preferito.
→ `append` su entità startup + modulo coaching.

## Lezioni apprese
