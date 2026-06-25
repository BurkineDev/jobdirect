/** Formatage localisé (fr-CA) pour l'affichage. */

export function formatDate(value: string | null): string {
  if (!value) return "Flexible";
  // Les dates « YYYY-MM-DD » sont interprétées en UTC pour éviter les décalages.
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "Flexible";
  return date.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBudget(value: number | null): string {
  if (value == null) return "À discuter";
  return `${value.toLocaleString("fr-CA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} $`;
}
