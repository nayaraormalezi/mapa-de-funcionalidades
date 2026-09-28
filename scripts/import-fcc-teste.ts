/**
 * Importação de TESTE: planilha Status por Canal → FeatureChannelContext.
 *
 *   npx tsx scripts/import-fcc-teste.ts --dry-run
 *   npx tsx scripts/import-fcc-teste.ts --apply
 *
 * Não cria Feature, produto, canal, jornada, necessidade, Figma, ticket ou avaliação.
 * Público entra pelo ChannelContext existente (público × momento da etapa × canal).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  canonicalFeatureName,
  normalizeFeatureLabel,
  slugify,
} from "../src/database/seed/fase16-3-catalog-data";
import { deriveDeadlineStatus, featureStageLabel } from "../src/lib/labels";
import type { FeatureStage } from "../src/types";

const DEFAULT_XLSX =
  "/Users/nayaraormalezi/Desktop/PRISMA_Status_por_Canal_TESTE.xlsx";

const CHANNEL_HEADERS = [
  "App CAIXA",
  "App atual CAIXA Consórcio",
  "Área logada",
  "SuperApp",
  "Portal do Consórcio",
  "AIC",
  "AIC extrarede",
  "Autocompra",
  "IBC",
  "Plataforma.CAIXA",
] as const;

/** Nome da coluna → nome canônico do canal no banco (único match). */
const CHANNEL_NAME_BY_HEADER: Record<string, string> = {
  "App CAIXA": "App CAIXA",
  "App atual CAIXA Consórcio": "App atual CAIXA Consórcio",
  "Área logada": "Área logada",
  SuperApp: "SuperApp CAIXA",
  "Portal do Consórcio": "Portal do Consórcio",
  AIC: "AIC",
  "AIC extrarede": "AIC Extrarede",
  Autocompra: "Autocompra",
  IBC: "IBC",
  "Plataforma.CAIXA": "Plataforma.CAIXA",
};

const AUDIENCE_BY_LABEL: Record<string, string> = {
  cliente: "aud-client",
  economiario: "aud-economiario",
  parceiro: "aud-partner",
};

const PRODUCT_BY_LABEL: Record<string, string> = {
  imobiliario: "imobiliario",
  "veiculos leves": "veiculos_leves",
  "veiculos pesados": "veiculos_pesados",
};

/** Etapas de venda (momento mom-sale), igual ao JAS canônico. */
const SALE_STAGES = new Set(["descoberta", "consideracao", "contratacao"]);

const PHASE_BY_LABEL: Record<string, FeatureStage> = Object.fromEntries(
  (Object.entries(featureStageLabel) as [FeatureStage, string][]).map(
    ([code, label]) => [normalizeFeatureLabel(label), code],
  ),
);

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

type SheetRow = {
  line: number;
  etapa: string;
  publico: string;
  necessidade: string;
  funcionalidade: string;
  produto: string;
  channels: Record<string, string>;
  observacoes: string;
};

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const si = xml.split(/<si[\s>]/).slice(1);
  for (const block of si) {
    const texts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) =>
      decodeXml(m[1] ?? ""),
    );
    out.push(texts.join(""));
  }
  return out;
}

