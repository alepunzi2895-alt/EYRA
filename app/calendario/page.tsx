import Link from "next/link";
import { Shell } from "@/app/components/Shell";
import { calendarEvents } from "@/lib/calendar";
import { Verifica } from "@/app/setup/Campi";

export const dynamic = "force-dynamic";

function when(value: { date?: string; dateTime?: string } | undefined, zone: string) {
  if (value?.date) return `${new Date(`${value.date}T12:00:00Z`).toLocaleDateString("it-IT", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long" })} · tutto il giorno`;
  if (value?.dateTime) return new Date(value.dateTime).toLocaleString("it-IT", { timeZone: zone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return "Data non disponibile";
}

function googleLink(value?: string) {
  try { const url = new URL(value ?? ""); return url.protocol === "https:" && ["www.google.com", "calendar.google.com"].includes(url.hostname) ? url.href : null; }
  catch { return null; }
}

export default async function CalendarPage() {
  let data: Awaited<ReturnType<typeof calendarEvents>> | undefined;
  let error = "";
  try { data = await calendarEvents(); }
  catch (e) { error = e instanceof Error ? e.message : "Calendar non disponibile."; }
  return <Shell>
    <h1>Calendario</h1>
    <p className="sub">Appuntamenti dei prossimi 30 giorni{data ? ` · ${data.name} · ${data.timeZone}` : " · Google Calendar"}.</p>
    <div className="azioni">
      <Link className="btn sec" href="/setup#calendar">Configura Calendar</Link>
      <Verifica kind="calendar-sync" label="Sincronizza scadenze" />
    </div>
    {error ? <p className="vuoto">{error}</p> : data && <>
      {!data.events.length && <p className="vuoto">Nessun appuntamento nei prossimi 30 giorni.</p>}
      <ul className="calendar-agenda">
        {data.events.map(event => {
          const url = googleLink(event.htmlLink);
          return <li key={event.id}>
            <time dateTime={event.start?.dateTime ?? event.start?.date}>{when(event.start, data.timeZone)}</time>
            <strong>{event.summary || "Senza titolo"}</strong>
            {event.end && <span>Termina: {event.end.date ? new Date(new Date(`${event.end.date}T12:00:00Z`).getTime() - 86400000).toLocaleDateString("it-IT", { timeZone: "UTC", day: "numeric", month: "long" }) : when(event.end, data.timeZone)}</span>}
            {url && <a href={url} target="_blank" rel="noreferrer">Apri in Google Calendar ↗</a>}
          </li>;
        })}
      </ul>
      {data.more && <p className="aiuto">Mostrati i primi 50 appuntamenti. <a href="https://calendar.google.com/" target="_blank" rel="noreferrer">Apri Google Calendar</a> per vedere tutti gli eventi.</p>}
    </>}
  </Shell>;
}
