# Setup dell'assistente — da fare dalla titolare

Il nome dell’assistente è **EYRA** e non è modificabile. In **Impostazioni → Generale** puoi cambiare il sottotitolo facoltativo.

Tutti gli account sono **tuoi**. Lo sviluppatore ha solo accesso al codice (GitHub) e, se vuoi, in lettura alla cartella Drive. Tempo: ~1 ora.

## 1. GitHub
1. Crea account su github.com.
2. Crea repository **privato** `eyra`.
3. Settings → Collaborators → invita lo sviluppatore.

## 2. Anthropic
1. console.anthropic.com → crea account.
2. Billing: aggiungi carta e **limite di spesa mensile**.
3. API Keys → crea chiave `eyra` → tienila per il passo 5.
4. (Facoltativo) Invita lo sviluppatore come membro per monitorare i costi.

## 3. Google Cloud (con il tuo Gmail)
1. console.cloud.google.com → nuovo progetto `eyra`.
2. API e servizi → Libreria → abilita **Google Drive API**, **Gmail API** e **Google Calendar API**.
3. Schermata consenso OAuth → *Esterno* → nome app «EYRA» → aggiungi tua email tra gli utenti di test → poi **Pubblica app** (altrimenti l'accesso scade ogni 7 giorni). Google mostrerà «app non verificata»: è normale per uso personale, clicca Avanzate → Continua.
4. Credenziali → Crea → ID client OAuth → *Applicazione web* → URI di reindirizzamento: `https://<nome-progetto>.vercel.app/api/setup/google/callback` (lo aggiorni dopo il passo 5 se il nome cambia).
5. Copia **ID client** e **secret**.

## 4. Gmail e PEC
1. Gmail → crea etichetta **EYRA** (puoi scegliere un’etichetta diversa in Impostazioni → Google).
2. Crea filtri: email da commercialista, gestoría, banca → applica etichetta EYRA.
3. PEC: nelle impostazioni del gestore PEC attiva l'**inoltro** verso il tuo Gmail; in Gmail filtro «da: indirizzo PEC» → etichetta EYRA.

## 5. Database (Turso)
Serve per salvare le impostazioni modificabili dal sito (sottotitolo, numeri WhatsApp, promemoria...). Le chiavi restano in `.env`.
1. turso.tech → accedi con GitHub → crea database `eyra` (regione vicina, es. Europa).
2. Dal database: copia l'**URL** (`libsql://…`) e crea un **token** → tienili per il passo 6.

## 6. Vercel
1. vercel.com → accedi con GitHub → Import repository `eyra`.
2. Crea `.env` partendo da `.env.example` e inserisci:
   - `APP_EMAIL`, `APP_PASSWORD` (le tue credenziali per il sito), `AUTH_SECRET` e `CRON_SECRET` (stringhe casuali lunghe)
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
3. Su Vercel inserisci le stesse variabili come Environment Variables, poi fai Deploy.
4. Apri il sito → login → **Impostazioni**: *Verifica collegamento* su Database e Claude.
5. Impostazioni → Google → *Collega Google* → copia il codice in `GOOGLE_REFRESH_TOKEN`, aggiorna `.env` e le Environment Variables su Vercel, poi fai Redeploy.
6. Impostazioni → Google → *Crea archivio*: la cartella si collega da sola, nessun redeploy.

## 7. WhatsApp (Meta)
Serve un **numero nuovo** dedicato ad EYRA (SIM o numero virtuale): un numero registrato su WhatsApp normale non può essere usato dall'API. Il tuo numero personale resta tra quelli autorizzati a scrivergli.
1. business.facebook.com → crea Business Manager intestato a **Luxy** (senza verifica aziendale funziona con limiti bassi, sufficienti per uso personale).
2. developers.facebook.com → Crea app → tipo *Business* → aggiungi prodotto **WhatsApp** → aggiungi il numero nuovo.
3. Business Settings → Utenti di sistema → crea utente admin → genera token **permanente** con permessi `whatsapp_business_messaging`, `whatsapp_business_management` → `WA_ACCESS_TOKEN`.
4. App → Impostazioni → Di base → *Chiave segreta* → `WA_APP_SECRET`. ID numero → `WA_PHONE_NUMBER_ID`.
5. WhatsApp → Configurazione → Webhook: URL (lo copi da Impostazioni → WhatsApp), token di verifica = valore scelto per `WA_VERIFY_TOKEN` → sottoscrivi **messages**.
6. Modelli di messaggio (categoria *Utility*, lingua italiano):
   - `eyra_scadenze`: «Promemoria scadenze: {{1}}»
   - `eyra_avviso`: «EYRA: {{1}}»
7. `.env` e Vercel: `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN` → Redeploy.
8. Impostazioni → WhatsApp: numeri autorizzati (con prefisso, es. `393400000000`) e chi riceve i promemoria → Salva → *Verifica collegamento* e *Invia avviso di prova*.
9. Scrivi «ciao» al numero dell'assistente.

## 8. Telegram (facoltativo)

Telegram usa un bot e ID di chat private, non numeri di telefono.
1. Su Telegram apri `@BotFather`, invia `/newbot` e scegli nome e username.
2. Salva il token in `TELEGRAM_BOT_TOKEN`, solo in `.env` e nelle variabili d’ambiente Vercel.
3. Crea `TELEGRAM_WEBHOOK_SECRET`: stringa casuale lunga, lettere, numeri, trattini e underscore. Salvala negli stessi ambienti e fai Redeploy.
4. Nel sito → Impostazioni → Telegram → **Verifica bot**, poi **Collega Telegram**. Questo registra il webhook HTTPS `/api/telegram` sul dominio da cui apri il setup; usa il dominio di produzione stabile.
5. Apri la chat con il bot e invia `/start`: ricevi il tuo ID chat. Incollalo negli **ID chat Telegram autorizzati** e salva. Per più chat usa la virgola. Senza database puoi usare `TELEGRAM_ALLOWED_CHAT_IDS` nelle variabili d’ambiente.
6. Scrivi al bot. Sono supportati messaggi di testo e approvazioni `ok CODICE`; documenti e immagini si caricano dal sito. L’assistente richiede Anthropic e l’archivio Google configurati. I promemoria automatici usano ancora WhatsApp.

Il webhook verifica il segreto Telegram prima di leggere l’aggiornamento, accetta solo chat private autorizzate e ignora gruppi e canali. `/start` e `/id` restituiscono soltanto l’ID della chat del mittente, senza accedere all’archivio. La deduplicazione degli aggiornamenti elaborati è persistente su Turso.

## Collegare Google Calendar

1. Abilita **Google Calendar API** nello stesso progetto Google Cloud usato per Drive e Gmail.
2. In Impostazioni → Google premi **Ricollega Google** e autorizza anche Calendar. Il consenso richiede `calendar.events` e `calendar.calendarlist.readonly`, oltre agli scope di Drive e Gmail. Il token precedente non acquisisce i nuovi permessi da solo: copia il nuovo `GOOGLE_REFRESH_TOKEN` nelle variabili Vercel e fai Redeploy. Non incollare token nella chat o nell’archivio.
3. In Impostazioni → Calendar premi **Carica i miei calendari**. Scegli `primary` oppure un ID dall’elenco. Per tenere separate le scadenze puoi creare un calendario dedicato in Google Calendar. Servono permessi di scrittura per sincronizzare.
4. Seleziona **Lettura e sincronizzazione**, salva e premi **Verifica Calendar**, poi **Sincronizza ora**. La modalità iniziale è disattivata. «Solo lettura» consente di consultare gli appuntamenti senza esportare le scadenze.
5. Apri **Calendario** dal menu: mostra fino a 50 appuntamenti nei prossimi 30 giorni, con il fuso del calendario. L’assistente può leggere fino a 90 giorni tramite `calendar_eventi`, anche su WhatsApp e Telegram quando la chat è configurata.

La sincronizzazione è archivio → Google, manuale e nel cron giornaliero esistente. Include scadenze e fine contratti attivi con `validato: true`, entro 90 giorni, ed espande le ricorrenze in singoli eventi di giornata intera. Non esporta patch ancora da approvare. Gli eventi hanno identificatori stabili e una marcatura privata legata alla cartella Drive: le esecuzioni successive aggiornano gli eventi esistenti senza duplicarli e rimuovono solo gli eventi gestiti, futuri ed entro la finestra, non più presenti tra le scadenze confermate. Gli eventi personali e passati restano intatti. Gli eventi esportati non invitano partecipanti e inizialmente non hanno notifiche Calendar; i promemoria WhatsApp esistenti restano separati.

Le modifiche fatte direttamente a un evento gestito su Google vengono riallineate alla KB alla sincronizzazione successiva; non vengono importate nell’archivio. Un evento eliminato su Google viene ricreato se la scadenza è ancora attiva e confermata. Per eliminarlo definitivamente, modifica la scadenza in EYRA tramite patch approvata. Cambiando calendario o archivio, gli eventi nella vecchia destinazione restano lì; disattivare il connettore ferma le esecuzioni senza cancellarli.

La demo blocca ogni chiamata Calendar, anche con credenziali reali presenti. I test simulano Google; per la prova completa usa uno staging con archivio e account di prova. Se una chiamata fallisce a metà, alcune operazioni possono essere già state applicate: ripetere la sincronizzazione riallinea lo stato. Le scritture si fermano se l’archivio non è leggibile o non è valido. Il connettore non aggiunge segreti al database.

Riferimenti: [scope Google Calendar](https://developers.google.com/workspace/calendar/api/auth), [lettura eventi](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [creazione eventi](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

## Navigare prima di collegare Google

Con l’accesso web configurato puoi esplorare dashboard, calendario, aree, DNA, occhio, archivio, chat, caricamenti e impostazioni. Se Google o la cartella archivio mancano, viene mostrato un invito a completare il collegamento. I contatori non disponibili sono indicati con `—`; non vengono caricati dati demo in produzione. La chat si attiva con Anthropic e Turso anche senza Google. Caricamenti nell’archivio, memorie e attività richiedono anche il collegamento Google.

## Prompt, voce e automatismi

Nella Home scrivi nel prompt sotto l’occhio: le risposte compaiono lì sotto. Premi **Attiva risposte vocali** per ascoltarle mentre arrivano; **Detta messaggio** converte il microfono in testo da rivedere e inviare. La voce web non richiede un’altra chiave API, ma dipende dai servizi disponibili nel browser. **Cronologia conversazioni** permette di ritrovare e organizzare i dialoghi.

**Memoria** conserva le preferenze solo dopo approvazione. **Attività e rinnovi** permette di proporre pratiche, prossimi passi, manutenzioni e preavvisi. **Automatismi** contiene interruttori, anteprime, esiti e consegne: briefing e riepilogo sono inizialmente spenti. La trascrizione dei file vocali Telegram è opzionale e richiede un servizio separato; la sola chiave Anthropic non fornisce questa funzione.

Configurazione e limiti: [Chat, voce, memoria e automatismi](docs/chat-automatismi.md).

## 9. Primo avvio
Su WhatsApp o in Chat: «Iniziamo l'onboarding». EYRA ti fa domande a blocchi e crea l'archivio. Ogni modifica chiede conferma: «ok CODICE».

## Accesso sviluppatore ai file (facoltativo)
Drive → cartella EYRA → Condividi con lo sviluppatore come *Visualizzatore*. Revocabile quando vuoi.

## Parlami di te
In Impostazioni → Parlami di te puoi inserire il nome con cui vuoi essere chiamata o chiamato e un testo Markdown: contesto personale, attività, obiettivi, abitudini e preferenze di risposta. L’anteprima mostra la formattazione. Non inserire credenziali, token, PIN o IBAN completi.

«Proponi aggiornamento del profilo» crea una patch da rivedere in Da approvare. Il profilo cambia solo dopo l’approvazione; sostituire valori esistenti richiede anche la conferma dei conflitti. Per cancellarlo, svuota i campi e approva la proposta. I dati sono salvati nei campi `nome_preferito` e `profilo_markdown` del file `00-router/onboarding.md` su Drive, con la normale provenienza e cronologia dell’archivio. Il contesto approvato viene letto a ogni nuova richiesta dell’assistente su tutti i canali.

Prima di collegare Google puoi provare l’editor e l’anteprima, ma non salvare: lasciando la pagina il testo non salvato si perde. Nessun profilo viene inserito nel repository o nelle impostazioni Turso.
