import "server-only";

/**
 * Gabarits de courriels.
 *
 * Écrits à la main, en HTML volontairement pauvre : les clients de messagerie
 * (Gmail, Outlook, Apple Mail) ignorent les feuilles de style externes, les
 * classes CSS et une bonne partie de la mise en page moderne. Seul le style
 * en ligne sur des balises simples est fiable partout.
 *
 * Chaque gabarit renvoie AUSSI une version texte. Ce n'est pas une politesse :
 * un courriel HTML sans équivalent texte est un signal de pourriel reconnu, et
 * la version texte est ce que lisent les aperçus de notification sur téléphone.
 */

export type Email = { subject: string; html: string; text: string };

/**
 * Échappe le contenu écrit par un utilisateur avant de l'insérer en HTML.
 * Un titre de tâche contenant `<` casserait la mise en page — et, pire,
 * permettrait d'injecter du balisage dans un courriel envoyé en notre nom.
 */
function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Raccourcit un fragment écrit par un utilisateur avant de l'insérer dans un
 * OBJET de courriel.
 *
 * Gmail affiche environ 70 caractères d'objet sur ordinateur et guère plus de
 * 40 sur téléphone. Or un titre de tâche est libre : « Aide pour déménagement
 * d'un 5 ½ du 3e étage sans ascenseur » suffit à pousser hors de l'écran la
 * partie qui porte l'information utile — la ville, ou le marqueur « ⚠️ à
 * relire » qui distingue une tâche signalée d'une tâche publiée.
 *
 * On coupe donc au dernier espace avant la limite (couper au milieu d'un mot
 * se lit comme une erreur d'affichage), et on n'ajoute l'ellipse que si l'on a
 * réellement retiré quelque chose.
 */
function clipForSubject(value: string, max = 45): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  // Sans espace exploitable (mot unique très long), on tranche net.
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

const BRAND = "#f97316";
const INK = "#1f2937";

function layout(options: {
  title: string;
  body: string;
  cta?: { label: string; url: string };
  footerNote?: string;
  unsubscribeUrl?: string;
}): string {
  const { title, body, cta, footerNote, unsubscribeUrl } = options;
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#f9fafb;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
    <div style="font-size:20px;font-weight:800;color:${BRAND};margin-bottom:20px;">JobDirect</div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;">
      <h1 style="margin:0 0 14px;font-size:19px;line-height:1.35;color:${INK};">${title}</h1>
      ${body}
      ${
        cta
          ? `<p style="margin:24px 0 0;"><a href="${cta.url}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:9px;">${esc(cta.label)}</a></p>`
          : ""
      }
    </div>
    <div style="margin-top:18px;font-size:12px;line-height:1.6;color:#6b7280;">
      ${footerNote ? `<p style="margin:0 0 8px;">${footerNote}</p>` : ""}
      <p style="margin:0;">JobDirect — mise en relation pour des tâches ponctuelles au Québec.</p>
      ${
        unsubscribeUrl
          ? `<p style="margin:8px 0 0;"><a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Ne plus recevoir d'alertes de tâches</a></p>`
          : ""
      }
    </div>
  </div>
</body></html>`;
}

function p(content: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${content}</p>`;
}

// ---------------------------------------------------------------------------
// 1. À L'OPÉRATEUR — une tâche vient d'arriver
// ---------------------------------------------------------------------------

/**
 * Le courriel le plus rentable du lot : il transforme « je découvre la demande
 * demain matin » en « je rappelle dans dix minutes ». Sur ce marché, le besoin
 * est urgent par nature (déménagement demain, pelletage ce matin) et le
 * premier qui répond emporte la tâche.
 *
 * Il contient donc les coordonnées du demandeur en clair : c'est un courriel
 * interne, destiné à la seule adresse d'administration, et le but est de
 * pouvoir appeler sans ouvrir l'ordinateur.
 */
export function operatorNewTaskEmail(input: {
  title: string;
  city: string;
  category: string;
  budget: string;
  desiredDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  published: boolean;
  moderationReasons: string[];
  adminUrl: string;
}): Email {
  const statusLine = input.published
    ? `<span style="color:#047857;font-weight:600;">Publiée automatiquement</span> — elle est déjà visible et peut recevoir des candidatures.`
    : `<span style="color:#b45309;font-weight:600;">En attente de ta relecture</span> — elle n'est pas encore visible.`;

  const reasons =
    input.moderationReasons.length > 0
      ? `<div style="margin:16px 0 0;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;">
           <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;color:#b45309;">Signalé par la modération</p>
           <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151;">
             ${input.moderationReasons.map((r) => `<li>${esc(r)}</li>`).join("")}
           </ul>
         </div>`
      : "";

  // Le titre est tronqué, jamais la ville ni le marqueur : ce sont eux qui
  // permettent de trier la boîte de réception d'un coup d'œil.
  const shortTitle = clipForSubject(input.title);
  const subject = input.published
    ? `✅ Nouvelle tâche publiée — ${shortTitle} (${input.city})`
    : `⚠️ Tâche à relire — ${shortTitle} (${input.city})`;

  return {
    subject,
    html: layout({
      title: esc(input.title),
      body:
        p(statusLine) +
        p(
          `${esc(input.city)} · ${esc(input.category)} · ${esc(input.desiredDate)} · budget ${esc(input.budget)}`,
        ) +
        p(
          `<strong>${esc(input.contactName)}</strong><br>` +
            `<a href="tel:${esc(input.contactPhone)}" style="color:${BRAND};">${esc(input.contactPhone)}</a><br>` +
            `<a href="mailto:${esc(input.contactEmail)}" style="color:${BRAND};">${esc(input.contactEmail)}</a>`,
        ) +
        reasons,
      cta: { label: "Ouvrir les opérations", url: input.adminUrl },
      footerNote: "Notification interne — envoyée à l'adresse d'administration.",
    }),
    text: [
      subject,
      "",
      input.published
        ? "Publiée automatiquement (déjà visible)."
        : "En attente de ta relecture (pas encore visible).",
      `${input.city} · ${input.category} · ${input.desiredDate} · budget ${input.budget}`,
      "",
      `${input.contactName}`,
      `${input.contactPhone}`,
      `${input.contactEmail}`,
      ...(input.moderationReasons.length > 0
        ? ["", "Signalé : " + input.moderationReasons.join(" ; ")]
        : []),
      "",
      input.adminUrl,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 2. À L'EMPLOYEUR — ta tâche est en ligne
// ---------------------------------------------------------------------------

export function employerTaskPublishedEmail(input: {
  contactName: string;
  title: string;
  city: string;
  taskUrl: string;
}): Email {
  const subject = `Votre tâche est en ligne : ${clipForSubject(input.title)}`;
  return {
    subject,
    html: layout({
      title: "Votre tâche est en ligne",
      body:
        p(`Bonjour ${esc(input.contactName)},`) +
        p(
          `Votre demande « <strong>${esc(input.title)}</strong> » est maintenant visible par les personnes disponibles à ${esc(input.city)}.`,
        ) +
        p(
          "Nous vous écrivons dès la première réponse. Vos coordonnées restent privées : elles ne sont jamais affichées publiquement, c'est notre équipe qui fait la mise en relation.",
        ),
      cta: { label: "Voir mon annonce", url: input.taskUrl },
    }),
    text: [
      subject,
      "",
      `Bonjour ${input.contactName},`,
      "",
      `Votre demande « ${input.title} » est maintenant visible par les personnes disponibles à ${input.city}.`,
      "",
      "Nous vous écrivons dès la première réponse. Vos coordonnées restent privées.",
      "",
      input.taskUrl,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 3. À L'EMPLOYEUR — quelqu'un s'est proposé
// ---------------------------------------------------------------------------

/**
 * Ce courriel ne donne PAS les coordonnées du candidat, et c'est délibéré :
 * la mise en relation est le service facturé. Il annonce la bonne nouvelle et
 * ramène la personne sur la plateforme.
 */
export function employerNewApplicationEmail(input: {
  contactName: string;
  taskTitle: string;
  applicantFirstName: string;
  message: string | null;
  dashboardUrl: string;
}): Email {
  const subject = `${input.applicantFirstName} est disponible pour « ${clipForSubject(input.taskTitle, 40)} »`;
  return {
    subject,
    html: layout({
      title: "Quelqu'un est disponible pour votre tâche",
      body:
        p(`Bonjour ${esc(input.contactName)},`) +
        p(
          `<strong>${esc(input.applicantFirstName)}</strong> s'est proposé(e) pour « ${esc(input.taskTitle)} ».`,
        ) +
        (input.message
          ? `<div style="margin:0 0 12px;padding:12px;background:#f9fafb;border-left:3px solid ${BRAND};font-size:15px;line-height:1.6;color:#374151;">${esc(input.message)}</div>`
          : "") +
        p("Nous vous mettons en contact — répondez à ce courriel pour lancer la suite."),
      cta: { label: "Voir la candidature", url: input.dashboardUrl },
    }),
    text: [
      subject,
      "",
      `Bonjour ${input.contactName},`,
      "",
      `${input.applicantFirstName} s'est proposé(e) pour « ${input.taskTitle} ».`,
      ...(input.message ? ["", `« ${input.message} »`] : []),
      "",
      "Répondez à ce courriel pour lancer la suite.",
      "",
      input.dashboardUrl,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 4. AU TRAVAILLEUR — une tâche pour toi
// ---------------------------------------------------------------------------

/**
 * Message commercial au sens de la LCAP : le lien de désabonnement est
 * OBLIGATOIRE, et c'est pourquoi `unsubscribeUrl` n'est pas optionnel ici.
 */
export function workerTaskAlertEmail(input: {
  workerFirstName: string;
  title: string;
  city: string;
  category: string;
  budget: string;
  desiredDate: string;
  taskUrl: string;
  unsubscribeUrl: string;
}): Email {
  const subject = `Nouvelle tâche à ${input.city} : ${clipForSubject(input.title, 40)}`;
  return {
    subject,
    html: layout({
      title: `Une tâche vient d'être publiée à ${esc(input.city)}`,
      body:
        p(`Bonjour ${esc(input.workerFirstName)},`) +
        `<div style="margin:0 0 14px;padding:14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:9px;">
           <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:${INK};">${esc(input.title)}</p>
           <p style="margin:0;font-size:14px;color:#6b7280;">${esc(input.city)} · ${esc(input.category)} · ${esc(input.desiredDate)}</p>
           <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:${BRAND};">${esc(input.budget)}</p>
         </div>` +
        p("Vous êtes disponible ? Répondez avant les autres — c'est souvent le premier qui obtient la tâche."),
      cta: { label: "Je suis disponible", url: input.taskUrl },
      unsubscribeUrl: input.unsubscribeUrl,
    }),
    text: [
      subject,
      "",
      `Bonjour ${input.workerFirstName},`,
      "",
      `${input.title}`,
      `${input.city} · ${input.category} · ${input.desiredDate} · ${input.budget}`,
      "",
      "Vous êtes disponible ? Répondez avant les autres.",
      "",
      input.taskUrl,
      "",
      `Ne plus recevoir d'alertes : ${input.unsubscribeUrl}`,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 5. AU TRAVAILLEUR — bienvenue
// ---------------------------------------------------------------------------

export function workerWelcomeEmail(input: {
  firstName: string;
  city: string;
  openTasks: number;
  tasksUrl: string;
  unsubscribeUrl: string;
}): Email {
  const subject = "Votre profil JobDirect est actif";
  return {
    subject,
    html: layout({
      title: "Votre profil est actif",
      body:
        p(`Bonjour ${esc(input.firstName)},`) +
        p(
          input.openTasks > 0
            ? `Il y a en ce moment <strong>${input.openTasks} tâche${input.openTasks > 1 ? "s" : ""} ouverte${input.openTasks > 1 ? "s" : ""}</strong> à ${esc(input.city)}. Vous pouvez postuler dès maintenant.`
            : `Aucune tâche n'est ouverte à ${esc(input.city)} à l'instant — nous vous prévenons dès qu'il y en a une.`,
        ) +
        p(
          "Vos coordonnées ne sont jamais affichées publiquement : votre profil apparaît sous la forme « Prénom N. », et ce sont les employeurs qui passent par nous pour vous joindre.",
        ),
      cta: { label: "Voir les tâches disponibles", url: input.tasksUrl },
      unsubscribeUrl: input.unsubscribeUrl,
    }),
    text: [
      subject,
      "",
      `Bonjour ${input.firstName},`,
      "",
      input.openTasks > 0
        ? `Il y a ${input.openTasks} tâche(s) ouverte(s) à ${input.city}.`
        : `Aucune tâche ouverte à ${input.city} pour l'instant — nous vous prévenons.`,
      "",
      "Vos coordonnées ne sont jamais publiques (profil affiché « Prénom N. »).",
      "",
      input.tasksUrl,
      "",
      `Ne plus recevoir d'alertes : ${input.unsubscribeUrl}`,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// 6. À L'OPÉRATEUR — une mise en relation vient d'être PAYÉE
// ---------------------------------------------------------------------------

/**
 * Le courriel à ne jamais manquer : de l'argent est déjà encaissé et une
 * promesse est due. Il part du webhook Stripe, donc au moment exact du
 * paiement.
 */
export function operatorPaidConnectionEmail(input: {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  workerName: string;
  amount: string;
  city: string | null;
  need: string | null;
  adminUrl: string;
}): Email {
  const subject = `💰 ${input.amount} encaissés — mise en relation à livrer (${input.clientName})`;
  return {
    subject,
    html: layout({
      title: `${esc(input.amount)} encaissés — mise en relation à livrer`,
      body:
        p(
          `<strong>${esc(input.clientName)}</strong> a payé d'avance pour être mis en contact avec <strong>${esc(input.workerName)}</strong>.`,
        ) +
        p(
          `<a href="tel:${esc(input.clientPhone)}" style="color:${BRAND};">${esc(input.clientPhone)}</a> · ` +
            `<a href="mailto:${esc(input.clientEmail)}" style="color:${BRAND};">${esc(input.clientEmail)}</a>` +
            (input.city ? `<br>${esc(input.city)}` : ""),
        ) +
        (input.need
          ? `<div style="margin:0 0 12px;padding:12px;background:#f9fafb;border-left:3px solid ${BRAND};font-size:15px;line-height:1.6;color:#374151;">${esc(input.need)}</div>`
          : "") +
        p(
          "Le paiement est encaissé : la promesse est due. Si vous ne trouvez personne, remboursez depuis Stripe — c'est ce qui rend l'avance acceptable.",
        ),
      cta: { label: "Ouvrir les opérations", url: input.adminUrl },
      footerNote: "Notification interne — envoyée à l'adresse d'administration.",
    }),
    text: [
      subject,
      "",
      `${input.clientName} a payé d'avance pour être mis en contact avec ${input.workerName}.`,
      `${input.clientPhone} · ${input.clientEmail}`,
      ...(input.city ? [input.city] : []),
      ...(input.need ? ["", `Besoin : ${input.need}`] : []),
      "",
      "Paiement encaissé : promesse due. Rembourser depuis Stripe si personne n'est trouvé.",
      "",
      input.adminUrl,
    ].join("\n"),
  };
}
