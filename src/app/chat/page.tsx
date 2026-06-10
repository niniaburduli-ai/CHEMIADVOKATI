import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/chat");
  return <ChatClient />;
}
