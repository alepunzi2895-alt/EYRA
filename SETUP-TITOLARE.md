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
2. API e servizi → Libreria → abilita **Google Drive API** e **Gmail API**.
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

## 8. Primo avvio
Su WhatsApp o in Chat: «Iniziamo l'onboarding». EYRA ti fa domande a blocchi e crea l'archivio. Ogni modifica chiede conferma: «ok CODICE».

## Accesso sviluppatore ai file (facoltativo)
Drive → cartella EYRA → Condividi con lo sviluppatore come *Visualizzatore*. Revocabile quando vuoi.
