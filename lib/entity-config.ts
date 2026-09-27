import { setting } from "./config";
import { demoEntities, emptyEntities, parseEntities } from "./entities";

/** Shared configuration for the orbit and its detail pages; demo never uses real entity names. */
export async function entityConfig() {
  const demo = !!process.env.KB_LOCAL_DIR;
  if (demo) return { config: demoEntities(), demo, issue: "" };
  try {
    const raw = await setting("HOME_ENTITIES");
    return { config: raw ? parseEntities(raw) : emptyEntities(), demo, issue: "" };
  } catch { return { config: emptyEntities(), demo, issue: "Configurazione dei pianeti non disponibile. Verifica le Impostazioni." }; }
}
