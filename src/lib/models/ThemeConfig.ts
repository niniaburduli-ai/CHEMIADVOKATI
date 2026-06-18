import { Schema, model, models, type Model } from "mongoose"

/**
 * Site theme — a singleton. Colors are stored as hex strings (one set per mode)
 * so the admin can edit them with native color pickers. Applied site-wide by
 * injecting CSS custom-property overrides in the root layout (see lib/theme.ts).
 */
const ThemeConfigSchema = new Schema(
  {
    light: { type: Schema.Types.Mixed, default: {} }, // token -> hex
    dark: { type: Schema.Types.Mixed, default: {} },
    radius: { type: String, default: "0.625rem" },
    baseFontSize: { type: Number, default: 16 }, // px on <html>
    fontFamily: { type: String, default: "sans" }, // sans | serif | system
  },
  { timestamps: true, minimize: false }
)

export type ThemeConfigDoc = {
  _id: unknown
  light: Record<string, string>
  dark: Record<string, string>
  radius: string
  baseFontSize: number
  fontFamily: string
  createdAt: Date
  updatedAt: Date
}

export const ThemeConfig: Model<ThemeConfigDoc> =
  (models.ThemeConfig as Model<ThemeConfigDoc>) ||
  model<ThemeConfigDoc>("ThemeConfig", ThemeConfigSchema)
