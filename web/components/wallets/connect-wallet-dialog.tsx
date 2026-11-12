"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  useChainId,
  useConnect,
  useConnection,
  useConnectors,
  useSignMessage,
} from "wagmi";

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
import {
  useCreateWalletChallenge,
  useRegisterWallet,
} from "@/lib/api/queries/wallets";
import {
  walletConnectSchema,
  type WalletConnectValues,
} from "@/lib/schemas/wallet-connect";

export function ConnectWalletDialog({
  organizationId,
}: {
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useConnection();
  const connectors = useConnectors();
  const { mutate: connect, isPending: isConnecting } = useConnect();
  const chainId = useChainId();
  const { mutateAsync: signMessageAsync } = useSignMessage();

  const challengeMutation = useCreateWalletChallenge(organizationId);
  const registerMutation = useRegisterWallet(organizationId);

  const form = useForm<WalletConnectValues>({
    resolver: zodResolver(walletConnectSchema),
    defaultValues: { label: "", domain: "" },
    mode: "onChange",
  });

  const isBusy = challengeMutation.isPending || registerMutation.isPending;

  async function handleConnectAndRegister(values: WalletConnectValues) {
    if (!address) {
      toast.error("Connect a wallet first.");
      return;
    }

    try {
      const challenge = await challengeMutation.mutateAsync({
        address,
        chainId,
      });

      const signature = await signMessageAsync({
        message: challenge.message,
      });

      await registerMutation.mutateAsync({
        address,
        domain: values.domain || undefined,
        label: values.label,
        message: challenge.message,
        signature,
      });

      toast.success("Wallet registered.");
      setOpen(false);
      form.reset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Wallet registration failed.";
      toast.error(message);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
    }
  }

  const [primaryConnector] = connectors;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={cn(buttonVariants(), "hover:translate-y-0")}>
        Connect wallet
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect issuer wallet</DialogTitle>
          <DialogDescription className="space-y-2 text-sm">
            <span className="block">
              Connect the browser wallet that will sign batches and revocations
              for this organization. MetaMask, Rabby, or any injected EVM wallet
              works.
            </span>
            <span className="block text-xs text-muted-foreground">
              Make sure your wallet is on{" "}
              <strong>Anvil (chain ID 31337)</strong> or the chain shown in
              settings. You&apos;ll sign a message to prove ownership — no
              transaction, no gas.
            </span>
          </DialogDescription>
        </DialogHeader>

        {isConnected ? (
          <form
            id="connect-wallet-form"
            noValidate
            onSubmit={form.handleSubmit(handleConnectAndRegister)}
          >
            <FieldGroup>
              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input value={address ?? ""} readOnly className="font-mono" />
                <p className="text-xs text-muted-foreground">
                  This address will be recorded as the issuer on every document
                  and will be required to sign batches on-chain.
                </p>
              </Field>

              <Controller
                control={form.control}
                name="label"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="wallet-label">Label</FieldLabel>
                    <Input
                      {...field}
                      id="wallet-label"
                      aria-invalid={fieldState.invalid}
                      placeholder="e.g. Treasury signer"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="domain"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="wallet-domain">
                      Domain (optional)
                    </FieldLabel>
                    <Input
                      {...field}
                      id="wallet-domain"
                      aria-invalid={fieldState.invalid}
                      placeholder="example.com"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        ) : (
          <Button
            type="button"
            disabled={!primaryConnector || isConnecting}
            onClick={() =>
              primaryConnector && connect({ connector: primaryConnector })
            }
          >
            {isConnecting ? "Connecting…" : "Connect browser wallet"}
          </Button>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          {isConnected ? (
            <SubmitButton
              className="w-auto"
              pending={isBusy}
              form="connect-wallet-form"
            >
              Sign & register
            </SubmitButton>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
