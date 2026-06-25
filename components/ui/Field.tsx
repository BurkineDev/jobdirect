import type { ComponentProps, ReactNode } from "react";

const controlBase =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-ink shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-gray-50";

/** Conteneur d'un champ : libellé + indice + message d'erreur. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-800"
      >
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={[controlBase, className].filter(Boolean).join(" ")} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={[controlBase, "min-h-28 resize-y", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={[controlBase, "appearance-none pr-9", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </select>
  );
}
