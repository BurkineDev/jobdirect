"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, CITIES } from "@/lib/constants";
import { Select } from "@/components/ui/Field";

export function TaskFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const city = params.get("city") ?? "";
  const category = params.get("category") ?? "";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.push(qs ? `/taches?${qs}` : "/taches");
  }

  const hasFilters = Boolean(city || category);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label
          htmlFor="filter-city"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Ville
        </label>
        <Select
          id="filter-city"
          value={city}
          onChange={(e) => update("city", e.target.value)}
        >
          <option value="">Toutes les villes</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex-1">
        <label
          htmlFor="filter-category"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Catégorie
        </label>
        <Select
          id="filter-category"
          value={category}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/taches")}
          className="h-11 rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:w-auto"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
