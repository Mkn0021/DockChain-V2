"use client";

import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { MdNavigateNext } from "react-icons/md";

import { useStepper } from "@/components/documents/stepper";
import { toast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { CarouselViewport, useCarousel } from "@/components/ui/carousel";
import {
  selectLatestPublishedVersion,
  useTemplateDetail,
  useTemplates,
} from "@/lib/api/queries/templates";

const PAGE_SIZE = 3;
const EASE = [0.32, 0.72, 0, 1] as const;

interface SelectionStepProps {
  organizationId: string;
  selectedTemplateId: string | null;
  onSelectTemplate: (
    templateId: string,
    versionId: string,
    layout: string,
    fieldSchema: unknown,
    name: string
  ) => void;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded-sm p-2 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MdNavigateNext size={36} className="rotate-180" />
      </button>
      {pages.map((page) => (
        <button
          type="button"
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            "rounded-sm px-3 py-1 text-sm",
            page === currentPage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded-sm p-2 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MdNavigateNext size={36} />
      </button>
    </div>
  );
}

interface TemplateCardProps {
  organizationId: string;
  templateId: string;
  name: string;
  description: string | null;
  selected: boolean;
  onSelect: (
    versionId: string,
    layout: string,
    fieldSchema: unknown,
    name: string
  ) => void;
}

function TemplateCard({
  organizationId,
  templateId,
  name,
  description,
  selected,
  onSelect,
}: TemplateCardProps) {
  const detail = useTemplateDetail(organizationId, templateId);
  const published = detail.data
    ? selectLatestPublishedVersion(detail.data.versions)
    : null;
  const layout = published?.layout ?? null;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative h-auto w-full overflow-hidden rounded-lg border bg-muted p-2 shadow-md",
        selected ? "border-2 border-primary" : "border-border"
      )}
    >
      <motion.div
        animate={{
          filter: hovered ? "blur(6px)" : "blur(0px)",
          opacity: hovered ? 0.35 : 1,
        }}
        transition={{ duration: 0.25, ease: EASE }}
        style={{ willChange: "filter, opacity" }}
        className="block h-full w-full [&_svg]:h-full [&_svg]:w-full [&_svg]:rounded-lg [&_svg]:object-contain"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={layout ? { __html: layout } : { __html: "" }}
      />

      <AnimatePresence>
        {hovered ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(6px)" }}
            transition={{ duration: 0.25, ease: EASE }}
            style={{ willChange: "filter, opacity" }}
            className="absolute inset-2 flex flex-col items-center justify-center gap-4 rounded-lg px-2 text-center"
          >
            <div className="flex flex-col items-center">
              <h3 className="text-lg md:text-xl">{name}</h3>
              <p className="text-sm text-balance text-muted-foreground">
                {description || "No description provided."}
              </p>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                if (published) {
                  onSelect(
                    published.id,
                    layout ?? "",
                    published.fieldSchema,
                    name
                  );
                }
              }}
              disabled={!layout || !published}
            >
              Use This
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function SelectionStep({
  organizationId,
  selectedTemplateId,
  onSelectTemplate,
}: SelectionStepProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { setCanGoToNextStep, setMiddleContent } = useStepper();

  const templates = useTemplates(organizationId);
  const detail = useTemplateDetail(organizationId, selectedTemplateId);

  const all = templates.data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const carousel = useCarousel(all.length);

  const publishedVersion = detail.data
    ? selectLatestPublishedVersion(detail.data.versions)
    : null;

  useEffect(() => {
    setCanGoToNextStep(Boolean(selectedTemplateId && publishedVersion));
  }, [selectedTemplateId, publishedVersion, setCanGoToNextStep]);

  useEffect(() => {
    if (selectedTemplateId && !detail.isPending && !publishedVersion) {
      toast.error("This template has no published version. Publish one first.");
    }
  }, [selectedTemplateId, detail.isPending, publishedVersion]);

  useEffect(() => {
    carousel.goTo((currentPage - 1) * PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    setMiddleContent(
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    );
    return () => setMiddleContent(null);
  }, [currentPage, totalPages, setMiddleContent]);

  if (templates.isPending) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Loading templates…
      </div>
    );
  }

  if (all.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center">
        <h4 className="text-lg md:text-xl">No templates available.</h4>
        <p className="text-sm text-muted-foreground">
          Please upload a template to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <CarouselViewport carousel={carousel} className="h-auto py-2">
        {all.map((template) => (
          <div
            key={template.id}
            className="w-full shrink-0 pr-6 last:pr-0 sm:w-1/2 lg:w-1/3"
          >
            <TemplateCard
              organizationId={organizationId}
              templateId={template.id}
              name={template.name}
              description={template.description}
              selected={selectedTemplateId === template.id}
              onSelect={(versionId, layout, fieldSchema, name) =>
                onSelectTemplate(
                  template.id,
                  versionId,
                  layout,
                  fieldSchema,
                  name
                )
              }
            />
          </div>
        ))}
      </CarouselViewport>
    </div>
  );
}
