# Identità visiva EYRA

**EYRA** è il nome di un'intelligenza progettata per osservare, comprendere e connettere informazioni provenienti da mondi diversi, trasformandole in consapevolezza, strategia e azione.

Il nome nasce dalla fusione concettuale di **EYE** e **RA**.

## EYE — Visione

**EYE** rappresenta l'occhio.

Non soltanto la capacità di vedere ciò che è davanti a noi, ma di individuare **connessioni, anomalie, rischi e opportunità che normalmente rimangono nascoste**.

L'occhio diventa quindi il simbolo della visione globale di EYRA.

EYRA osserva contemporaneamente dati, documenti, email, scadenze, società, immobili, attività finanziarie, fiscalità e informazioni provenienti da sistemi differenti.

Non guarda semplicemente il dato.

**Comprende il contesto in cui quel dato esiste.**

## RA — Luce

**Ra**, nella mitologia dell'antico Egitto, è la divinità associata al Sole.

Nel concept di EYRA, RA viene utilizzato simbolicamente come rappresentazione di **luce, conoscenza e capacità di rendere visibile ciò che prima era oscuro**.

La luce diventa quindi metafora della comprensione.

**EYE osserva.**  
**RA illumina.**  
**EYRA comprende.**

## EYRA — Intelligenza aumentata

Dall'unione concettuale nasce:

**EYE + RA → EYRA**

Un'entità digitale capace di osservare un ecosistema complesso dall'alto e mettere in relazione informazioni che normalmente rimarrebbero separate.

EYRA non è concepita come un semplice chatbot.

È un **centro di intelligenza multidisciplinare** capace di collegare competenze, dati e sistemi differenti.

Il suo valore non deriva soltanto da ciò che conosce, ma soprattutto dalla capacità di **creare connessioni tra informazioni diverse**.

## Il simbolo

L'identità visiva di EYRA è un **occhio cosmico**.

La **pupilla centrale** rappresenta il nucleo dell'intelligenza.

L'**iride**, costituita da connessioni simili a sinapsi, rappresenta la rete di conoscenza.

Le **orbite** che circondano l'occhio rappresentano i diversi ecosistemi collegati a EYRA: persone, aziende, immobili, finanza, fiscalità, nautica, documenti, comunicazioni, scadenze e opportunità.

Tutte queste informazioni orbitano intorno allo stesso centro intelligente.

## La filosofia

EYRA segue un principio semplice:

**osservare → connettere → comprendere → anticipare → agire.**

Non significa prevedere il futuro in senso letterale.

Significa utilizzare informazioni, contesto e relazioni per identificare in anticipo **possibili conseguenze, rischi, opportunità e azioni necessarie**.

Per questo EYRA assume simbolicamente il ruolo di un **occhio veggente digitale**: un'intelligenza che cerca di mostrare ciò che non è immediatamente evidente.

## Identità visiva

Il colore principale di EYRA è un **Emerald Teal luminoso**.

Il verde richiama **crescita, equilibrio e andamento positivo**.

La componente teal comunica **intelligenza, controllo e tecnologia**.

Il nero e la grafite rappresentano invece lo spazio, la profondità e l'universo sconosciuto che circonda la conoscenza.

Al centro rimane sempre l'occhio illuminato di EYRA.

**Una sola intelligenza. Molte connessioni. Una visione d'insieme.**

Riferimento originale: `public/eyra.png`, fornito dalla titolare. L'originale resta intatto.

## Asset utilizzati

- `public/eyra-wordmark.svg`: scritta vettoriale trasparente ricostruita sulle forme del riferimento. È usata in dashboard, barra laterale, login e vista ampliata. Non richiede un font installato. Mantiene E a tre barre, Y aperta, R curva e A senza traversa. Il componente `Wordmark` mantiene il nome fisso EYRA accessibile.
- `public/eyra-cosmos.png`: sfondo cosmico ricostruito con lo strumento imagegen integrato, a partire dal riferimento; occhio e scritte rimossi. Impiegato dietro il modello e al login.
- `public/eyra-wordmark.png`: estrazione raster con alpha ottenuta da imagegen. La rimozione automatica lascia residui minuti; per l'interfaccia è stato scelto il tracciato SVG pulito.
- `public/eyra-eye.glb`: geometria esportata con `npm run model:export`. Il bulbo contiene colori nebulosi sui vertici e particelle a diverse profondità, senza proiettare la foto su una sfera.

