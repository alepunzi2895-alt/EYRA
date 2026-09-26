import Link from "next/link";
import { brand } from "@/lib/config";
import Wordmark from "./Wordmark";

export async function Shell({ children, inbox = 0 }: { children: React.ReactNode; inbox?: number }) {
  const { name, tagline } = await brand();
  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand"><Wordmark name={name} />{tagline && <small>{tagline}</small>}</div>
        <nav aria-label="Principale">
          <Link href="/">Oggi</Link>
          <Link href="/cartella">Archivio</Link>
          <Link href="/carica">Carica</Link>
          <Link href="/inbox">Da approvare {inbox > 0 && <span className="badge">{inbox}</span>}</Link>
          <Link href="/chat">Chat</Link>
          <Link href="/dna"><span>DNA di <Wordmark name={name} inline /></span></Link>
        </nav>
        <Link href="/setup" className="setup-link">Impostazioni</Link>
      </aside>
      <main>{children}</main>
    </div>
  );
}
