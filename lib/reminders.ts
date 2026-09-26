import { loadAll, scadenze, today, Scad } from "./kb";
import { sendTemplate } from "./whatsapp";
import { settings, list } from "./config";

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
export const reminderDays = async () => list((await settings()).REMINDER_DAYS).map(Number).filter((n) => !isNaN(n));
export const digestNumbers = async () => {
  const s = await settings();
  return list(s.WA_DIGEST_NUMBERS || s.WA_ALLOWED_NUMBERS);
};

/** Parametri template WhatsApp: niente a capo, max ~1000 caratteri. */
export const oneLine = (s: string) => s.replace(/\s*\n+\s*/g, " • ").replace(/\s{4,}/g, "   ").slice(0, 1000);

export async function dueReminders(): Promise<Scad[]> {
  const oggi = today(), set = await reminderDays();
  return scadenze(await loadAll(true), 365).filter(s => set.includes(days(oggi, s.data)) || days(oggi, s.data) === s.preavviso);
}

export async function sendReminders(): Promise<number> {
  const rows = await dueReminders();
  if (!rows.length) return 0;
  const oggi = today();
  const line = rows.map((s) => {
    const d = days(oggi, s.data);
    return `${d === 0 ? "OGGI" : `tra ${d} gg`} ${s.data.slice(8, 10)}/${s.data.slice(5, 7)} ${s.titolo}`;
  }).join(" • ");
  const s = await settings();
  const errors = await Promise.all((await digestNumbers()).map((n) => sendTemplate(n, s.WA_TEMPLATE_DIGEST, [oneLine(line)])));
  if (errors.some(Boolean)) throw new Error("Uno o più promemoria WhatsApp non sono stati consegnati.");
  return rows.length;
}

/** Avviso a tutti i numeri promemoria. Restituisce gli errori di invio (vuoto = tutto ok). */
export async function notify(text: string): Promise<string[]> {
  const s = await settings();
  const nums = await digestNumbers();
  const res = await Promise.all(nums.map((n) => sendTemplate(n, s.WA_TEMPLATE_AVVISO, [oneLine(text)])));
  return res.flatMap((e, i) => (e ? [`+${nums[i]}: ${e}`] : []));
}
