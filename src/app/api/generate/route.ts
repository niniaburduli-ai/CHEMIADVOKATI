import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { GenerateDocSchema } from "@/lib/validators";
import { docTypeLabel } from "@/lib/legal/doc-type-labels";
import { streamOpenRouterChat } from "@/lib/ai-call";
import { verifyLegalCitations, STRICT_BREVITY_RULE } from "@/lib/legal/openrouter";
import { getCachedCitations, setCachedCitations } from "@/lib/legal/doc-citation-cache";
import { applyPlanExpiryIfDue, applyCustomPlanExpiryIfDue } from "@/lib/plan-expiry";
import { splitQuota, applyQuotaSplit } from "@/lib/quota";
import { DelimiterSplitter } from "@/lib/streaming/delimiter-splitter";
import { encodeMeta } from "@/lib/streaming/chat-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Separates the document body from the trailing legal-basis block (stripped
 * server-side; never shown inside the document text — see the dedicated
 * sources panel on /generate). */
const CITATIONS_DELIM = "###წყაროები###";

const SYSTEM_KA = `შენ ხარ ქართული იურიდიული დოკუმენტების გენერატორი.
შექმენი სრული, პროფესიონალური ქართული იურიდიული დოკუმენტი მომხმარებლის მიერ მოწოდებული დეტალების საფუძველზე.
გამოიყენე ოფიციალური ქართული სამართლებრივი ენა.
${STRICT_BREVITY_RULE}

ფორმატირება (მკაცრად დაიცავი):
- დოკუმენტი არის ჩვეულებრივი ტექსტი, არა markdown ფაილი — არასოდეს გამოიყენო სათაურის სიმბოლოები # ## ### ან სხვა markdown სინტაქსი.
- დოკუმენტის სათაური დაწერე ჩვეულებრივ ტექსტად პირველ სტრიქონზე (მაგ. „ქირავნობის ხელშეკრულება"), # სიმბოლოს გარეშე.
- სექციები დანომრე ჩვეულებრივი ციფრებით (1., 2., 1.1. და ა.შ.), # ან ## სიმბოლოების გარეშე.
- სექციის ნომერი და სრული სათაური ერთად, მთლიანად, დაწერე **მუქი შრიფტით** (მაგ. **4. ქირა და გადახდის წესი**).
- მონაცემების გამოსაკვეთად (სახელი, თარიღი, თანხა, პირადი ნომერი, მისამართი) გამოიყენე მხოლოდ **მუქი შრიფტი** (markdown-ის ** სინტაქსით) — სხვა markdown სინტაქსი დაუშვებელია.
- დოკუმენტი უნდა იყოს კომპაქტური: სექციებს შორის მაქსიმუმ ერთი ცარიელი ხაზი, ზედმეტი დაშორებების გარეშე.

მონაცემები (კრიტიკულია):
- გამოიყენე ზუსტად ის მონაცემები, რომლებიც მომხმარებელმა დეტალებში მოგაწოდა.
- არასოდეს დატოვო ცარიელი ველი, ფრჩხილები [ ] ან სხვა placeholder ტექსტში. თუ რომელიმე დამატებითი დეტალი (მაგ. ტელეფონი, ელფოსტა) დეტალებში საერთოდ არ არის მოწოდებული — უბრალოდ არ ჩართო ეს დეტალი დოკუმენტში, ნაცვლად ცარიელი placeholder-ის დაწერისა.
- გამონაკლისი ზემოთ მოცემულ წესთან: დეტალებში შეიძლება გხვდეს ნიშნები ზუსტად ამ ფორმატით — [ID_1], [PHONE_1], [EMAIL_1], [BANK_1]. ეს არ არის ცარიელი placeholder; ეს რეალური პირადი მონაცემია დაცული სახით. გამოიყენე ეს ნიშნები ზუსტად ისე, როგორც წერია, სწორ ადგილას დოკუმენტში — არასოდეს შეცვალო, თარგმნო ან წაშალო.
- დოკუმენტი უნდა იყოს სრულად შევსებული, დასრულებული და პირდაპირ გამოსაყენებელი, ყოველგვარი ხელით შესავსები ველის გარეშე.

დოკუმენტის ტექსტის დასრულების შემდეგ, ცალკე სტრიქონზე დაწერე ზუსტად: ${CITATIONS_DELIM}
შემდეგ, იმ ტექსტის შემდეგ, ჩამოთვალე საქართველოს კანონმდებლობის ის მუხლები, რომლებსაც დოკუმენტი ეფუძნება, შემდეგი ფორმატით:
<კანონის/კოდექსის სრული დასახელება>:
- მუხლი <N>, პუნქტი <M> (საჭიროებისას)
- მუხლი <N2>
თითოეული კანონი დაწერე ცალკე ბლოკად, ერთი ცარიელი ხაზით გამოყოფილი. არ გამოიგონო მუხლის ნომერი — მიუთითე მხოლოდ ის ნორმები, რომლებიც რეალურად შეესაბამება დოკუმენტის შინაარსს შენი ცოდნით. ეს სექცია არასოდეს უნდა გამოჩნდეს ${CITATIONS_DELIM}-მდე, მხოლოდ მის შემდეგ.`;

