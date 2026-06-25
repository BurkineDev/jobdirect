import type { FormState } from "@/lib/types";

export function FormAlert({ state }: { state: FormState }) {
  if (state.status === "success") {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        role="status"
      >
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p>{state.message}</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        role="alert"
      >
        <svg
          className="mt-0.5 h-5 w-5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{state.message}</p>
      </div>
    );
  }

  return null;
}
