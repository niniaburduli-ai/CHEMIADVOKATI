import "pdf-parse/worker";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { createScheduler, createWorker } from "tesseract.js";
import { STRICT_BREVITY_RULE } from "./openrouter";
import { estimatePages } from "./review-limits";

export {
  MAX_ANALYSIS_TEXT,
  BASE_REVIEW_PAGES,
  PAGES_PER_EXTRA_CREDIT,
  MAX_REVIEW_PAGES,
  PAGE_CHAR_ESTIMATE,
  reviewCreditCost,
  estimatePages,
} from "./review-limits";

export const RISK_CATEGORIES = [
  "liability",
  "financial",
  "termination",
  "compliance",
  "confidentiality",
  "obligations",
] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const RISK_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export interface RiskFinding {
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  recommendation: string;
}

export interface DocumentAnalysisResult {
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx + 1).toLowerCase();
}

export function isSupportedExtension(ext: string): ext is SupportedExtension {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_EXTENSIONS = ["jpg", "jpeg"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

export function isImageExtension(ext: string): ext is ImageExtension {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export const OCR_CONCURRENCY = 3;

export async function extractTextFromImages(
  images: { name: string; buffer: Buffer }[]
): Promise<{ combinedText: string; succeededCount: number; failedCount: number }> {
  const poolSize = Math.min(OCR_CONCURRENCY, images.length);
  const scheduler = createScheduler();
  const workerResults = await Promise.allSettled(
    Array.from({ length: poolSize }, () => createWorker("kat"))
  );

  // Separate successful workers from failures to avoid leaking on partial failure
  const workers: Awaited<ReturnType<typeof createWorker>>[] = [];
  let creationError: Error | null = null;
  for (const result of workerResults) {
    if (result.status === "fulfilled") {
      workers.push(result.value);
    } else if (!creationError) {
      creationError = result.reason as Error;
    }
  }

  // If any worker creation failed, terminate successful ones and throw
  if (creationError) {
    await Promise.all(workers.map((w) => w.terminate()));
    throw creationError;
  }

  workers.forEach((worker) => scheduler.addWorker(worker));

  const results: (string | null)[] = new Array(images.length).fill(null);
  try {
    await Promise.all(
      images.map(async (image, i) => {
        try {
          const { data } = await scheduler.addJob("recognize", image.buffer);
          results[i] = data.text;
        } catch (err) {
          console.warn(`OCR failed for image ${i} (${images[i].name}):`, err);
          results[i] = null;
        }
      })
    );
  } finally {
    await scheduler.terminate();
  }

  const succeededCount = results.filter((text) => text !== null).length;
  const failedCount = images.length - succeededCount;

  if (succeededCount === 0) {
    throw new Error("All images failed OCR");
  }

  const combinedText = results
    .map((text, i) => (text === null ? null : `--- გვერდი ${i + 1} ---\n\n${text}`))
    .filter((chunk): chunk is string => chunk !== null)
    .join("\n\n");

  return { combinedText, succeededCount, failedCount };
}

export type ExtractedDocument = { text: string; pages: number };

export async function extractDocumentText(
  fileName: string,
  buffer: Buffer
): Promise<ExtractedDocument> {
  const ext = extensionOf(fileName);
  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result.text, pages: result.total || 1 };
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value, pages: estimatePages(value) };
  }
  const text = buffer.toString("utf-8").replace(/\0/g, " ");
  return { text, pages: estimatePages(text) };
}