function decodeXml(raw: string) {
  return raw
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function colIndex(ref: string) {
  const letters = ref.replace(/\d/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function readStatusSheet(xlsxPath: string): SheetRow[] {
  const stringsXml = execFileSync(
    "unzip",
    ["-p", xlsxPath, "xl/sharedStrings.xml"],
    { encoding: "utf8" },
  );
  const sheetXml = execFileSync(
    "unzip",
    ["-p", xlsxPath, "xl/worksheets/sheet1.xml"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  const strings = parseSharedStrings(stringsXml);
  const cells = new Map<number, Map<number, string>>();
  for (const m of sheetXml.matchAll(
    /<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
  )) {
    const ref = m[1]!;
    const attrs = m[2] ?? "";
    const inner = m[3] ?? "";
    const row = Number(ref.replace(/[A-Z]/g, ""));
    const col = colIndex(ref);
    const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
    let value = "";
    if (attrs.includes('t="s"') && v) value = strings[Number(v)] ?? "";
    else if (v) value = decodeXml(v);
    if (!cells.has(row)) cells.set(row, new Map());
    cells.get(row)!.set(col, value);
  }
  const header = cells.get(1);
  if (!header) throw new Error("Aba Status sem cabeçalho.");
  const headerByCol = new Map<number, string>();
  for (const [col, name] of header) headerByCol.set(col, name.trim());

  const rows: SheetRow[] = [];
  const maxRow = Math.max(...cells.keys());
  for (let line = 2; line <= maxRow; line++) {
    const row = cells.get(line);
    if (!row) continue;
    const get = (name: string) => {
      for (const [col, h] of headerByCol) {
        if (h === name) return (row.get(col) ?? "").trim();
      }
      return "";
    };
    const funcionalidade = get("Funcionalidade");
    if (!funcionalidade) continue;
    const channels: Record<string, string> = {};
    for (const h of CHANNEL_HEADERS) channels[h] = get(h);
    rows.push({
      line,
      etapa: get("Etapa"),
      publico: get("Público"),
      necessidade: get("Necessidade"),
      funcionalidade,
      produto: get("Produto"),
      channels,
      observacoes: get("Observações"),
    });
  }
  return rows;
}

type PlannedFcc = {
  id: string;
  featureId: string;
  featureName: string;
  productId: string;
  channelContextId: string;
  channelName: string;
  audienceId: string;
  momentId: string;
  phase: FeatureStage;
  notes: string;
  action: "create" | "update" | "unchanged";
  existingId?: string;
};

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const xlsx =
    args.find((a) => a.endsWith(".xlsx")) ?? DEFAULT_XLSX;
  if (!existsSync(xlsx)) throw new Error(`Planilha não encontrada: ${xlsx}`);

  const sheetRows = readStatusSheet(xlsx);
  const supabase = admin();

  const [featuresRes, productsRes, channelsRes, contextsRes, fccRes] =
    await Promise.all([
      supabase.from("features").select("id,name,active").eq("active", true),
      supabase.from("products").select("id,name,active").eq("active", true),
      supabase.from("channels").select("id,name,active").eq("active", true),
      supabase
        .from("channel_contexts")
        .select("id,audience_id,moment_id,channel_id,active")
        .eq("active", true),
      supabase
        .from("feature_channel_contexts")
        .select("id,feature_id,product_id,channel_context_id,phase,active"),
    ]);
  for (const r of [featuresRes, productsRes, channelsRes, contextsRes, fccRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const featureByNorm = new Map<string, { id: string; name: string }[]>();
  for (const f of featuresRes.data ?? []) {
    const key = normalizeFeatureLabel(String(f.name));
    const list = featureByNorm.get(key) ?? [];
    list.push({ id: String(f.id), name: String(f.name) });
    featureByNorm.set(key, list);
  }

  const channelByNorm = new Map<string, { id: string; name: string }>();
  for (const c of channelsRes.data ?? []) {
    channelByNorm.set(normalizeFeatureLabel(String(c.name)), {
      id: String(c.id),
      name: String(c.name),
    });
  }

  const contexts = contextsRes.data ?? [];
  const fccByKey = new Map<
    string,
    { id: string; phase: string; active: boolean }
  >();
  for (const fcc of fccRes.data ?? []) {
    const key = `${fcc.feature_id}|${fcc.product_id}|${fcc.channel_context_id}`;
    fccByKey.set(key, {
      id: String(fcc.id),
      phase: String(fcc.phase),
      active: fcc.active !== false,
    });
  }

  const missingFeatures = new Set<string>();
  const missingProducts = new Set<string>();
  const missingChannels = new Set<string>();
  const missingContexts: string[] = [];
  const invalidStatus: string[] = [];
  const conflicts: string[] = [];
  const pendingQuestion: string[] = [];
  let ignoredNa = 0;
  let ignoredEmpty = 0;
  const planned = new Map<string, PlannedFcc>();

  for (const row of sheetRows) {
    const featureName = canonicalFeatureName(row.funcionalidade);
    const featureKey = normalizeFeatureLabel(featureName);
    const matches = featureByNorm.get(featureKey) ?? [];
    if (matches.length !== 1) {
      if (matches.length === 0) missingFeatures.add(row.funcionalidade);
      else {
        conflicts.push(
          `Feature ambígua "${row.funcionalidade}" (${matches.map((m) => m.id).join(", ")})`,
        );
      }
    }
    const productId = PRODUCT_BY_LABEL[normalizeFeatureLabel(row.produto)];
    if (!productId) missingProducts.add(row.produto || "(vazio)");
    const audienceId = AUDIENCE_BY_LABEL[normalizeFeatureLabel(row.publico)];
    if (!audienceId) {
      conflicts.push(`Público desconhecido na linha ${row.line}: "${row.publico}"`);
    }
    const stageKey = normalizeFeatureLabel(row.etapa);
    const momentId = SALE_STAGES.has(stageKey) ? "mom-sale" : "mom-after-sale";
    if (!stageKey) conflicts.push(`Etapa vazia na linha ${row.line}`);

    for (const header of CHANNEL_HEADERS) {
      const raw = (row.channels[header] ?? "").trim();
      if (!raw) {
        ignoredEmpty += 1;
        continue;
      }
      const norm = normalizeFeatureLabel(raw);
      if (norm === "nao se aplica") {
        ignoredNa += 1;
        continue;
      }
      if (raw === "?") {
        pendingQuestion.push(
          `L${row.line} ${row.funcionalidade} · ${row.produto} · ${header}`,
        );
        continue;
      }
      const phase = PHASE_BY_LABEL[norm];
      if (!phase) {
        invalidStatus.push(`L${row.line} ${header}: "${raw}"`);
        continue;
      }
      const channelName = CHANNEL_NAME_BY_HEADER[header];
      const channel = channelName
        ? channelByNorm.get(normalizeFeatureLabel(channelName))
        : undefined;
      if (!channel) {
        missingChannels.add(header);
        continue;
      }
      if (matches.length !== 1 || !productId || !audienceId) continue;
      const context = contexts.find(
        (c) =>
          c.channel_id === channel.id &&
          c.audience_id === audienceId &&
          c.moment_id === momentId,
      );
      if (!context) {
        missingContexts.push(
          `L${row.line} ${row.publico} · ${momentId} · ${channel.name} (${row.funcionalidade})`,
        );
        continue;
      }
      const feature = matches[0]!;
      const key = `${feature.id}|${productId}|${context.id}`;
      const existing = fccByKey.get(key);
      const id =
        existing?.id ??
        `fcc-teste-${slugify(feature.name)}-${productId}-${context.id}`.slice(
          0,
          80,
        );
      const next: PlannedFcc = {
        id,
        featureId: feature.id,
        featureName: feature.name,
        productId,
        channelContextId: String(context.id),
        channelName: channel.name,
        audienceId,
        momentId,
        phase,
        notes: row.observacoes,
        action: existing
          ? existing.phase === phase
            ? "unchanged"
            : "update"
          : "create",
        existingId: existing?.id,
      };
      const prev = planned.get(key);
      if (prev && (prev.phase !== next.phase || prev.notes !== next.notes)) {
        conflicts.push(
          `Conflito ${feature.name} / ${productId} / ${channel.name} / ${audienceId} / ${momentId}: ${prev.phase} vs ${next.phase}`,
        );
      } else if (!prev) {
        planned.set(key, next);
      }
    }
  }

  const list = [...planned.values()];
  const created = list.filter((p) => p.action === "create");
  const updated = list.filter((p) => p.action === "update");
  const unchanged = list.filter((p) => p.action === "unchanged");

  console.log("\n=== IMPORTAÇÃO PRISMA — TESTE (dry-run) ===\n");
  console.log(`Planilha: ${xlsx}`);
  console.log(`Linhas lidas: ${sheetRows.length}`);
  console.log(`Features no banco: ${(featuresRes.data ?? []).length}`);
  console.log(`FCC ativos antes: ${(fccRes.data ?? []).filter((f) => f.active !== false).length}`);
  console.log("\nFeatureChannelContexts:");
  console.log(`  criar:      ${created.length}`);
  console.log(`  atualizar:  ${updated.length}`);
  console.log(`  sem mudança:${unchanged.length}`);
  console.log(`  ignorados (vazio): ${ignoredEmpty}`);
  console.log(`  ignorados (Não se aplica): ${ignoredNa}`);
  console.log(`  pendentes "?": ${pendingQuestion.length}`);
  console.log(`  contexto de canal ausente: ${missingContexts.length}`);
  console.log("\nFeatures não encontradas:");
  if (missingFeatures.size === 0) console.log("  (nenhuma)");
  else for (const n of [...missingFeatures].sort()) console.log(`  - ${n}`);
  console.log("\nProdutos não encontrados:");
  if (missingProducts.size === 0) console.log("  (nenhum)");
  else for (const n of missingProducts) console.log(`  - ${n}`);
  console.log("\nCanais não encontrados:");
  if (missingChannels.size === 0) console.log("  (nenhum)");
  else for (const n of missingChannels) console.log(`  - ${n}`);
  console.log("\nStatus inválidos:");
  if (invalidStatus.length === 0) console.log("  (nenhum)");
  else invalidStatus.forEach((s) => console.log(`  - ${s}`));
  console.log("\nPendências '?':");
  if (pendingQuestion.length === 0) console.log("  (nenhuma)");
  else pendingQuestion.forEach((s) => console.log(`  - ${s}`));
  console.log("\nContextos de canal ausentes (não cria canal):");
  const ctxSample = [...new Set(missingContexts)];
  if (ctxSample.length === 0) console.log("  (nenhum)");
  else ctxSample.slice(0, 40).forEach((s) => console.log(`  - ${s}`));
  if (ctxSample.length > 40) console.log(`  … +${ctxSample.length - 40}`);
  console.log("\nConflitos:");
  if (conflicts.length === 0) console.log("  (nenhum)");
  else conflicts.forEach((s) => console.log(`  - ${s}`));

  if (created.length) {
    console.log("\nA criar (amostra):");
    for (const p of created.slice(0, 25)) {
      console.log(
        `  ${p.featureName} · ${p.productId} · ${p.channelName} · ${p.audienceId} · ${p.momentId} → ${p.phase}`,
      );
    }
    if (created.length > 25) console.log(`  … +${created.length - 25}`);
  }

  if (!apply) {
    console.log("\nNenhuma alteração gravada (dry-run).");
    return;
  }

  if (conflicts.length || invalidStatus.length || missingChannels.size || missingProducts.size) {
    throw new Error(
      "Abortado: conflitos, produto/canal ausente ou status inválido. Nada gravado nesta execução.",
    );
  }

  const now = new Date().toISOString();
  const toWrite = list.filter((p) => p.action !== "unchanged");
  for (const p of toWrite) {
    if (p.action === "create") {
      const { error } = await supabase.from("feature_channel_contexts").upsert({
        id: p.id,
        feature_id: p.featureId,
        product_id: p.productId,
        channel_context_id: p.channelContextId,
        phase: p.phase,
        status: deriveDeadlineStatus(null, p.phase),
        experience: "NOT_EVALUATED",
        notes: p.notes,
        responsible: "",
        active: true,
        figma_url: null,
        experience_image_url: null,
        experience_url: null,
        ticket_number: null,
        updated_at: now,
      });
      if (error) throw new Error(`FCC ${p.featureName}: ${error.message}`);
      continue;
    }
    const { error } = await supabase
      .from("feature_channel_contexts")
      .update({
        phase: p.phase,
        status: deriveDeadlineStatus(null, p.phase),
        ...(p.notes ? { notes: p.notes } : {}),
        active: true,
        updated_at: now,
      })
      .eq("id", p.existingId ?? p.id);
    if (error) throw new Error(`FCC ${p.featureName}: ${error.message}`);
  }

  const after = await supabase
    .from("feature_channel_contexts")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  console.log("\nCarga aplicada.");
  console.log(`FCC ativos depois: ${after.count ?? "?"}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
