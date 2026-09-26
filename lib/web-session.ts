import { cookies } from "next/headers";
import { authToken } from "./auth";
export async function requireSession() {
  const token = (await cookies()).get("auth")?.value;
  if (!token || token !== await authToken()) throw new Error("Sessione scaduta. Accedi di nuovo.");
}
