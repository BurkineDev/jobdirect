"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAdminNote } from "@/lib/actions/admin";
import { Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormState } from "@/lib/types";

const initial: FormState = { status: "idle" };

export function NoteForm({ taskId }: { taskId: string }) {
  const [state, formAction] = useActionState(addAdminNote, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <input type="hidden" name="task_id" value={taskId} />
      <Textarea
        name="note"
        placeholder="Ajouter une note interne…"
        className="min-h-20 text-sm"
        required
      />
      {state.status === "error" && (
        <p className="text-xs text-red-600">{state.message}</p>
      )}
      <SubmitButton size="sm" variant="secondary" pendingText="Ajout…">
        Ajouter la note
      </SubmitButton>
    </form>
  );
}
