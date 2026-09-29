/** Ações secundárias do menu ⋯ do Quick View — nunca inclui CTA da ficha. */
export function buildQuickViewSecondaryActions(canEdit: boolean): Array<{
  label: string;
  tone?: "danger";
}> {
  if (!canEdit) return [];
  return [
    { label: "Duplicar implementação" },
    { label: "Remover implementação", tone: "danger" },
  ];
}
