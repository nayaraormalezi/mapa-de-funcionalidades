import { getDatabase } from "@/services/db";
import type { Gap } from "@/types";

export async function getGaps(): Promise<Gap[]> {
  return (await getDatabase()).gaps.filter((g) => {
    const record = g as Gap & { active?: boolean };
    return record.active !== false;
  });
}

export async function getOpenGaps(): Promise<Gap[]> {
  return (await getGaps()).filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  );
}

export async function getGapById(id: string): Promise<Gap | undefined> {
  return (await getGaps()).find((g) => g.id === id);
}
