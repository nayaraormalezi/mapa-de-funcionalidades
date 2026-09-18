"use client";

import { Field } from "@/components/cadastros/crud-form";
import { evidenceTypeLabel } from "@/lib/labels";

/**
 * Campos compartilhados: mensuração de sucesso + evidência opcional.
 * Usado em necessidades e evoluções.
 */
export function MeasurementAndEvidenceFields({
  measurementDefault,
  evidenceTitleDefault,
  evidenceLinkDefault,
  evidenceDescriptionDefault,
  evidenceTypeDefault = "UX_RESEARCH",
  measurementHint,
}: {
  measurementDefault?: string;
  evidenceTitleDefault?: string;
  evidenceLinkDefault?: string;
  evidenceDescriptionDefault?: string;
  evidenceTypeDefault?: string;
  measurementHint?: string;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-slate-50/60 p-3">
      <div>
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Mensuração
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {measurementHint ??
            "Como saberemos se o resultado esperado foi alcançado."}
        </p>
      </div>
      <Field
        label="Como será mensurado"
        name="measurement"
        as="textarea"
        defaultValue={measurementDefault}
      />

      <div className="border-t border-[var(--border)] pt-3">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Evidência (opcional)
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Pesquisa, reclamação, analytics ou link que fundamenta a decisão.
        </p>
      </div>
      <Field
        label="Título da evidência"
        name="evidence_title"
        defaultValue={evidenceTitleDefault}
      />
      <Field
        label="Tipo"
        name="evidence_type"
        as="select"
        defaultValue={evidenceTypeDefault}
        options={Object.entries(evidenceTypeLabel).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      <Field
        label="Link"
        name="evidence_link"
        defaultValue={evidenceLinkDefault}
      />
      <Field
        label="Descrição da evidência"
        name="evidence_description"
        as="textarea"
        defaultValue={evidenceDescriptionDefault}
      />
    </div>
  );
}
