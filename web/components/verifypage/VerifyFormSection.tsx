import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import { Button } from "@/components/_ui/Button";
import InputBox from "@/components/_ui/InputBox";
import {
  VERIFICATION_STATUS_MAP,
  VERIFY_INSTRUCTIONS,
  StatusKey,
} from "@/data/verifypage.data";
import ApiClient from "@/lib/api-client";
import { VerificationResult } from "@/types/document.type";

import InfoBox from "../dashboard/InfoBox";
import { useAlert } from "../providers/AlertProvider";

const VerifyFormSection: React.FC = () => {
  const [templateId, setTemplateId] = useState("");
  const [documentHash, setDocumentHash] = useState("");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  const params = useSearchParams();

  const handleVerification = useCallback(
    async (templateIdToVerify?: string, documentHashToVerify?: string) => {
      const finalTemplateId = templateIdToVerify || templateId;
      const finalDocumentHash = documentHashToVerify || documentHash;

      try {
        setLoading(true);
        setVerificationResult(null);

        if (!finalTemplateId.trim() || !finalDocumentHash.trim()) {
          throw new Error("Template ID and Document Hash are required");
        }

        const response = await ApiClient.post<VerificationResult>(
          "/documents/verify",
          {
            templateId: finalTemplateId.trim(),
            documentHash: finalDocumentHash.trim(),
          }
        );

        if (!response.success) {
          throw new Error(response.error || "Failed to verify document");
        }

        setVerificationResult(response.data);
      } catch (error) {
        showAlert(
          `Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error"
        );
      } finally {
        setLoading(false);
      }
    },
    [templateId, documentHash, showAlert]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleVerification();
  };

  useEffect(() => {
    const urlTemplateId = params.get("templateId");
    const urlDocumentHash = params.get("docHash");

    if (urlTemplateId) setTemplateId(urlTemplateId);
    if (urlDocumentHash) setDocumentHash(urlDocumentHash);

    if (urlTemplateId && urlDocumentHash) {
      handleVerification(urlTemplateId, urlDocumentHash);
    }
  }, [params, handleVerification]);

  const canSubmit = templateId.trim() && documentHash.trim();

  if (verificationResult) {
    const key = verificationResult.exists
      ? verificationResult.isValid
        ? "verified"
        : "invalid"
      : "notFound";
    const status = VERIFICATION_STATUS_MAP[key as StatusKey];
    const Icon = status.icon;

    return (
      <div className="flex flex-col gap-6 animate-in fade-in-0 zoom-in-95 duration-500">
        <div
          className={`flex justify-center items-center px-6 py-4 gap-4 border-2 rounded-xl ${status.containerClass}`}
        >
          <Icon className={`${status.iconColorClass} rounded-none`} size={64} />
          <div className="flex-1">
            <h4
              className={`p-0 m-0 text-2xl font-semibold ${status.textClass}`}
            >
              {status.title}
            </h4>
            <p className={`text-sm ${status.textClass} opacity-80`}>
              {status.subtitle}
            </p>
          </div>
        </div>

        {verificationResult.exists && verificationResult.isValid && (
          <InfoBox
            title="Document Details"
            items={[
              `Issuer: ${verificationResult.issuer || "N/A"}`,
              `Issued At: ${verificationResult.issuedAt || "N/A"}`,
            ]}
          />
        )}

        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = "/verify";
          }}
          disabled={loading}
          className="w-full"
        >
          Verify Another Document
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <InputBox
          label="Template ID"
          placeholder="Enter Template ID"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          disabled={loading}
        />

        <InputBox
          label="Document Hash"
          placeholder="Enter Document Hash"
          value={documentHash}
          onChange={(e) => setDocumentHash(e.target.value)}
          disabled={loading}
        />

        <InfoBox
          items={VERIFY_INSTRUCTIONS.filter(
            (inst) => inst.key === "manual"
          ).map((inst) => inst.details)}
          className="mt-2"
        />

        <Button
          variant="primary"
          type="submit"
          className="w-full mt-2"
          disabled={loading || !canSubmit}
        >
          {loading ? "Verifying..." : "Verify Document"}
        </Button>
      </form>
    </div>
  );
};

export default VerifyFormSection;
