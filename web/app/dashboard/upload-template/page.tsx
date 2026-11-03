"use client";

import React, { useState } from "react";
import { IoCloudUploadOutline, IoClose } from "react-icons/io5";

import { Button } from "@/components/_ui/Button";
import InputBox from "@/components/_ui/InputBox";
import { useAlert } from "@/components/providers/AlertProvider";
import {
  UPLOAD_TEMPLATE,
  DEPLOYMENT_INSTRUCTIONS,
} from "@/data/dashboard.data";
import ApiClient from "@/lib/api-client";

import InfoBox from "../../../components/dashboard/InfoBox";

export default function UploadTemplatePage() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [svgTemplate, setSvgTemplate] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const canDeploy = selectedFile && title.trim() !== "";

  const { showAlert } = useAlert();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files![0];
    if (file && file.type === UPLOAD_TEMPLATE.fileTypes.svg) {
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setSvgTemplate(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setSvgTemplate("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeploy = async () => {
    if (!canDeploy) return;

    setIsDeploying(true);
    try {
      if (!svgTemplate) throw new Error("SVG template is empty");

      const response = await ApiClient.post("/templates/", {
        name: title,
        description: description || "",
        svgTemplate,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to deploy template");
      }

      showAlert(UPLOAD_TEMPLATE.alerts.deploySuccess, "success");
      window.location.href = "/dashboard/issue-document";
    } catch (error) {
      showAlert(
        UPLOAD_TEMPLATE.alerts.deployError((error as Error).message),
        "error"
      );
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <main className="w-full">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Upload & Preview Box */}
        <div>
          <div
            className={`flex flex-col items-center justify-center relative h-96 ${!selectedFile ? "border-2 border-dashed border-border hover:border-text-muted cursor-pointer" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {!selectedFile ? (
              <>
                <IoCloudUploadOutline size={96} className="text-border" />
                <h4 className="m-0 p-0">Upload SVG Template</h4>
                <p className="text-text-secondary">
                  Click to select an SVG file for preview and upload
                </p>
              </>
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <button
                  onClick={clearFile}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md"
                  title="Remove file"
                >
                  <IoClose
                    size={20}
                    className="text-text-primary hover:text-red-600 transition-colors"
                  />
                </button>

                {/* SVG Preview */}
                <div className="w-full h-96 border-2 border-border rounded-lg p-2 bg-background-muted shadow-xs overflow-hidden">
                  <div
                    className="w-full h-full flex items-center justify-center [&_svg]:rounded-lg [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto"
                    dangerouslySetInnerHTML={{ __html: svgTemplate }}
                  />
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        {/* Right Side: Template Information */}
        <div>
          <div className="space-y-6">
            <InputBox
              label="Template Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for your template..."
              required
            />

            <InputBox
              label="Template Description"
              variant="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of your template, its use cases, and features..."
              required
            />
            <InfoBox
              title="Deployment Process"
              items={DEPLOYMENT_INSTRUCTIONS}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-6">
        <Button
          onClick={handleDeploy}
          disabled={!canDeploy || isDeploying}
          className="w-72"
        >
          {isDeploying ? "Deploying to Blockchain..." : "Deploy to Blockchain"}
        </Button>
      </div>
    </main>
  );
}
