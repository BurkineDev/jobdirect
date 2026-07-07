import type { Task } from "./types";
import type { WorkerCandidate } from "./queries";

/**
 * Suggestions de mise en relation tâche ↔ travailleurs (MVP volontairement simple) :
 * même ville obligatoire, bonus si la catégorie (ou un de ses mots) apparaît
 * dans les compétences du travailleur.
 */

export type Match = { candidate: WorkerCandidate; score: number; reason: string };

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // retire les accents
}

export function suggestMatches(
  task: Pick<Task, "city" | "category">,
  pool: WorkerCandidate[],
  limit = 5,
): Match[] {
  const taskCity = normalize(task.city);
  const categoryWords = normalize(task.category)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3);

  return pool
    .filter((c) => normalize(c.city) === taskCity && taskCity !== "")
    .map((c) => {
      const skills = normalize(c.skills);
      const skillHit = categoryWords.some((w) => skills.includes(w));
      return {
        candidate: c,
        score: skillHit ? 2 : 1,
        reason: skillHit ? "ville + compétences" : "même ville",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
