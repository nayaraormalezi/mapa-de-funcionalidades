"use client";

import { DataLoadErrorView } from "@/components/shared/data-load-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <DataLoadErrorView error={error} reset={reset} />;
}
