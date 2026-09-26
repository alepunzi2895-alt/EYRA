# DNA di EYRA

La pagina `/dna` rappresenta nove prospettive della stessa intelligenza attraverso una doppia elica geometrica. I nodi non sono agenti autonomi o servizi attivi: sono aree del catalogo editoriale, selezionabili anche attraverso pulsanti HTML.

## Contenuti e provenienza

Il catalogo tipizzato è in `lib/dna.ts`. Ogni specialista include descrizione, attività disponibili, conoscenze acquisibili, possibili sviluppi, documenti utili, un esempio illustrativo, collegamenti ad altre aree e percorsi delle fonti nel progetto.

| Specialista | Base nel progetto |
|---|---|
| Tax & Accounting | Moduli fisco IT/ES, lettura allegati e parser FatturaPA |
| CFO | Modulo contabilità-finanza, analisi conversazionale degli allegati |
| Real Estate | Modulo immobili-edilizia, procedura nuovo affitto, archivio e scadenze |
| Marine | Modulo nautica, procedura acquisto barca, archivio e scadenze |
| Business & Strategy | Router, modulo startup-bandi, ricerca web e chat |
| Grants & Incentives | Modulo startup-bandi, procedura candidatura, ricerca web |
| Legal/Bureaucracy | Limiti professionali di AGENT.md, ingestione documenti, Gmail |
| Construction | Modulo immobili-edilizia, analisi conversazionale degli allegati |
| Personal Coach | Modulo coaching, directive apprendimento, scadenze e promemoria |

I moduli della KB sono in parte template in bozza: il catalogo descrive il supporto conversazionale degli strumenti esistenti, non certifica competenze professionali né procedure già complete. Business & Strategy, Legal/Bureaucracy e Construction sono prospettive editoriali costruite sulle funzioni trasversali esistenti; non introducono nuovi tool o moduli operativi.

“Disponibile” non attesta lo stato delle connessioni. Il servizio AI e gli archivi devono essere configurati; Gmail e WhatsApp hanno prerequisiti propri. “Sviluppo futuro” raccoglie possibilità non implementate, senza impegni di roadmap. Esempi e relazioni sono illustrativi e non derivano dai dati della titolare.

Le procedure restano nella KB. L'acquisizione di conoscenza passa dalle patch approvate: non è addestramento del modello, modifica autonoma del codice o attivazione di servizi. Questa pagina non legge né scrive documenti personali e non esegue azioni esterne.

## Interfaccia e rendering

- `app/dna/page.tsx`: pagina server nella Shell esistente, identità da `brand()`.
- `app/dna/DnaExplorer.tsx`: selezione degli specialisti e delle tre viste, informazioni e connessioni.
- `app/dna/DnaScene.tsx`: caricamento differito della scena, controlli, doppia elica SVG statica e fallback.
- `app/dna/dna-scene.ts`: geometrie Three.js, selezione, rotazione e gestione risorse.
- `app/globals.css`: stili circoscritti alla sezione DNA.

La preferenza di movimento ridotto avvia la scena in pausa. Il rendering si sospende fuori schermo e a scheda nascosta. In pausa si ridisegna solo in risposta alle interazioni o al ridimensionamento. Geometrie, materiali, renderer, eventi e osservatori vengono liberati allo smontaggio, anche dopo perdita del contesto WebGL.

La vista statica è selezionabile in qualsiasi momento. Tastiera: Tab per i pulsanti, Invio/Spazio per selezionare, frecce sulla scena per ruotare, Home per centrare. Tutti i contenuti sono accessibili dai pulsanti HTML anche senza WebGL.
