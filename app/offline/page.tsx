import type { Metadata } from "next";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = {
  title: "Hors ligne",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold text-ink">Vous êtes hors ligne</h1>
      <p className="mt-2 max-w-sm text-gray-600">
        JobDirect a besoin d&apos;une connexion Internet. Vérifiez votre réseau,
        puis réessayez.
      </p>
      <a
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-6 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Réessayer
      </a>
    </div>
  );
}
