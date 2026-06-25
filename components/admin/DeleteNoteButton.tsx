"use client";

import { useTransition } from "react";
import { deleteAdminNote } from "@/lib/actions/admin";

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => deleteAdminNote(noteId))}
      className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
    >
      Supprimer
    </button>
  );
}
