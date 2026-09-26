import { Shell } from "@/app/components/Shell";
import { brand } from "@/lib/config";
import DnaExplorer from "./DnaExplorer";

export const dynamic = "force-dynamic";

export default async function DnaPage() {
  const { name } = await brand();
  return <Shell><DnaExplorer name={name} /></Shell>;
}
