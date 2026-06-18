/**
 * Pure theme constants + CSS builder — NO database imports, so this is safe to
 * import from client components. DB access lives in lib/theme.ts.
 */

export type FontChoice = "sans" | "serif" | "system"

/** Editable design tokens, in form order. Keys map to CSS vars consumed by Tailwind. */
export const THEME_TOKENS: { key: string; label: string }[] = [
  { key: "background", label: "ფონი (Background)" },
  { key: "foreground", label: "ტექსტი (Foreground)" },
  { key: "primary", label: "მთავარი (Primary)" },
  { key: "primary-foreground", label: "მთავარის ტექსტი" },
  { key: "secondary", label: "მეორადი (Secondary)" },
  { key: "secondary-foreground", label: "მეორადის ტექსტი" },
  { key: "accent", label: "აქცენტი (Accent)" },
  { key: "accent-foreground", label: "აქცენტის ტექსტი" },
  { key: "muted", label: "მქრქალი (Muted)" },
  { key: "muted-foreground", label: "მქრქალი ტექსტი" },
  { key: "card", label: "ბარათი (Card)" },
  { key: "card-foreground", label: "ბარათის ტექსტი" },
  { key: "border", label: "ჩარჩო (Border)" },
  { key: "input", label: "ინფუთი (Input)" },
  { key: "ring", label: "ფოკუსი (Ring)" },
  { key: "destructive", label: "საფრთხე (Destructive)" },
]

export const FONT_CHOICES: { value: FontChoice; label: string }[] = [
  { value: "sans", label: "Noto Sans Georgian (sans-serif)" },
  { value: "serif", label: "Noto Serif Georgian (serif)" },
  { value: "system", label: "სისტემური (System UI)" },
]

export const DEFAULT_LIGHT: Record<string, string> = {
  background: "#ffffff", foreground: "#0a0a14",
  primary: "#1a1a2e", "primary-foreground": "#ffffff",
  secondary: "#f4f4f5", "secondary-foreground": "#1a1a2e",
  accent: "#eef2ff", "accent-foreground": "#1a1a2e",
  muted: "#f4f4f5", "muted-foreground": "#6b7280",
  card: "#ffffff", "card-foreground": "#0a0a14",
  border: "#e5e7eb", input: "#e5e7eb", ring: "#1a1a2e",
  destructive: "#dc2626",
}

export const DEFAULT_DARK: Record<string, string> = {
  background: "#0a0a14", foreground: "#fafafa",
  primary: "#e5e7ff", "primary-foreground": "#1a1a2e",
  secondary: "#1f2937", "secondary-foreground": "#fafafa",
  accent: "#1f2937", "accent-foreground": "#fafafa",
  muted: "#1f2937", "muted-foreground": "#9ca3af",
  card: "#11111c", "card-foreground": "#fafafa",
  border: "#26262e", input: "#2a2a33", ring: "#6b7280",
  destructive: "#ef4444",
}

export type ThemeConfigData = {
  light: Record<string, string>
  dark: Record<string, string>
  radius: string
  baseFontSize: number
  fontFamily: FontChoice
}

export const DEFAULT_THEME: ThemeConfigData = {
  light: DEFAULT_LIGHT,
  dark: DEFAULT_DARK,
  radius: "0.625rem",
  baseFontSize: 16,
  fontFamily: "sans",
}

function fontStack(choice: FontChoice): string {
  if (choice === "serif") return "var(--font-noto-serif), Georgia, serif"
  if (choice === "system") return "system-ui, -apple-system, 'Segoe UI', sans-serif"
  return "var(--font-noto-sans), system-ui, sans-serif"
}

function tokenVars(tokens: Record<string, string>): string {
  return THEME_TOKENS.map((t) => {
    const v = tokens[t.key]
    return v ? `  --${t.key}: ${v};` : null
  })
    .filter(Boolean)
    .join("\n")
}

/**
 * Build the CSS injected in the root layout. Targets :root / .dark with the same
 * specificity as globals.css; because it renders after the stylesheet in source
 * order it wins, overriding the default oklch palette with the admin's hex tokens.
 */
export function buildThemeCss(cfg: ThemeConfigData): string {
  const font = fontStack(cfg.fontFamily)
  return [
    ":root{",
    tokenVars(cfg.light),
    `  --radius: ${cfg.radius};`,
    `  --font-georgian: ${font};`,
    "}",
    ".dark{",
    tokenVars(cfg.dark),
    "}",
    `html{ font-size: ${cfg.baseFontSize}px; }`,
  ].join("\n")
}
