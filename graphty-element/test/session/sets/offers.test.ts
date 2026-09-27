/**
 * @file Offered sets (design/sets/sets-design.md section 8.2): one test per row of the shape
 * table, each through the element's own algorithm of that shape where it has one; `limit` and
 * `more`; the edge-count pass, which `offers` never runs; overlapping communities; the unknown
 * run; using an offer as a scope; keeping one with `createFrom` and `createPath`, following one,
 * and refusing a stale one before the resolve and between the resolve and the commit.
 *
 * The graph, undirected: a triangle a-b-c, a bridge c-d, a triangle d-e-f, an isolated node g,
 * and a pair h-i. Three components: {a..f}, {h, i}, {g}.
 */

import { assert, describe, it } from "vitest";

import type { NodeId, RunId, SetDefinition } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import type { Concrete, Materialiser } from "../../../src/session/sets/algebra";
import { offerCounters } from "../../../src/session/sets/offers";
import { createSetsApi } from "../../../src/session/sets/SetsApi";
import type { SetOffer } from "../../../src/session/sets/types";
import { type Harness, makeSession } from "../helpers";
import type { Published } from "../visibility/results";
import { builtInRuns } from "./algorithms";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
const EDGES = [
    ["a", "b"],
    ["b", "c"],
    ["a", "c"],
    ["c", "d"],
    ["d", "e"],
    ["e", "f"],
    ["d", "f"],
    ["h", "i"],
] as const;

/**
 * Nodes to values.
 * @param values - Id to values.
 * @returns The map.
 */
function perNode(values: Record<string, Record<string, unknown>>): Map<NodeId, Record<string, unknown>> {
    return new Map(Object.entries(values));
}

/** A session over the graph, running built-in algorithms and publishing the table's run ids by hand. */
function fixture(table: Map<string, Published> = new Map()): Harness {
    let harness: Harness | null = null;
    const made = makeSession({ directed: false, runs: { execute: builtInRuns(() => harness as Harness, table) } });
    harness = made;
    made.add(
        NODES.map((id) => ({ id })),
        EDGES.map(([src, dst]) => ({ src, dst })),
    );

    return made;
}

/**
 * Run an algorithm to completion under a chosen id.
 * @param h - The harness.
 * @param algorithm - Its key.
 * @param as - The run id.
 * @param params - Its parameters.
 * @returns The run id.
 */
async function run(h: Harness, algorithm: string, as: string, params: Record<string, unknown> = {}): Promise<RunId> {
    const result = await h.session.runs.start(algorithm, params, { as, scope: "graph", style: false });

    return result.runId;
}

/**
 * Re-run a run in place and wait for it.
 * @param h - The harness.
 * @param id - The run.
 */
async function rerun(h: Harness, id: RunId): Promise<void> {
    const held = h.session.runs.get(id);
    assert.isDefined(held);
    await held?.rerun();
}

/**
 * The node and edge counts a scope resolves to.
 * @param h - The harness.
 * @param definition - The offer's definition.
 * @returns The counts.
 */
async function counts(h: Harness, definition: SetDefinition): Promise<{ nodes: number; edges: number }> {
    const { nodes, edges } = await h.session.scope.count({ define: definition });

    return { nodes, edges };
}

/**
 * The node ids a scope resolves to, sorted.
 * @param h - The harness.
 * @param definition - The definition.
 * @returns The ids.
 */
async function nodeIds(h: Harness, definition: SetDefinition): Promise<string[]> {
    const resolved = await h.session.scope.resolve({ define: definition });

    return [...resolved.nodes].map(String).sort();
}

/**
 * What a call refused with.
 * @param call - The call.
 * @returns The code and `details.reason`, or null when it did not refuse.
 */
async function refusal(call: () => unknown): Promise<{ code: string; reason: unknown } | null> {
    try {
        await call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        return { code: error.code, reason: (error.details as { reason?: unknown } | undefined)?.reason };
    }

    return null;
}

