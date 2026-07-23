import "server-only";
import { createClient } from "./supabase/server";
import type {
  Application,
  Task,
  Worker,
  AdminNote,
  Commission,
  Profile,
  PublicWorker,
  ConnectionRequest,
} from "./types";

/**
 * Lectures de données côté serveur.
 * - Lectures PUBLIQUES : via la vue `public_tasks` (colonnes non sensibles,
 *   tâches actives uniquement) — accessible avec la clé publique.
 * - Lectures ADMIN : sur les tables, autorisées par la RLS (`is_admin()`)
 *   lorsque la requête s'exécute dans une session admin authentifiée.
 */

const PUBLIC_TASK_COLUMNS =
  "id, title, description, city, category, desired_date, budget_estimate, status, created_at";

export type PublicTask = Pick<
  Task,
  | "id"
  | "title"
  | "description"
  | "city"
  | "category"
  | "desired_date"
  | "budget_estimate"
  | "status"
  | "created_at"
>;

export async function getActiveTasks(filters: {
  city?: string;
  category?: string;
}): Promise<PublicTask[]> {
  const supabase = await createClient();
  let query = supabase
    .from("public_tasks")
    .select(PUBLIC_TASK_COLUMNS)
    .order("created_at", { ascending: false });

  if (filters.city) query = query.eq("city", filters.city);
  if (filters.category) query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) {
    console.error("getActiveTasks error", error);
    return [];
  }
  return (data ?? []) as PublicTask[];
}

export async function getActiveTask(id: string): Promise<PublicTask | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_tasks")
    .select(PUBLIC_TASK_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getActiveTask error", error);
    return null;
  }
  return (data as PublicTask) ?? null;
}

// --- Répertoire PUBLIC des travailleurs (via la vue public_workers) ---------

const PUBLIC_WORKER_COLUMNS =
  "id, display_name, city, skills, availability, experience, created_at";

export async function getPublicWorkers(filters: {
  city?: string;
}): Promise<PublicWorker[]> {
  const supabase = await createClient();
  let query = supabase
    .from("public_workers")
    .select(PUBLIC_WORKER_COLUMNS)
    .order("created_at", { ascending: false });
  if (filters.city) query = query.eq("city", filters.city);

  const { data, error } = await query;
  if (error) {
    console.error("getPublicWorkers error", error);
    return [];
  }
  return (data ?? []) as PublicWorker[];
}

export async function getPublicWorker(id: string): Promise<PublicWorker | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_workers")
    .select(PUBLIC_WORKER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return (data as PublicWorker) ?? null;
}

// --- Lectures COMPTE utilisateur (via la session authentifiée + RLS) --------

export type TaskWithApplications = Task & { applications: Application[] };

/** Tâches publiées par l'employeur connecté, avec leurs candidatures. */
export async function getMyTasksWithApplications(
  userId: string,
): Promise<TaskWithApplications[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, applications(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMyTasksWithApplications error", error);
    return [];
  }
  return (data ?? []) as TaskWithApplications[];
}

export type MyApplication = Application & {
  task: Pick<Task, "id" | "title" | "city" | "category" | "status"> | null;
};

/** Candidatures envoyées par le travailleur connecté. */
export async function getMyApplications(
  userId: string,
): Promise<MyApplication[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*, task:tasks(id, title, city, category, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMyApplications error", error);
    return [];
  }
  return (data ?? []) as MyApplication[];
}

// --- Lectures ADMIN (toutes les colonnes) ----------------------------------

export type TaskWithCount = Task & { application_count: number };

export async function getAllTasks(): Promise<TaskWithCount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, applications(count)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getAllTasks error", error);
    return [];
  }
  return (data ?? []).map((t) => {
    const { applications, ...task } = t as Task & {
      applications: { count: number }[];
    };
    return {
      ...(task as Task),
      application_count: applications?.[0]?.count ?? 0,
    };
  });
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Task) ?? null;
}

export async function getAllWorkers(): Promise<Worker[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getAllWorkers error", error);
    return [];
  }
  return (data ?? []) as Worker[];
}

