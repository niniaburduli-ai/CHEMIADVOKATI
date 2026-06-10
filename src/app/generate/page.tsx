import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GenerateClient } from "./generate-client";

export default async function GeneratePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/generate");
  return <GenerateClient />;
}
