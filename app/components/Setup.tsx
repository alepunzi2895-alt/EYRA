export default function Setup({ error }: { error: string }) {
  return (
    <div className="vuoto">
      <p><strong>Drive non raggiungibile.</strong> {error}</p>
      <p>Controlla il collegamento Google e la cartella archivio in <a href="/setup">Setup</a>.</p>
    </div>
  );
}
