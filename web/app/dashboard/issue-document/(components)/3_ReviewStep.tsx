"use client";

import ApiClient from '@/lib/api-client';
import { useState, useEffect } from 'react';
import InputBox from '@/components/_ui/InputBox';
import { Template } from '@/types/template.type';
import InfoBox from '@/components/dashboard/InfoBox';
import { useStepper } from '@/components/dashboard/StepperLayout';
import { DOCUMENT_ISSUING_INSTRACTIONS } from '@/data/dashboard.data';
import { useAlert } from '@/components/providers/AlertProvider';

interface ReviewStepProps {
    selectedTemplate: Template;
    formValues: Record<string, string>;
    renderedDocument: string | null;
    onRenderedDocumentChange: (svg: string | null) => void;
    onDocumentIssued: (docId: string) => void;
}

export default function ReviewStep({
    selectedTemplate,
    formValues,
    renderedDocument,
    onRenderedDocumentChange,
    onDocumentIssued
}: ReviewStepProps) {
    const [recipient, setRecipient] = useState<string>('');
    const { setCanGoToNextStep, setOnNext } = useStepper();
    const { showAlert } = useAlert();

    useEffect(() => {
        const handleDocumentIssue = async () => {
            try {
                const response = await ApiClient.post('/documents/issue', {
                    templateId: selectedTemplate.id,
                    recipent: { name: recipient },
                    fieldValues: formValues,
                    issuedAt: new Date().toISOString()
                });

                if (!response.success) {
                    throw new Error(response.error || 'Document issuance failed');
                }

                const doc = response.data as { id: string };

                if (doc.id) {
                    onDocumentIssued(doc.id);
                }
                return true;
            } catch (error) {
                showAlert(`Document issue failed: ${error}`, 'error')
                return false;
            }
        }

        setOnNext(() => handleDocumentIssue)
    }, [setOnNext, recipient, onDocumentIssued, formValues, selectedTemplate, showAlert]);

    useEffect(() => {
        setCanGoToNextStep(!!recipient.trim() && !!renderedDocument);
    }, [renderedDocument, recipient, setCanGoToNextStep]);

    useEffect(() => {
        const renderDocument = (svgTemplate: string, data: Record<string, string> | Map<string, string>) => {
            const dataEntries = data instanceof Map
                ? data.entries()
                : Object.entries(data);

            for (const [key, value] of dataEntries) {
                const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                svgTemplate = svgTemplate.replace(regex, value || '');
            }
            return svgTemplate.replace(/{{\s*\w+\s*}}/g, '');
        };

        const rendered = renderDocument(selectedTemplate.svgTemplate, formValues);
        onRenderedDocumentChange(rendered);
    }, [selectedTemplate, formValues, onRenderedDocumentChange]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full items-start">
            <div className="flex items-center justify-center w-full h-full">
                <div className="w-96 h-72 border rounded-lg p-2 bg-background-muted shadow-md mx-auto flex items-center justify-center">
                    {renderedDocument ? (
                        <div className="[&_svg]:rounded-lg [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: renderedDocument }} />
                    ) : (
                        <p>No document preview available.</p>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-center w-full gap-4">
                <InputBox
                    label="Recipient"
                    placeholder="Enter recipient name or email..."
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    required
                />
                <InfoBox
                    title="Issuing Information"
                    items={DOCUMENT_ISSUING_INSTRACTIONS}
                    className="w-full"
                />
            </div>
        </div>
    );
}