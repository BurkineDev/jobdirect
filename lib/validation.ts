/** Petits utilitaires de validation partagés par les Server Actions. */

export function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Considère un numéro valide s'il contient au moins 10 chiffres. */
export function isPhone(value: string): boolean {
  return value.replace(/\D/g, "").length >= 10;
}

/** Convertit une saisie de budget (« 80 », « 80,50 ») en nombre, ou null. */
export function parseBudget(value: string): number | null | "invalid" {
  if (!value) return null;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  if (Number.isNaN(n) || n < 0) return "invalid";
  return n;
}
