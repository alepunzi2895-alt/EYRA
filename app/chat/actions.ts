"use server";
import { redirect } from "next/navigation";
import { createConversation, archiveConversation } from "@/lib/history";
import { requireSession } from "@/lib/web-session";
export async function newChat() { await requireSession(); redirect(`/chat?id=${await createConversation()}`); }
export async function archiveChat(fd: FormData) {
  await requireSession(); await archiveConversation(String(fd.get("id")), fd.get("archived") === "1"); redirect("/chat");
}
