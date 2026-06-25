import Link from "next/link";
import { Logo } from "./Logo";
import { ButtonLink } from "@/components/ui/Button";

const navLinks = [
  { href: "/taches", label: "Parcourir les tâches" },
  { href: "/travailleur", label: "Je cherche du travail" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        {/* Navigation bureau */}
        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {link.label}
            </Link>
          ))}
          <ButtonLink href="/publier" size="sm" className="ml-1">
            Publier une tâche
          </ButtonLink>
        </nav>

        {/* Navigation mobile — disclosure natif, sans JS */}
        <details className="relative sm:hidden [&_svg.chev]:open:rotate-180">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
            <svg
              className="chev transition-transform"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="sr-only">Menu</span>
          </summary>
          <div className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {link.label}
              </Link>
            ))}
            <ButtonLink href="/publier" className="mt-1 w-full">
              Publier une tâche
            </ButtonLink>
          </div>
        </details>
      </div>
    </header>
  );
}
