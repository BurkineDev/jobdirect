"use client";

import Link from "next/link";
import { signOutUser } from "@/lib/actions/auth";
import type { SessionProfile } from "@/lib/types";

export function AccountMenu({ profile }: { profile: SessionProfile }) {
  const roleLabel = profile.role === "employer" ? "Employeur" : "Travailleur";
  const initial = (profile.full_name || profile.email || "?").charAt(0).toUpperCase();

  return (
    <details className="relative [&_svg.chev]:open:rotate-180">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
          {initial}
        </span>
        <svg
          className="chev transition-transform"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span className="sr-only">Mon compte</span>
      </summary>

      <div className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
        <div className="border-b border-gray-100 px-3 py-2">
          <p className="truncate text-sm font-semibold text-ink">
            {profile.full_name || profile.email}
          </p>
          <p className="text-xs text-gray-500">{roleLabel}</p>
        </div>
        <Link
          href="/mon-compte"
          className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Mon tableau de bord
        </Link>
        <form action={signOutUser}>
          <button
            type="submit"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </details>
  );
}
