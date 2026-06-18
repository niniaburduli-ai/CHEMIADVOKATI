import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/features";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const [session, flags] = await Promise.all([auth(), getFeatureFlags()]);
  if (!flags.chat) redirect("/");
  if (!session?.user?.id) redirect("/login?callbackUrl=/chat");
  return <ChatClient />;
}
