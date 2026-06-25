import type { ApplicationStatus, TaskStatus } from "./constants";

/**
 * Types représentant les lignes des tables Supabase.
 * Gardés manuels (et simples) pour le MVP ; pourront être remplacés
 * par les types générés (`supabase gen types`) plus tard.
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  city: string;
  category: string;
  desired_date: string | null; // format ISO date (YYYY-MM-DD)
  budget_estimate: number | null;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  skills: string;
  availability: string;
  experience: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  task_id: string;
  worker_id: string | null;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface AdminNote {
  id: string;
  task_id: string | null;
  note: string;
  created_at: string;
}

/** Résultat standard renvoyé par les Server Actions de formulaire. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
    };
