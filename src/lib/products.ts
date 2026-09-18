import type { Product } from "@/types";

/** Portfólio fixo — somente estes 3 produtos existem. */
export const PRODUCT_IDS = [
  "imobiliario",
  "veiculos_leves",
  "veiculos_pesados",
] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];

/** Catálogo estático das linhas de produto do Consórcio CAIXA. */
export const PRODUCT_CATALOG = [
  {
    id: "imobiliario" as const,
    name: "Imobiliário",
    shortName: "Imobiliário",
    description:
      "Crédito para imóvel residencial ou comercial, terreno e construção.",
    order: 1,
  },
  {
    id: "veiculos_leves" as const,
    name: "Veículos Leves",
    shortName: "Veículos Leves",
    description:
      "Automóveis, utilitários leves e motocicletas para pessoa física e jurídica.",
    order: 2,
  },
  {
    id: "veiculos_pesados" as const,
    name: "Veículos Pesados",
    shortName: "Veículos Pesados",
    description:
      "Caminhões, ônibus, máquinas e equipamentos para operações empresariais.",
    order: 3,
  },
] as const satisfies ReadonlyArray<{
  id: ProductId;
  name: string;
  shortName: string;
  description: string;
  order: number;
}>;

export type ProductName = (typeof PRODUCT_CATALOG)[number]["name"];

export const ALL_PRODUCTS_ID = "all" as const;
export type ProductScopeId = typeof ALL_PRODUCTS_ID | ProductId;

export const DEFAULT_PRODUCT_ID: ProductId = "imobiliario";
export const DEFAULT_PRODUCT: ProductName = "Imobiliário";

export const PRODUCT_OPTIONS = PRODUCT_CATALOG.map((product) => ({
  value: product.id,
  label: product.name,
}));

export const PRODUCT_NAME_OPTIONS = PRODUCT_CATALOG.map((product) => ({
  value: product.name,
  label: product.name,
}));

/** Aliases legados → id canônico (nunca cria produto novo). */
const LEGACY_TO_ID: Record<string, ProductId> = {
  imobiliario: "imobiliario",
  "prod-imobiliario": "imobiliario",
  Imobiliário: "imobiliario",
  "Consórcio Imobiliário": "imobiliario",
  veiculos_leves: "veiculos_leves",
  "veiculos-leves": "veiculos_leves",
  "prod-veiculos-leves": "veiculos_leves",
  "Veículos leves": "veiculos_leves",
  "Veículos Leves": "veiculos_leves",
  "Consórcio Veículos Leves": "veiculos_leves",
  veiculos_pesados: "veiculos_pesados",
  "veiculos-pesados": "veiculos_pesados",
  "prod-veiculos-pesados": "veiculos_pesados",
  "Veículos pesados": "veiculos_pesados",
  "Veículos Pesados": "veiculos_pesados",
  "Consórcio Veículos Pesados": "veiculos_pesados",
};

export function isProductId(value: string | null | undefined): value is ProductId {
  return (
    value === "imobiliario" ||
    value === "veiculos_leves" ||
    value === "veiculos_pesados"
  );
}

/** Resolve para um dos 3 produtos, ou `null` se inválido/ausente. */
export function parseProductId(
  idOrName: string | null | undefined,
): ProductId | null {
  if (!idOrName?.trim()) return null;
  const raw = idOrName.trim();
  if (isProductId(raw)) return raw;
  const mapped = LEGACY_TO_ID[raw];
  if (mapped) return mapped;
  const byName = PRODUCT_CATALOG.find(
    (p) =>
      p.name.toLowerCase() === raw.toLowerCase() ||
      p.shortName.toLowerCase() === raw.toLowerCase(),
  );
  return byName?.id ?? null;
}

export function getProductMeta(idOrName: string) {
  const id = parseProductId(idOrName) ?? DEFAULT_PRODUCT_ID;
  return PRODUCT_CATALOG.find((p) => p.id === id)!;
}

/**
 * Resolve id de produto para persistência.
 * Ausente/inválido → default (nunca cria "outro").
 */
export function resolveProductId(
  idOrName: string | null | undefined,
): ProductId {
  return parseProductId(idOrName) ?? DEFAULT_PRODUCT_ID;
}

export function catalogAsProducts(now = "2026-09-01T12:00:00.000Z"): Product[] {
  return PRODUCT_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
    shortName: p.shortName,
    description: p.description,
    order: p.order,
    active: true,
    createdAt: now,
    updatedAt: now,
  }));
}

/** Vazio = transversal (todos os 3 produtos). */
export function appliesToProduct(
  productIds: string[] | null | undefined,
  productId: string,
): boolean {
  if (!productIds || productIds.length === 0) return true;
  return productIds.includes(productId);
}

/** Rótulo de aplicabilidade com os nomes dos produtos (ex.: "Imobiliário · Veículos Leves"). */
export function formatApplicabilityLabel(
  productIds: string[] | null | undefined,
): string {
  const ids = (productIds ?? []).filter(isProductId);
  const resolved =
    ids.length === 0 || ids.length >= PRODUCT_IDS.length
      ? [...PRODUCT_IDS]
      : ids;
  return resolved.map((id) => getProductMeta(id).shortName).join(" · ");
}

export function normalizeProductIds(
  ids: Array<string | null | undefined> | null | undefined,
  fallback?: string | null,
): ProductId[] {
  const fromList = (ids ?? [])
    .map((id) => parseProductId(id))
    .filter((id): id is ProductId => Boolean(id));
  if (fromList.length > 0) {
    return Array.from(new Set(fromList));
  }
  const single = parseProductId(fallback);
  return single ? [single] : [];
}
