# Chat, voce, memoria e automatismi

## Chat e voce

La chat web richiede `ANTHROPIC_API_KEY` e Turso, anche senza Google. Il prompt è sotto l’occhio nella Home: le risposte appaiono subito sotto, nello stesso spazio. «Parla con l’assistente» nella barra superiore porta al prompt; «Cronologia conversazioni» apre dialoghi precedenti, ricerca e archiviazione. Il prompt Home continua la conversazione `web`, conservata anche ricaricando la pagina. Il modello riceve gli ultimi 30 messaggi e può cercare nei dialoghi non archiviati. Le cronologie JSON precedenti su Drive vengono importate una sola volta quando si apre quella conversazione; gli originali restano al loro posto.

«Attiva risposte vocali» abilita la lettura in italiano per questa apertura della chat. Il testo arriva in streaming e le prime frasi complete possono essere lette prima della fine della risposta. «Ferma voce» interrompe la lettura; «Ascolta» rilegge una risposta. Le voci del dispositivo non richiedono chiavi aggiuntive; quelle AI richiedono la configurazione sotto. Non è una sessione audio bidirezionale continua. Il tempo al primo testo dipende anche da modello, strumenti, rete e avvio del server; l’audio AI aggiunge il tempo di sintesi delle frasi.

«Detta messaggio» richiede il permesso microfono: rivedi il testo, poi invia. Il riconoscimento non è disponibile in tutti i browser e può utilizzare servizi remoti del produttore del browser. Se assente, resta utilizzabile la tastiera, anche con il suo microfono. La sintesi preferisce una voce italiana locale, quando disponibile. Le approvazioni di patch richiedono un nuovo messaggio scritto, non una trascrizione audio.

«Scegli voce» elenca le voci del dispositivo, mostrando prima quelle italiane e indicando quali sono locali oppure online. «Ascolta anteprima» permette di confrontarle senza inviare messaggi a Claude. La scelta viene salvata solo nel browser e vale per risposte progressive e riascolto; «Automatica» ripristina la scelta predefinita. Se una voce del dispositivo salvata non è più disponibile si usa quella automatica. L’elenco si aggiorna quando il browser carica nuove voci e al ritorno nella pagina. Safari può esporre una sola voce italiana: l’app non può installare altri timbri nel sistema.

### Audio AI e iPhone Safari

