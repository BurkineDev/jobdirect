"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/lib/actions/admin";
import { Button } from "@/components/ui/Button";

/** Validation 1-clic d'une tâche en attente (pending → active). */
export function ActivateTaskButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => updateTaskStatus(taskId, "active"))}
    >
      {pending ? "Activation…" : "Activer"}
    </Button>
  );
}
