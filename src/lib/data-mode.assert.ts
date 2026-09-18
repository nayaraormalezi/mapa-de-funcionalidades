/**
 * Smoke asserts for DataMode (sem runner de testes no projeto).
 * Executar: npx --yes tsx src/lib/data-mode.assert.ts
 */
import {
  resolveDataMode,
  sanitizeErrorMessage,
} from "./data-mode";

function assert( cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(
  resolveDataMode({
    NEXT_PUBLIC_USE_SUPABASE: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  }) === "LIVE",
  "LIVE when flag+url+key",
);

assert(
  resolveDataMode({
    NEXT_PUBLIC_USE_SUPABASE: "false",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  }) === "DEMO",
  "DEMO when flag false",
);

assert(
  resolveDataMode({
    NEXT_PUBLIC_USE_SUPABASE: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  }) === "DEMO",
  "DEMO when key missing (incomplete LIVE config)",
);

assert(
  resolveDataMode({}) === "DEMO",
  "DEMO by default",
);

const sanitized = sanitizeErrorMessage(
  new Error("token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb and sb_publishable_abc"),
);
assert(
  Boolean(sanitized && !sanitized.includes("eyJ") && !sanitized.includes("sb_publishable_abc")),
  "sanitize redacts secrets",
);

console.log("data-mode.assert: OK (LIVE≠DEMO on incomplete env; DEMO explícito)");
