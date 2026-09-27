/**
 * @file Held-item captures (design/sets/sets-design.md section 5.2): before a run re-executes in
 * place, what each kept rule holds of the result being replaced is captured onto the run under its
 * execution; the rule then resolves to the capture and reads "Earlier run"; a capture is carried
 * forward only while live state still holds its execution; with no capture, the rule resolves to
 * nothing with `values-not-kept`.
 *
 * The graph: a-b, a-c, b-c, c-d, d-e.
 */

import { assert, describe, it } from "vitest";

import type { NodeId, Scope, SetId } from "../../../src/catalog/types";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import type { SessionRunsApi } from "../../../src/session/runs";
import { itemKeyOf } from "../../../src/session/sets/captures";
import { setsStoreOf } from "../../../src/session/sets/SetsApi";
import { edgeBetween, type Harness, makeSession } from "../helpers";
import { type Published, publishing } from "../visibility/results";

/**
 * Nodes to values.
 * @param values - Id to values.
 * @returns The map.
 */
function perNode(values: Record<string, Record<string, unknown>>): Map<NodeId, Record<string, unknown>> {
    return new Map(Object.entries(values));
}

/** Louvain's first answer: group 0 is a, b; group 1 is c, d, e. */
const FIRST: Published = { shape: "community", nodes: perNode({ a: { group: 0 }, b: { group: 0 }, c: { group: 1 }, d: { group: 1 }, e: { group: 1 } }) };
/** Its second: group 1 is b, d, e. */
const SECOND: Published = { shape: "community", nodes: perNode({ a: { group: 0 }, b: { group: 1 }, c: { group: 0 }, d: { group: 1 }, e: { group: 1 } }) };

/**
 * A session with a finished partition run `louv`.
 * @returns The harness, the table the executor publishes from, and the first execution.
 */
async function withLouvain(): Promise<{ harness: Harness; table: Map<string, Published>; first: string }> {
    const table = new Map<string, Published>([["louv", FIRST]]);
    const harness = makeSession({ directed: false, runs: { execute: publishing(table) } });
    harness.add(
        ["a", "b", "c", "d", "e"].map((id) => ({ id })),
        [
            { src: "a", dst: "b" },
            { src: "a", dst: "c" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "d", dst: "e" },
        ],
    );
    await harness.session.runs.start("degree", undefined, { as: "louv", scope: "graph", style: false });
    const first = resultExecutionOf(harness.session.results, "louv");
    assert.isString(first);

    return { harness, table, first: first as string };
}

/**
 * Re-run a run in place and wait for it.
 * @param harness - The harness.
 * @param run - The run.
 */
async function rerun(harness: Harness, run: string): Promise<void> {
    const held = harness.session.runs.get(run);
    assert.isDefined(held);
    await held?.rerun();
}

/**
 * Keep a rule holding one group of one execution.
 * @param harness - The harness.
 * @param execution - The execution.
 * @param value - The group.
 * @returns The set id.
 */
function holdGroup(harness: Harness, execution: string, value: number): SetId {
    return harness.session.sets.create({ kind: "rule", where: { kind: "item", item: { run: "louv", key: { field: "group", value }, execution } }, reading: "induced" });
}

/**
 * The nodes a scope resolves to, sorted.
 * @param harness - The harness.
 * @param scope - The scope.
 * @returns The ids.
 */
async function nodesOf(harness: Harness, scope: Scope): Promise<NodeId[]> {
    return [...(await harness.session.scope.resolve(scope)).nodes].sort();
}

/**
 * A run's captures as plain data.
 * @param harness - The harness.
 * @param run - The run.
 * @returns Execution to item key to capture.
 */
function heldOf(harness: Harness, run: string): Record<string, Record<string, unknown>> {
    const held = (harness.session.runs as SessionRunsApi).heldOf(run);

    return Object.fromEntries([...held].map(([execution, items]) => [execution, Object.fromEntries(items)]));
}

