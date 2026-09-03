import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { EmployerDashboard } from "@/components/account/EmployerDashboard";
import { WorkerDashboard } from "@/components/account/WorkerDashboard";
import { RoleChooser } from "@/components/auth/RoleChooser";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon tableau de bord" };

export default async function MonComptePage({
  searchParams,
}: {
  searchParams: Promise<{ mdp?: string }>;
}) {
  const [profile, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);
  if (!profile) redirect("/connexion?redirect=/mon-compte");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-brand-600">
          {profile.role === "employer" ? "Compte employeur" : "Compte travailleur"}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
          Bonjour, {profile.full_name || profile.email}
        </h1>
      </header>

      {/* Confirmation après une réinitialisation réussie : sans elle, la
          personne atterrit sur son tableau de bord sans savoir si le
          changement a bien été pris en compte. */}
      {params.mdp === "change" && (
        <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">
            Votre mot de passe a été modifié. Vous êtes maintenant connecté.
          </p>
        </div>
      )}

      {!profile.role_confirmed && <RoleChooser />}

      {profile.role === "employer" ? (
        <EmployerDashboard userId={profile.id} />
      ) : (
        <WorkerDashboard profile={profile} />
      )}
    </div>
  );
}
