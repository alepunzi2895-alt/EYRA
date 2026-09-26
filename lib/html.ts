/** Pagina HTML minimale per esiti di setup (stesso stile dell'app). */
export function page(title: string, body: string) {
  return new Response(`<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:system-ui,sans-serif;background:#e9eeec;color:#14324b;max-width:720px;margin:10vh auto;padding:0 20px;line-height:1.5">
<h1 style="letter-spacing:-.02em">${title}</h1>${body}<p><a href="/setup" style="color:#14324b">Torna al setup</a></p></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
