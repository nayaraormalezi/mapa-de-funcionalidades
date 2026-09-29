import assert from "node:assert/strict";
import {
  filterCommentsByChannelScope,
  resolveClickedImplementation,
  resolveCreateFeatureChannelContextId,
  evolutionsForFccIds,
  improvementsForChannel,
} from "./channel-implementation-detail.ts";

const contexts = [
  {
    featureChannelContextId: "fcc-aic",
    channelName: "AIC",
    phase: "AVAILABLE",
  },
  {
    featureChannelContextId: "fcc-plat",
    channelName: "Plataforma.CAIXA",
    phase: "BACKLOG",
  },
];

const aic = resolveClickedImplementation(contexts, "fcc-aic");
assert.equal(aic?.channelName, "AIC");
assert.equal(aic?.phase, "AVAILABLE");

const plat = resolveClickedImplementation(contexts, "fcc-plat");
assert.equal(plat?.channelName, "Plataforma.CAIXA");
assert.equal(plat?.phase, "BACKLOG");

assert.equal(
  resolveClickedImplementation(contexts, "fcc-missing"),
  null,
  "missing FCC must not fall back to first",
);

const comments = [
  {
    id: "g1",
    parentCommentId: null,
    featureChannelContextId: null,
  },
  {
    id: "a1",
    parentCommentId: null,
    featureChannelContextId: "fcc-aic",
  },
  {
    id: "p1",
    parentCommentId: null,
    featureChannelContextId: "fcc-plat",
  },
  {
    id: "ar1",
    parentCommentId: "a1",
    featureChannelContextId: "fcc-aic",
  },
];

assert.equal(filterCommentsByChannelScope(comments, { type: "all" }).length, 4);
assert.deepEqual(
  filterCommentsByChannelScope(comments, { type: "general" }).map((c) => c.id),
  ["g1"],
);
assert.deepEqual(
  filterCommentsByChannelScope(comments, {
    type: "fcc",
    fccIds: ["fcc-aic"],
  }).map((c) => c.id),
  ["a1", "ar1"],
);
assert.deepEqual(
  filterCommentsByChannelScope(comments, {
    type: "fcc",
    fccIds: ["fcc-plat"],
  }).map((c) => c.id),
  ["p1"],
);

assert.equal(
  resolveCreateFeatureChannelContextId({
    lockedFccId: "fcc-aic",
    channelFilter: { type: "all" },
  }),
  "fcc-aic",
);
assert.equal(
  resolveCreateFeatureChannelContextId({
    channelFilter: { type: "general" },
  }),
  null,
);
assert.equal(
  resolveCreateFeatureChannelContextId({
    channelFilter: { type: "fcc", fccIds: ["fcc-plat", "fcc-plat-2"] },
  }),
  "fcc-plat",
);

const evolutions = [
  { featureChannelContextId: "fcc-aic", title: "A", active: true },
  { featureChannelContextId: "fcc-plat", title: "B", active: true },
  { featureChannelContextId: "fcc-aic", title: "C", active: false },
];
assert.deepEqual(
  evolutionsForFccIds(evolutions, ["fcc-aic"]).map((e) => e.title),
  ["A"],
);

const gaps = [
  { featureId: "f1", currentChannelId: "ch-aic", title: "1" },
  { featureId: "f1", currentChannelId: "ch-plat", title: "2" },
  { featureId: "f2", currentChannelId: "ch-aic", title: "3" },
];
assert.deepEqual(
  improvementsForChannel(gaps, "f1", "ch-aic").map((g) => g.title),
  ["1"],
);

console.log("channel-implementation-detail.assert: ok");
