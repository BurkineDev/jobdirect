/**
 * Modération automatique des textes destinés à devenir PUBLICS.
 *
 * Pourquoi c'est le module le plus important du dépôt : le modèle d'affaires
 * de JobDirect repose entièrement sur le fait que les coordonnées ne
 * circulent que par la mise en relation — c'est le seul service facturé. Or
 * la description d'une tâche et les compétences d'un travailleur sont du
 * texte libre affiché publiquement. Un « appelez-moi au 514-555-0142 » glissé
 * là contourne la plateforme et fait tomber le revenu à zéro.
 *
 * Jusqu'ici, c'est la validation manuelle (`pending` → `active`) qui servait
 * de filet. Ce module la remplace par un contrôle systématique, ce qui permet
 * de publier instantanément les soumissions propres — et de ne réserver
 * l'attention humaine qu'aux cas douteux.
 *
 * Deux sorties distinctes :
 *   • `clean` : le texte débarrassé des coordonnées, publiable tel quel ;
 *   • `reasons` : pourquoi la soumission mérite un œil humain. Un texte peut
 *     être nettoyé ET signalé — retirer un numéro ne dit pas si la personne
 *     a essayé de contourner par malice ou par habitude.
 */

/** Marqueur affiché à la place d'une coordonnée retirée. */
const MASK = "[coordonnées retirées]";

/**
 * Numéros de téléphone nord-américains sous toutes leurs formes courantes au
 * Québec : 514-555-0142, (514) 555-0142, 514.555.0142, 5145550142,
 * +1 514 555 0142. Les dates (2026-09-15) et les codes postaux (H2X 1Y4) ne
 * correspondent pas : le motif exige un groupe 3-3-4 strictement numérique.
 */
const PHONE_RE =
  /(?:\+?1[\s.\-–]?)?\(?\d{3}\)?[\s.\-–]?\d{3}[\s.\-–]?\d{4}/g;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** URL explicite (https://…, www.…). */
const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;

/** Domaine nu (« monsite.ca », « facebook.com/…»). */
const BARE_DOMAIN_RE =
  /\b[a-z0-9-]{2,}\.(?:com|ca|net|org|info|biz|io|co|fr|be|ch|me|app)\b(?:\/\S*)?/gi;

/** Identifiant de réseau social (« @moncompte »). */
const HANDLE_RE = /(?<![A-Za-z0-9._%+-])@[A-Za-z0-9._]{3,}/g;

/**
 * Formulations qui trahissent une intention de contourner la plateforme.
 * Elles ne sont PAS masquées (le texte reste lisible) mais elles signalent la
 * soumission : c'est le signal le plus utile pour repérer une fuite que les
 * motifs ci-dessus n'auraient pas attrapée (numéro écrit en lettres, par ex.).
 */
const BYPASS_HINTS = [
  "appelez-moi",
  "appelle-moi",
  "appelez moi",
  "textez-moi",
  "texte-moi",
  "textez moi",
  "whatsapp",
  "messenger",
  "mon numero",
  "mon numéro",
  "mon cell",
  "mon courriel",
  "mon adresse courriel",
  "écrivez-moi à",
  "ecrivez-moi a",
  "hors plateforme",
  "sans passer par",
  "directement avec moi",
];

export type ModerationResult = {
  /** Texte publiable : coordonnées remplacées par un marqueur. */
  clean: string;
  /** true si au moins une coordonnée a été retirée. */
  redacted: boolean;
  /** Motifs justifiant une relecture humaine (vide = publiable d'office). */
  reasons: string[];
};

function normalizeForHints(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Nettoie un texte libre destiné à l'affichage public.
 *
 * L'ordre des remplacements compte : les courriels d'abord, sinon le motif
 * « domaine nu » découperait « marc@example.com » en laissant « marc@ ».
 */
export function moderateText(input: string): ModerationResult {
  const reasons: string[] = [];
  let text = input ?? "";

  const apply = (re: RegExp, reason: string) => {
    // `re` est global : on remet lastIndex à zéro pour rester réutilisable
    // entre deux appels (les littéraux /g sont partagés au niveau du module).
    re.lastIndex = 0;
    if (!re.test(text)) return;
    re.lastIndex = 0;
    text = text.replace(re, MASK);
    reasons.push(reason);
  };

  apply(EMAIL_RE, "courriel dans le texte public");
  apply(URL_RE, "lien dans le texte public");
  apply(PHONE_RE, "numéro de téléphone dans le texte public");
  apply(BARE_DOMAIN_RE, "adresse de site dans le texte public");
  apply(HANDLE_RE, "identifiant de réseau social dans le texte public");

  const redacted = reasons.length > 0;

  const haystack = normalizeForHints(input ?? "");
  const hinted = BYPASS_HINTS.filter((hint) =>
    haystack.includes(normalizeForHints(hint)),
  );
  if (hinted.length > 0) {
    reasons.push(`formulation de contournement : « ${hinted[0]} »`);
  }

  // Deux marqueurs collés (« [..] [..] ») après nettoyage : on recompacte.
  text = text.replace(
    new RegExp(`(?:${escapeRe(MASK)}[\\s,;.]*){2,}`, "g"),
    `${MASK} `,
  );

  return { clean: text.trim(), redacted, reasons };
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type TaskModeration = {
  title: string;
  description: string;
  /** true = publiable immédiatement ; false = à relire par un humain. */
  autoPublishable: boolean;
  reasons: string[];
  redacted: boolean;
};

/**
 * Modère une soumission de tâche.
 *
 * Choix délibéré : une soumission dont on a retiré des coordonnées n'est PAS
 * auto-publiée. Le texte nettoyé est pourtant sûr — mais la personne a écrit
 * quelque chose qu'elle voulait visible, et le publier amputé sans un regard
 * humain produit des annonces incompréhensibles (« Contactez-moi au
 * [coordonnées retirées] »). Mieux vaut un délai qu'une annonce absurde.
 */
export function moderateTask(input: {
  title: string;
  description: string;
}): TaskModeration {
  const title = moderateText(input.title);
  const description = moderateText(input.description);
  const reasons = [
    ...title.reasons.map((r) => `titre : ${r}`),
    ...description.reasons.map((r) => `description : ${r}`),
  ];

  // Une description très courte n'est pas suspecte, mais elle donne une
  // annonce inutilisable : autant la faire relire (et compléter) d'abord.
  if (description.clean.length < 20) {
    reasons.push("description trop courte pour être publiée telle quelle");
  }

  return {
    title: title.clean,
    description: description.clean,
    autoPublishable: reasons.length === 0,
    reasons,
    redacted: title.redacted || description.redacted,
  };
}

export type WorkerModeration = {
  skills: string;
  availability: string;
  experience: string | null;
  reasons: string[];
  redacted: boolean;
};

/**
 * Modère une inscription de travailleur.
 *
 * Ces trois champs alimentent la vue `public_workers` : ils sont exposés au
 * répertoire, donc soumis exactement au même risque de fuite que la
 * description d'une tâche.
 */
export function moderateWorker(input: {
  skills: string;
  availability: string;
  experience: string;
}): WorkerModeration {
  const skills = moderateText(input.skills);
  const availability = moderateText(input.availability);
  const experience = moderateText(input.experience);

  return {
    skills: skills.clean,
    availability: availability.clean,
    experience: experience.clean || null,
    reasons: [
      ...skills.reasons.map((r) => `compétences : ${r}`),
      ...availability.reasons.map((r) => `disponibilités : ${r}`),
      ...experience.reasons.map((r) => `expérience : ${r}`),
    ],
    redacted: skills.redacted || availability.redacted || experience.redacted,
  };
}
