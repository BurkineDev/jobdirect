import "server-only";
import { Resend } from "resend";

/**
 * Accès Resend côté serveur.
 *
 * Le courriel est OPTIONNEL, exactement comme Stripe : sans `RESEND_API_KEY`,
 * l'application se comporte comme avant (aucune notification), et rien ne
 * casse. C'est la même philosophie que le reste du projet — une intégration
 * absente doit dégrader le service, jamais l'interrompre.
 */

let cached: Resend | null = null;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

export function isEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Expéditeur. Un sous-domaine dédié (`mail.`) isole la réputation d'envoi :
 * si le volume transactionnel était un jour signalé comme indésirable, le
 * domaine principal ne serait pas contaminé.
 */
export function emailFrom(): string {
  // `||` et non `??` : une variable d'environnement DÉFINIE MAIS VIDE est un
  // grand classique (on la crée dans l'interface Vercel sans coller la
  // valeur). `??` ne retombe que sur `undefined`, si bien qu'une chaîne vide
  // passerait telle quelle et Resend refuserait l'envoi — sans que rien ne
  // l'explique. Ici, vide vaut absent.
  return (
    process.env.EMAIL_FROM?.trim() ||
    "JobDirect <notifications@mail.jobdirectquebec.com>"
  );
}

/**
 * Adresse de réponse : une vraie boîte lue par un humain.
 *
 * Indispensable — un destinataire qui répond à une notification s'attend à
 * joindre quelqu'un. Sans `reply-to`, sa réponse part vers une adresse
 * d'envoi qui ne reçoit rien, et le client se croit ignoré.
 */
export function emailReplyTo(): string | undefined {
  // Même raison que pour l'expéditeur : vide doit valoir absent.
  return process.env.EMAIL_REPLY_TO?.trim() || operatorEmail();
}

/**
 * Adresse de l'opérateur : le premier courriel de `ADMIN_EMAILS`.
 * Réutiliser cette variable évite une configuration de plus à tenir à jour.
 */
export function operatorEmail(): string | undefined {
  const first = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)[0];
  return first || undefined;
}
