/**
 * Asserts de regras de comentários + menções + sync + visibilidade.
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
import {
  canCreateInternalComments,
  canViewInternalComments,
  countVisibleComments,
  emptyCommentsMessage,
  filterCommentsByTab,
  mentionAllowedRoles,
  resolveCreateVisibility,
  type CommentVisibility,
} from "./comment-visibility";
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

assert(!roleCan("viewer", "comment.internal"), "viewer !internal");
assert(roleCan("editor", "comment.internal"), "editor internal");
assert(roleCan("admin", "comment.internal"), "admin internal");

assert(!canViewInternalComments("viewer"), "viewer cannot view internal");
assert(canViewInternalComments("editor"), "editor views internal");
assert(canViewInternalComments("admin"), "admin views internal");
assert(!canCreateInternalComments("viewer"), "viewer !create internal");
assert(canCreateInternalComments("editor"), "editor create internal");

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

// --- Visibilidade: create / reply ---
const pub = resolveCreateVisibility({
  role: "viewer",
  requested: "PUBLIC",
  parentVisibility: null,
});
assert(pub.ok && pub.visibility === "PUBLIC", "viewer creates public");

const denyInternal = resolveCreateVisibility({
  role: "viewer",
  requested: "INTERNAL",
  parentVisibility: null,
});
assert(!denyInternal.ok, "viewer cannot create internal");

const editorInternal = resolveCreateVisibility({
  role: "editor",
  requested: "INTERNAL",
  parentVisibility: null,
});
assert(
  editorInternal.ok && editorInternal.visibility === "INTERNAL",
  "editor creates internal",
);

const inheritInternal = resolveCreateVisibility({
  role: "editor",
  requested: "PUBLIC",
  parentVisibility: "INTERNAL",
});
assert(
  inheritInternal.ok && inheritInternal.visibility === "INTERNAL",
  "reply inherits INTERNAL (ignore requested PUBLIC)",
);

const inheritPublic = resolveCreateVisibility({
  role: "viewer",
  requested: "INTERNAL",
  parentVisibility: "PUBLIC",
});
assert(
  inheritPublic.ok && inheritPublic.visibility === "PUBLIC",
  "reply inherits PUBLIC",
);

const denyReplyInternal = resolveCreateVisibility({
  role: "viewer",
  requested: "INTERNAL",
  parentVisibility: "INTERNAL",
});
assert(!denyReplyInternal.ok, "viewer cannot reply internal");

// --- Contagem sem vazamento para viewer ---
type C = {
  id: string;
  parentCommentId: string | null;
  content: string;
  visibility: CommentVisibility;
};

const mixed: C[] = [
  { id: "p1", parentCommentId: null, content: "pub", visibility: "PUBLIC" },
  { id: "p2", parentCommentId: null, content: "pub2", visibility: "PUBLIC" },
  { id: "i1", parentCommentId: null, content: "int", visibility: "INTERNAL" },
  {
    id: "r1",
    parentCommentId: "p1",
    content: "reply",
    visibility: "PUBLIC",
  },
  {
    id: "ri",
    parentCommentId: "i1",
    content: "reply int",
    visibility: "INTERNAL",
  },
];

assert(countVisibleComments(mixed, "admin") === 5, "admin sees all count");
assert(countVisibleComments(mixed, "editor") === 5, "editor sees all count");
assert(countVisibleComments(mixed, "viewer") === 3, "viewer only public count");
assert(
  !filterCommentsByTab(mixed, "all", "viewer").some(
    (c) => c.visibility === "INTERNAL",
  ),
  "viewer all-tab never leaks internal",
);
assert(
  filterCommentsByTab(mixed, "internal", "viewer").length === 0,
  "viewer internal tab empty",
);
assert(
  filterCommentsByTab(mixed, "internal", "editor").length === 2,
  "editor internal filter",
);

assert(
  emptyCommentsMessage("internal", "editor") === "Nenhum comentário interno",
  "empty internal message for editor",
);
assert(
  emptyCommentsMessage("internal", "viewer") === "Nenhum comentário ainda",
  "viewer never sees internal empty copy",
);

assert(mentionAllowedRoles("PUBLIC") === null, "public mentions all roles");
assert(
  JSON.stringify(mentionAllowedRoles("INTERNAL")) ===
    JSON.stringify(["admin", "editor"]),
  "internal mentions admin/editor only",
);

// --- Fonte única / sincronização ---
let source: C[] = mixed.slice(0, 3);
function previewReads() {
  return syncCommentsFromSource(source);
}
function sheetReads() {
  return syncCommentsFromSource(source);
}

assert(
  JSON.stringify(previewReads()) === JSON.stringify(sheetReads()),
  "preview === sheet source",
);

source = [
  ...source,
  { id: "d", parentCommentId: null, content: "int prévia", visibility: "INTERNAL" },
];
assert(
  sheetReads().some((c) => c.id === "d"),
  "internal created on preview → sheet",
);
assert(
  countVisibleComments(previewReads(), "viewer") ===
    countVisibleComments(sheetReads(), "viewer"),
  "viewer counts stay synced without internals",
);

// --- Menções ---
assert(detectMentionQuery("@", 1)?.query === "", "@ alone opens");
assert(detectMentionQuery("@mar", 4)?.query === "mar", "@mar filters");
assert(
  detectMentionQuery("Precisamos falar com @", 22)?.query === "",
  "@ mid sentence",
);
assert(
  detectMentionQuery("Precisamos falar com @mar", 25)?.query === "mar",
  "@mar mid sentence",
);
assert(
  detectMentionQuery("Precisamos revisar isso. @mar", 29)?.query === "mar",
  "@ after punctuation+space",
);
assert(
  detectMentionQuery("Olá,@mar", 8)?.query === "mar",
  "@ after punctuation",
);
assert(detectMentionQuery("email@empresa.com", 6) === null, "email no mention");
assert(detectMentionQuery("oi@mar", 6) === null, "mid-token no mention");

const inserted = insertMentionAt("Precisamos @mar revisar", 15, {
  id: "u1",
  fullName: "Mariana Silva",
});
assert(
  inserted.text === "Precisamos @Mariana Silva revisar",
  "insert at cursor position",
);
assert(inserted.cursor === "Precisamos @Mariana Silva".length + 1, "cursor after mention+space");

const withAfter = insertMentionAt("falar com @mar amanhã", 14, {
  id: "u1",
  fullName: "Mariana Silva",
});
assert(
  withAfter.text === "falar com @Mariana Silva amanhã",
  "preserve text after mention",
);

const multiA = insertMentionAt("@", 1, { id: "u1", fullName: "Mariana Silva" });
const multiB = insertMentionAt(
  `${multiA.text}e @car`,
  `${multiA.text}e @car`.length,
  { id: "u2", fullName: "Carlos Oliveira" },
);
assert(multiB.text.includes("@Mariana Silva"), "first mention kept");
assert(multiB.text.includes("@Carlos Oliveira"), "second mention inserted");

const cleared = retainMentionsInContent("sem menção", [
  { userId: "u1", fullName: "Mariana Silva" },
]);
assert(cleared.length === 0, "removing @text drops mention before send");

const partial = retainMentionsInContent("@Mariana", [
  { userId: "u1", fullName: "Mariana Silva" },
]);
assert(partial.length === 0, "incomplete mention token drops relation");

const dup = retainMentionsInContent(
  "@Mariana Silva e @Mariana Silva",
  [
    { userId: "u1", fullName: "Mariana Silva" },
    { userId: "u1", fullName: "Mariana Silva" },
  ],
);
assert(dup.length === 1, "dedupe same user mention");

const segments = segmentCommentContent("@Mariana Silva precisa revisar", [
  { userId: "u1", fullName: "Mariana Silva" },
]);
assert(segments[0]?.type === "mention", "render mention segment");
assert(
  segments[0]?.type === "mention" && segments[0].userId === "u1",
  "mention bound to user id",
);

assert(countComments(mixed) === 5, "raw count helpers");

console.log(
  "comments.assert: OK (permissions + visibility + sync + mentions)",
);
