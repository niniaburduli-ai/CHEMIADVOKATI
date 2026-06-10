import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOC_TYPES } from "@/lib/validators";
import { DocumentDownloadButton } from "@/components/site/document-download-button";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/documents");

  await dbConnect();
  const docs = await GeneratedDocument.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">გენერირებული დოკუმენტები</h1>
          <p className="text-sm text-muted-foreground">{docs.length} დოკუმენტი</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">ჯერ დოკუმენტი არ გენერირებულა.</p>
            <Link href="/generate" className={buttonVariants()}>
              შექმენი დოკუმენტი
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => {
            const id = String((doc as { _id: unknown })._id);
            const created = (doc as { createdAt?: Date }).createdAt;
            const typeName =
              DOC_TYPES[doc.type as keyof typeof DOC_TYPES] ?? doc.type;
            return (
              <Card key={id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {typeName}
                        </Badge>
                        {created && (
                          <span className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {new Date(created).toLocaleDateString("ka-GE")}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <DocumentDownloadButton
                      content={doc.content}
                      filename={`${doc.title}.txt`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded p-3 max-h-40 overflow-y-auto leading-relaxed">
                    {doc.content.slice(0, 500)}
                    {doc.content.length > 500 ? "…" : ""}
                  </pre>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
