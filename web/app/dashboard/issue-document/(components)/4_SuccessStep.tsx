"use client";

import axios from 'axios';
import Image from 'next/image';
import ApiClient from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { DOCUMENT_ACTION_BUTTONS } from '@/data/dashboard.data';
import { useAlert } from '@/components/providers/AlertProvider';

interface QRBuffer {
    qrCode: string;
    url: string;
}

interface SuccessStepProps {
    documentId: string;
    renderedDocument: string | null;
    onNewDocument: () => void;
}

export default function SuccessStep({ documentId, renderedDocument, onNewDocument }: SuccessStepProps) {
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const { showAlert } = useAlert();

    useEffect(() => {
        async function fetchQr() {
            if (!documentId) return;
            try {
                const response = await ApiClient.get(`/documents/${documentId}/qr`);
                if (!response.success) {
                    setQrImage(null);
                    return;
                }
                const { qrCode, url } = response.data as QRBuffer;
                setQrImage(`data:image/png;base64,${qrCode}`);
                setQrUrl(url ?? null);
            } catch {
                setQrImage(null);
            }
        }
        fetchQr();
    }, [documentId]);

    async function downloadPdf() {
        try {
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/pdf`, // Direct backend call
                { renderedDocument },
                {
                    responseType: 'blob',
                    withCredentials: true,
                }
            );

            const blob = response.data;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `document_${documentId}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            showAlert(`Download failed: ${error}`, 'error');
        }
    }

    async function handleActions(action: string) {
        if (action == 'copy' && qrUrl) {
            await navigator.clipboard.writeText(qrUrl);
            showAlert('QR URL copied to clipboard!', 'success');
        } else if (action == 'finish') {
            onNewDocument();
        } else if (action == 'download' && renderedDocument) {
            showAlert('Download process started', 'info');
            await downloadPdf();
        }
    }

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-lg text-center gap-2">
            <div className="border-2 p-4 rounded-md">
                {qrImage ? (
                    <Image src={qrImage} alt="Document QR Code" width={200} height={200} unoptimized />
                ) : (
                    <div className="w-[128px] h-[128px] bg-gray-200 flex items-center justify">QR not available</div>
                )}
            </div>
            <div className="flex w-full justify-center items-center py-6">
                <div className="flex gap-8">
                    {DOCUMENT_ACTION_BUTTONS.map(button => (
                        <div key={button.key}
                            className="flex flex-col items-center cursor-pointer"
                            onClick={() => handleActions(button.key)}
                        >
                            <button.Icon className="w-6 h-6 rounded-none text-border-dark" />
                            <span className="text-sm mt-2">{button.title}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}