import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFeatureFlags } from "@/lib/features";
import { getLocale } from "@/lib/i18n/locale";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const [session, flags, locale] = await Promise.all([auth(), getFeatureFlags(), getLocale()]);
  if (!flags.chat) redirect("/");
  if (!session?.user?.id) redirect("/login?callbackUrl=/chat");
  return <ChatClient locale={locale} />;
}
