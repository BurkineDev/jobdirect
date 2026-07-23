import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-gray-600">
              La plateforme locale du Québec pour publier des tâches ponctuelles
              et trouver de l&apos;aide près de chez vous.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link href="/taches" className="text-gray-600 hover:text-brand-600">
              Parcourir les tâches
            </Link>
            <Link href="/publier" className="text-gray-600 hover:text-brand-600">
              Publier une tâche
            </Link>
            <Link
              href="/travailleur"
              className="text-gray-600 hover:text-brand-600"
            >
              Je cherche du travail
            </Link>
            <Link
              href="/confidentialite"
              className="text-gray-600 hover:text-brand-600"
            >
              Confidentialité
            </Link>
            <Link
              href="/admin"
              className="text-gray-600 hover:text-brand-600"
            >
              Espace admin
            </Link>
          </nav>
        </div>

        <p className="mt-8 border-t border-gray-200 pt-6 text-xs text-gray-500">
          © {new Date().getFullYear()} JobDirect. Tous droits réservés. Fait au
          Québec.
        </p>
      </div>
    </footer>
  );
}
