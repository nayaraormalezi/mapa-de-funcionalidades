"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, Trash2, Upload } from "lucide-react";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ExperienceImageField({
  existingUrl,
  required,
  label = "Screenshot da experiência",
  hint = "JPG, PNG, WEBP ou GIF · até 10 MB",
}: {
  existingUrl?: string | null;
  required?: boolean;
  label?: string;
  hint?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const hasExisting = Boolean(existingUrl) && !remove;

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
        {required ? " *" : ""}
      </span>
      <p className="text-xs text-slate-500">{hint}</p>

      {hasExisting ? (
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={existingUrl!}
            alt="Screenshot atual"
            className="max-h-40 w-full rounded-md object-contain object-top"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <ImageIcon className="h-3.5 w-3.5" />
              Imagem atual
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRemove(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : null}

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-center transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40",
          hasExisting && "opacity-80",
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Pré-visualização"
            className="max-h-36 rounded-md object-contain"
          />
        ) : (
          <Upload className="h-5 w-5 text-slate-400" />
        )}
        <span className="text-sm font-medium text-slate-700">
          {hasExisting || preview ? "Trocar imagem" : "Selecionar imagem"}
        </span>
        {fileName ? (
          <span className="text-xs text-[var(--brand)]">{fileName}</span>
        ) : (
          <span className="text-xs text-slate-500">
            Arraste ou clique para escolher
          </span>
        )}
        <input
          type="file"
          name="experience_image"
          accept={ACCEPT}
          required={required && !hasExisting && !fileName}
          className="sr-only"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            setFileName(next?.name ?? null);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(next ? URL.createObjectURL(next) : null);
            if (next) setRemove(false);
          }}
        />
      </label>

      {remove ? (
        <input type="hidden" name="remove_experience_image" value="true" />
      ) : null}
      {hasExisting ? (
        <input
          type="hidden"
          name="experience_image_url"
          value={existingUrl ?? ""}
        />
      ) : null}
    </div>
  );
}
