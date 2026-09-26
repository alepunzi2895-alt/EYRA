/** Scritta del progetto con nome accessibile fornito dall'identità centralizzata. */
export default function Wordmark({ name, inline = false }: { name: string; inline?: boolean }) {
  return <span className={`wordmark${inline ? " wordmark-inline" : ""}`}><img src="/eyra-wordmark.svg" alt={name} width={740} height={136} fetchPriority={inline ? "auto" : "high"} /></span>;
}
