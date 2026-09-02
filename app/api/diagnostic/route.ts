import { getAdminUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectionFee, isStripeEnabled } from "@/lib/stripe";
import { siteUrl } from "@/lib/site";

/**
 * Diagnostic de configuration — réservé aux administrateurs.
 *
 * Répond à la question « mes variables d'environnement sont-elles vues par
 * CE déploiement ? », qui ne peut pas se vérifier depuis l'extérieur : Vercel
 * fige les variables dans chaque déploiement, et une variable enregistrée
 * pour « Preview » seulement reste invisible en production sans aucun signal.
 *
 * SÉCURITÉ — cette route ne renvoie JAMAIS la valeur d'un secret :
 *   • uniquement des booléens de présence ;
 *   • pour Stripe, le MODE seul (« test » ou « live »), déduit du préfixe ;
 *   • `siteUrl` est une URL publique, déjà visible de tous.
 * Un visiteur non-administrateur reçoit 404, pas 403 : l'existence même de
 * la route n'est pas divulguée.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return new Response("Not found", { status: 404 });
  }

  const present = (name: string) => Boolean(process.env[name]);

  const env = {
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    ADMIN_EMAILS: present("ADMIN_EMAILS"),
    SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
    STRIPE_SECRET_KEY: present("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: present("STRIPE_WEBHOOK_SECRET"),
    NEXT_PUBLIC_SITE_URL: present("NEXT_PUBLIC_SITE_URL"),
    CONNECTION_FEE_CAD: present("CONNECTION_FEE_CAD"),
  };

  // Mode Stripe : le préfixe de la clé, jamais la clé.
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = secretKey.startsWith("sk_live_")
    ? "live"
    : secretKey.startsWith("sk_test_")
      ? "test"
      : secretKey
        ? "inconnu"
        : null;

  // Vérification RÉELLE de la clé service role : une clé présente mais
  // tronquée ou erronée passerait le simple test de présence.
  let serviceRoleWorks = false;
  let serviceRoleError: string | null = null;
  const supabaseAdmin = createAdminClient();
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true });
    if (error) {
      serviceRoleError = error.message;
    } else {
      serviceRoleWorks = true;
    }
  }

  const problems: string[] = [];
  if (!env.STRIPE_SECRET_KEY)
    problems.push("STRIPE_SECRET_KEY absente de ce déploiement.");
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    problems.push("SUPABASE_SERVICE_ROLE_KEY absente de ce déploiement.");
  if (!env.STRIPE_WEBHOOK_SECRET)
    problems.push("STRIPE_WEBHOOK_SECRET absente : le webhook répondra 503.");
  if (env.SUPABASE_SERVICE_ROLE_KEY && !serviceRoleWorks)
    problems.push(
      `Clé service role présente mais refusée par Supabase : ${serviceRoleError ?? "erreur inconnue"}`,
    );
  if (!env.NEXT_PUBLIC_SITE_URL)
    problems.push(
      `NEXT_PUBLIC_SITE_URL absente : les retours Stripe et OAuth utiliseront ${siteUrl()}`,
    );
  if (stripeMode === "live")
    problems.push("Stripe est en mode LIVE : les paiements sont réels.");
  if (problems.length === 0)
    problems.push("Aucun problème détecté : la configuration est complète.");

  return Response.json(
    {
      deploiement: {
        siteUrl: siteUrl(),
        vercelEnv: process.env.VERCEL_ENV ?? "local",
        nodeEnv: process.env.NODE_ENV,
      },
      variables: env,
      stripe: {
        actif: isStripeEnabled(),
        mode: stripeMode,
        webhookPret: Boolean(
          process.env.STRIPE_SECRET_KEY &&
            process.env.STRIPE_WEBHOOK_SECRET &&
            supabaseAdmin,
        ),
        fraisMiseEnRelation: connectionFee(),
      },
      cleServiceRole: {
        configuree: env.SUPABASE_SERVICE_ROLE_KEY,
        fonctionnelle: serviceRoleWorks,
        erreur: serviceRoleError,
      },
      diagnostic: problems,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
