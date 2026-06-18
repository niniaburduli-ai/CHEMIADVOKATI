import { dbConnect } from "@/lib/db"
import { ThemeConfig, type ThemeConfigDoc } from "@/lib/models/ThemeConfig"
import {
  DEFAULT_THEME,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  type FontChoice,
  type ThemeConfigData,
} from "@/lib/theme-tokens"

// Re-export the client-safe constants/builder so existing imports of "@/lib/theme" keep working.
export {
  THEME_TOKENS,
  FONT_CHOICES,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  DEFAULT_THEME,
  buildThemeCss,
  type FontChoice,
  type ThemeConfigData,
} from "@/lib/theme-tokens"

/** Read the singleton theme, merged over defaults. Safe on DB failure. */
export async function getThemeConfig(): Promise<ThemeConfigData> {
  try {
    await dbConnect()
    const doc = await ThemeConfig.findOne().lean<ThemeConfigDoc>()
    if (!doc) return { ...DEFAULT_THEME, light: { ...DEFAULT_LIGHT }, dark: { ...DEFAULT_DARK } }
    return {
      light: { ...DEFAULT_LIGHT, ...(doc.light || {}) },
      dark: { ...DEFAULT_DARK, ...(doc.dark || {}) },
      radius: doc.radius || DEFAULT_THEME.radius,
      baseFontSize: Number(doc.baseFontSize) || 16,
      fontFamily: (["sans", "serif", "system"].includes(doc.fontFamily) ? doc.fontFamily : "sans") as FontChoice,
    }
  } catch {
    return { ...DEFAULT_THEME, light: { ...DEFAULT_LIGHT }, dark: { ...DEFAULT_DARK } }
  }
}