/** An offer's fields a row checks. */
function summary(offer: SetOffer): Record<string, unknown> {
    return { label: offer.label, value: offer.item.key.value, field: offer.item.key.field, nodes: offer.nodes, reading: offer.reading, path: offer.path, followable: offer.followable };
}

describe("sets.offers: one row per result shape", () => {
    it("community (connected components): one offer per group, largest first, not followable", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");

        const { offers, more } = h.session.sets.offers(id);

        assert.strictEqual(more, 0);
        assert.deepStrictEqual(offers.map(summary), [
            { label: "Community 0 (6 nodes)", value: 0, field: "group", nodes: 6, reading: "induced", path: false, followable: false },
            { label: "Community 2 (2 nodes)", value: 2, field: "group", nodes: 2, reading: "induced", path: false, followable: false },
            { label: "Community 1 (1 node)", value: 1, field: "group", nodes: 1, reading: "induced", path: false, followable: false },
        ]);
        assert.deepStrictEqual(await nodeIds(h, offers[0].definition), ["a", "b", "c", "d", "e", "f"], "the first offer is the largest component");
        assert.deepStrictEqual(await counts(h, offers[0].definition), { nodes: 6, edges: 7 });
        assert.strictEqual(offers[0].item.execution, resultExecutionOf(h.session.results, id), "the item holds the execution it was read from");
    });

    it("layered-grouping (breadth-first search): one offer per level", async () => {
        const h = fixture();
        const id = await run(h, "bfs", "steps", { source: "a" });

        const { offers } = h.session.sets.offers(id);

        assert.deepStrictEqual(
            offers.map((offer) => [offer.label, offer.followable, offer.reading]),
            [
                ["Level 1 (2 nodes)", true, "induced"],
                ["Level 3 (2 nodes)", true, "induced"],
                ["Level 0 (1 node)", true, "induced"],
                ["Level 2 (1 node)", true, "induced"],
            ],
        );
        assert.deepStrictEqual(await nodeIds(h, offers[1].definition), ["e", "f"]);
    });

    it("category-table: one offer per category (no built-in algorithm has this shape, so the result is hand-built)", async () => {
        const table = new Map<string, Published>([
            ["kinds", { shape: "category-table", nodes: perNode({ a: { category: "hub" }, c: { category: "hub" }, d: { category: "hub" }, b: { category: "leaf" } }) }],
        ]);
        const h = fixture(table);
        await run(h, "degree", "kinds");

        const { offers } = h.session.sets.offers("kinds");

        assert.deepStrictEqual(
            offers.map((offer) => [offer.label, offer.nodes, offer.reading, offer.followable]),
            [
                ["Hub (3 nodes)", 3, "induced", true],
                ["Leaf (1 node)", 1, "induced", true],
            ],
        );
        assert.deepStrictEqual(await counts(h, offers[0].definition), { nodes: 3, edges: 2 });
    });

    it("node-set: one offer, in == true, read induced (hand-built: no built-in algorithm has this shape)", async () => {
        const table = new Map<string, Published>([["picked", { shape: "node-set", nodes: perNode({ a: { in: true }, b: { in: true }, c: { in: false }, g: { in: true } }) }]]);
        const h = fixture(table);
        await run(h, "degree", "picked");

        const { offers } = h.session.sets.offers("picked");

        assert.deepStrictEqual(offers.map(summary), [{ label: "In the set (3 nodes)", value: true, field: "in", nodes: 3, reading: "induced", path: false, followable: true }]);
        assert.deepStrictEqual(await counts(h, offers[0].definition), { nodes: 3, edges: 1 });
    });

    it("edge-set (Kruskal): one offer, in == true, read listed, its counts left to the edge pass", async () => {
        const h = fixture();
        const id = await run(h, "kruskal", "tree");

        const { offers } = h.session.sets.offers(id);

        assert.deepStrictEqual(offers.map(summary), [{ label: "In the set", value: true, field: "in", nodes: undefined, reading: "listed", path: false, followable: true }]);
        assert.isUndefined(offers[0].edges);
        assert.deepStrictEqual(await counts(h, offers[0].definition), { nodes: 8, edges: 6 }, "a forest over every node but g");
    });

    it("path (shortest path): one offer, onPath == true, read listed, a path offer", async () => {
        const h = fixture();
        const id = await run(h, "shortest-path", "route", { source: "a", target: "f" });

        const { offers } = h.session.sets.offers(id);

        assert.deepStrictEqual(offers.map(summary), [{ label: "On path", value: true, field: "onPath", nodes: undefined, reading: "listed", path: true, followable: true }]);
        assert.deepStrictEqual(await counts(h, offers[0].definition), { nodes: 4, edges: 3 });
    });

    it("node-metric (degree) and edge-metric (max flow) offer nothing: a threshold leaf cuts a metric", async () => {
        const h = fixture();
        const degree = await run(h, "degree", "deg");
        const flow = await run(h, "max-flow", "flow", { source: "a", sink: "f" });

        assert.strictEqual(h.session.runs.get(flow)?.result?.shape, "edge-metric");
        assert.deepStrictEqual(h.session.sets.offers(degree), { offers: [], more: 0 });
        assert.deepStrictEqual(h.session.sets.offers(flow), { offers: [], more: 0 });
    });

    it("temporal offers nothing (hand-built: no built-in algorithm has this shape)", async () => {
        const h = fixture(new Map([["series", { shape: "temporal" }]]));
        await run(h, "degree", "series");

        assert.deepStrictEqual(h.session.sets.offers("series"), { offers: [], more: 0 });
    });

    it("pair-list (link prediction) offers nothing: a candidate pair is not an existing subgraph", async () => {
        const h = fixture();
        const id = await run(h, "link-prediction", "links");

        assert.strictEqual(h.session.runs.get(id)?.result?.shape, "pair-list");
        assert.deepStrictEqual(h.session.sets.offers(id), { offers: [], more: 0 });
    });
});

