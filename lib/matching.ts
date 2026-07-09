import type { Task } from "./types";
import type { WorkerCandidate } from "./queries";

/**
 * Suggestions de mise en relation tâche ↔ travailleurs, par PROXIMITÉ réelle.
 * On calcule la distance entre la ville de la tâche et celle du travailleur :
 *   • même ville (< 5 km)      → priorité maximale
 *   • région proche (≤ 40 km)  → banlieue / métro immédiat
 *   • région élargie (≤ 80 km) → navette raisonnable
 *   • > 80 km                  → écarté (trop loin)
 * Bonus si une compétence correspond à la catégorie. Ville inconnue
 * (« Autre ») → affichée en dernier avec « ville à confirmer ».
 */

export type Match = { candidate: WorkerCandidate; score: number; reason: string };

// Coordonnées approximatives (lat, lng) des villes desservies.
const COORDS: Record<string, [number, number]> = {
  montreal: [45.51, -73.57],
  quebec: [46.81, -71.21],
  laval: [45.61, -73.71],
  gatineau: [45.48, -75.7],
  longueuil: [45.53, -73.51],
  sherbrooke: [45.4, -71.89],
  saguenay: [48.43, -71.07],
  levis: [46.8, -71.18],
  "trois-rivieres": [46.34, -72.54],
  terrebonne: [45.7, -73.65],
  "saint-jean-sur-richelieu": [45.31, -73.26],
  repentigny: [45.74, -73.45],
  drummondville: [45.88, -72.48],
  granby: [45.4, -72.73],
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .trim();
}

function coordsFor(city: string | null | undefined): [number, number] | null {
  const key = normalize(city).replace(/'/g, "").replace(/\s+/g, "-");
  return COORDS[key] ?? null;
}

/** Distance en km entre deux points (formule de haversine). */
function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function suggestMatches(
  task: Pick<Task, "city" | "category">,
  pool: WorkerCandidate[],
  limit = 6,
): Match[] {
  const taskCoord = coordsFor(task.city);
  const categoryWords = normalize(task.category)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

  return pool
    .map((candidate) => {
      const skillHit = categoryWords.some((w) =>
        normalize(candidate.skills).includes(w),
      );
      const workerCoord = coordsFor(candidate.city);

      let proximity = 0;
      let label = "ville à confirmer";
      if (taskCoord && workerCoord) {
        const d = distanceKm(taskCoord, workerCoord);
        if (d < 5) [proximity, label] = [3, "même ville"];
        else if (d <= 40) [proximity, label] = [2, "région proche"];
        else if (d <= 80) [proximity, label] = [1, "région élargie"];
        else [proximity, label] = [-1, "trop loin"];
      }

      return {
        candidate,
        proximity,
        score: proximity + (skillHit ? 1 : 0),
        reason: label + (skillHit ? " + compétences" : ""),
      };
    })
    .filter((m) => m.proximity >= 0) // écarte « trop loin »
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate, score, reason }) => ({ candidate, score, reason }));
}
