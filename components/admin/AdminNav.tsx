"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { signOut } from "@/lib/actions/admin";

const links = [
  { href: "/admin", label: "Tâches" },
  { href: "/admin/operations", label: "Opérations" },
  { href: "/admin/travailleurs", label: "Travailleurs" },
  { href: "/admin/candidatures", label: "Candidatures" },
];

export function AdminNav({ email }: { email?: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const active =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {email && <span className="hidden text-gray-500 sm:inline">{email}</span>}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 font-medium text-gray-600 hover:bg-gray-100"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