describe("sets.offers: limit, the edge-count pass and refusals", () => {
    it("returns the largest `limit` offers and how many were left out", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");

        const two = h.session.sets.offers(id, { limit: 2 });
        assert.deepStrictEqual(
            two.offers.map((offer) => offer.nodes),
            [6, 2],
        );
        assert.strictEqual(two.more, 1);
        assert.deepStrictEqual(h.session.sets.offers(id, { limit: 0 }), { offers: [], more: 3 });
    });

    it("keeps an offer's item's members, whatever definition a copy of the offer carries", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");
        const { offers } = h.session.sets.offers(id);

        const kept = await h.session.sets.createFrom({ ...offers[0], definition: offers[1].definition });
        const honest = await h.session.sets.createFrom(offers[0]);

        assert.deepStrictEqual(h.session.sets.get(kept)?.definition, h.session.sets.get(honest)?.definition);
        assert.deepStrictEqual(h.session.sets.get(kept)?.createdFrom, { kind: "result", item: offers[0].item });
    });

    it("fills `edges` only once the pass is cached, and `offers` never runs it", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");
        const before = offerCounters.edgePasses;

        const first = h.session.sets.offers(id).offers;
        h.session.sets.offers(id);
        assert.isTrue(
            first.every((offer) => offer.edges === undefined),
            "no pass has run",
        );
        assert.strictEqual(offerCounters.edgePasses, before, "offers never runs the pass");

        await h.session.sets.createFrom(first[1]);
        assert.strictEqual(offerCounters.edgePasses, before + 1, "the first resolution of an offer runs it");
        await h.session.sets.createFrom(first[2]);
        assert.strictEqual(offerCounters.edgePasses, before + 1, "once per execution");

        assert.deepStrictEqual(
            h.session.sets.offers(id).offers.map((offer) => offer.edges),
            [7, 1, 0],
        );
    });

    it("fills a listed offer's nodes and edges from the pass", async () => {
        const h = fixture();
        const id = await run(h, "kruskal", "tree");

        await h.session.sets.createFrom(h.session.sets.offers(id).offers[0]);
        const [offer] = h.session.sets.offers(id).offers;

        assert.strictEqual(offer.nodes, 8);
        assert.strictEqual(offer.edges, 6);
        assert.strictEqual(offer.label, "In the set (8 nodes)");
    });

    it("counts an edge once for every group both its endpoints hold, in overlapping communities", async () => {
        // a: {0}, b: {0, 1}, c: {0, 1}, d: {1}. a-b and a-c are in 0; b-c in 0 and 1; c-d in 1.
        const table = new Map<string, Published>([
            ["overlap", { shape: "community", nodes: perNode({ a: { group: [0] }, b: { group: [0, 1] }, c: { group: [0, 1] }, d: { group: [1] }, e: { group: [2] } }) }],
        ]);
        const h = fixture(table);
        await run(h, "degree", "overlap");
        const { offers } = h.session.sets.offers("overlap");
        await h.session.sets.createFrom(offers[0]);

        const filled = h.session.sets.offers("overlap").offers;

        assert.deepStrictEqual(
            filled.map((offer) => [offer.item.key.value, offer.nodes, offer.edges]),
            [
                [0, 3, 3],
                [1, 3, 2],
                [2, 1, 0],
            ],
        );
        for (const offer of filled) {
            const resolved = await counts(h, offer.definition);
            assert.deepStrictEqual(resolved, { nodes: offer.nodes, edges: offer.edges }, `group ${String(offer.item.key.value)} resolves to what the pass counted`);
        }
    });

    it("refuses a run the session does not hold with E_UNKNOWN_RUN", async () => {
        const h = fixture();
        await run(h, "components", "pieces");

        assert.deepStrictEqual(await refusal(() => h.session.sets.offers("nope")), { code: "E_UNKNOWN_RUN", reason: undefined });
    });
});

