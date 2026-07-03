import {
  ShieldCheck, Clock, ArrowRight,
  MessageSquare, FileText, FolderOpen,
  MousePointerClick, Zap, Layers, Users, Circle,
  type LucideIcon,
} from "lucide-react"

export const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare, FileText, FolderOpen, ArrowRight,
  Layers, Users, MousePointerClick, Zap, ShieldCheck, Clock, Circle,
}

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle
}
