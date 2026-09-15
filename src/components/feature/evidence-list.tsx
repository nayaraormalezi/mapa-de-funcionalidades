import { EvidenceAttachmentView } from "@/components/feature/evidence-file-field";
import { EmptyState } from "@/components/shared/empty-state";
import { evidenceTypeLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { Evidence } from "@/types";
import { FileText } from "lucide-react";

export function EvidenceList({ evidences }: { evidences: Evidence[] }) {
  if (evidences.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Sem evidências"
        description="Ainda não há evidências vinculadas a esta funcionalidade."
        className="py-8"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {evidences.map((evidence) => (
        <li
          key={evidence.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              {evidenceTypeLabel[evidence.type]}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              {formatDate(evidence.date)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">{evidence.title}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {evidence.description}
          </p>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Responsável: {evidence.responsible}
          </p>
          <EvidenceAttachmentView
            fileName={evidence.fileName}
            fileMime={evidence.fileMime}
            fileSize={evidence.fileSize}
            fileUrl={evidence.fileUrl}
          />
          {evidence.link ? (
            <a
              href={evidence.link}
              className="mt-1 inline-block text-xs text-[var(--brand)] hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Abrir link
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
