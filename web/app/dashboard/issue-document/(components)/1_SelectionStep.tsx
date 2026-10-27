"use client";

import ApiClient from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { MdNavigateNext } from 'react-icons/md';
import { Button } from '@/components/_ui/Button';
import { useAlert } from '@/components/providers/AlertProvider';
import { useStepper } from '@/components/dashboard/StepperLayout';
import { Template, TemplateSelectionStepProps } from '@/types/template.type';


export default function SelectionStep({ selectedTemplate, onSelectTemplate }: TemplateSelectionStepProps) {
    const [allTemplates, setAllTemplates] = useState<Template[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { showAlert } = useAlert();
    const { setCanGoToNextStep, setMiddleContent } = useStepper();
    const limit = 3;

    useEffect(() => {
        setCanGoToNextStep(!!selectedTemplate);
    }, [selectedTemplate, setCanGoToNextStep]);

    useEffect(() => {
        const startPage = Math.max(1, currentPage - 1);
        const endPage = Math.min(totalPages, currentPage + 1);
        const pageButtons = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
            <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded ${page === currentPage ? 'bg-primary text-white' : 'text-text-secondary hover:bg-background-muted'}`}
            >
                {page}
            </button>
        ));

        const pagination = (
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-text-secondary hover:bg-background-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MdNavigateNext size={36} className="rotate-180" />
                </button>
                {pageButtons}
                <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-text-secondary hover:bg-background-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MdNavigateNext size={36} />
                </button>
            </div>
        );
        setMiddleContent(pagination);
        return () => setMiddleContent(null);
    }, [currentPage, totalPages, setMiddleContent]);

    useEffect(() => {
        async function fetchTemplates() {
            try {
                const response = await ApiClient.get('/templates/');

                if (!response.success) {
                    throw new Error(response.error || 'Failed to fetch templates');
                }
                const data = response.data as { templates: Template[], total: number, pages: number };
                setAllTemplates(data.templates);
                setTotalPages(Math.ceil(data.total / limit));
            } catch (error) {
                showAlert(`Error fetching templates: ${error}`, 'error');
            }
        }
        fetchTemplates();
    }, [showAlert]);

    const templates = allTemplates.slice((currentPage - 1) * limit, currentPage * limit);

    return (
        <div className="w-full h-auto lg:h-72 rounded-none overflow-x-auto overflow-y-auto lg:overflow-y-hidden">
            <div className="h-full flex flex-col lg:flex-row gap-6 items-center py-2">
                {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-center">
                        <h4 className='m-0 p-0'>No templates available.</h4>
                        <p>Please upload a template to get started.</p>
                    </div>
                ) : (
                    templates.map((template) => (
                        <div key={template.id} className={`w-full lg:w-96 h-auto lg:h-full flex flex-col bg-background-muted p-2 border border-border rounded-lg shadow-md group relative overflow-hidden transition-all duration-300 ${selectedTemplate?.id === template.id ? 'border-2 border-primary' : ''}`}>
                            <div className="group-hover:hidden w-full flex items-center justify-center overflow-hidden rounded-lg transition-all duration-100 group-hover:opacity-0 group-hover:pointer-events-none [&_svg]:rounded-lg [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto"
                                dangerouslySetInnerHTML={{ __html: template.svgTemplate }}
                            />
                            <div className="hidden group-hover:flex flex-col items-center justify-center h-full w-full text-center gap-4">
                                <div>
                                    <h4 className="m-0 p-0"> {template.name}</h4>
                                    <p>{template.description || 'No description provided.'}</p>
                                </div>
                                <Button onClick={() => onSelectTemplate(template)}>Use This</Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}