export const ANALYSIS_SYSTEM_PROMPT = `შენ ხარ ქართული იურიდიული დოკუმენტების რისკ-ანალიტიკოსი.
${STRICT_BREVITY_RULE}
"summary", "explanation" და "recommendation" ველები დაწერე მარტივი, ყოველდღიური ენით — თითქოს არაიურისტ ადამიანს ხსნი, არა კოლეგა იურისტს. აარიდე იურიდიულ ჟარგონს; თუ ტერმინი აუცილებელია, ერთი მარტივი სიტყვით ახსენი ფრჩხილებში.
გაანალიზე მოწოდებული დოკუმენტი და დააბრუნე მხოლოდ JSON, ზუსტად ამ ფორმატით, დამატებითი ტექსტის ან ახსნის გარეშე:

{
  "summary": "მოკლე შეჯამება 2-3 წინადადებით",
  "findings": [
    {
      "category": "liability | financial | termination | compliance | confidentiality | obligations",
      "severity": "low | medium | high | critical",
      "title": "მოკლე სათაური",
      "explanation": "რატომ არის ეს რისკი",
      "recommendation": "კონკრეტული რჩევა ამ რისკთან დაკავშირებით"
    }
  ],
  "recommendations": ["ზოგადი რეკომენდაცია 1", "ზოგადი რეკომენდაცია 2"]
}

წესები:
- გამოავლინე 2-დან 8-მდე კონკრეტული რისკი, დოკუმენტის რეალურ შინაარსზე დაყრდნობით.
- category და severity მნიშვნელობები ზუსტად ზემოთ ჩამოთვლილთაგან უნდა იყოს, სხვა მნიშვნელობა დაუშვებელია.
- "explanation" ველი დაწერე მაქსიმუმ 1-2 მოკლე წინადადებით (დაახლოებით 25 სიტყვამდე) — მხოლოდ მთავარი პრობლემა და მისი შედეგი, ზედმეტი კონტექსტის გარეშე.
- დოკუმენტის ტექსტში შეიძლება გხვდეს ნიშნები ზუსტად ამ ფორმატით: [ID_1], [PHONE_1], [EMAIL_1], [BANK_1] — ეს პირადი მონაცემების დაცული ჩანაცვლებებია. თუ მათ "summary", "explanation" ან "recommendation" ველებში ახსენებ, გადაიტანე ისინი ზუსტად, უცვლელად.
- უპასუხე ქართულ ენაზე, მხოლოდ JSON ობიექტით — არც ერთი დამატებითი სიტყვა ჯსონის გარეთ.`;

function coerceCategory(value: unknown): RiskCategory {
  return (RISK_CATEGORIES as readonly string[]).includes(String(value))
    ? (value as RiskCategory)
    : "compliance";
}

function coerceSeverity(value: unknown): RiskSeverity {
  return (RISK_SEVERITIES as readonly string[]).includes(String(value))
    ? (value as RiskSeverity)
    : "medium";
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export function parseAnalysisResponse(raw: string): DocumentAnalysisResult {
  const jsonText = extractJsonBlock(raw);
  let parsed: { summary?: unknown; findings?: unknown; recommendations?: unknown };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) throw new Error("AI response missing summary");

  const findingsRaw = Array.isArray(parsed.findings) ? parsed.findings : [];
  const findings: RiskFinding[] = findingsRaw
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      category: coerceCategory(f.category),
      severity: coerceSeverity(f.severity),
      title: typeof f.title === "string" ? f.title : "",
      explanation: typeof f.explanation === "string" ? f.explanation : "",
      recommendation: typeof f.recommendation === "string" ? f.recommendation : "",
    }))
    .filter((f) => f.title || f.explanation);

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter((r): r is string => typeof r === "string")
    : [];

  return { summary, findings, recommendations };
}

export interface DocumentImprovementResult {
  text: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
}

export interface DocumentRevision extends DocumentImprovementResult {
  instruction: string;
  createdAt: Date;
}

