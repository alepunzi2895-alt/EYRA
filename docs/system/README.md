# Documentazione continua

Il manuale unisce spiegazioni revisionate e inventario estratto dal codice. Non usa Claude, OpenAI, Google, Turso o credenziali. Non legge `.env`, `kb-demo`, archivi privati o dati di produzione.

## Fonti

- `catalog.json`: panoramica, architettura, flussi e schede operative. Ogni sorgente ammessa deve appartenere ad almeno una scheda.
- `lib/dna.ts`: nove aree specialistiche, capacità disponibili e future. Un solo agente orchestratore esegue gli strumenti.
- TypeScript: pagine, route, funzioni/classi/tipi esportati, strumenti e parametri dell’agente, nomi delle impostazioni, schema database.
- `source-state.json`: impronte SHA-256 delle sorgenti al momento della revisione documentale. I fine riga sono normalizzati per Windows/Linux.

L’analisi statica usa il parser TypeScript e non importa moduli applicativi. L’inventario non include corpi delle funzioni, contenuto di conversazioni, valori delle impostazioni o delle variabili di ambiente.

## A ogni sviluppo e deploy

1. Aggiorna le schede interessate in `catalog.json`; modifica il catalogo DNA se cambiano le competenze. Per nuove aree aggiungi una scheda e i relativi pattern.
2. Rivedi ingressi, risultati, persistenza, approvazioni, limiti e test. Le descrizioni degli strumenti provengono dal codice; per le funzioni pubbliche sono utili commenti JSDoc mirati.
3. Esegui `npm run docs:update` per registrare l’avvenuta revisione, quindi `npm run check` prima del push.
4. Genera sempre il PDF con `npm run docs:pdf` prima di concludere lo sviluppo, anche per correzioni, configurazioni e refactoring. Controlla visivamente il risultato quando modifichi testo, tabelle o impaginazione.
5. Dopo il commit rigenera l’edizione finale o verifica l’artifact riuscito di GitHub Actions per lo stesso commit. Per ogni deploy verifica la corrispondenza con il codice distribuito. Anche un redeploy senza push richiede una nuova generazione: eseguila localmente sul commit distribuito oppure avvia il workflow manuale sul relativo ref e verifica il commit del risultato.
6. Indica nel riepilogo la revisione e la posizione del PDF. Se la generazione fallisce, risolvi l’errore prima di dichiarare completata la documentazione.

Il controllo blocca impronte vecchie, riferimenti mancanti e sorgenti non coperte. **Aggiornare un hash non prova che una spiegazione sia corretta**: la revisione delle schede rimane obbligatoria. Non c’è una riscrittura autonoma con un modello che possa inventare comportamento o costi API aggiuntivi.

## Generazione locale

Prerequisiti: Node e dipendenze npm del progetto; Python 3.12 con:

```sh
python -m pip install -r scripts/requirements-docs.txt
npm run docs:check
npm run docs:pdf
```

Se Python non è nel PATH o si usa un runtime separato, `DOCS_PYTHON` indica il percorso dell’eseguibile. Non inserire percorsi personali nel repository.

Output ignorati da Git:

- `output/pdf/eyra-manuale-sistema.pdf`
- `output/pdf/eyra-system.json`

Il PDF riporta revisione Git, eventuali modifiche locali, data e impronta delle sorgenti. `npm run docs:inventory` produce soltanto il JSON, senza Python.

## Aggiornamento automatico su GitHub

Il workflow **Documentazione sistema** parte su ogni push e pull request ed è avviabile manualmente. Verifica coerenza e test del generatore, produce il PDF e conserva PDF/JSON come artifact `eyra-manuale-<commit>` per 90 giorni (entro gli eventuali limiti dell’organizzazione).

Un redeploy Vercel senza push non avvia questo workflow automaticamente: chi esegue il deploy deve avviare la generazione manuale prevista sopra. Queste istruzioni sono obbligatorie in `AGENTS.md` e `CLAUDE.md`; il workflow documentale non blocca tecnicamente il rilascio Vercel.

Da GitHub: **Actions → Documentazione sistema → esecuzione → Artifacts**. Il workflow non committa file generati, non pubblica il manuale su un sito pubblico e non modifica Vercel. Se Actions è disattivato o la revisione documentale è obsoleta, il PDF non viene generato: l’esito del workflow espone il motivo.

La CI documentale non esegue `npm run check` applicativo perché quest’ultimo usa Turso di test; resta obbligatorio prima del push. I test automatici non certificano collegamenti reali, permessi OAuth, audio Safari o consegne dei messaggi.
