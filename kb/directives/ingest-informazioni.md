---
id: ingest-informazioni
tipo: procedura
titolo: Ingest informazioni esterne (commercialista, gestoría, banca, email, PDF)
entita: []
stato: attivo
aggiornato: 2026-09-26
validato: true
tags: [directive, doe]
modulo: contabilita-finanza
---
## Obiettivo
Ogni informazione ricevuta finisce nel file markdown giusto, tracciata, senza perdere dati esistenti.

## Input
Testo incollato, email (Gmail/PEC), PDF, fattura XML, foto, estratto conto, messaggio WhatsApp. Testo incollato → `inbox_salva` per tracciabilità (email e allegati sono già salvati dall'app).

## Passi
1. **Classifica**: fonte (commercialista|gestoria|banca|titolare|ente|email|pec|altro), entità coinvolte, modulo.
2. **Estrai fatti atomici**: 1 fatto = 1 operazione. Solo fatti espliciti. Niente deduzioni.
3. **Trova file target**: `kb_cerca` / `kb_elenco`, poi `kb_leggi` prima di modificare.
4. **Proponi**: `patch_proponi` con fonte e operazioni atomiche → ricevi codice, diff, conflitti.
5. **Conflitti** (valore esistente diverso): NON forzare. Mostra vecchio vs nuovo e fonte, chiedi conferma.
6. **Riepiloga** in max 5 righe + «Rispondi ok CODICE per applicare».
7. **Applica** solo quando il messaggio della titolare contiene il codice: `patch_applica`.
8. **Verifica**: il tool restituisce errori di validazione. Se presenti → Self-annealing.

## Regole
- Fonte professionista (commercialista/gestoria) → campi toccati marcati `validato_da` + data.
- Importi: sempre numero + valuta. Date: ISO `aaaa-mm-gg`.
- Mai salvare credenziali, IBAN completi, numeri documento identità.
- Nuova scadenza citata → `create` da template `scadenza`.
- Informazione normativa generale (non su un'entità) → `append` al modulo, sezione `FAQ`, con fonte e data.
- Dubbio su entità o file target → chiedi, non indovinare.

## Self-annealing
Se script fallisce o validazione dà errori:
1. Leggi errore. Correggi la patch e riproponi.
2. Se l'errore è un bug dell'app, annotalo in `95-log/learnings.md` per lo sviluppatore.
3. Aggiungi riga a `## Lezioni apprese` qui sotto + `95-log/learnings.md`.

## Lezioni apprese
- 2026-09-26 — Titoli YAML con `:` interni rompono il parser: usare `—`.
