import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { EmployerDashboard } from "@/components/account/EmployerDashboard";
import { WorkerDashboard } from "@/components/account/WorkerDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon tableau de bord" };

export default async function MonComptePage() {
  const profile = await getCurrentProfile();
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

      {profile.role === "employer" ? (
        <EmployerDashboard userId={profile.id} />
      ) : (
        <WorkerDashboard profile={profile} />
      )}
    </div>
  );
}
