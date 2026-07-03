import type { ReactNode } from "react";

/** Renders the model's `**bold**` markdown as <strong> instead of literal asterisks. */
export function renderMarkdownBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}
