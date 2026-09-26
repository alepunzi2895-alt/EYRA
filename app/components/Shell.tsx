import { brand } from "@/lib/config";
import Navigation from "./Navigation";

export async function Shell({ children, inbox = 0 }: { children: React.ReactNode; inbox?: number }) {
  const { name, tagline } = await brand();
  return (
    <div className="shell">
      <Navigation name={name} tagline={tagline} inbox={inbox} />
      <main id="contenuto" tabIndex={-1}>{children}</main>
    </div>
  );
}
