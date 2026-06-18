/** Client-safe feature-flag constants + helpers (no DB import). */

export type FeatureKey = "chat" | "generate" | "review" | "legislation" | "blog"

export type FeatureFlagsData = Record<FeatureKey, boolean>

export const DEFAULT_FLAGS: FeatureFlagsData = {
  chat: true,
  generate: true,
  review: true,
  legislation: true,
  blog: true,
}

/** Feature metadata for the admin panel + route/nav mapping. */
export const FEATURE_DEFS: {
  key: FeatureKey
  label: string
  description: string
  paths: string[]
}[] = [
  { key: "chat", label: "AI იურისტი (ჩატი)", description: "AI კონსულტაციის ჩატი", paths: ["/chat"] },
  { key: "generate", label: "დოკუმენტის გენერაცია", description: "შაბლონები და დოკუმენტის შექმნა", paths: ["/generate"] },
  { key: "review", label: "დოკუმენტის მიმოხილვა", description: "ატვირთული დოკუმენტის ანალიზი", paths: ["/review"] },
  { key: "legislation", label: "კანონმდებლობა", description: "კანონმდებლობის ბაზა", paths: ["/legislation"] },
  { key: "blog", label: "ბლოგი", description: "ბლოგის გვერდი", paths: ["/blog"] },
]

/** Which feature (if any) owns a path/href. */
export function featureForPath(href: string): FeatureKey | null {
  const path = href.split(/[?#]/)[0]
  for (const def of FEATURE_DEFS) {
    if (def.paths.some((p) => path === p || path.startsWith(p + "/"))) return def.key
  }
  return null
}

/** True when an href is reachable under the current flags (non-feature hrefs always pass). */
export function isPathEnabled(href: string, flags: FeatureFlagsData): boolean {
  const key = featureForPath(href)
  return key ? flags[key] : true
}
