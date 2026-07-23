"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CITIES } from "@/lib/constants";
import { Select } from "@/components/ui/Field";

export function WorkerFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const city = params.get("city") ?? "";

  function update(value: string) {
    router.push(value ? `/embaucher?city=${encodeURIComponent(value)}` : "/embaucher");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label
          htmlFor="worker-city"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Ville
        </label>
        <Select
          id="worker-city"
          value={city}
          onChange={(e) => update(e.target.value)}
        >
          <option value="">Toutes les villes</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      {city && (
        <button
          type="button"
          onClick={() => router.push("/embaucher")}
          className="h-11 rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 sm:w-auto"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
