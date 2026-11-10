"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "@/components/providers/toast-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDeleteOrganization } from "@/lib/api/queries/organization";

interface DangerZoneProps {
  organizationId: string;
  organizationName: string;
  canDelete: boolean;
}

export function DangerZone({
  organizationId,
  organizationName,
  canDelete,
}: DangerZoneProps) {
  const router = useRouter();
  const mutation = useDeleteOrganization(organizationId);
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);

  const confirmed = confirm.trim() === organizationName.trim();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirm("");
    }
  }

  function handleConfirmDelete() {
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Organization deleted.");
        router.replace("/");
        router.refresh();
      },
      onError: (error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete organization.";
        toast.error(message);
      },
    });
  }

  if (!canDelete) {
    return null;
  }

  return (
    <section className="mt-8 h-fit rounded-lg border border-destructive/40 p-6">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-destructive">
          Danger zone
        </h2>
        <p className="text-sm text-muted-foreground">
          Deleting this organization removes all members, invitations, wallets,
          templates, documents, batches, webhooks and API keys permanently. This
          cannot be undone.
        </p>
      </header>

      <div className="mt-4 flex justify-end">
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger
            className={buttonVariants({ variant: "destructive" })}
          >
            Delete organization
          </AlertDialogTrigger>
          <AlertDialogContent className="min-w-fit">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete &ldquo;{organizationName}&rdquo;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. To confirm, type the organization
                name{" "}
                <span className="font-mono font-semibold text-foreground">
                  {organizationName}
                </span>{" "}
                below.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="confirm-org-name">
                  Organization name
                </FieldLabel>
                <Input
                  id="confirm-org-name"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="off"
                  autoFocus
                  disabled={mutation.isPending}
                />
              </Field>
            </FieldGroup>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={mutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={!confirmed || mutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  handleConfirmDelete();
                }}
                className={buttonVariants({ variant: "destructive" })}
              >
                {mutation.isPending ? "Deleting…" : "Delete organization"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
