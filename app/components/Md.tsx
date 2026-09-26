import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown con wikilink [[id]] → /f/id */
export default function Md({ text }: { text: string }) {
  const src = text.replace(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g, (_, id: string, label?: string) => `[${label ?? id}](/f/${encodeURIComponent(id.trim())})`);
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{src}</ReactMarkdown>;
}
