import { brand } from "@/lib/config";
import Wordmark from "@/app/components/Wordmark";

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { name } = await brand();
  return (
    <form className="login" method="post" action="/api/login">
      <h1><Wordmark name={name} /></h1>
      <p className="sub">Accesso riservato.</p>
      <label htmlFor="em">Email</label>
      <input id="em" name="email" type="email" autoComplete="email" required autoFocus />
      <label htmlFor="pw">Password</label>
      <input id="pw" name="password" type="password" autoComplete="current-password" required />
      {e && <p className="conflitto">{e === "config" ? "Accesso non configurato. Imposta APP_EMAIL, APP_PASSWORD e AUTH_SECRET nelle variabili d’ambiente del deploy e ripubblica." : "Email o password errate."}</p>}
      <button type="submit">Entra</button>
    </form>
  );
}
