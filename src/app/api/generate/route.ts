import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { GenerateDocSchema, DOC_TYPES } from "@/lib/validators";
import { callOpenRouterChat } from "@/lib/ai-call";
import { verifyLegalCitations, STRICT_BREVITY_RULE } from "@/lib/legal/openrouter";
import { getCachedCitations, setCachedCitations } from "@/lib/legal/doc-citation-cache";
import { applyPlanExpiryIfDue, applyCustomPlanExpiryIfDue } from "@/lib/plan-expiry";
import { splitQuota, applyQuotaSplit } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Separates the document body from the trailing legal-basis block (stripped
 * server-side; never shown inside the document text — see the dedicated
 * sources panel on /generate). */
const CITATIONS_DELIM = "###წყაროები###";

const SYSTEM = `შენ ხარ ქართული იურიდიული დოკუმენტების გენერატორი.
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
- დოკუმენტი უნდა იყოს სრულად შევსებული, დასრულებული და პირდაპირ გამოსაყენებელი, ყოველგვარი ხელით შესავსები ველის გარეშე.

დოკუმენტის ტექსტის დასრულების შემდეგ, ცალკე სტრიქონზე დაწერე ზუსტად: ${CITATIONS_DELIM}
შემდეგ, იმ ტექსტის შემდეგ, ჩამოთვალე საქართველოს კანონმდებლობის ის მუხლები, რომლებსაც დოკუმენტი ეფუძნება, შემდეგი ფორმატით:
<კანონის/კოდექსის სრული დასახელება>:
- მუხლი <N>, პუნქტი <M> (საჭიროებისას)
- მუხლი <N2>
თითოეული კანონი დაწერე ცალკე ბლოკად, ერთი ცარიელი ხაზით გამოყოფილი. არ გამოიგონო მუხლის ნომერი — მიუთითე მხოლოდ ის ნორმები, რომლებიც რეალურად შეესაბამება დოკუმენტის შინაარსს შენი ცოდნით. ეს სექცია არასოდეს უნდა გამოჩნდეს ${CITATIONS_DELIM}-მდე, მხოლოდ მის შემდეგ.`;

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

  const typeName = DOC_TYPES[parsed.data.type];
  const userMsg = `დოკუმენტის ტიპი: ${typeName}\n\nდეტალები:\n${parsed.data.details}`;

  let raw: string;
  try {
    raw = await callOpenRouterChat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      undefined,
      16000
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI service unavailable",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  // The model is instructed to print the delimiter on its own line right
  // after the document body — everything after it is the legal-basis block,
  // kept out of the saved/rendered document content (see the dedicated
  // sources panel on /generate).
  const delimIndex = raw.indexOf(CITATIONS_DELIM);
  const body_ = (delimIndex === -1 ? raw : raw.slice(0, delimIndex)).trim();
  // Defense in depth: strip stray leading "#"/"##" heading markers in case the
  // model doesn't fully comply with the no-markdown-headers instruction.
  const content = body_.replace(/^#{1,6}\s*/gm, "");
  const citationsSection =
    delimIndex === -1 ? "" : raw.slice(delimIndex + CITATIONS_DELIM.length).trim();

  // Only two doc types exist and their typically-applicable articles barely
  // change over time — verify live once per type, then reuse that result
  // instead of paying a live web-search fee on every generation.
  let legalBasis = citationsSection;
  const cachedCitations = getCachedCitations(parsed.data.type);
  if (cachedCitations) {
    legalBasis = cachedCitations;
  } else if (citationsSection) {
    const verified = await verifyLegalCitations(typeName, citationsSection);
    if (verified) {
      legalBasis = verified;
      setCachedCitations(parsed.data.type, verified);
    }
  }

  const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;

  const docCreate = GeneratedDocument.create({
    userId: session.user.id,
    title,
    type: parsed.data.type,
    content,
    legalBasis,
  });
  const saveOps: Promise<unknown>[] = [docCreate];
  if (!isAdmin && quotaSplit) {
    saveOps.push(applyQuotaSplit(session.user.id, "docGeneration", quotaSplit));
  }
  const [doc] = await Promise.all(saveOps);

  return NextResponse.json(
    { id: String((doc as { _id: unknown })._id), title, content, legalBasis },
    { status: 201 }
  );
}
