"use client";

import { cn } from "cn";
import {
  useRef,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from "react";
import { IoCloudUploadOutline, IoClose } from "react-icons/io5";

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractPlaceholders(svg: string): string[] {
  const seen = new Set<string>();
  for (const match of svg.matchAll(PLACEHOLDER_RE)) {
    seen.add(match[1]);
  }
  return [...seen];
}

export function SvgDropzone({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (next: string, keys: string[]) => void;
  invalid: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function readFile(file: File | undefined) {
    if (!file || file.type !== "image/svg+xml") {
      return;
    }
    const text = await file.text();
    onChange(text, extractPlaceholders(text));
  }

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    readFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    readFile(event.dataTransfer.files?.[0]);
  }

  function handleClear(event: MouseEvent) {
    event.stopPropagation();
    onChange("", []);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const hasFile = value.length > 0;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={cn(
        "relative flex h-96 flex-col items-center justify-center rounded-3xl",
        hasFile
          ? ""
          : "cursor-pointer border-2 border-dashed border-border hover:border-muted-foreground",
        invalid && !hasFile && "border-destructive hover:border-destructive"
      )}
    >
      {hasFile ? (
        <div className="flex w-full flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-4 right-4 z-10 rounded-full bg-background p-2 shadow-md"
            title="Remove file"
          >
            <IoClose size={20} />
          </button>
          <div className="h-96 w-full overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
            <div
              className="flex h-full w-full items-center justify-center [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-full w-full flex-col items-center justify-center gap-2"
        >
          <IoCloudUploadOutline size={96} className="text-border" />
          <h2 className="text-lg md:text-xl">Upload SVG template</h2>
          <p className="text-muted-foreground">
            Click or drop an SVG file to preview and upload
          </p>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  );
}