In Vercel configura `OPENAI_API_KEY` e fai Redeploy, quindi apri **Impostazioni → Voce** (`/setup#voce`), scegli **Audio AI → OpenAI** e salva. Ricarica la Home: in «Scegli voce» trovi 13 timbri indipendenti dalle voci del telefono (Marin, Cedar, Coral, Nova, Alloy, Ash, Ballad, Echo, Fable, Onyx, Sage, Shimmer, Verse), con anteprima. Le voci sono generate dall’AI con `gpt-4o-mini-tts`; testo e registrazioni vengono elaborati da OpenAI a consumo, separatamente da Claude. Le chiavi rimangono solo nell’ambiente server. L’opzione è spenta per default e sempre disattivata in demo. [Documentazione TTS](https://developers.openai.com/api/docs/guides/text-to-speech).

Con Audio AI attivo il microfono usa, dove supportato, **Registra e trascrivi**: Safari registra MP4, altri browser possono usare WebM. Premi «Termina», attendi la trascrizione e verifica il testo prima di inviare. Limiti: 90 secondi e 4 MB. Il server usa `gpt-4o-mini-transcribe` e non conserva il file audio. Il testo entra nella cronologia solo quando invii il messaggio. In «Scegli voce» puoi tornare a **Dettatura del browser**, con testo progressivo e senza questa chiamata API.

La dettatura nativa conserva il testo tra brevi sessioni, sostituisce le ipotesi parziali senza duplicarle e accetta il risultato finale dopo «Termina». Si ferma dopo 90 secondi o due riavvii senza nuove parole; errori di permesso/rete non provocano riavvii infiniti. Microfono e riproduzione richiedono un gesto esplicito; se Safari sospende l’audio AI, usa «Riprendi audio». Non sono garantiti ascolto o riproduzione a schermo bloccato. Senza permesso microfono resta disponibile il testo.

I campi principali usano almeno 16 px sui dispositivi touch, i comandi vocali hanno area di tocco di almeno 44 px e la chat usa l’altezza dinamica dello schermo. Tabelle e codice nelle risposte scorrono internamente.

API di riferimento: [Messages Anthropic](https://platform.claude.com/docs/en/api/messages/create), [streaming](https://platform.claude.com/docs/en/build-with-claude/streaming), [Web Speech](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API).

## Memoria e attività

### Immagini e foto di documenti

Nel prompt usa «Allega foto o documento» oppure «Scatta foto» (fotocamera posteriore sui telefoni che supportano `capture`). Puoi allegare più pagine, vedere e aprire l’anteprima e rimuovere singoli file. JPG, PNG, WebP e GIF arrivano a Claude come contenuti visivi, PDF come documenti. Il browser ottimizza le foto grandi fino a 2400 pixel sul lato lungo; controlla che i caratteri restino leggibili. HEIC/HEIF vengono convertiti solo quando il browser sa decodificarli; altrimenti viene richiesto un JPG/PNG. Fino a 8 allegati e 4 MB complessivi per invio web, compatibili con i limiti Vercel. I file non supportati vengono rifiutati prima dell’elaborazione.

L’assistente deve indicare dati illeggibili o incerti e chiedere un’immagine migliore, senza inventarli. Puoi chiedere estrazione di date/importi, riepiloghi, confronti o proposte di scadenze. Nessun dato strutturato viene applicato all’archivio senza approvazione. Le foto possono essere analizzate con Anthropic anche prima di collegare Google; la conservazione degli allegati nell’archivio richiede Drive.

Le chat sono su Turso; preferenze durature e correzioni diventano memorie markdown su Drive **solo dopo approvazione**. `LEARNING_ENABLED=off` disattiva le proposte automatiche. La pagina Memoria permette anche proposte manuali e proposte di rimozione. Non viene addestrato un modello; vengono recuperate fino a 40 memorie approvate come contesto. Le credenziali riconoscibili vengono oscurate nella cronologia e rifiutate nei moduli; non inserire segreti nei dialoghi.

Attività e rinnovi riusano i template `procedura` e `scadenza`, senza richiedere aggiornamenti distruttivi degli archivi esistenti. Creazione e modifiche passano dall’Inbox. I rinnovi hanno data iniziale, ricorrenza mensile/annuale e preavviso aggiuntivo ai giorni generali. La chiusura registra la data di completamento, usata nel riepilogo settimanale.

## Telegram

Sono accettate chat private autorizzate, documenti e foto fino a 15 MB, vocali fino a 10 minuti/15 MB. Firma segreta webhook e whitelist restano obbligatorie. La deduplicazione degli aggiornamenti elaborati è persistente su Turso; un aggiornamento interrotto non viene rieseguito automaticamente, per evitare effetti duplicati.

La chiave Anthropic serve alle risposte e all’analisi di testo/documenti, non alla trascrizione dei file audio. Il connettore opzionale usa [OpenAI speech-to-text](https://developers.openai.com/api/docs/guides/speech-to-text), modello `gpt-4o-mini-transcribe`: configura `OPENAI_API_KEY` solo nelle variabili d’ambiente e scegli `TRANSCRIPTION_PROVIDER=openai` in Impostazioni → Telegram. È spento per default e sempre disabilitato in demo. Nessun audio viene conservato dal codice dopo la trascrizione; la trascrizione entra nella cronologia. L’audio viene inviato al provider configurato.

## Automatismi e consegne

Briefing e riepilogo settimanale sono inizialmente spenti. Dal centro Automatismi si possono vedere anteprime, attivare singoli lavori, scegliere WhatsApp/Telegram/entrambi e avviare esecuzioni manuali. L’attivazione del cron richiede `CRON_SECRET` e il deploy Vercel. Il cron parte alle 06 UTC, con la tolleranza prevista dal piano: 07 in inverno, 08 in estate a Roma/Madrid. La fascia silenziosa è calcolata nel fuso configurato; la coda viene riprovata alla successiva esecuzione fuori fascia, non automaticamente all’ora di fine silenzio. «Consegna avvisi in coda» consente un tentativo manuale.

I riepiloghi usano scadenze confermate, appuntamenti quando Calendar è collegato, attività ordinate per data e conteggio delle proposte pendenti. La domenica il riepilogo include le attività completate negli ultimi sette giorni. Le priorità sono suggerite dalle date, non valutazioni professionali.

I destinatari devono essere nelle whitelist. Gli invii WhatsApp usano il template avviso approvato su Meta, con testo compatto entro il limite del parametro; Telegram riceve il testo completo a blocchi. Tre tentativi per gli errori di consegna. Un invio rimasto `sending` richiede verifica manuale dell’esito prima di un eventuale nuovo avviso. Il registro distingue errori ed esiti; le operazioni demo sono segnalate e non chiamano servizi esterni. Le nuove funzioni non abilitano automaticamente destinatari o servizi mancanti.

## Backup e ripristino

Il backup include archivio e allegati, impostazioni non segrete, conversazioni, messaggi, esecuzioni, consegne e deduplicazione webhook. Le tabelle sono lette nella stessa transazione. Ogni ZIP contiene `manifest.json` con SHA-256 per ogni file. Prima del salvataggio viene estratto e verificato in memoria; dimensione massima 100 MB, senza salvataggi parziali. Conserva gli ultimi otto nuovi backup su Drive. Il download autenticato su Vercel è limitato a 4 MB compressi; per copie maggiori usa lo ZIP in `_backup` su Drive o il mirror. [Limiti Vercel](https://vercel.com/docs/functions/limitations). In demo non vengono salvati export del database nella cartella del repository.

Per una seconda copia automatica configura `BACKUP_MIRROR_URL` e `BACKUP_MIRROR_TOKEN` nell’ambiente. Il servizio esterno deve accettare HTTPS `PUT`, `Authorization: Bearer ...`, `Content-Type: application/zip` e `X-Backup-Name`; nessun redirect è seguito. La creazione e conservazione del servizio di destinazione restano da configurare. Un errore del mirror viene mostrato anche quando la copia Drive è riuscita.

Per recuperare dati, verifica prima il manifest con `verifyBackup`, poi ripristina in un ambiente separato: `archive/` contiene i percorsi Drive, `database/*.json` le righe applicative. Non sovrascrivere la produzione né rieseguire consegne pendenti durante una verifica. Non è presente un pulsante di ripristino distruttivo in produzione; chiavi e token devono essere riconfigurati dall’ambiente sicuro originale.

## Verifica

`npm run check` usa una copia temporanea di `kb-demo` e Turso, con righe di test identificate e rimosse. Copre approvazioni, memoria, rinnovi, cronologia/migrazione/paginazione, dedup, orari legali, integrità del backup, limiti Telegram e segmentazione vocale. I test audio simulano risultati parziali, riavvii, stop, errori di permesso, coda durante streaming, ripresa, annullamento, API protette, opt-in, MP4/WebM, limiti e risposte dei provider. Non certificano il microfono o la riproduzione su un iPhone fisico.

Prova finale su iPhone Safari con un account di prova e sito HTTPS:

1. Home, menu, cronologia e Impostazioni in verticale e orizzontale: verifica scorrimento e campi con tastiera aperta.
2. Detta due frasi con una pausa, premi Termina e controlla che non manchino o si ripetano parole. Nega il permesso e verifica il messaggio di recupero.
3. Con Audio AI configurato, registra una nota, trascrivila e confronta due timbri con l’anteprima. Verifica Ferma voce e Riprendi audio dopo un’interruzione.
4. Invia un messaggio con risposta vocale attiva e allega una foto dalla fotocamera; controlla anteprima, rimozione e lettura della risposta.

Disponibilità effettiva delle voci, crediti dei provider, microfono, fotocamera e consegne reali richiedono la prova sul dispositivo/account. I test automatici non consumano servizi audio a pagamento.
