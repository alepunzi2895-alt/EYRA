import type { CSSProperties } from "react";

const paths = {
  mic: <><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></>,
  camera: <><path d="M3 6h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/></>,
  attach: <path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2m-7 13 9-9"/>,
  send: <path d="M12 20V4m-7 7 7-7 7 7"/>,
  stop: <rect x="5" y="5" width="14" height="14" rx="2"/>,
  sound: <><path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></>,
  history: <><path d="M3 10a9 9 0 1 1 1 7M3 3v7h7m2-4v6l4 2"/></>,
  keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1M6 16h12"/></>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
};
export default function Icon({ name, style }: { name: keyof typeof paths; style?: CSSProperties }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
