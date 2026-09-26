# EYRA

Assistente gestionale personale: fisco Italia/Spagna, immobili, barche, contabilità, bandi, coaching.
Web + WhatsApp. Archivio markdown sul Google Drive della titolare.

- **Titolare**: segui `SETUP-TITOLARE.md`.
- **Sviluppo**: leggi `CLAUDE.md`, poi `npm install && npm run dev:demo`.

Il nome **EYRA** è fisso. Il significato di **EYE + RA** e dell’occhio cosmico è descritto in [Identità visiva EYRA](docs/eyra-visual-assets.md).

## Funzioni
- **DNA di EYRA**: `/dna` esplora nove specialisti tramite una doppia elica 3D, con attività disponibili, conoscenze acquisibili e sviluppi futuri. Vista statica, controlli accessibili e dettagli in `docs/eyra-dna.md`.
- **Occhio 3D**: avatar geometrico ispirato al riferimento, con iride smeraldo, lamelle metalliche, lente e satelliti animati. Trascina o usa le frecce per ruotarlo; Pausa e Centra controllano la vista. `/occhio` apre la vista ampliata e il download GLB. Rigenera il file con `npm run model:export` dopo modifiche a `lib/eye-model.ts`.
- **Oggi**: scadenze 60 giorni, stato archivio.
- **Archivio**: navigazione cartelle, schede con fonte di ogni dato.
- **Carica**: estratti conto, fatture (PDF, XML, p7m), contratti → analisi e proposte.
- **Da approvare**: diff, conflitti, Applica/Rifiuta.
- **Chat / WhatsApp**: stesso agente, legge PDF/immagini/Excel/XML, cerca normativa, capisce spagnolo e inglese, risponde in italiano.
- **Automatico ogni mattina**: promemoria (7, 2, 0 giorni), import email con etichetta configurata (PEC inoltrata), backup la domenica.
- **Impostazioni**: sottotitolo, modello Claude, Drive/Gmail, numeri WhatsApp, promemoria — salvate su Turso, con verifica dei collegamenti. Le chiavi restano in `.env`.
- **Onboarding a intervista**: la titolare costruisce l'archivio parlando con EYRA.

## Sicurezza
Password web, whitelist WhatsApp, firma Meta verificata, scritture solo con codice di conferma, nessuna credenziale in archivio, segreti solo in `.env`.
