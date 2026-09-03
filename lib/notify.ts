import "server-only";
import { createAdminClient } from "./supabase/admin";
import {
  emailFrom,
  emailReplyTo,
  getResend,
  operatorEmail,
} from "./email/client";
import {
  employerNewApplicationEmail,
  employerTaskPublishedEmail,
  operatorNewTaskEmail,
  operatorPaidConnectionEmail,
  workerTaskAlertEmail,
  workerWelcomeEmail,
  type Email,
} from "./email/templates";
import { formatBudget, formatDate } from "./format";
import { siteUrl } from "./site";

/**
 * Notifications par courriel — la couche métier.
 *
 * RÈGLE ABSOLUE DE CE MODULE : aucune fonction ne lève jamais d'exception et
 * aucune ne fait échouer l'action qui l'appelle. Un courriel non parti est un
 * désagrément ; une publication de tâche refusée parce que le fournisseur de
 * courriel avait un incident serait une perte de client. Tout est donc
 * enveloppé, et l'échec est journalisé sans remonter.
 *
 * ENVOIS ATTENDUS, PLUTÔT QU'EN TÂCHE DE FOND : sur une plateforme
 * serverless, un envoi lancé sans être attendu peut être interrompu dès que
 * la réponse HTTP est rendue — le courriel part alors « parfois ». On accepte
 * donc les ~300 ms d'attente sur la soumission du formulaire : la fiabilité
 * vaut plus que le délai. Quand le volume le justifiera, `waitUntil()` de
 * `@vercel/functions` permettra de rendre la main avant la fin des envois.
 */

/** Nombre maximal d'alertes envoyées pour une même tâche. */
const MAX_WORKER_ALERTS = 25;

/** Prénom seul : on ne tutoie pas, mais on n'écrit pas « Bonjour Marc Tremblay ». */
function firstName(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0];
  return first || "bonjour";
}

