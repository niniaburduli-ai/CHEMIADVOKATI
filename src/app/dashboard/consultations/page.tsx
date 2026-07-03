import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { Consultation } from "@/lib/models/consultation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { groupItemsByArticle, type LegalBasisItem } from "@/lib/legal/citations";
import { renderMarkdownBold } from "@/lib/markdown-bold";

type RawSource = {
  title?: string;
  url?: string;
  article?: string;
  paragraph?: string;
  subparagraph?: string;
  /** Legacy: consultations saved before article/paragraph/subparagraph existed. */
  articleNumber?: string;
};

type SourceGroup = {
  lawName: string;
  url?: string;
  articleGroups: Array<{ article: string; points: string[] }>;
};

/**
 * Same grouping the live chat view uses (groupItemsByArticle), so the history
 * view renders identical "Legal Basis" text for the same underlying data
 * instead of its own re-derivation.
 */
function groupSources(sources: RawSource[]): SourceGroup[] {
  const groups = new Map<string, { lawName: string; url?: string; items: LegalBasisItem[] }>();
  for (const s of sources) {
    const key = `${s.title ?? ""}|${s.url ?? ""}`;
    let g = groups.get(key);
    if (!g) {
      g = { lawName: s.title ?? "", url: s.url, items: [] };
      groups.set(key, g);
    }
    // Legacy rows only have the pre-flattened articleNumber string — show it as
    // its own line rather than trying to reparse it back into paragraph/subparagraph.
    if (s.article) {
      g.items.push({
        article: s.article,
        paragraph: s.paragraph ?? null,
        subparagraph: s.subparagraph ?? null,
      });
    } else {
      g.items.push({ article: s.articleNumber ?? s.title ?? "", paragraph: null, subparagraph: null });
    }
  }
  return [...groups.values()].map((g) => ({
    lawName: g.lawName,
    url: g.url,
    articleGroups: groupItemsByArticle(g.items),
  }));
}

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/consultations");

  await dbConnect();
  const items = await Consultation.find({ userId: session.user.id })
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
          <h1 className="text-2xl font-bold">კონსულტაციების ისტორია</h1>
          <p className="text-sm text-muted-foreground">{items.length} კონსულტაცია</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">ჯერ კონსულტაცია არ გაქვს.</p>
            <Link href="/chat" className={buttonVariants()}>
              დაიწყე კონსულტაცია
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const id = String((item as { _id: unknown })._id);
            const created = (item as { createdAt?: Date }).createdAt;
            const sources = item.sources ?? [];
            return (
              <Card key={id} id={id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-semibold leading-snug">
                      {item.question}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 pt-0.5">
                      <Clock className="h-3 w-3" />
                      {created ? new Date(created).toLocaleDateString("ka-GE") : ""}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {renderMarkdownBold(item.answer)}
                  </p>
                  {sources.length > 0 && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground">
                        იურიდიული საფუძველი:
                      </p>
                      {groupSources(sources as RawSource[]).map((g, i) => (
                        <div key={`${g.url ?? ""}|${i}`} className="space-y-1">
                          <p className="text-xs font-medium">{g.lawName}:</p>
                          <ul className="ml-1 space-y-0.5">
                            {g.articleGroups.map(({ article, points }) => (
                              <li key={article} className="text-xs text-muted-foreground">
                                {article}
                                {points.length > 1 && <>, პუნქტები: {points.join("; ")}</>}
                                {points.length === 1 && <>, პუნქტი: {points[0]}</>}
                              </li>
                            ))}
                          </ul>
                          {g.url && (
                            <a
                              href={g.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="flex items-start gap-1.5 text-xs text-primary hover:underline"
                            >
                              <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>წყარო</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
