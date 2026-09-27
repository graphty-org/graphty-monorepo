/**
 * @file Memberships, `sets.containing` (design/sets/sets-design.md section 15.2): the kept sets
 * and the partition items holding one element, answered without resolving what need not be: a
 * fixed set by binary search, a rule of element-local leaves at the one element, and a rule with a
 * population leaf resolved once and cached. An edge's row is its `Edge.index` in the snapshot.
 *
 * The graph, undirected: a triangle a-b-c, a bridge c-d, a triangle d-e-f, an isolated node g,
 * and a pair h-i. Each node carries `data.weight`: its position in the alphabet.
 */

import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import { cacheCounters } from "../../../src/session/sets/cache";
import { resolveCounters } from "../../../src/session/sets/resolve";
import { edgeBetween, type Harness, makeSession } from "../helpers";
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

/** A session over the graph, running built-in algorithms. */
function fixture(): Harness {
    let harness: Harness | null = null;
    const made = makeSession({ directed: false, runs: { execute: builtInRuns(() => harness as Harness) } });
    harness = made;
    made.add(
        NODES.map((id, i) => ({ id, weight: i + 1 })),
        EDGES.map(([src, dst]) => ({ src, dst })),
    );

    return made;
}

/**
 * Every resolution counter summed: zero across a call that resolved nothing.
 * @returns The sum.
 */
function resolutionWork(): number {
    return Object.values(resolveCounters).reduce((sum, count) => sum + count, 0);
}

/**
 * The names of the kept sets holding an element.
 * @param h - The harness.
 * @param element - The element.
 * @returns The set names.
 */
async function setNames(h: Harness, element: { node: NodeId } | { edge: EdgeId }): Promise<string[]> {
    const { sets } = await h.session.sets.containing(element);

    return sets.map((id) => h.session.sets.get(id)?.name ?? id);
}

describe("sets.containing", () => {
    it("lists a node's kept sets and the partition items of every finished run, with labels", async () => {
        const h = fixture();
        await h.session.runs.start("components", {}, { as: "pieces", scope: "graph", style: false });
        await h.session.runs.start("bfs", { source: "a" }, { as: "steps", scope: "graph", style: false });
        await h.session.runs.start("degree", {}, { as: "deg", scope: "graph", style: false });
        h.session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Pair" });
        h.session.sets.create({ kind: "fixed", nodes: ["e"], reading: "induced" }, { name: "Elsewhere" });
        h.session.sets.create(
            { kind: "rule", where: { kind: "range", attribute: "data.weight", max: 3 }, reading: "induced" },
            { name: "Light" },
        );

        const found = await h.session.sets.containing({ node: "b" });

        assert.deepStrictEqual(
            found.sets.map((id) => h.session.sets.get(id)?.name),
            ["Pair", "Light"],
        );
        const pieces = h.session.runs.get("pieces");
        const steps = h.session.runs.get("steps");
        assert.deepStrictEqual(found.items, [
            {
                item: {
                    result: "pieces",
                    key: { field: "group", value: 0 },
                    run: resultExecutionOf(h.session.results, "pieces"),
                },
                label: `${pieces?.label ?? ""}: community 0 of 3`,
                of: 3,
            },
            {
                item: {
                    result: "steps",
                    key: { field: "level", value: 1 },
                    run: resultExecutionOf(h.session.results, "steps"),
                },
                label: `${steps?.label ?? ""}: level 1 of 4`,
                of: 4,
            },
        ]);
        assert.deepStrictEqual(
            (await h.session.sets.containing({ node: "g" })).items.map((entry) => entry.of),
            [3],
            "g was never reached by the search",
        );
    });

    it("answers a fixed set by binary search, without resolving it", async () => {
        const h = fixture();
        h.session.sets.create({ kind: "fixed", nodes: ["a", "c", "e", "g", "i"], reading: "induced" }, { name: "Odd" });
        const before = resolutionWork();

        assert.deepStrictEqual(await setNames(h, { node: "e" }), ["Odd"]);
        assert.deepStrictEqual(await setNames(h, { node: "b" }), []);
        assert.deepStrictEqual(
            await setNames(h, { edge: edgeBetween(h, "a", "c") }),
            ["Odd"],
            "an induced set holds the edge between two members",
        );
        assert.deepStrictEqual(await setNames(h, { edge: edgeBetween(h, "a", "b") }), []);

        assert.strictEqual(resolutionWork(), before, "nothing was resolved");
    });

    it("evaluates a rule of element-local leaves on the one element", async () => {
        const h = fixture();
        h.session.sets.create(
            { kind: "rule", where: { kind: "range", attribute: "data.weight", min: 4 }, reading: "induced" },
            { name: "Heavy" },
        );
        let reads = 0;
        const get = h.nodeAttributes.get.bind(h.nodeAttributes);
        h.nodeAttributes.get = (index: number) => {
            reads++;
            return get(index);
        };
        const before = resolutionWork();

        assert.deepStrictEqual(await setNames(h, { node: "e" }), ["Heavy"]);
        assert.strictEqual(reads, 1, "one element's value was read");
        assert.deepStrictEqual(await setNames(h, { node: "b" }), []);
        assert.strictEqual(reads, 2);
        assert.deepStrictEqual(
            await setNames(h, { edge: edgeBetween(h, "d", "e") }),
            ["Heavy"],
            "an induced rule holds the edge between two members",
        );
        assert.deepStrictEqual(await setNames(h, { edge: edgeBetween(h, "c", "d") }), []);
        assert.isAtMost(reads, 6, "an edge reads its two endpoints");

        assert.strictEqual(resolutionWork(), before, "nothing was resolved");
    });

    it("resolves a rule with a top leaf once and serves the next question from the cache", async () => {
        const h = fixture();
        await h.session.runs.start("degree", {}, { as: "deg", scope: "graph", style: false });
        h.session.sets.create(
            { kind: "rule", where: { kind: "threshold", path: "results.deg.value", top: 2 }, reading: "induced" },
            { name: "Hubs" },
        );

        assert.deepStrictEqual(await setNames(h, { node: "c" }), ["Hubs"]);
        const work = resolutionWork();
        const { hits } = cacheCounters;

        assert.deepStrictEqual(await setNames(h, { node: "d" }), ["Hubs"]);
        assert.deepStrictEqual(await setNames(h, { node: "a" }), []);
        assert.deepStrictEqual(await setNames(h, { edge: edgeBetween(h, "c", "d") }), ["Hubs"]);

        assert.strictEqual(resolutionWork(), work, "resolved once");
        assert.strictEqual(cacheCounters.hits, hits, "the cached resolution is peeked at, not looked up");
    });

    it("reads an edge's row from its index: a listed set holds the edge it names and its endpoints, not a neighbour", async () => {
        const h = fixture();
        const ab = edgeBetween(h, "a", "b");
        h.session.sets.create({ kind: "fixed", nodes: [], edges: [ab], reading: "listed" }, { name: "One edge" });

        assert.deepStrictEqual(
            await setNames(h, { node: "a" }),
            ["One edge"],
            "a fixed set's node half holds its edges' endpoints",
        );
        assert.deepStrictEqual(await setNames(h, { node: "c" }), []);
        assert.deepStrictEqual(await setNames(h, { edge: ab }), ["One edge"]);
        assert.deepStrictEqual(await setNames(h, { edge: edgeBetween(h, "b", "c") }), []);
    });

    it("refuses an element the graph does not hold", async () => {
        const h = fixture();

        for (const element of [{ node: "zz" }, { edge: "999999" }]) {
            try {
                await h.session.sets.containing(element);
                assert.fail("expected a refusal");
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
            }
        }
    });
});