describe("held-item captures", () => {
    it("captures each item a kept rule holds as a sorted id list under its execution, before the re-run", async () => {
        const { harness, table, first } = await withLouvain();
        holdGroup(harness, first, 1);
        assert.deepStrictEqual(heldOf(harness, "louv"), {}, "nothing is captured before a re-run");

        table.set("louv", SECOND);
        await rerun(harness, "louv");

        assert.deepStrictEqual(heldOf(harness, "louv"), { [first]: { [itemKeyOf({ field: "group", value: 1 })]: { nodes: ["c", "d", "e"] } } });
    });

    it("resolves the holding rule to the capture and reports the run as an earlier run", async () => {
        const { harness, table, first } = await withLouvain();
        const held = holdGroup(harness, first, 1);
        table.set("louv", SECOND);
        await rerun(harness, "louv");

        assert.deepStrictEqual(await nodesOf(harness, { set: held }), ["c", "d", "e"], "the earlier members, not the new group 1 (b, d, e)");
        assert.deepStrictEqual(harness.session.sets.status({ set: held }), { freshness: "current", reasons: [], earlierRuns: ["louv"] });
    });

    it("captures an edge field's edges by stable identity and resolves them again", async () => {
        const table = new Map<string, Published>();
        const harness = makeSession({ directed: false, runs: { execute: publishing(table) } });
        harness.add(
            ["a", "b", "c"].map((id) => ({ id })),
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
                { src: "a", dst: "c" },
            ],
        );
        const ab = edgeBetween(harness, "a", "b");
        const bc = edgeBetween(harness, "b", "c");
        const ac = edgeBetween(harness, "a", "c");
        table.set("route", {
            shape: "path",
            nodes: perNode({ a: { onPath: true }, b: { onPath: true }, c: { onPath: true } }),
            edges: new Map([
                [ab, { onPath: true }],
                [bc, { onPath: true }],
                [ac, { onPath: false }],
            ]),
        });
        await harness.session.runs.start("degree", undefined, { as: "route", scope: "graph", style: false });
        const execution = resultExecutionOf(harness.session.results, "route") ?? "";
        const held = harness.session.sets.create({
            kind: "rule",
            where: { kind: "item", item: { run: "route", key: { field: "onPath", value: true }, execution } },
            reading: "listed",
        });

        table.set("route", {
            shape: "path",
            nodes: perNode({ a: { onPath: true }, b: { onPath: false }, c: { onPath: true } }),
            edges: new Map([
                [ab, { onPath: false }],
                [bc, { onPath: false }],
                [ac, { onPath: true }],
            ]),
        });
        await rerun(harness, "route");

        const resolved = await harness.session.scope.resolve({ set: held });
        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b", "c"]);
        assert.deepStrictEqual([...resolved.edges].sort(), [ab, bc].sort(), "the earlier path's edges, not a-c");
    });

    it("carries a capture forward only while live state still holds its execution", async () => {
        const { harness, table, first } = await withLouvain();
        const held = holdGroup(harness, first, 1);
        const key = itemKeyOf({ field: "group", value: 1 });
        table.set("louv", SECOND);
        await rerun(harness, "louv");
        await rerun(harness, "louv");
        assert.deepStrictEqual(Object.keys(heldOf(harness, "louv")), [first], "still held: carried; the second execution is held by nothing");
        assert.deepStrictEqual(heldOf(harness, "louv")[first], { [key]: { nodes: ["c", "d", "e"] } });

        const store = setsStoreOf(harness.session.sets);
        const record = store.get(held);
        harness.session.sets.remove(held);
        await rerun(harness, "louv");
        assert.deepStrictEqual(heldOf(harness, "louv"), {}, "nothing holds the execution: not carried");

        // Restoring the record (what an undo of the removal does) finds no capture any more.
        store.transact(() => {
            if (record !== undefined) {
                store.put(record);
            }
        });
        assert.deepStrictEqual(await nodesOf(harness, { set: held }), []);
        assert.deepStrictEqual(harness.session.sets.status({ set: held }), {
            freshness: "current",
            reasons: [{ kind: "values-not-kept", run: "louv" }],
            earlierRuns: ["louv"],
        });
    });

    it("resolves a rule holding an execution with no capture to nothing, with values-not-kept", async () => {
        const { harness } = await withLouvain();
        // A token no live execution carries, as a file loaded without its runs' captures holds.
        const held = holdGroup(harness, "loaded.7", 1);

        assert.deepStrictEqual(await nodesOf(harness, { set: held }), []);
        assert.deepStrictEqual(harness.session.sets.status({ set: held }), {
            freshness: "current",
            reasons: [{ kind: "values-not-kept", run: "louv" }],
            earlierRuns: ["louv"],
        });
    });

    it("does not capture for an inline scope, which holds nothing between calls", async () => {
        const { harness, table, first } = await withLouvain();
        table.set("louv", SECOND);
        await rerun(harness, "louv");
        assert.deepStrictEqual(heldOf(harness, "louv"), {});
        const inline: Scope = { define: { kind: "rule", where: { kind: "item", item: { run: "louv", key: { field: "group", value: 1 }, execution: first } }, reading: "induced" } };
        assert.deepStrictEqual(await nodesOf(harness, inline), []);
    });
});
