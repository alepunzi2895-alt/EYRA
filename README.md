# EYRA

Assistente gestionale personale: fisco Italia/Spagna, immobili, barche, contabilità, bandi, coaching.
Web + WhatsApp + Telegram (testo, foto, documenti e vocali con trascrizione opzionale). Archivio markdown sul Google Drive della titolare. L’interfaccia e la chat con Claude sono utilizzabili anche prima del collegamento Google; la chat richiede Anthropic e Turso.

- **Titolare**: segui `SETUP-TITOLARE.md`.
- **Sviluppo**: leggi `CLAUDE.md`, poi `npm install && npm run dev:demo`.

Il nome **EYRA** è fisso. Il significato di **EYE + RA** e dell’occhio cosmico è descritto in [Identità visiva EYRA](docs/eyra-visual-assets.md).

## Funzioni
- **DNA di EYRA**: `/dna` esplora nove specialisti tramite una doppia elica 3D, con attività disponibili, conoscenze acquisibili e sviluppi futuri. Vista statica, controlli accessibili e dettagli in `docs/eyra-dna.md`.
- **Occhio 3D**: avatar geometrico ispirato al riferimento, con iride smeraldo, lamelle metalliche, lente e satelliti animati. Trascina o usa le frecce per ruotarlo; Pausa e Centra controllano la vista. `/occhio` apre la vista ampliata e il download GLB. Rigenera il file con `npm run model:export` dopo modifiche a `lib/eye-model.ts`.
- **Home**: scadenze 60 giorni, stato archivio. Menu laterale chiuso all’apertura, layout a tutta larghezza e font Montserrat ispirato al riferimento visivo.
- **Archivio**: navigazione cartelle, schede con fonte di ogni dato.
- **Google Calendar**: `/calendario` mostra gli appuntamenti e l’agente può consultarli. Sincronizzazione unidirezionale delle scadenze attive e confermate dei prossimi 90 giorni, manuale o giornaliera. Configurazione e verifica in Impostazioni → Calendar; nessuna chiamata Google in demo.
- **Carica**: estratti conto, fatture (PDF, XML, p7m), contratti → analisi e proposte.
- **Da approvare**: diff, conflitti, Applica/Rifiuta.
- **Chat / WhatsApp**: stesso agente, legge PDF/immagini/Excel/XML, cerca normativa, capisce spagnolo e inglese, risponde in italiano.
- **Chat con voce**: risposte in streaming, dettatura e lettura per frasi con le voci del dispositivo; opzionalmente 13 timbri AI e registrazione MP4/WebM con OpenAI. Cronologia su Turso, più conversazioni, ricerca e archiviazione. L’audio AI richiede una chiave separata ed è spento per default.
- **Foto di documenti**: prompt sotto l’occhio, fotocamera del telefono, allegati multipli con anteprima e rimozione, ottimizzazione delle foto grandi. Claude riceve le immagini per estrarre dati e proporre modifiche da approvare.
- **Memoria**: `/memoria` mostra preferenze e correzioni approvate. L’agente propone nuove memorie durante il dialogo; ogni inserimento o rimozione richiede una patch approvata. Non è riaddestramento del modello.
- **Attività e rinnovi**: `/attivita`, responsabile, prossimo passo, follow-up, stato, manutenzioni ricorrenti e preavvisi personalizzati.
- **Centro automatismi**: `/automatismi`, briefing, riepilogo settimanale, interruttori, canali, fasce silenziose, registro esiti e coda persistente. Cron alle 06 UTC (07/08 a Roma secondo la stagione).
- **Backup completo**: markdown, allegati e tabelle applicative non segrete, verifica checksum e ripristino in memoria, download autenticato, eventuale copia su endpoint HTTPS separato.
- **Impostazioni**: sottotitolo, modello Claude, Drive/Gmail, numeri WhatsApp, promemoria — salvate su Turso, con verifica dei collegamenti. Le chiavi restano in `.env`.
- **Onboarding a intervista**: la titolare costruisce l'archivio parlando con EYRA.

## Sicurezza
Password web, whitelist WhatsApp, firma Meta verificata, scritture solo con codice di conferma, nessuna credenziale in archivio, segreti solo in `.env`.

Configurazione, limiti e test: [Chat, voce, memoria e automatismi](docs/chat-automatismi.md).
