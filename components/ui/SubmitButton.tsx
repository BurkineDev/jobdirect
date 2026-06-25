"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Button>, "type"> & {
  pendingText?: string;
};

export function SubmitButton({
  children,
  pendingText = "Envoi en cours…",
  ...props
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
