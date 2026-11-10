"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authClient } from "@/lib/auth/client";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  inviterEmail: string;
  status: string;
  expiresAt: string;
}

function CenteredMessage({ message }: { message: string }) {
  return (
    <Card className="w-full max-w-md p-8 text-center text-sm text-muted-foreground">
      {message}
    </Card>
  );
}

export function AcceptInvitationCard({
  invitationId,
}: {
  invitationId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const invitationQuery = useQuery({
    queryKey: ["invitation", invitationId],
    queryFn: async () => {
      const { data } = await authClient.organization.getInvitation({
        query: { id: invitationId },
      });
      return (data as InvitationData | null) ?? null;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Invitation accepted.");
      const slug =
        invitationQuery.data?.organizationSlug ??
        (data?.member?.organizationId ? undefined : undefined);
      if (data?.member?.organizationId) {
        await authClient.organization.setActive({
          organizationId: data.member.organizationId,
        });
      }
      router.replace(slug ? `/${slug}/dashboard` : "/");
    },
    onError: (e: unknown) => {
      toast.error(
        e instanceof Error ? e.message : "Failed to accept invitation."
      );
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.rejectInvitation({
        invitationId,
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Invitation declined.");
      router.replace("/");
    },
    onError: (e: unknown) => {
      toast.error(
        e instanceof Error ? e.message : "Failed to decline invitation."
      );
    },
  });

  if (invitationQuery.isPending) {
    return <CenteredMessage message="Loading invitation…" />;
  }

  if (invitationQuery.isError || !invitationQuery.data) {
    return (
      <CenteredMessage message="This invitation is invalid or has expired." />
    );
  }

  const invitation = invitationQuery.data;

  if (invitation.status !== "pending") {
    return (
      <CenteredMessage
        message={`This invitation is already ${invitation.status}.`}
      />
    );
  }

  const busy = acceptMutation.isPending || declineMutation.isPending;

  return (
    <Card className="w-full max-w-md p-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">
          Join {invitation.organizationName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invitation.inviterEmail} invited you to join as{" "}
          <span className="font-medium text-foreground capitalize">
            {invitation.role}
          </span>
          .
        </p>
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          className="flex-1"
          disabled={busy}
          onClick={() => acceptMutation.mutate()}
        >
          {acceptMutation.isPending ? "Accepting…" : "Accept"}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => declineMutation.mutate()}
        >
          {declineMutation.isPending ? "Declining…" : "Decline"}
        </Button>
      </div>
    </Card>
  );
}
