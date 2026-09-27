import type { Doc, Scad } from "./kb";

export type CostCenter = { id: string; name: string; reference: string; volume: number | null; notes: string };
export type EntityConfig = { year: number; entities: CostCenter[] };
export type Planet = CostCenter & { size: number; attention: "unknown" | "calm" | "watch" | "urgent"; reason: string; documents: number };

/** Display settings only; entity records and their financial documents remain in the approved KB. */
export function parseEntities(raw: string): EntityConfig {
  if (raw.length > 12000) throw new Error("Configurazione troppo lunga.");
  const value = JSON.parse(raw) as EntityConfig;
  if (!Number.isInteger(value.year) || value.year < 2000 || value.year > 2100 || !Array.isArray(value.entities) || value.entities.length !== 4) throw new Error("Indica un anno e quattro centri di costo.");
  const ids = new Set<string>();
  const entities = value.entities.map(e => {
    if (!e || typeof e.id !== "string" || !/^[a-z0-9-]{1,50}$/.test(e.id) || ids.has(e.id)) throw new Error("Identificatori dei centri non validi o duplicati.");
    ids.add(e.id);
    if (typeof e.name !== "string" || !e.name.trim() || e.name.length > 90 || typeof e.reference !== "string" || !/^[a-zA-Z0-9_-]{0,100}$/.test(e.reference) || typeof e.notes !== "string" || e.notes.length > 500) throw new Error("Controlla nomi, ID archivio e peculiarità (massimo 500 caratteri).");
    if (e.volume !== null && (typeof e.volume !== "number" || !Number.isFinite(e.volume) || e.volume < 0 || e.volume > 1e15)) throw new Error("Il volume annuo deve essere un importo positivo o zero, oppure vuoto.");
    return { id: e.id, name: e.name.trim(), reference: e.reference, volume: e.volume, notes: e.notes.trim() };
  });
  const references = entities.map(e => e.reference).filter(Boolean);
  if (new Set(references).size !== references.length) throw new Error("Ogni centro deve avere un ID archivio distinto.");
  return { year: value.year, entities };
}

export function emptyEntities(year = new Date().getFullYear()): EntityConfig {
  return { year, entities: Array.from({ length: 4 }, (_, i) => ({ id: `centro-${i + 1}`, name: `Centro di costo ${i + 1}`, reference: "", volume: null, notes: "" })) };
}

export function demoEntities(year = new Date().getFullYear()): EntityConfig {
  return { year, entities: ["Attività Spagna", "Attività Italia", "Impresa demo", "Progetto demo"].map((name, i) => ({ id: `centro-${i + 1}`, name, reference: "", volume: [120000, 70000, 240000, 45000][i], notes: "Dati dimostrativi. Configura i valori reali nelle Impostazioni dell’ambiente di produzione." })) };
}

/** Compare EUR volumes for a shared year. Missing values never imply zero or a healthy status. */
export function entityPlanets(config: EntityConfig, docs: Doc[], deadlines: Scad[], available: boolean, date: string): Planet[] {
  const max = Math.max(0, ...config.entities.map(e => e.volume ?? 0));
  return config.entities.map(e => {
    const related = e.reference ? docs.filter(d => d.id === e.reference || (Array.isArray(d.fm?.entita) && d.fm.entita.includes(e.reference))) : [];
    const linked = !!e.reference && docs.some(d => d.id === e.reference && d.fm?.tipo === "entita");
    const days = (s: string) => Math.round((Date.parse(s) - Date.parse(date)) / 86400000);
    const upcoming = deadlines.filter(d => d.entita.includes(e.reference) && days(d.data) >= -90 && days(d.data) <= 14);
    const urgent = upcoming.filter(d => days(d.data) <= 3);
    const watch = upcoming.filter(d => days(d.data) <= 14);
    let attention: Planet["attention"] = "unknown", reason = !available ? "Archivio non disponibile: attenzione non valutabile." : "Collega l’ID dell’entità nell’archivio per valutare l’attenzione.";
    if (available && linked) {
      if (urgent.length) { attention = "urgent"; reason = `${urgent.length} scadenze attive arretrate o entro 3 giorni (controllo degli ultimi 90 giorni).`; }
      else if (watch.length || related.some(d => d.fm?.validato === false)) { attention = "watch"; reason = watch.length ? `${watch.length} scadenze entro 14 giorni.` : "Documenti da confermare nell’archivio."; }
      else { attention = "calm"; reason = "Nessun segnale nei documenti collegati e nella finestra controllata. Non è una certificazione contabile."; }
    }
    return { ...e, size: e.volume === null ? 36 : 24 + (max ? Math.sqrt(e.volume / max) * 40 : 0), attention, reason, documents: related.length };
  });
}
