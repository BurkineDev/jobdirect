import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import type { PublicTask } from "./queries";

/**
 * Données de marché PUBLIQUES et mises en cache.
 *
 * Deux usages, tous deux identiques pour chaque visiteur :
 *   • les signaux de liquidité (« 12 personnes disponibles à Laval ») qui
 *     rassurent les deux faces et évitent les pages vides — un marketplace
 *     meurt de ses états vides bien avant de mourir de sa technique ;
 *   • les pages d'atterrissage « service × ville » et le sitemap.
 *
 * Tout passe par le client anon SANS cookie (`createPublicClient`), seule
 * façon d'envelopper la lecture dans `unstable_cache`. Le tag « market »
 * permet de tout rafraîchir d'un coup quand l'admin active une tâche.
 */

export const MARKET_TAG = "market";

/** 5 minutes : assez frais pour un marché local, assez long pour absorber un pic. */
const REVALIDATE_SECONDS = 300;

export type MarketSnapshot = {
  /** Nombre de travailleurs publics, par ville. */
  workersByCity: Record<string, number>;
  /** Nombre de tâches actives, par ville. */
  tasksByCity: Record<string, number>;
  /** Nombre de tâches actives, par « ville|catégorie ». */
  tasksByCityCategory: Record<string, number>;
  totalWorkers: number;
  totalTasks: number;
};

function bump(counter: Record<string, number>, key: string | null | undefined) {
  const k = (key ?? "").trim();
  if (!k) return;
  counter[k] = (counter[k] ?? 0) + 1;
}

/** Marché vide — servi tel quel si la base est injoignable. */
const EMPTY_SNAPSHOT: MarketSnapshot = {
  workersByCity: {},
  tasksByCity: {},
  tasksByCityCategory: {},
  totalWorkers: 0,
  totalTasks: 0,
};

async function loadMarketSnapshot(): Promise<MarketSnapshot> {
  const supabase = createPublicClient();
  if (!supabase) return EMPTY_SNAPSHOT;

  const [workersRes, tasksRes] = await Promise.all([
    supabase.from("public_workers").select("city"),
    supabase.from("public_tasks").select("city, category"),
  ]);

  if (workersRes.error) console.error("market: workers", workersRes.error);
  if (tasksRes.error) console.error("market: tasks", tasksRes.error);

  const workersByCity: Record<string, number> = {};
  const tasksByCity: Record<string, number> = {};
  const tasksByCityCategory: Record<string, number> = {};

  const workers = (workersRes.data ?? []) as { city: string | null }[];
  for (const w of workers) bump(workersByCity, w.city);

  const tasks = (tasksRes.data ?? []) as {
    city: string | null;
    category: string | null;
  }[];
  for (const t of tasks) {
    bump(tasksByCity, t.city);
    if (t.city && t.category) bump(tasksByCityCategory, `${t.city}|${t.category}`);
  }

  return {
    workersByCity,
    tasksByCity,
    tasksByCityCategory,
    totalWorkers: workers.length,
    totalTasks: tasks.length,
  };
}

/** Instantané du marché (mis en cache, partagé entre tous les visiteurs). */
export const getMarketSnapshot = unstable_cache(
  loadMarketSnapshot,
  ["market-snapshot"],
  { tags: [MARKET_TAG], revalidate: REVALIDATE_SECONDS },
);

const SERVICE_TASK_COLUMNS =
  "id, title, description, city, category, desired_date, budget_estimate, status, created_at";

async function loadServiceTasks(
  city: string,
  category: string,
): Promise<PublicTask[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("public_tasks")
    .select(SERVICE_TASK_COLUMNS)
    .eq("city", city)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) {
    console.error("market: service tasks", error);
    return [];
  }
  return (data ?? []) as PublicTask[];
}

/** Tâches actives d'une page « service × ville ». */
export const getServiceTasks = unstable_cache(
  loadServiceTasks,
  ["service-tasks"],
  { tags: [MARKET_TAG], revalidate: REVALIDATE_SECONDS },
);

async function loadIndexableTasks(): Promise<
  { id: string; created_at: string }[]
> {
  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("public_tasks")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("market: indexable tasks", error);
    return [];
  }
  return (data ?? []) as { id: string; created_at: string }[];
}

/** Tâches actives à lister dans le sitemap. */
export const getIndexableTasks = unstable_cache(
  loadIndexableTasks,
  ["indexable-tasks"],
  { tags: [MARKET_TAG], revalidate: REVALIDATE_SECONDS },
);

/**
 * Budget médian observé pour un couple ville × catégorie.
 *
 * Volontairement calculé sur les VRAIES tâches publiées, jamais sur un
 * barème inventé : afficher un prix de marché faux détruirait la confiance
 * des deux côtés. `null` quand l'échantillon est trop mince pour être honnête
 * (moins de 3 budgets renseignés) — la page n'affiche alors aucun montant.
 */
export function medianBudget(tasks: PublicTask[]): number | null {
  const values = tasks
    .map((t) => (t.budget_estimate == null ? null : Number(t.budget_estimate)))
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);

  if (values.length < 3) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? Math.round((values[mid - 1] + values[mid]) / 2)
    : Math.round(values[mid]);
}
