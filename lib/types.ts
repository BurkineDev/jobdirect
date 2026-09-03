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
  /** Description d'origine, avant masquage des coordonnées. NULL = rien retiré. */
  description_raw: string | null;
  /** Motifs du signalement de modération. NULL = soumission propre. */
  moderation_reasons: string[] | null;
  /** true = publiée automatiquement, sans validation humaine. */
  auto_published: boolean;
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
  /** false = retiré du répertoire public (vue `public_workers`). */
  is_public: boolean;
  /** Motifs du signalement de modération. NULL = inscription propre. */
  moderation_reasons: string[] | null;
  /** Compétences d'origine, avant masquage des coordonnées. */
  skills_raw: string | null;
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

export type UserRole = "employer" | "worker";

export interface Profile {
  id: string;
  role: UserRole;
  /** false = rôle deviné (compte OAuth) : l'application demande de trancher. */
  role_confirmed: boolean;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  skills: string | null;
  availability: string | null;
  experience: string | null;
  /** false = retiré du répertoire public (comptes travailleur seulement). */
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/** Profil travailleur exposé publiquement (identifiants réduits, sans coordonnées). */
export interface PublicWorker {
  id: string;
  display_name: string;
  city: string;
  skills: string;
  availability: string;
  experience: string | null;
  created_at: string;
}

export type ConnectionRequestStatus = "new" | "contacted" | "matched" | "closed";

/** Demande d'un client pour être mis en relation avec un travailleur. */
export interface ConnectionRequest {
  id: string;
  worker_id: string | null;
  worker_name: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  city: string | null;
  need: string | null;
  status: ConnectionRequestStatus;
  /** Frais de mise en relation encaissés d'avance (Stripe). NULL = non payé. */
  paid_at: string | null;
  amount_paid: number | null;
  created_at: string;
}

export type CommissionStatus = "pending" | "paid";

/** Commission de mise en relation (payée hors plateforme, ex. Interac). */
export interface Commission {
  id: string;
  task_id: string;
  amount: number;
  status: CommissionStatus;
  paid_at: string | null;
  note: string | null;
  created_at: string;
}

/** Profil + courriel du compte auth associé. */
export type SessionProfile = Profile & { email: string };

export type PaymentKind = "connection" | "commission";
export type PaymentStatus = "pending" | "paid" | "refunded";

/** Encaissement Stripe (frais de mise en relation ou commission de tâche). */
export interface Payment {
  id: string;
  kind: PaymentKind;
  connection_request_id: string | null;
  commission_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  customer_email: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Résultat standard renvoyé par les Server Actions de formulaire. */
export type FormState =
  | { status: "idle" }
  | {
      status: "success";
      message: string;
      /** Paiement Stripe à ouvrir immédiatement (page de paiement hébergée). */
      redirectUrl?: string;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string>;
    };
