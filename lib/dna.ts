/** Catalogo editoriale: descrive il supporto dell'agente, non attesta collegamenti attivi.
 * Le procedure operative restano nella KB. Fonti e limiti: docs/eyra-dna.md.
 */
export type SpecialistId = "tax" | "cfo" | "real-estate" | "marine" | "business" | "grants" | "legal" | "construction" | "coach";
export type Specialist = {
  id: SpecialistId;
  name: string;
  subject: string;
  description: string;
  available: string[];
  learns: string[];
  future: string[];
  documents: string;
  example: string;
  connections: SpecialistId[];
  sources: string[];
};

export const SPECIALISTS: readonly Specialist[] = [
  {
    id: "tax", name: "Tax & Accounting", subject: "Italia · Spagna · Internazionale",
    description: "Mette in relazione fiscalità e contabilità, tenendo distinti paesi, soggetti e fonti.",
    available: ["Legge fatture e documenti contabili, inclusi XML FatturaPA e p7m contenenti XML.", "Consulta l’archivio e le scadenze registrate; cerca fonti ufficiali per le domande su IVA e dichiarazioni.", "Prepara sintesi e proposte da verificare con commercialista o gestoría. Firme e invii restano ai professionisti e alla titolare."],
    learns: ["Regimi fiscali, attività e relazioni tra i soggetti, sulla base dei documenti forniti.", "Indicazioni del commercialista, correzioni e procedure approvate, con fonte e data."],
    future: ["Collegamento diretto ai gestionali contabili e ai portali fiscali: richiede nuove integrazioni; oggi non è disponibile."],
    documents: "Fatture, prospetti contabili, dichiarazioni fornite, comunicazioni del commercialista e scadenze in archivio.",
    example: "Una fattura relativa a un immobile in Spagna viene collegata al proprietario e al contratto, per preparare le domande da porre alla gestoría.",
    connections: ["cfo", "real-estate", "legal"], sources: ["kb/50-moduli/fisco-it/fisco-it.md", "kb/50-moduli/fisco-es-intl/fisco-es-intl.md", "lib/fattura.ts", "lib/agent.ts"],
  },
  {
    id: "cfo", name: "CFO", subject: "Liquidità · Margini · Prospettive",
    description: "Aiuta a leggere l’equilibrio finanziario e a ragionare sulle conseguenze delle decisioni.",
    available: ["Analizza in chat gli estratti e i fogli caricati per riassumere costi, incassi, debiti e crediti.", "Aiuta a confrontare margini, investimenti e ipotesi di cash flow o forecast, esplicitando dati mancanti e assunzioni."],
    learns: ["Categorie di costo, condizioni bancarie non riservate, tempi di incasso e impegni finanziari documentati.", "Obiettivi di liquidità e criteri approvati per confrontare scenari e investimenti."],
    future: ["Sincronizzazione bancaria, riconciliazione automatica e motore di forecast verificato: richiedono sviluppo dedicato."],
    documents: "Estratti conto oscurati, Excel e CSV, budget, fatture, piani di rimborso e prospetti di incassi e pagamenti.",
    example: "Un preventivo lavori viene confrontato con gli incassi attesi per discutere quando sostenere la spesa. Le ipotesi restano visibili.",
    connections: ["tax", "business", "construction"], sources: ["kb/00-router/moduli.md", "kb/50-moduli/contabilita-finanza/contabilita-finanza.md", "lib/agent.ts"],
  },
  {
    id: "real-estate", name: "Real Estate", subject: "Immobili · Contratti · Rendimenti",
    description: "Collega ogni immobile alla sua storia: contratti, affitti, incassi, utenze e manutenzioni.",
    available: ["Cerca schede immobili e contratti e legge le scadenze presenti nell’archivio.", "Riassume documenti di locazione, costi e incassi forniti per discutere il rendimento e proporre aggiornamenti da approvare."],
    learns: ["Caratteristiche degli immobili, rapporti contrattuali e storico documentato degli incassi.", "Utenze, fornitori, interventi e procedure di gestione approvate."],
    future: ["Incassi sincronizzati e gestione automatica degli affitti: richiedono collegamenti e funzioni aggiuntive."],
    documents: "Contratti di locazione, schede immobili, bollette, ricevute, preventivi e verbali di manutenzione.",
    example: "Un rinnovo contrattuale viene collegato all’immobile, ai canoni e alle scadenze fiscali già registrate.",
    connections: ["tax", "cfo", "construction", "legal"], sources: ["kb/60-procedure/nuovo-affitto.md", "kb/50-moduli/immobili-edilizia/immobili-edilizia.md", "lib/kb.ts"],
  },
  {
    id: "marine", name: "Marine", subject: "Barche · Charter · Navigazione",
    description: "Riunisce il contesto di ogni barca, dall’acquisto alla gestione operativa.",
    available: ["Consulta schede barche, contratti e scadenze di assicurazioni o licenze presenti nell’archivio.", "Analizza i documenti forniti su charter, registrazioni e manutenzioni; cerca fonti normative da verificare per il caso specifico."],
    learns: ["Caratteristiche, uso, bandiera e storico documentale delle imbarcazioni.", "Procedure approvate per manutenzioni, assicurazioni, charter e rapporti con porti e fornitori."],
    future: ["Calendari charter sincronizzati, telemetria e collegamenti ai registri navali non sono implementati."],
    documents: "Schede barche, contratti charter, polizze, licenze, registrazioni, fatture e libretti di manutenzione.",
    example: "L’acquisto di una barca collega documenti di proprietà, costi previsti e domande fiscali al soggetto acquirente.",
    connections: ["tax", "cfo", "legal"], sources: ["kb/60-procedure/acquisto-barca.md", "kb/50-moduli/nautica/nautica.md", "lib/agent.ts"],
  },
  {
    id: "business", name: "Business & Strategy", subject: "Modello · Mercato · Direzione",
    description: "Trasforma informazioni e obiettivi in ipotesi di lavoro da confrontare e discutere.",
    available: ["Aiuta a strutturare in chat business model, business plan e ipotesi di pricing dai dati forniti.", "Cerca informazioni su mercato e competitor e prepara confronti indicando fonti, assunzioni e limiti."],
    learns: ["Offerta, clienti, posizionamento, struttura dei costi e criteri di scelta della titolare.", "Decisioni approvate e risultati documentati, utili per le analisi successive."],
    future: ["Monitoraggio continuo dei competitor e raccolta automatica di dati di mercato richiedono nuovi servizi."],
    documents: "Business plan, listini, ricerche, analisi commerciali, budget e note sulle decisioni.",
    example: "Un’ipotesi di nuovo servizio charter mette in relazione prezzi, costi, domanda documentata e vincoli operativi.",
    connections: ["cfo", "grants", "marine", "coach"], sources: ["kb/00-router/moduli.md", "kb/50-moduli/startup-bandi/startup-bandi.md", "lib/agent.ts"],
  },
  {
    id: "grants", name: "Grants & Incentives", subject: "Bandi · Startup · Agevolazioni",
    description: "Aiuta a orientarsi tra opportunità e requisiti, a partire dal paese e dal soggetto interessato.",
    available: ["Cerca su richiesta bandi, finanziamenti, incentivi e sgravi, verificando le fonti ufficiali.", "Confronta i requisiti pubblicati con le informazioni disponibili e prepara una lista di documenti e punti da verificare."],
    learns: ["Profilo dell’impresa, progetti, paesi di interesse e requisiti documentati.", "Storico delle candidature, esiti e indicazioni approvate dei consulenti."],
    future: ["Sorveglianza automatica dei portali e invio delle candidature non sono disponibili."],
    documents: "Testi dei bandi, visure, business plan, preventivi, piani di spesa e documenti delle candidature.",
    example: "Un bando viene confrontato con il progetto e il paese dell’impresa, evidenziando requisiti ancora da dimostrare.",
    connections: ["business", "tax", "cfo"], sources: ["kb/60-procedure/candidatura-bando.md", "kb/50-moduli/startup-bandi/startup-bandi.md", "lib/agent.ts"],
  },
  {
    id: "legal", name: "Legal/Bureaucracy", subject: "Documenti · Pratiche · Scadenze",
    description: "Organizza i passaggi e rende esplicite le questioni da sottoporre ai professionisti.",
    available: ["Riassume contratti e comunicazioni forniti e rintraccia documenti e scadenze nell’archivio.", "Prepara elenchi di documenti mancanti e domande precise per commercialisti o avvocati. Le decisioni professionali restano a loro quando necessario."],
    learns: ["Stato documentato delle pratiche, interlocutori e istruzioni ricevute dai professionisti.", "Procedure e checklist approvate, con provenienza e data delle informazioni."],
    future: ["Accesso diretto ai portali delle pratiche e PEC via IMAP sono sviluppi futuri. Oggi la PEC può essere importata se inoltrata a Gmail configurato."],
    documents: "Contratti, comunicazioni, PEC inoltrate a Gmail, richieste degli enti e checklist documentali.",
    example: "Una comunicazione su una pratica immobiliare diventa un riepilogo delle richieste e una proposta di scadenza da approvare.",
    connections: ["tax", "real-estate", "marine", "construction"], sources: ["kb/AGENT.md", "kb/directives/ingest-informazioni.md", "lib/gmail.ts", "AGENTS.md"],
  },
  {
    id: "construction", name: "Construction", subject: "Lavori · SAL · Fornitori",
    description: "Collega il progetto edilizio ai documenti, alle spese e alle responsabilità dei soggetti coinvolti.",
    available: ["Legge e confronta in chat preventivi, descrizioni dei lavori e SAL forniti.", "Riassume pagamenti, fornitori e autorizzazioni documentate; propone informazioni e scadenze da aggiungere all’archivio."],
    learns: ["Capitolati, fasi dei lavori, condizioni concordate e storico dei fornitori.", "Procedure di controllo approvate e indicazioni del tecnico incaricato."],
    future: ["Gestione strutturata di cantiere, approvazione dei SAL e collegamenti ai portali edilizi richiedono nuove funzioni."],
    documents: "Preventivi, capitolati, SAL, fatture, contratti con fornitori e documenti autorizzativi.",
    example: "Un SAL viene confrontato con il preventivo caricato e collegato all’immobile e alle uscite previste, per la verifica del tecnico.",
    connections: ["real-estate", "cfo", "legal"], sources: ["kb/50-moduli/immobili-edilizia/immobili-edilizia.md", "lib/agent.ts"],
  },
  {
    id: "coach", name: "Personal Coach", subject: "Obiettivi · Priorità · Continuità",
    description: "Aiuta a dare ordine alle intenzioni e a trasformarle in prossimi passi concreti.",
    available: ["Supporta in chat la definizione di obiettivi, priorità e passi successivi.", "Rilegge decisioni e scadenze registrate per un follow-up su richiesta. I promemoria delle scadenze richiedono WhatsApp e automatismi configurati.", "Legge gli appuntamenti Google Calendar e sincronizza le scadenze confermate, dopo il collegamento nelle Impostazioni."],
    learns: ["Obiettivi, vincoli, preferenze organizzative e criteri decisionali condivisi dalla titolare.", "Correzioni e risultati documentati, conservati nell’archivio dopo approvazione."],
    future: ["I follow-up autonomi dedicati agli obiettivi e la sincronizzazione bidirezionale del calendario richiedono sviluppo."],
    documents: "Note sugli obiettivi, piani di lavoro, decisioni, scadenze e feedback forniti.",
    example: "Tre progetti concorrenti vengono confrontati per urgenza, impegno e obiettivi; la titolare sceglie le priorità da conservare.",
    connections: ["business", "cfo", "grants"], sources: ["kb/50-moduli/coaching/coaching.md", "kb/directives/apprendimento.md", "lib/reminders.ts", "AGENTS.md"],
  },
];