const SYSTEM_EN = `You are a Georgian legal document generator.
Draft a complete, professional legal document in English, based on the details provided by the user, applying the current legislation of Georgia.
Use formal English legal drafting language.
${STRICT_BREVITY_RULE}

Formatting (follow strictly):
- The document is plain text, not a markdown file — never use heading symbols # ## ### or any other markdown syntax.
- Write the document's title as plain text on the first line (e.g. "Rental Agreement"), without a # symbol.
- Number sections with plain numerals (1., 2., 1.1., etc.), without # or ## symbols.
- Write each section's number and full heading together, entirely in **bold** (e.g. **4. Rent and Payment Terms**).
- To highlight data (names, dates, amounts, ID numbers, addresses), use only **bold** (markdown ** syntax) — no other markdown syntax is allowed.
- The document must be compact: at most one blank line between sections, no excessive spacing.

Data (critical):
- Use exactly the data the user provided in the details.
- Never leave a blank field, square brackets [ ], or other placeholder text in the output. If some additional detail (e.g. phone, email) was not provided in the details at all — simply omit that detail from the document instead of writing an empty placeholder.
- Exception to the rule above: the details may contain tokens in exactly this format — [ID_1], [PHONE_1], [EMAIL_1], [BANK_1]. These are not the empty placeholders the rule above tells you to avoid; they are real personal data in protected form. Use these tokens exactly as written, in the correct place in the document — never alter, translate, or remove them.
- The document must be fully filled in, complete, and ready to use as-is, with no fields left for manual completion.

After finishing the document text, on its own line write exactly: ${CITATIONS_DELIM}
Then, after that line, list the articles of Georgian legislation the document is based on, in this format:
<Full name of the law/code>:
- Article <N>, paragraph <M> (if applicable)
- Article <N2>
Write each law as a separate block, separated by one blank line. Do not invent an article number — cite only the provisions that genuinely correspond to the document's content, to the best of your knowledge. This section must never appear before ${CITATIONS_DELIM}, only after it.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GenerateDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  let user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  user = await applyPlanExpiryIfDue(user);
  user = await applyCustomPlanExpiryIfDue(user);
  const isAdmin = user.role === "admin";
  const quotaSplit = isAdmin ? null : splitQuota(user, "docGeneration", 1);
  if (!isAdmin && !quotaSplit) {
    return NextResponse.json(
      { error: "Document generation quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const locale = parsed.data.locale;
  const typeName = docTypeLabel(parsed.data.type, locale);
  const userMsg =
    locale === "en"
      ? `Document type: ${typeName}\n\nDetails:\n${parsed.data.details}`
      : `დოკუმენტის ტიპი: ${typeName}\n\nდეტალები:\n${parsed.data.details}`;

  let deltas: AsyncGenerator<string, number, unknown>;
  try {
    deltas = await streamOpenRouterChat(
      [
        { role: "system", content: locale === "en" ? SYSTEM_EN : SYSTEM_KA },
        { role: "user", content: userMsg },
      ],
      undefined,
      // Only 2 doc types (complaint, demand-letter) from a 2000-char detail
      // input — realistic output is a few hundred to ~1500 words. 6000 tokens
      // leaves ample headroom over that without paying for a 16k ceiling that
      // was never actually reachable in practice.
      6000
    );
  } catch (err) {
    // Connection never opened — nothing streamed yet, safe to return a
    // plain error response exactly like the non-streaming version did.
    return NextResponse.json(
      {
        error: "AI service unavailable",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const bodyStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // The model is instructed to print CITATIONS_DELIM on its own line
      // right after the document body — everything after it is the
      // legal-basis block, kept out of the streamed/rendered document text.
      // Only the prefix (document body) is forwarded live; the citation
      // block is buffered silently and processed after the stream ends.
      const splitter = new DelimiterSplitter(CITATIONS_DELIM);
      let full = "";
      let midStreamError = false;
      let generationCostUsd = 0;
      try {
        let r = await deltas.next();
        while (!r.done) {
          full += r.value;
          const safe = splitter.push(r.value);
          if (safe) controller.enqueue(encoder.encode(safe));
          r = await deltas.next();
        }
        generationCostUsd = r.value ?? 0;
        const { prose } = splitter.finish();
        if (prose) controller.enqueue(encoder.encode(prose));
      } catch {
        midStreamError = true;
      }

      if (midStreamError || !full.trim()) {
        // Failed after some text may already have streamed to the browser —
        // no clean status code possible at this point, so signal failure
        // in-band. Crucially: no document saved, no quota charged.
        controller.enqueue(
          encoder.encode(encodeMeta({ error: "AI service unavailable" }))
        );
        controller.close();
        return;
      }

      const delimIndex = full.indexOf(CITATIONS_DELIM);
      const body_ = (delimIndex === -1 ? full : full.slice(0, delimIndex)).trim();
      // Defense in depth: strip stray leading "#"/"##" heading markers in
      // case the model doesn't fully comply with the no-markdown-headers
      // instruction. Applied here (once, on the full text) rather than
      // per-chunk during streaming, since a heading marker split across a
      // chunk boundary can't be reliably detected mid-stream — the version
      // sent to the browser live may occasionally show a stray "#" in that
      // rare case, but the authoritative `content` below (what's actually
      // saved, and what the client swaps to once the stream ends) is always
      // fully stripped either way.
      const content = body_.replace(/^#{1,6}\s*/gm, "");
      const citationsSection =
        delimIndex === -1 ? "" : full.slice(delimIndex + CITATIONS_DELIM.length).trim();

      // Only two doc types exist and their typically-applicable articles
      // barely change over time — verify live once per type, then reuse
      // that result instead of paying a live web-search fee on every
      // generation.
      let legalBasis = citationsSection;
      let citationsCostUsd = 0;
      const cachedCitations = await getCachedCitations(parsed.data.type, locale);
      if (cachedCitations) {
        legalBasis = cachedCitations;
      } else if (citationsSection) {
        const verified = await verifyLegalCitations(typeName, citationsSection);
        if (verified) {
          legalBasis = verified.text;
          citationsCostUsd = verified.costUsd;
          await setCachedCitations(parsed.data.type, verified.text, locale);
        }
      }

      const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;

      const docCreate = GeneratedDocument.create({
        userId: session.user.id,
        title,
        type: parsed.data.type,
        content,
        legalBasis,
        costUsd: generationCostUsd + citationsCostUsd,
      });
      const saveOps: Promise<unknown>[] = [docCreate];
      if (!isAdmin && quotaSplit) {
        saveOps.push(applyQuotaSplit(session.user.id, "docGeneration", quotaSplit));
      }
      const [doc] = await Promise.all(saveOps);

      controller.enqueue(
        encoder.encode(
          encodeMeta({
            id: String((doc as { _id: unknown })._id),
            title,
            content,
            legalBasis,
          })
        )
      );
      controller.close();
    },
  });

  return new Response(bodyStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