Il contorno ha tre lamelle speculari per palpebra e resta frontale a riposo. Le orbite continuano a muoversi; la rotazione intenzionale rimane disponibile tramite trascinamento o tastiera.

L'iride riprende il contrasto della foto: bordo esterno scuro, collaretto smeraldo irregolare, filamenti sottili e fasci in rilievo con larghezze variabili. La pupilla è una superficie curva quasi nera, senza anello metallico, con un piccolo riflesso laterale. Il riflesso maggiore segue la curvatura della cornea in alto a destra. I riflessi sono geometrie sfumate e seguono il modello durante la rotazione; il file GLB li include.

## Prompt dello sfondo — imagegen integrato

> Use case: precise-object-edit / background reconstruction. Edit target: attached EYRA source artwork. Create a wide cinematic space background for a website and a real 3D eye that will be composited separately in the center. Preserve the source's realistic deep black and emerald/turquoise nebula, tiny silver and warm gold stars, far planets and atmospheric planet horizon along the bottom. Remove the ENTIRE giant eye, metal framework, orbital wires, satellites attached to eye, all logo text and slogan. Fill the removed area with a natural continuation of the starfield and nebulous cosmic depth. Keep the center mostly dark and quiet so the separate green eye remains legible, brightest detailed nebula wisps concentrated at far upper right and around the far edges, small dark planet low left, sweeping dim curved planet horizon at bottom. Sophisticated near-black space, fine natural dust and stars, no garish purple or bright green fog, no graphic grids, no interface, no text anywhere. Wide 16:9 landscape image, high detail, faithful palette and cinematic photographic realism of the original.

## Prompt dell'estrazione raster — imagegen integrato

> Precise edit of this transparent EYRA wordmark: remove ALL the broad green/gray glow, haze, shadows and fringes around the letters. Keep ONLY crisp thin ivory-white letter strokes on fully transparent alpha. Preserve the lettering geometry and spacing. The E is three separate horizontal bars, the Y is a thin fork, the R has its open futuristic bowl and diagonal leg, A has no crossbar. No redesign and no other text. Crop tightly around the four letters with only a small transparent margin. Wide horizontal logo lockup, about 6:1. Absolutely no glow or colored pixels surrounding the strokes, no background rectangle, no stars. Clean professional transparent PNG for a header.

Le immagini sono state prodotte con lo strumento integrato, senza CLI né chiavi API aggiuntive. L'SVG è un asset nativo del progetto, non un font identificato nell'immagine.

## Interfaccia e tipografia
La navigazione parte chiusa e si apre con il pulsante Menu, come pannello modale laterale. Si chiude con Esc, il pulsante di chiusura, un clic sullo sfondo o la scelta di una pagina. La pagina principale si chiama Home. I contenuti occupano la larghezza disponibile; impostazioni e caricamenti usano colonne sui display ampi.

La Home inizia direttamente sotto la navbar con uno sfondo cosmico a tutta larghezza: Wordmark centrato e luminoso, poi occhio 3D. Il bagliore pulsa lentamente solo quando non è richiesta una riduzione delle animazioni. Data e ora seguono il dispositivo e si aggiornano ogni secondo. Su Vercel la città è approssimata dall’IP (`x-vercel-ip-city`); in locale resta non rilevata. Il pulsante «Rileva posizione» chiede il permesso al browser e mostra le coordinate nella pagina, senza salvarle né inviarle a servizi di geocodifica. Il rifiuto del permesso non impedisce la navigazione. Avvisi di configurazione e azioni rapide seguono lo spazio introduttivo.

Il font dell’interfaccia e dei testi è Montserrat, scelto come approssimazione geometrica del lettering «SEE WHAT OTHERS DON’T» dell’immagine originale. Non è un’identificazione certa del font nel raster. Titoli e navigazione usano pesi leggeri e spaziatura ampia; i testi lunghi conservano spaziatura naturale per la leggibilità. Il marchio continua a essere reso con Wordmark.