export type ApplicationWithTask = Application & {
  task: Pick<Task, "id" | "title" | "city" | "category"> | null;
};

export async function getAllApplications(): Promise<ApplicationWithTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*, task:tasks(id, title, city, category)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getAllApplications error", error);
    return [];
  }
  return (data ?? []) as ApplicationWithTask[];
}

export async function getAdminNotes(taskId: string): Promise<AdminNote[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_notes")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AdminNote[];
}

/** Toutes les notes, regroupées par identifiant de tâche. */
export async function getNotesByTask(): Promise<Map<string, AdminNote[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_notes")
    .select("*")
    .order("created_at", { ascending: false });

  const map = new Map<string, AdminNote[]>();
  for (const note of (data ?? []) as AdminNote[]) {
    if (!note.task_id) continue;
    const list = map.get(note.task_id) ?? [];
    list.push(note);
    map.set(note.task_id, list);
  }
  return map;
}

export type CommissionWithTask = Commission & {
  task: Pick<
    Task,
    "id" | "title" | "city" | "category" | "status" | "contact_name" | "contact_phone" | "budget_estimate"
  > | null;
};

/** Commissions (mise en relation), avec la tâche associée. Réservé admin. */
export async function getCommissions(): Promise<CommissionWithTask[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commissions")
    .select(
      "*, task:tasks(id, title, city, category, status, contact_name, contact_phone, budget_estimate)",
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getCommissions error", error);
    return [];
  }
  return (data ?? []) as CommissionWithTask[];
}

/** Demandes de mise en relation (client → travailleur). Réservé admin. */
export async function getConnectionRequests(): Promise<ConnectionRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getConnectionRequests error", error);
    return [];
  }
  return (data ?? []) as ConnectionRequest[];
}

/** Candidat au matching : travailleur inscrit (formulaire) ou compte travailleur. */
export type WorkerCandidate = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  skills: string | null;
  availability: string | null;
  source: "formulaire" | "compte";
};

/** Réunit les deux viviers de travailleurs (table workers + profils avec compte). */
export async function getWorkerPool(): Promise<WorkerCandidate[]> {
  const supabase = await createClient();
  const [workersRes, profilesRes] = await Promise.all([
    supabase.from("workers").select("*"),
    supabase.from("profiles").select("*").eq("role", "worker"),
  ]);

  const fromForms: WorkerCandidate[] = ((workersRes.data ?? []) as Worker[]).map(
    (w) => ({
      key: `w_${w.id}`,
      name: w.name,
      phone: w.phone,
      email: w.email,
      city: w.city,
      skills: w.skills,
      availability: w.availability,
      source: "formulaire",
    }),
  );
  const fromAccounts: WorkerCandidate[] = (
    (profilesRes.data ?? []) as Profile[]
  ).map((p) => ({
    key: `p_${p.id}`,
    name: p.full_name,
    phone: p.phone,
    email: p.email,
    city: p.city,
    skills: p.skills,
    availability: p.availability,
    source: "compte",
  }));

  // Dédoublonnage simple par courriel (un compte remplace une fiche formulaire).
  const seen = new Set(
    fromAccounts.map((c) => c.email?.toLowerCase()).filter(Boolean),
  );
  return [
    ...fromAccounts,
    ...fromForms.filter((c) => !seen.has(c.email?.toLowerCase() ?? "")),
  ];
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const [tasks, workers, applications] = await Promise.all([
    supabase.from("tasks").select("status"),
    supabase.from("workers").select("id", { count: "exact", head: true }),
    supabase.from("applications").select("id", { count: "exact", head: true }),
  ]);

  const statuses = (tasks.data ?? []) as { status: string }[];
  return {
    totalTasks: statuses.length,
    activeTasks: statuses.filter((t) => t.status === "active").length,
    pendingTasks: statuses.filter((t) => t.status === "pending").length,
    totalWorkers: workers.count ?? 0,
    totalApplications: applications.count ?? 0,
  };
}