export const IMPROVEMENT_SYSTEM_PROMPT = `შენ ხარ ქართული იურიდიული დოკუმენტების რედაქტორი.
${STRICT_BREVITY_RULE}
"summary", "explanation" და "recommendation" ველები დაწერე მარტივი, ყოველდღიური ენით — თითქოს არაიურისტ ადამიანს ხსნი, არა კოლეგა იურისტს. აარიდე იურიდიულ ჟარგონს; თუ ტერმინი აუცილებელია, ერთი მარტივი სიტყვით ახსენი ფრჩხილებში. (revisedText თავად ოფიციალურ სამართლებრივ ენაზე რჩება — ეს წესი მხოლოდ ახსნა-განმარტების ველებზეა.)
მოგეწოდება ხელშეკრულების ტექსტი და მასში გამოვლენილი რისკები. შენი ამოცანაა შეასწორო დოკუმენტი ამ რისკების გათვალისწინებით — ეს ერთჯერადი, საბოლოო გასწორებაა, დამატებითი შეკითხვების საშუალება არ არსებობს. დააბრუნე მხოლოდ JSON, ზუსტად ამ ფორმატით, დამატებითი ტექსტის ან ახსნის გარეშე:

{
  "revisedText": "შესწორებული დოკუმენტის სრული ტექსტი",
  "summary": "მოკლე შეჯამება 2-3 წინადადებით შესწორებული ვერსიის შესახებ",
  "findings": [
    {
      "category": "liability | financial | termination | compliance | confidentiality | obligations",
      "severity": "low | medium | high | critical",
      "title": "მოკლე სათაური",
      "explanation": "რატომ არის ეს რისკი",
      "recommendation": "კონკრეტული რჩევა ამ რისკთან დაკავშირებით"
    }
  ],
  "recommendations": ["ზოგადი რეკომენდაცია 1", "ზოგადი რეკომენდაცია 2"]
}

წესები:
- თუ დოკუმენტში აკლია ან ბუნდოვანია კონკრეტული მონაცემი (მაგ. სახელი, თარიღი, მისამართი), ნუ გამოიგონებ მას და ნურც შეკითხვას დასვამ — ჩასვი placeholder კვადრატულ ფრჩხილებში, ინგლისურად, UPPER_SNAKE_CASE ფორმატით, მაგალითად [LESSOR_NAME], [DATE], [ADDRESS].
- ეს ცალკეა ზემოთაღწერილი ახალი placeholder-ის შექმნისგან: ტექსტში შეიძლება უკვე გხვდეს ნიშნები ზუსტად ამ ფორმატით — [ID_1], [PHONE_1], [EMAIL_1], [BANK_1]. ეს რეალური პირადი მონაცემია დაცული სახით, რომელიც უკვე დოკუმენტში იყო. გადაიტანე ეს ნიშნები ზუსტად, უცვლელად, სადაც არ უნდა გამოჩნდეს "revisedText"-სა თუ findings-ის ველებში.
- findings ასახავდეს შესწორებული ტექსტის დარჩენილ რისკებს, არა თავდაპირველისას — თუ ყველა რისკი გამოსწორდა, დააბრუნე ცარიელი მასივი.
- "explanation" ველი დაწერე მაქსიმუმ 1-2 მოკლე წინადადებით (დაახლოებით 25 სიტყვამდე) — მხოლოდ მთავარი პრობლემა და მისი შედეგი, ზედმეტი კონტექსტის გარეშე.
- category და severity მნიშვნელობები ზუსტად ზემოთ ჩამოთვლილთაგან უნდა იყოს, სხვა მნიშვნელობა დაუშვებელია.
- უპასუხე ქართულ ენაზე, მხოლოდ JSON ობიექტით — არც ერთი დამატებითი სიტყვა ჯსონის გარეთ.`;

export function buildImprovementUserMessage(input: {
  baseText: string;
  findings: RiskFinding[];
  instruction: string;
}): string {
  const parts: string[] = [`მიმდინარე დოკუმენტი:\n${input.baseText}`];

  if (input.findings.length > 0) {
    const findingsList = input.findings
      .map((f, i) => `${i + 1}. [${f.severity}/${f.category}] ${f.title} — ${f.explanation}`)
      .join("\n");
    parts.push(`გამოვლენილი რისკები:\n${findingsList}`);
  }

  parts.push(
    input.instruction.trim()
      ? `მომხმარებლის მოთხოვნა: ${input.instruction.trim()}`
      : "შეასწორე ყველა გამოვლენილი რისკი."
  );

  return parts.join("\n\n");
}

export function parseImprovementResponse(raw: string): DocumentImprovementResult {
  const jsonText = extractJsonBlock(raw);
  let parsed: {
    revisedText?: unknown;
    summary?: unknown;
    findings?: unknown;
    recommendations?: unknown;
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const text = typeof parsed.revisedText === "string" ? parsed.revisedText.trim() : "";
  if (!text) throw new Error("AI response missing revisedText");

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

  const findingsRaw = Array.isArray(parsed.findings) ? parsed.findings : [];
  const findings: RiskFinding[] = findingsRaw
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      category: coerceCategory(f.category),
      severity: coerceSeverity(f.severity),
      title: typeof f.title === "string" ? f.title : "",
      explanation: typeof f.explanation === "string" ? f.explanation : "",
      recommendation: typeof f.recommendation === "string" ? f.recommendation : "",
    }))
    .filter((f) => f.title || f.explanation);

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter((r): r is string => typeof r === "string")
    : [];

  return { text, summary, findings, recommendations };
}
