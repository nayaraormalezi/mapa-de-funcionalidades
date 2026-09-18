/** Vazio = transversal (todos os públicos). */
export function appliesToAudience(
  audienceIds: string[] | null | undefined,
  audienceId: string,
): boolean {
  if (!audienceId) return true;
  if (!audienceIds || audienceIds.length === 0) return true;
  return audienceIds.includes(audienceId);
}

export function formatAudienceApplicabilityLabel(
  audienceIds: string[] | null | undefined,
  audiences: { id: string; name: string }[],
): string {
  const ids = (audienceIds ?? []).filter(Boolean);
  if (ids.length === 0 || ids.length >= audiences.length) {
    return "Todos os públicos";
  }
  if (ids.length === 1) {
    return audiences.find((a) => a.id === ids[0])?.name ?? ids[0];
  }
  return ids
    .map((id) => audiences.find((a) => a.id === id)?.name ?? id)
    .join(" · ");
}
