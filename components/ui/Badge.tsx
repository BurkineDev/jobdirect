import type { ReactNode } from "react";

/** Petite étiquette colorée. `tone` accepte des classes Tailwind (bg/text/ring). */
export function Badge({
  children,
  tone = "bg-gray-100 text-gray-700 ring-gray-200",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      {children}
    </span>
  );
}
