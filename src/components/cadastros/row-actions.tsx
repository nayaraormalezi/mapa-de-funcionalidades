"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  archiveRecord,
  duplicateFeature,
  type ActionResult,
} from "@/app/actions/crud";
import { Button } from "@/components/ui/button";

export function ArchiveButton({
  table,
  id,
  label = "Arquivar",
}: {
  table: string;
  id: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result: ActionResult = await archiveRecord(table, id);
          if (result.ok) router.refresh();
          else alert(result.message);
        });
      }}
    >
      {pending ? "…" : label}
    </Button>
  );
}

export function DuplicateFeatureButton({ featureId }: { featureId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await duplicateFeature(featureId);
          if (result.ok) {
            router.refresh();
            if (result.id) router.push(`/cadastros/funcionalidades?edit=${result.id}`);
          } else {
            alert(result.message);
          }
        });
      }}
    >
      {pending ? "…" : "Duplicar"}
    </Button>
  );
}