describe("sets.offers: using and keeping an offer", () => {
    it("writes nothing when an offer is used as a scope", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");
        const changes: unknown[] = [];
        h.session.on("set:changed", (change) => changes.push(change));
        const [offer] = h.session.sets.offers(id).offers;

        await h.session.scope.resolve({ define: offer.definition });
        await h.session.scope.count({ define: offer.definition });

        assert.deepStrictEqual(h.session.sets.list(), []);
        assert.deepStrictEqual(changes, []);
    });

    it("keeps an offer as a fixed set of its members, created from the result with its execution", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");
        const [offer] = h.session.sets.offers(id).offers;

        const kept = await h.session.sets.createFrom(offer, { name: "Main piece" });

        const set = h.session.sets.get(kept);
        assert.deepStrictEqual(set?.definition, { kind: "fixed", nodes: ["a", "b", "c", "d", "e", "f"], reading: "induced" });
        assert.deepStrictEqual(set?.createdFrom, { kind: "result", item: offer.item });
        assert.isString(offer.item.execution);
    });

    it("keeps a followable offer as a rule over the item without its execution", async () => {
        const h = fixture();
        const id = await run(h, "bfs", "steps", { source: "a" });
        const [offer] = h.session.sets.offers(id).offers;

        const kept = await h.session.sets.createFrom(offer, { follow: true });

        const set = h.session.sets.get(kept);
        assert.deepStrictEqual(set?.definition, { kind: "rule", where: { kind: "item", item: { run: id, key: { field: "level", value: 1 } } }, reading: "induced" });
        assert.deepStrictEqual(set?.createdFrom, { kind: "result", item: offer.item });
    });

    it("refuses to follow a partition group", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");
        const [offer] = h.session.sets.offers(id).offers;

        assert.deepStrictEqual(await refusal(() => h.session.sets.createFrom(offer, { follow: true })), { code: "E_BAD_COMMAND", reason: "follow-group" });
        assert.deepStrictEqual(h.session.sets.list(), []);
    });

    it("keeps a path offer in its order, each step naming the on-path edges between its pair", async () => {
        const h = fixture();
        const id = await run(h, "shortest-path", "route", { source: "a", target: "f" });
        const [offer] = h.session.sets.offers(id).offers;

        const kept = await h.session.sets.createPath(offer);

        const set = h.session.sets.get(kept);
        assert.strictEqual(set?.definition.kind, "path");
        const path = set?.definition as Extract<SetDefinition, { kind: "path" }>;
        assert.deepStrictEqual(path.nodes, ["a", "c", "d", "f"]);
        assert.deepStrictEqual(
            path.edges?.map((step) => {
                const member = step as { source: NodeId; target: NodeId };
                return [member.source, member.target];
            }),
            [
                ["a", "c"],
                ["c", "d"],
                ["d", "f"],
            ],
        );
        assert.deepStrictEqual(set?.createdFrom, { kind: "result", item: offer.item });
        assert.strictEqual(h.session.sets.pathKind(kept), "simple");
    });

    it("refuses a stale offer before resolving it", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");
        const [offer] = h.session.sets.offers(id).offers;
        await rerun(h, id);

        assert.deepStrictEqual(await refusal(() => h.session.sets.createFrom(offer)), { code: "E_BAD_COMMAND", reason: "stale-offer" });
        assert.deepStrictEqual(await refusal(() => h.session.sets.createFrom(offer, { follow: true })), { code: "E_BAD_COMMAND", reason: "stale-offer" });
        assert.deepStrictEqual(h.session.sets.list(), []);
    });

    it("refuses a stale offer before the resolve step runs, and when a re-run lands between the resolve and the commit", async () => {
        const h = fixture();
        const id = await run(h, "shortest-path", "route", { source: "a", target: "f" });
        const [offer] = h.session.sets.offers(id).offers;
        const pending: (() => void)[] = [];
        const concrete: Concrete = { definition: { kind: "fixed", nodes: ["a"], reading: "induced" }, refs: [], createdFrom: { kind: "result", item: offer.item } };
        const held = (): Promise<Concrete> =>
            new Promise((resolve) => {
                pending.push(() => {
                    resolve(concrete);
                });
            });
        const materialise: Materialiser = { from: held, combine: held, path: held };
        const sets = createSetsApi({ edgeMember: () => undefined, materialise, executionOf: (runId) => resultExecutionOf(h.session.results, runId) });

        const fromCall = sets.createFrom(offer);
        const pathCall = sets.createPath(offer);
        await Promise.resolve();
        assert.strictEqual(pending.length, 2, "both calls reached the resolve step");
        await rerun(h, id);
        pending[0]();
        pending[1]();

        assert.deepStrictEqual(await refusal(() => fromCall), { code: "E_BAD_COMMAND", reason: "stale-offer" });
        assert.deepStrictEqual(await refusal(() => pathCall), { code: "E_BAD_COMMAND", reason: "stale-offer" });
        assert.deepStrictEqual(await refusal(() => sets.createFrom(offer)), { code: "E_BAD_COMMAND", reason: "stale-offer" });
        assert.strictEqual(pending.length, 2, "a call refused before the resolve never reaches it");
        assert.deepStrictEqual(sets.list(), []);
    });

    it("a set kept through createFrom(offer) reads current, then 'Earlier run' after its run re-runs", async () => {
        const h = fixture();
        const id = await run(h, "components", "pieces");
        const [offer] = h.session.sets.offers(id).offers;
        const kept = await h.session.sets.createFrom(offer);

        assert.deepStrictEqual(h.session.sets.status({ set: kept }), { freshness: "current", reasons: [], earlierRuns: [] });
        await rerun(h, id);

        assert.deepStrictEqual(h.session.sets.status({ set: kept }), { freshness: "current", reasons: [], earlierRuns: [id] });
        const members = await h.session.scope.resolve({ set: kept });
        assert.deepStrictEqual([...members.nodes].map(String).sort(), ["a", "b", "c", "d", "e", "f"], "a fixed set keeps its members");
    });
});
