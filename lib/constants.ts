/**
 * Données de référence partagées par toute l'application.
 * Centralisées ici pour rester faciles à faire évoluer (ajout de villes,
 * de catégories, etc.) sans toucher au reste du code.
 */

/** Catégories de tâches proposées sur JobDirect. */
export const CATEGORIES = [
  "Déménagement",
  "Ménage",
  "Manutention",
  "Construction",
  "Aménagement paysager",
  "Peinture",
  "Livraison",
  "Restauration / Événementiel",
  "Garde / Aide à domicile",
  "Autre",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Principales villes du Québec (liste non exhaustive, évolutive). */
export const CITIES = [
  "Montréal",
  "Québec",
  "Laval",
  "Gatineau",
  "Longueuil",
  "Sherbrooke",
  "Saguenay",
  "Lévis",
  "Trois-Rivières",
  "Terrebonne",
  "Saint-Jean-sur-Richelieu",
  "Repentigny",
  "Drummondville",
  "Granby",
  "Autre",
] as const;

export type City = (typeof CITIES)[number];

/** Statuts du cycle de vie d'une tâche. */
export const TASK_STATUSES = [
  "pending",
  "active",
  "assigned",
  "completed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Libellés FR + couleurs (classes Tailwind) pour l'affichage des statuts. */
export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; badge: string }
> = {
  pending: {
    label: "En attente",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  active: {
    label: "Active",
    badge: "bg-green-100 text-green-800 ring-green-200",
  },
  assigned: {
    label: "Assignée",
    badge: "bg-blue-100 text-blue-800 ring-blue-200",
  },
  completed: {
    label: "Terminée",
    badge: "bg-gray-100 text-gray-700 ring-gray-200",
  },
  cancelled: {
    label: "Annulée",
    badge: "bg-red-100 text-red-700 ring-red-200",
  },
};

/** Statuts d'une candidature (côté admin). */
export const APPLICATION_STATUSES = [
  "new",
  "reviewed",
  "contacted",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuts d'une demande de mise en relation (client → travailleur). */
export const CONNECTION_REQUEST_STATUSES = [
  "new",
  "contacted",
  "matched",
  "closed",
] as const;

export type ConnectionRequestStatusValue =
  (typeof CONNECTION_REQUEST_STATUSES)[number];

export const CONNECTION_REQUEST_STATUS_META: Record<
  ConnectionRequestStatusValue,
  { label: string; badge: string }
> = {
  new: { label: "Nouvelle", badge: "bg-brand-100 text-brand-800 ring-brand-200" },
  contacted: {
    label: "Contactée",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  matched: {
    label: "Mise en relation",
    badge: "bg-green-100 text-green-800 ring-green-200",
  },
  closed: { label: "Fermée", badge: "bg-gray-100 text-gray-700 ring-gray-200" },
};

export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { label: string; badge: string }
> = {
  new: { label: "Nouvelle", badge: "bg-brand-100 text-brand-800 ring-brand-200" },
  reviewed: {
    label: "Vue",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  contacted: {
    label: "Contactée",
    badge: "bg-green-100 text-green-800 ring-green-200",
  },
  rejected: {
    label: "Refusée",
    badge: "bg-red-100 text-red-700 ring-red-200",
  },
};
