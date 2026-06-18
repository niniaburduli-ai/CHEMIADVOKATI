import { dbConnect } from "@/lib/db"
import { FeatureFlags, type FeatureFlagsDoc } from "@/lib/models/FeatureFlags"
import { DEFAULT_FLAGS, type FeatureFlagsData } from "@/lib/features-config"

// Re-export client-safe constants/helpers so existing "@/lib/features" imports keep working.
export {
  DEFAULT_FLAGS,
  FEATURE_DEFS,
  featureForPath,
  isPathEnabled,
  type FeatureKey,
  type FeatureFlagsData,
} from "@/lib/features-config"

/** Read the singleton flags, merged over defaults. Safe on DB failure. */
export async function getFeatureFlags(): Promise<FeatureFlagsData> {
  try {
    await dbConnect()
    const doc = await FeatureFlags.findOne().lean<FeatureFlagsDoc>()
    if (!doc) return { ...DEFAULT_FLAGS }
    return {
      chat: doc.chat !== false,
      generate: doc.generate !== false,
      review: doc.review !== false,
      legislation: doc.legislation !== false,
      blog: doc.blog !== false,
    }
  } catch {
    return { ...DEFAULT_FLAGS }
  }
}
