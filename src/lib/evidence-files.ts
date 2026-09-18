import { createClient } from "@/lib/supabase/server";

export const EVIDENCE_BUCKET = "evidences";

export const EVIDENCE_ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedEvidenceFile(file: File) {
  return (
    EVIDENCE_ALLOWED_MIME.includes(
      file.type as (typeof EVIDENCE_ALLOWED_MIME)[number],
    ) && file.size > 0 && file.size <= EVIDENCE_MAX_BYTES
  );
}

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export function buildEvidenceStoragePath(
  featureId: string,
  evidenceId: string,
  fileName: string,
) {
  const safe = sanitizeFileName(fileName) || "arquivo";
  return `${featureId}/${evidenceId}/${Date.now()}-${safe}`;
}

export async function createEvidenceSignedUrl(filePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(filePath, 60 * 60); // 1h
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function withEvidenceFileUrls<T extends { filePath: string | null }>(
  evidences: T[],
): Promise<(T & { fileUrl: string | null })[]> {
  return Promise.all(
    evidences.map(async (evidence) => {
      if (!evidence.filePath) return { ...evidence, fileUrl: null };
      try {
        return {
          ...evidence,
          fileUrl: await createEvidenceSignedUrl(evidence.filePath),
        };
      } catch {
        return { ...evidence, fileUrl: null };
      }
    }),
  );
}

export async function uploadEvidenceFile(params: {
  featureId: string;
  evidenceId: string;
  file: File;
  previousPath?: string | null;
}) {
  if (!isAllowedEvidenceFile(params.file)) {
    return {
      ok: false as const,
      message:
        "Arquivo inválido. Use PDF ou imagem (JPG, PNG, WEBP, GIF) de até 10 MB.",
    };
  }

  const supabase = await createClient();
  const path = buildEvidenceStoragePath(
    params.featureId,
    params.evidenceId,
    params.file.name,
  );

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  if (params.previousPath && params.previousPath !== path) {
    await supabase.storage
      .from(EVIDENCE_BUCKET)
      .remove([params.previousPath])
      .catch(() => undefined);
  }

  return {
    ok: true as const,
    filePath: path,
    fileName: params.file.name,
    fileMime: params.file.type,
    fileSize: params.file.size,
  };
}

const EXPERIENCE_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function isStoragePath(value: string | null | undefined) {
  if (!value) return false;
  return !/^https?:\/\//i.test(value);
}

export async function resolveExperienceImageUrl(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  if (!isStoragePath(value)) return value;
  return createEvidenceSignedUrl(value);
}

export async function uploadExperienceImage(params: {
  featureId: string;
  fccId: string;
  file: File;
  previousPath?: string | null;
}) {
  if (
    !EXPERIENCE_IMAGE_MIME.includes(
      params.file.type as (typeof EXPERIENCE_IMAGE_MIME)[number],
    ) ||
    params.file.size <= 0 ||
    params.file.size > EVIDENCE_MAX_BYTES
  ) {
    return {
      ok: false as const,
      message: "Imagem inválida. Use JPG, PNG, WEBP ou GIF de até 10 MB.",
    };
  }

  const supabase = await createClient();
  const safe = sanitizeFileName(params.file.name) || "screenshot";
  const path = `experiences/${params.featureId}/${params.fccId}/${Date.now()}-${safe}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  if (
    params.previousPath &&
    isStoragePath(params.previousPath) &&
    params.previousPath !== path
  ) {
    await supabase.storage
      .from(EVIDENCE_BUCKET)
      .remove([params.previousPath])
      .catch(() => undefined);
  }

  return { ok: true as const, filePath: path };
}

/** Upload de resultado de pesquisa (PDF ou imagem) ligado à implementação. */
export async function uploadResearchFile(params: {
  featureId: string;
  fccId: string;
  file: File;
  previousPath?: string | null;
}) {
  if (!isAllowedEvidenceFile(params.file)) {
    return {
      ok: false as const,
      message:
        "Arquivo inválido. Use PDF ou imagem (JPG, PNG, WEBP, GIF) de até 10 MB.",
    };
  }

  const supabase = await createClient();
  const safe = sanitizeFileName(params.file.name) || "pesquisa";
  const path = `research/${params.featureId}/${params.fccId}/${Date.now()}-${safe}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, buffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  if (
    params.previousPath &&
    isStoragePath(params.previousPath) &&
    params.previousPath !== path
  ) {
    await supabase.storage
      .from(EVIDENCE_BUCKET)
      .remove([params.previousPath])
      .catch(() => undefined);
  }

  return {
    ok: true as const,
    filePath: path,
    fileName: params.file.name,
    fileMime: params.file.type,
    fileSize: params.file.size,
  };
}

export async function removeEvidenceFile(filePath: string | null | undefined) {
  if (!filePath) return;
  const supabase = await createClient();
  await supabase.storage.from(EVIDENCE_BUCKET).remove([filePath]);
}
