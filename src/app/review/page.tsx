import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ReviewClient } from "./review-client";

export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/review");
  return <ReviewClient />;
}
