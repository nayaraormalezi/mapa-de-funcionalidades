"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, ImageIcon, Trash2, Upload } from "lucide-react";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif";

function formatBytes(size: number | null | undefined) {
  if (!size || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceFileField({
  existingFileName,
  existingFileMime,
  existingFileSize,
  existingFileUrl,
  inputName = "file",
  removeName = "remove_file",
  label = "Arquivo (PDF ou imagem)",
}: {
  existingFileName?: string | null;
  existingFileMime?: string | null;
  existingFileSize?: number | null;
  existingFileUrl?: string | null;
  inputName?: string;
  removeName?: string;
  label?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const hasExisting = Boolean(existingFileName) && !remove;

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
      </span>
      <p className="text-xs text-slate-500">
        Até 10 MB · PDF, JPG, PNG, WEBP ou GIF
      </p>

      {hasExisting ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200">
            {existingFileMime?.startsWith("image/") ? (
              <ImageIcon className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {existingFileName}
            </p>
            <p className="text-[11px] text-slate-500">
              {formatBytes(existingFileSize)}
              {existingFileUrl ? (
                <>
                  {" · "}
                  <a
                    href={existingFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand)] hover:underline"
                  >
                    Abrir
                  </a>
                </>
              ) : null}
            </p>
          </div>
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
      ) : null}

      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-6 text-center transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40",
          hasExisting && "opacity-80",
        )}
      >
        <Upload className="h-5 w-5 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">
          {hasExisting ? "Substituir arquivo" : "Selecionar arquivo"}
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
          name={inputName}
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            setFileName(next?.name ?? null);
            if (next) setRemove(false);
          }}
        />
      </label>

      {remove ? <input type="hidden" name={removeName} value="true" /> : null}
    </div>
  );
}

export function EvidenceAttachmentView({
  fileName,
  fileMime,
  fileSize,
  fileUrl,
}: {
  fileName?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
  fileUrl?: string | null;
}) {
  if (!fileName && !fileUrl) return null;
  const isImage = Boolean(fileMime?.startsWith("image/") && fileUrl);

  return (
    <div className="mt-3 space-y-2">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fileUrl!}
          alt={fileName ?? "Evidência"}
          className="max-h-48 max-w-full rounded-lg border border-[var(--border)] object-contain"
        />
      ) : null}
      <a
        href={fileUrl ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
      >
        {fileMime?.startsWith("image/") ? (
          <ImageIcon className="h-3.5 w-3.5" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        {fileName ?? "Abrir arquivo"}
        {fileSize ? ` (${formatBytes(fileSize)})` : ""}
      </a>
    </div>
  );
}
