import Link from "next/link";
import Eye3D from "@/app/components/Eye3D";
import { brand } from "@/lib/config";
import Wordmark from "@/app/components/Wordmark";

export const dynamic = "force-dynamic";
export default async function EyePage() {
  const { name } = await brand();
  return <main className="eye-studio">
    <header><Link href="/">← Cruscotto</Link><h1><Wordmark name={name} /></h1><a href="/eyra-eye.glb" download className="eye-download">Scarica modello .glb ↓</a></header>
    <Eye3D name={name} expanded />
    <p className="eye-studio-caption">Smeraldo, luce e profondità.</p>
  </main>;
}