/** Envoi unitaire, silencieux en cas d'échec. */
async function send(to: string, email: Email): Promise<boolean> {
  const resend = getResend();
  if (!resend || !to) return false;

  try {
    const { error } = await resend.emails.send({
      from: emailFrom(),
      to: [to],
      replyTo: emailReplyTo(),
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      console.error("notify: envoi refusé", to, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("notify: envoi impossible", to, error);
    return false;
  }
}

/**
 * Envoi GROUPÉ — une seule requête pour jusqu'à 100 destinataires.
 *
 * Indispensable pour l'alerte aux travailleurs. Resend limite le compte à
 * 2 requêtes par seconde : envoyer 25 alertes une par une prendrait plus de
 * douze secondes et se ferait étrangler en route. L'API `batch` fait passer
 * le tout en un appel.
 *
 * Chaque message garde son propre lien de désabonnement, donc on ne peut pas
 * simplement mettre 25 adresses dans un `to:` — ce serait au passage divulguer
 * les courriels des travailleurs les uns aux autres.
 */
async function sendBatch(
  messages: { to: string; email: Email }[],
): Promise<number> {
  const resend = getResend();
  const valid = messages.filter((m) => m.to);
  if (!resend || valid.length === 0) return 0;

  try {
    const { error } = await resend.batch.send(
      valid.map((m) => ({
        from: emailFrom(),
        to: [m.to],
        replyTo: emailReplyTo(),
        subject: m.email.subject,
        html: m.email.html,
        text: m.email.text,
      })),
    );
    if (error) {
      console.error("notify: envoi groupé refusé", error);
      return 0;
    }
    return valid.length;
  } catch (error) {
    console.error("notify: envoi groupé impossible", error);
    return 0;
  }
}

/** Lien de désabonnement porté par chaque alerte (exigence LCAP). */
function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/desabonnement/${token}`;
}

// ---------------------------------------------------------------------------
// Nouvelle tâche
// ---------------------------------------------------------------------------

export type NewTaskNotification = {
  id: string;
  title: string;
  description: string;
  city: string;
  category: string;
  desired_date: string | null;
  budget_estimate: number | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  published: boolean;
  moderationReasons: string[];
};

/**
 * Le moment qui décide de tout : une tâche vient d'arriver.
 *
 * Trois destinataires, dans cet ordre d'importance :
 *   1. l'opérateur — pour qu'il puisse rappeler dans les minutes qui suivent
 *      plutôt que le lendemain matin ;
 *   2. les travailleurs du secteur — c'est ce qui réveille un vivier inerte ;
 *   3. l'employeur — confirmation que son annonce est bien en ligne.
 */
export async function notifyNewTask(task: NewTaskNotification): Promise<void> {
  const base = siteUrl();
  const budget = formatBudget(task.budget_estimate);
  const desiredDate = formatDate(task.desired_date);

  try {
    const operator = operatorEmail();
    if (operator) {
      await send(
        operator,
        operatorNewTaskEmail({
          title: task.title,
          city: task.city,
          category: task.category,
          budget,
          desiredDate,
          contactName: task.contact_name,
          contactPhone: task.contact_phone,
          contactEmail: task.contact_email,
          published: task.published,
          moderationReasons: task.moderationReasons,
          adminUrl: `${base}/admin/operations`,
        }),
      );
    }
  } catch (error) {
    console.error("notifyNewTask: opérateur", error);
  }

  // Les deux envois suivants n'ont de sens que si la tâche est VISIBLE :
  // inutile d'inviter des travailleurs à postuler sur une annonce en attente
  // de relecture, ni d'annoncer à l'employeur qu'elle est en ligne.
  if (!task.published) return;

  try {
    await send(
      task.contact_email,
      employerTaskPublishedEmail({
        contactName: firstName(task.contact_name),
        title: task.title,
        city: task.city,
        taskUrl: `${base}/taches/${task.id}`,
      }),
    );
  } catch (error) {
    console.error("notifyNewTask: employeur", error);
  }

  try {
    await notifyMatchingWorkers(task);
  } catch (error) {
    console.error("notifyNewTask: travailleurs", error);
  }
}

/**
 * Alerte les travailleurs du secteur.
 *
 * Passe par la fonction SQL `workers_to_notify`, qui réunit les deux viviers
 * (fiches formulaire + comptes), écarte les personnes désabonnées et
 * dédoublonne par courriel. Elle lit des coordonnées privées : elle n'est
 * accordée qu'au rôle `service_role`, d'où le client admin.
 */
async function notifyMatchingWorkers(
  task: NewTaskNotification,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin || !getResend()) return;

  const { data, error } = await admin.rpc("workers_to_notify", {
    p_city: task.city,
    p_category: task.category,
  });

  if (error) {
    console.error("notifyMatchingWorkers: RPC", error.message);
    return;
  }

  const recipients = (data ?? []) as {
    name: string | null;
    email: string;
    unsubscribe_token: string;
  }[];

  const base = siteUrl();
  const budget = formatBudget(task.budget_estimate);
  const desiredDate = formatDate(task.desired_date);

  await sendBatch(
    recipients.slice(0, MAX_WORKER_ALERTS).map((worker) => ({
      to: worker.email,
      email: workerTaskAlertEmail({
        workerFirstName: firstName(worker.name),
        title: task.title,
        city: task.city,
        category: task.category,
        budget,
        desiredDate,
        taskUrl: `${base}/taches/${task.id}`,
        unsubscribeUrl: unsubscribeUrl(worker.unsubscribe_token),
      }),
    })),
  );

  if (recipients.length > MAX_WORKER_ALERTS) {
    console.warn(
      `notifyMatchingWorkers: ${recipients.length} destinataires, plafonné à ${MAX_WORKER_ALERTS}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Nouvelle candidature
// ---------------------------------------------------------------------------

/**
 * Prévient l'employeur qu'on s'est proposé pour sa tâche.
 *
 * Le courriel ne contient PAS les coordonnées du candidat : la mise en
 * relation est le service facturé. Il annonce, et ramène sur la plateforme.
 */
export async function notifyNewApplication(input: {
  taskId: string;
  applicantName: string;
  message: string | null;
}): Promise<void> {
  try {
    if (!getResend()) return;

    // Les coordonnées du demandeur sont invisibles au visiteur (RLS) : c'est
    // le client admin qui les relit, côté serveur uniquement.
    const admin = createAdminClient();
    if (!admin) return;

    const { data, error } = await admin
      .from("tasks")
      .select("title, contact_name, contact_email")
      .eq("id", input.taskId)
      .maybeSingle();

    if (error || !data) {
      console.error("notifyNewApplication: tâche introuvable", error);
      return;
    }

    const task = data as {
      title: string;
      contact_name: string;
      contact_email: string;
    };
    const base = siteUrl();

    await send(
      task.contact_email,
      employerNewApplicationEmail({
        contactName: firstName(task.contact_name),
        taskTitle: task.title,
        applicantFirstName: firstName(input.applicantName),
        message: input.message,
        dashboardUrl: `${base}/mon-compte`,
      }),
    );

    const operator = operatorEmail();
    if (operator && operator !== task.contact_email) {
      await send(operator, {
        subject: `Candidature reçue — ${task.title}`,
        html: `<p>${firstName(input.applicantName)} s'est proposé(e) pour « ${task.title} ».</p><p><a href="${base}/admin/candidatures">Voir les candidatures</a></p>`,
        text: `${firstName(input.applicantName)} s'est proposé(e) pour « ${task.title} ».\n\n${base}/admin/candidatures`,
      });
    }
  } catch (error) {
    console.error("notifyNewApplication", error);
  }
}

// ---------------------------------------------------------------------------
// Inscription d'un travailleur
// ---------------------------------------------------------------------------

/**
 * Accueille un nouveau travailleur.
 *
 * Le nombre de tâches ouvertes dans sa ville est le seul argument qui compte :
 * un vivier ne reste actif que si la personne croit qu'il y a du travail.
 * Le jeton de désabonnement est relu par le client admin — la RLS interdit au
 * visiteur anonyme de relire la ligne qu'il vient d'insérer.
 */
export async function notifyWorkerWelcome(input: {
  email: string;
  name: string;
  city: string;
  openTasksInCity: number;
}): Promise<void> {
  try {
    if (!getResend()) return;

    const admin = createAdminClient();
    if (!admin) return;

    const { data } = await admin
      .from("workers")
      .select("unsubscribe_token")
      .eq("email", input.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const token = (data as { unsubscribe_token: string } | null)
      ?.unsubscribe_token;
    // Sans jeton, pas d'envoi : un message commercial sans lien de
    // désabonnement fonctionnel n'est pas conforme à la LCAP.
    if (!token) return;

    await send(
      input.email,
      workerWelcomeEmail({
        firstName: firstName(input.name),
        city: input.city,
        openTasks: input.openTasksInCity,
        tasksUrl: `${siteUrl()}/taches?city=${encodeURIComponent(input.city)}`,
        unsubscribeUrl: unsubscribeUrl(token),
      }),
    );
  } catch (error) {
    console.error("notifyWorkerWelcome", error);
  }
}

// ---------------------------------------------------------------------------
// Mise en relation payée (depuis le webhook Stripe)
// ---------------------------------------------------------------------------

/**
 * Le courriel à ne jamais manquer : l'argent est encaissé, la promesse est
 * due. Envoyé depuis le webhook Stripe, donc à l'instant du paiement.
 */
export async function notifyPaidConnection(
  connectionRequestId: string,
): Promise<void> {
  try {
    const operator = operatorEmail();
    if (!operator || !getResend()) return;

    const admin = createAdminClient();
    if (!admin) return;

    const { data, error } = await admin
      .from("connection_requests")
      .select(
        "client_name, client_phone, client_email, worker_name, city, need, amount_paid",
      )
      .eq("id", connectionRequestId)
      .maybeSingle();

    if (error || !data) {
      console.error("notifyPaidConnection: demande introuvable", error);
      return;
    }

    const r = data as {
      client_name: string;
      client_phone: string;
      client_email: string;
      worker_name: string | null;
      city: string | null;
      need: string | null;
      amount_paid: number | null;
    };

    await send(
      operator,
      operatorPaidConnectionEmail({
        clientName: r.client_name,
        clientPhone: r.client_phone,
        clientEmail: r.client_email,
        workerName: r.worker_name ?? "un travailleur",
        amount: formatBudget(r.amount_paid),
        city: r.city,
        need: r.need,
        adminUrl: `${siteUrl()}/admin/operations`,
      }),
    );
  } catch (error) {
    console.error("notifyPaidConnection", error);
  }
}
