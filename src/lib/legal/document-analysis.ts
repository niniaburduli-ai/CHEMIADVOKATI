import "pdf-parse/worker";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

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

export const MAX_ANALYSIS_TEXT = 10_000;
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

export async function extractDocumentText(fileName: string, buffer: Buffer): Promise<string> {
  const ext = extensionOf(fileName);
  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString("utf-8").replace(/\0/g, " ");
}

export const ANALYSIS_SYSTEM_PROMPT = `შენ ხარ ქართული იურიდიული დოკუმენტების რისკ-ანალიტიკოსი.
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
