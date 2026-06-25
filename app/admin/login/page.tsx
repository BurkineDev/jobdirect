import type { Metadata } from "next";
import { Logo } from "@/components/site/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Connexion admin",
  robots: { index: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-ink">Espace administration</h1>
          <p className="mt-1 text-sm text-gray-600">
            Réservé à l&apos;équipe JobDirect.
          </p>
          <div className="mt-6">
            <LoginForm redirectTo={redirect} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          JobDirect · Espace sécurisé
        </p>
      </div>
    </div>
  );
}
