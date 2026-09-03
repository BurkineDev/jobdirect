import { CATEGORIES, CITIES, type Category, type City } from "./constants";

/**
 * Socle SEO : pages d'atterrissage « service × ville » et données structurées.
 *
 * Pourquoi ce fichier existe : dans un marché local, la recherche Google est
 * le seul canal d'acquisition qui compose sans budget publicitaire. Un client
 * ne cherche pas « plateforme de tâches », il cherche « déménagement
 * Montréal ». Chaque couple (catégorie, ville) mérite donc son URL, son titre
 * et son contenu propre — c'est ce que ce module génère.
 *
 * « Autre » est volontairement exclu des deux listes : personne ne tape
 * « autre à autre » dans Google, et une page vide dilue le reste du site.
 */

/** Catégories dignes d'une page indexée (« Autre » n'a aucun volume de recherche). */
export const SEO_CATEGORIES = CATEGORIES.filter(
  (c) => c !== "Autre",
) as Exclude<Category, "Autre">[];

/** Villes dignes d'une page indexée (même raison pour « Autre »). */
export const SEO_CITIES = CITIES.filter((c) => c !== "Autre") as Exclude<
  City,
  "Autre"
>[];

/** Transforme un libellé français en segment d'URL (sans accent ni ponctuation). */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // tout le reste devient un tiret
    .replace(/^-+|-+$/g, "");
}

export type ServicePage = {
  /** Segment d'URL, ex. « demenagement-montreal ». */
  slug: string;
  category: string;
  city: string;
};

/**
 * Toutes les pages « service × ville ».
 *
 * Le slug concatène catégorie et ville, ce qui serait ambigu à re-découper
 * (« saint-jean-sur-richelieu » contient des tirets). On ne le découpe donc
 * jamais : la table ci-dessous est la source de vérité, consultée par slug.
 */
export const SERVICE_PAGES: ServicePage[] = SEO_CATEGORIES.flatMap((category) =>
  SEO_CITIES.map((city) => ({
    slug: `${slugify(category)}-${slugify(city)}`,
    category,
    city,
  })),
);

const BY_SLUG = new Map(SERVICE_PAGES.map((p) => [p.slug, p]));

export function findServicePage(slug: string): ServicePage | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Toutes les pages d'une même ville (maillage interne « autres services ici »). */
export function servicePagesInCity(city: string): ServicePage[] {
  return SERVICE_PAGES.filter((p) => p.city === city);
}

/** La même catégorie dans les autres villes (maillage interne « ailleurs au Québec »). */
export function servicePagesInCategory(category: string): ServicePage[] {
  return SERVICE_PAGES.filter((p) => p.category === category);
}

/**
 * Formulation naturelle du service pour les titres et le contenu.
 * Écrit à la main : « Aide au déménagement à Montréal » se lit et se cherche
 * beaucoup mieux que « Déménagement à Montréal », et c'est exactement la
 * requête que tape un particulier.
 */
export const CATEGORY_COPY: Record<
  string,
  { h1: string; searchTerm: string; examples: string[] }
> = {
  Déménagement: {
    h1: "Aide au déménagement",
    searchTerm: "aide au déménagement",
    examples: [
      "charger et décharger un camion",
      "monter des boîtes sans ascenseur",
      "démonter et remonter les meubles",
      "un coup de main de 2 à 4 heures",
    ],
  },
  Ménage: {
    h1: "Ménage et grand nettoyage",
    searchTerm: "ménage à domicile",
    examples: [
      "grand ménage de printemps",
      "nettoyage de fin de bail",
      "ménage après travaux",
      "entretien récurrent",
    ],
  },
  Manutention: {
    h1: "Manutention et gros bras",
    searchTerm: "manutention",
    examples: [
      "vider un garage ou un sous-sol",
      "transporter des matériaux",
      "charger une remorque",
      "débarrasser des encombrants",
    ],
  },
  Construction: {
    h1: "Aide en construction et rénovation",
    searchTerm: "aide en construction",
    examples: [
      "démolition légère",
      "manœuvre sur un chantier",
      "nettoyage de chantier",
      "aide à la pose",
    ],
  },
  "Aménagement paysager": {
    h1: "Aménagement paysager et travaux extérieurs",
    searchTerm: "aménagement paysager",
    examples: [
      "tonte et entretien de terrain",
      "pose de tourbe ou de paillis",
      "taille de haies",
      "ramassage de feuilles, déneigement",
    ],
  },
  Peinture: {
    h1: "Peinture intérieure et extérieure",
    searchTerm: "peintre",
    examples: [
      "repeindre une pièce",
      "préparer et sabler les murs",
      "peinture de clôture ou de galerie",
      "retouches avant une vente",
    ],
  },
  Livraison: {
    h1: "Livraison et transport",
    searchTerm: "livraison",
    examples: [
      "récupérer un achat Marketplace",
      "livrer un meuble",
      "transport avec camionnette",
      "course urgente",
    ],
  },
  "Restauration / Événementiel": {
    h1: "Personnel de restauration et d'événement",
    searchTerm: "personnel d'événement",
    examples: [
      "service en salle pour une soirée",
      "aide en cuisine",
      "montage et démontage de salle",
      "plonge lors d'un gros service",
    ],
  },
  "Garde / Aide à domicile": {
    h1: "Garde et aide à domicile",
    searchTerm: "aide à domicile",
    examples: [
      "accompagnement d'une personne âgée",
      "aide aux courses et aux repas",
      "gardiennage ponctuel",
      "présence de jour ou de soir",
    ],
  },
};

