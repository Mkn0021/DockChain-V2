"use client";

import { useState } from "react";

import { Template } from "@/types/template.type";

import StepperLayout, {
  StepperProvider,
} from "../../../components/dashboard/StepperLayout";
import SelectionStep from "./(components)/1_SelectionStep";
import FillFieldsStep from "./(components)/2_FillFieldsStep";
import ReviewStep from "./(components)/3_ReviewStep";
import SuccessStep from "./(components)/4_SuccessStep";

export default function IssueDocumentPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [renderedDocument, setRenderedDocument] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string>("");

  const IssueDocumentSteps = [
    {
      title: "Select Design",
      description: "Choose a template design for your document.",
      nextButtonText: "Continue to Fields",
      component: (
        <SelectionStep
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
        />
      ),
    },
    {
      title: "Fill Required Fields",
      description: "Enter all necessary information for the document.",
      nextButtonText: "Review Details",
      component: (
        <FillFieldsStep
          selectedTemplate={selectedTemplate!}
          formValues={formValues}
          onInputChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setFormValues((prev) => ({
              ...prev,
              [e.target.name]: e.target.value,
            }));
          }}
        />
      ),
    },
    {
      title: "Review All Details",
      description: "Check and confirm all entered details before issuing.",
      nextButtonText: "Issue Document",
      component: (
        <ReviewStep
          selectedTemplate={selectedTemplate!}
          formValues={formValues}
          renderedDocument={renderedDocument}
          onRenderedDocumentChange={setRenderedDocument}
          onDocumentIssued={setDocumentId}
        />
      ),
    },
    {
      title: "QR Code & Finish",
      description: "Document issued successfully! Here is your QR code.",
      component: (
        <SuccessStep
          documentId={documentId}
          renderedDocument={renderedDocument}
          onNewDocument={() => {
            setSelectedTemplate(null);
            setFormValues({});
            setCurrentStep(0);
          }}
        />
      ),
    },
  ];

  return (
    <StepperProvider>
      <StepperLayout
        steps={IssueDocumentSteps}
        current={currentStep}
        setCurrent={setCurrentStep}
      >
        {IssueDocumentSteps[currentStep].component}
      </StepperLayout>
    </StepperProvider>
  );
}
