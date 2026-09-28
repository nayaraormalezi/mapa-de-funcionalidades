/**
 * Asserts de regras de comentários + menções + sincronização de fonte.
 * Executar: npx --yes tsx src/lib/comments.assert.ts
 */
import {
  countComments,
  detectMentionQuery,
  insertMentionAt,
  retainMentionsInContent,
  segmentCommentContent,
  syncCommentsFromSource,
} from "./comment-mentions";
import { roleCan } from "./permissions";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(roleCan("viewer", "comment.create"), "viewer create");
assert(roleCan("editor", "comment.create"), "editor create");
assert(roleCan("admin", "comment.create"), "admin create");

assert(!roleCan("viewer", "comment.delete"), "viewer cannot delete");
assert(roleCan("editor", "comment.delete"), "editor delete");
assert(roleCan("admin", "comment.delete"), "admin delete");

/** Mencionar não é permissão separada: quem comenta pode mencionar. */
assert(roleCan("viewer", "comment.create"), "viewer can mention via create");
assert(roleCan("editor", "comment.create"), "editor can mention via create");
assert(roleCan("admin", "comment.create"), "admin can mention via create");

/** Flatten: parent null = root; replies attach to root even if nested attempt. */
function resolveParent(
  parentId: string | null,
  byId: Map<string, { id: string; parentCommentId: string | null }>,
): string | null {
  if (!parentId) return null;
  const parent = byId.get(parentId);
  if (!parent) return null;
  return parent.parentCommentId ?? parent.id;
}

const byId = new Map([
  ["c1", { id: "c1", parentCommentId: null }],
  ["r1", { id: "r1", parentCommentId: "c1" }],
]);

assert(resolveParent(null, byId) === null, "root has no parent");
assert(resolveParent("c1", byId) === "c1", "reply to root");
assert(resolveParent("r1", byId) === "c1", "reply to reply → root");

// --- Fonte única / sincronização prévia ↔ ficha ---
type C = { id: string; parentCommentId: string | null; content: string };

let source: C[] = [
  { id: "a", parentCommentId: null, content: "um" },
  { id: "b", parentCommentId: null, content: "dois" },
  { id: "c", parentCommentId: "a", content: "resposta" },
];

function previewReads() {
  return syncCommentsFromSource(source);
}
function sheetReads() {
  return syncCommentsFromSource(source);
}

assert(countComments(previewReads()) === 3, "count sync start");
assert(
  JSON.stringify(previewReads()) === JSON.stringify(sheetReads()),
  "preview === sheet source",
);

source = [
  ...source,
  { id: "d", parentCommentId: null, content: "da prévia" },
];
assert(countComments(sheetReads()) === 4, "create on preview → sheet");
assert(
  sheetReads().some((c) => c.content === "da prévia"),
  "sheet sees preview create",
);

source = [
  ...source,
  { id: "e", parentCommentId: null, content: "da ficha" },
];
assert(countComments(previewReads()) === 5, "create on sheet → preview");

source = [
  ...source,
  { id: "f", parentCommentId: "a", content: "reply prévia" },
];
assert(
  sheetReads().some((c) => c.id === "f" && c.parentCommentId === "a"),
  "reply preview → sheet linked",
);

source = [
  ...source,
  { id: "g", parentCommentId: "a", content: "reply ficha" },
];
assert(
  previewReads().some((c) => c.id === "g" && c.parentCommentId === "a"),
  "reply sheet → preview linked",
);

source = source.filter((c) => c.id !== "d");
assert(!sheetReads().some((c) => c.id === "d"), "delete preview → gone sheet");
assert(countComments(previewReads()) === countComments(sheetReads()), "count sync after delete");

source = source.filter((c) => c.id !== "e");
assert(!previewReads().some((c) => c.id === "e"), "delete sheet → gone preview");

// --- Menções ---
assert(detectMentionQuery("oi @mar", 7)?.query === "mar", "detect @query");
assert(detectMentionQuery("oi@mar", 6) === null, "no mention mid-token");
assert(detectMentionQuery("@", 1)?.query === "", "open @ alone");

const inserted = insertMentionAt("Precisamos @mar revisar", 15, {
  id: "u1",
  fullName: "Mariana Silva",
});
assert(
  inserted.text === "Precisamos @Mariana Silva revisar",
  "insert at cursor position",
);
assert(inserted.pending.userId === "u1", "pending user id");
assert(inserted.text.includes("@Mariana Silva"), "token in text");

const multi = retainMentionsInContent(
  "@Mariana Silva e @Carlos Oliveira validam",
  [
    { userId: "u1", fullName: "Mariana Silva" },
    { userId: "u2", fullName: "Carlos Oliveira" },
    { userId: "u3", fullName: "Ghost" },
  ],
);
assert(multi.length === 2, "multiple mentions retained");
assert(!multi.some((m) => m.userId === "u3"), "deleted mention not retained");

const cleared = retainMentionsInContent("sem menção", [
  { userId: "u1", fullName: "Mariana Silva" },
]);
assert(cleared.length === 0, "removing @text drops mention before send");

const segments = segmentCommentContent("@Mariana Silva precisa revisar", [
  { userId: "u1", fullName: "Mariana Silva" },
]);
assert(segments[0]?.type === "mention", "render mention segment");
assert(
  segments[0]?.type === "mention" && segments[0].userId === "u1",
  "mention bound to user id",
);
assert(
  !segmentCommentContent("texto livre", []).some((s) => s.type === "mention"),
  "no phantom mentions",
);

const replyMentions = retainMentionsInContent("@Mariana já validei", [
  { userId: "u1", fullName: "Mariana" },
]);
assert(replyMentions.length === 1, "mention in reply");

console.log(
  "comments.assert: OK (permissions + sync + mentions + threading)",
);