/** Repli si une catégorie est ajoutée sans copie dédiée. */
export function categoryCopy(category: string) {
  return (
    CATEGORY_COPY[category] ?? {
      h1: category,
      searchTerm: category.toLowerCase(),
      examples: [],
    }
  );
}

export function servicePath(slug: string): string {
  return `/services/${slug}`;
}

/**
 * Élision de « de » devant une voyelle : « besoin d'aide », pas « besoin de
 * aide ». Détail de français, mais il apparaît dans la balise `description`
 * — donc directement dans l'extrait affiché par Google, où une faute coûte
 * des clics.
 */
export function deElided(term: string): string {
  const first = term
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .charAt(0)
    .toLowerCase();
  // Le « h » français est muet dans les mots qui nous concernent (heure,
  // habitation) : on l'élide aussi.
  return /[aeiouyh]/.test(first) ? `d'${term}` : `de ${term}`;
}

/**
 * Sérialise un objet JSON-LD pour un `<script type="application/ld+json">`.
 * `<` est échappé afin qu'une description contenant du HTML ne puisse pas
 * refermer la balise script (injection).
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

type JobPostingTask = {
  id: string;
  title: string;
  description: string;
  city: string;
  category: string;
  desired_date: string | null;
  budget_estimate: number | null;
  created_at: string;
};

/**
 * Données structurées `JobPosting` d'une tâche — la distribution gratuite.
 *
 * Une tâche balisée correctement devient éligible à **Google Jobs**, qui
 * affiche les offres au-dessus des résultats classiques et n'exige aucun
 * budget publicitaire. Pour un fondateur solo, c'est le meilleur rapport
 * effort/portée du site.
 *
 * Deux choix délibérés :
 *   • `baseSalary` est OMIS. Le budget d'une tâche ponctuelle (80 $ pour un
 *     déménagement de 2 h) n'est ni un salaire horaire ni un taux journalier :
 *     le déclarer comme tel produirait une donnée structurée fausse, ce que
 *     Google sanctionne et ce qui tromperait le candidat. Le montant est donc
 *     annoncé en clair dans la description.
 *   • `validThrough` est toujours renseigné. Google déclasse les offres qui
 *     n'expirent jamais, et une tâche de déménagement passée n'a plus lieu
 *     d'être proposée.
 */
export function jobPostingSchema(
  task: JobPostingTask,
  baseUrl: string,
): Record<string, unknown> {
  const budgetLine =
    task.budget_estimate != null
      ? ` Budget estimé par le demandeur : ${task.budget_estimate} $ CAD pour l'ensemble de la tâche.`
      : " Budget à discuter avec le demandeur.";

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: task.title,
    description: `<p>${task.description}</p><p>${budgetLine}</p>`,
    identifier: {
      "@type": "PropertyValue",
      name: "JobDirect",
      value: task.id,
    },
    datePosted: task.created_at,
    validThrough: jobValidThrough(task),
    employmentType: ["TEMPORARY", "PART_TIME"],
    industry: task.category,
    directApply: true,
    hiringOrganization: {
      "@type": "Organization",
      name: "JobDirect",
      sameAs: baseUrl,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: task.city,
        addressRegion: "QC",
        addressCountry: "CA",
      },
    },
    url: `${baseUrl}/taches/${task.id}`,
  };
}

/**
 * Date d'expiration de l'offre : le lendemain de la date souhaitée, ou 30
 * jours après la publication quand le demandeur est resté flexible.
 */
function jobValidThrough(task: JobPostingTask): string {
  if (task.desired_date) {
    const day = new Date(`${task.desired_date}T23:59:59`);
    if (!Number.isNaN(day.getTime())) return day.toISOString();
  }
  const created = new Date(task.created_at);
  const fallback = Number.isNaN(created.getTime()) ? new Date() : created;
  return new Date(fallback.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
}
