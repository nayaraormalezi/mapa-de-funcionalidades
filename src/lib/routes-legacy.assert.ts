/**
 * Asserts rotas canônicas + redirects legados (Fase 14).
 * Executar: npx --yes tsx src/lib/routes-legacy.assert.ts
 */
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

/** Canônicas (menu principal / domínio). */
const CANONICAL = [
  "/dashboard",
  "/mapa",
  "/jornadas",
  "/roadmap",
  "/gaps",
  "/canais",
  "/produtos",
  "/inteligencia",
  "/inteligencia/comparacoes",
  "/inteligencia/transformacoes",
  "/relatorios",
  "/configuracoes",
] as const;

/** Redirects preservados (compatibilidade). */
const REDIRECTS: Record<string, string> = {
  "/comparacao": "/inteligencia/comparacoes",
  "/transformacao": "/inteligencia/transformacoes",
  "/cadastros": "/configuracoes?tab=cadastros",
};

assert(CANONICAL.includes("/inteligencia"), "intelligence hub canonical");
assert(
  REDIRECTS["/comparacao"] === "/inteligencia/comparacoes",
  "comparacao redirect",
);
assert(
  REDIRECTS["/transformacao"] === "/inteligencia/transformacoes",
  "transformacao redirect",
);
assert(REDIRECTS["/cadastros"] === "/configuracoes?tab=cadastros", "cadastros hub");

/** Conceitos que NÃO devem ser módulos de 1º nível no menu. */
const NOT_TOP_LEVEL = ["/comparacao", "/transformacao", "/cadastros"];
for (const path of NOT_TOP_LEVEL) {
  assert(!CANONICAL.includes(path as (typeof CANONICAL)[number]), `${path} not top-level`);
}

console.log(
  "routes-legacy.assert: OK (canonical hub + redirects Comparison/Transformation/Cadastros)",
);
