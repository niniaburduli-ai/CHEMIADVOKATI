import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { Consultation } from "@/lib/models/consultation";
import { buttonVariants } from "@/components/ui/button";
import { ConsultationsGrid, type ConsultationItem } from "./consultations-grid";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/consultations");

  await dbConnect();
  const docs = await Consultation.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const items: ConsultationItem[] = docs.map((doc) => {
    const d = doc as unknown as {
      _id: unknown;
      question: string;
      answer: string;
      createdAt?: Date;
      sources?: ConsultationItem["sources"];
    };
    return {
      id: String(d._id),
      question: d.question,
      answer: d.answer,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      sources: d.sources ?? [],
    };
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">კონსულტაციების ისტორია</h1>
          <p className="text-sm text-muted-foreground">{items.length} კონსულტაცია</p>
        </div>
      </div>

      <ConsultationsGrid items={items} />
    </div>
  );
}
