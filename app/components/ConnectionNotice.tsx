import Link from "next/link";

export default function ConnectionNotice({ message }: { message: string }) {
  return <aside className="connection-notice" role="status">
    <div><strong>Configurazione da completare</strong><p>{message}</p></div>
    <Link className="btn sec" href="/setup">Configura collegamenti</Link>
  </aside>;
}
