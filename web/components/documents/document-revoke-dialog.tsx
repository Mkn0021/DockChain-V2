"use client";

import { cn } from "cn";
import { XCircle } from "lucide-react";
import { useState } from "react";
import { parseEther } from "viem";
import {
  useChainId,
  useConnection,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePrepareRevoke, useSubmitRevoke } from "@/lib/api/queries/documents";

const REASON_OPTIONS = [
  { value: "error", label: "Issued in error" },
  { value: "fraud", label: "Fraud" },
  { value: "superseded", label: "Superseded" },
  { value: "holder_request", label: "Holder request" },
  { value: "other", label: "Other" },
] as const;

type ReasonCode = (typeof REASON_OPTIONS)[number]["value"];

interface DocumentRevokeDialogProps {
  organizationId: string;
  documentId: string;
}

export function DocumentRevokeDialog({
  organizationId,
  documentId,
}: DocumentRevokeDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReasonCode>("error");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"form" | "signing" | "submitting">("form");

  const { address } = useConnection();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { mutateAsync: signTypedDataAsync } = useSignTypedData();
  const { mutateAsync: sendTransactionAsync } = useSendTransaction();

  const prepare = usePrepareRevoke(organizationId, documentId);
  const submit = useSubmitRevoke(organizationId, documentId);

  async function handleRevoke() {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }

    try {
      setStep("signing");
      const prepared = await prepare.mutateAsync({
        mode: "signature",
        reasonCode: reason,
        note: note || undefined,
      });

      let submitBody: {
        revocationId: string;
        signature?: string;
        txHash?: string;
      };

      if (prepared.mode === "signature") {
        const td = prepared.typedData;
        const signature = await signTypedDataAsync({
          domain: td.domain,
          message: td.message,
          primaryType: td.primaryType,
          types: td.types,
        } as Parameters<typeof signTypedDataAsync>[0]);
        submitBody = { revocationId: prepared.revocationId, signature };
      } else {
        if (chainId !== prepared.chainId) {
          await switchChainAsync({ chainId: prepared.chainId });
        }
        const txHash = await sendTransactionAsync({
          to: prepared.to as `0x${string}`,
          data: prepared.data as `0x${string}`,
          value: parseEther("0"),
          chainId: prepared.chainId,
        });
        submitBody = { revocationId: prepared.revocationId, txHash };
      }

      setStep("submitting");
      await submit.mutateAsync(submitBody);
      toast.success("Revocation submitted.");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Revocation failed."
      );
    } finally {
      setStep("form");
    }
  }

  const busy = step !== "form" || prepare.isPending || submit.isPending;

  let submitLabel: string;
  if (step === "signing") {
    submitLabel = "Awaiting signature…";
  } else if (step === "submitting") {
    submitLabel = "Submitting…";
  } else {
    submitLabel = "Sign & revoke";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setOpen(next);
          if (!next) {
            setReason("error");
            setNote("");
          }
        }
      }}
    >
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "destructive" }),
          "hover:translate-y-0"
        )}
      >
        <XCircle className="size-4" />
        Revoke
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke document</DialogTitle>
          <DialogDescription>
            Revocation is permanent and recorded on-chain. You&apos;ll be asked
            to sign with your connected wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="revoke-reason">Reason</Label>
            <select
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReasonCode)}
              disabled={busy}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revoke-note">Note (optional)</Label>
            <Input
              id="revoke-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for the audit trail"
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRevoke}
            disabled={busy || !address}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
