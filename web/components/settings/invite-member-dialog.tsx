"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { ChevronDown, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { toast } from "@/components/providers/toast-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useInviteMember } from "@/lib/api/queries/invitations";
import {
  INVITE_ROLES,
  inviteFormSchema,
  type InviteFormValues,
} from "@/lib/schemas/invite-member";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MenuItem } from "../ui/menu-item";

import { MAX_MEMBERS } from "./members-table";

interface InviteMemberDialogProps {
  organizationId: string;
  currentMemberCount: number;
}

export function InviteMemberDialog({
  organizationId,
  currentMemberCount,
}: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const mutation = useInviteMember(organizationId);
  const atCapacity = currentMemberCount >= MAX_MEMBERS;

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", role: "issuer" },
    mode: "onSubmit",
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset({ email: "", role: "issuer" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        disabled={atCapacity}
        className={cn(
          buttonVariants(),
          "flex items-center justify-center hover:translate-y-0"
        )}
      >
        {!atCapacity && <PlusIcon className="size-5" />}
        {atCapacity ? "Member limit reached" : "Invite member"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Send an invitation by email. They&apos;ll pick up the role you
            assign. Organizations can have at most{" "}
            <strong>{MAX_MEMBERS} members</strong>.
          </DialogDescription>
        </DialogHeader>

        <form
          id="invite-member-form"
          noValidate
          onSubmit={form.handleSubmit((values) =>
            mutation.mutate(values, {
              onSuccess: () => {
                toast.success("Invitation sent.");
                setOpen(false);
              },
              onError: (error: unknown) => {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to send invitation.";
                toast.error(message);
              },
            })
          )}
        >
          <FieldGroup>
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                  <Input
                    {...field}
                    aria-invalid={fieldState.invalid}
                    autoComplete="email"
                    id="invite-email"
                    placeholder="name@company.com"
                    type="email"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Role</FieldLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={field.disabled}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full justify-between font-normal",
                        fieldState.invalid && "border-destructive"
                      )}
                    >
                      <span className="capitalize">{field.value}</span>
                      <ChevronDown className="size-4 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      matchTriggerWidth
                      align="start"
                      className="[&>*:first-child]:rounded-t-2xl"
                    >
                      {INVITE_ROLES.map((value) => (
                        <MenuItem
                          key={value}
                          label={value}
                          isActive={field.value === value}
                          onClick={() => field.onChange(value)}
                          className="capitalize"
                        />
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <SubmitButton
            className="w-auto"
            pending={mutation.isPending}
            disabled={!form.formState.isDirty}
            form="invite-member-form"
          >
            Send invitation
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
