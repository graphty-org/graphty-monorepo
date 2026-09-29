/**
 * @file What the undo history retains at scale, and that it stays inside its budget. See
 * design/undo/undo-design.md sections 7 and 12.6.
 *
 * Only what does not depend on the clock is here, so it runs in the `default` project with
 * coverage; the time budgets are in `./scale.bench.test.ts`.
 *
 * - The retained size of each kind of step, at the largest graph a session holds: the node and
 *   edge ceilings the element enforces (`DEFAULT_LIMITS`, 50,000 nodes and 100,000 edges today),
 *   less room for the steps to add to it.
 *   Each is asserted per element, so the figures of the design's table at a million nodes follow
 *   by multiplication.
 * - `history.bytes <= limitBytes` once eviction has run, and the latest step kept even when it
 *   alone is over the budget.
 * - Thirty undos of removals from the middle of the rows, called without awaiting, pay for one
 *   rebuild of the graph, at the next read.
 * - At a million nodes and five million edges, without a scene: a snapshot and a run result of
 *   that size are built in Node, their estimates checked against their storage, and a history
 *   fed steps of those sizes stays inside the 256 MiB default.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import { assert, beforeAll, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { DEFAULT_LIMITS } from "../../../src/session/limits";
import { snapshotBytes } from "../../../src/session/project/graphOps";
import { History, STEP_OVERHEAD_BYTES } from "../../../src/session/project/History";
import { createRunResult } from "../../../src/session/results";
import { retentionOf } from "../../../src/session/results/RunResult";
import type { ElementSession } from "../../../src/session/types";
import type { Harness } from "../helpers";
import { fakeLayout } from "./fakes";
import { blankHarness } from "./fixture-session";

/** The largest graph a session holds, less room for the steps below to add to it. */
const NODES = DEFAULT_LIMITS.renderCeiling - 1000;
const EDGES = 2 * NODES;
/** Building the graph and the million-row structures takes longer than the project's default. */
const TIMEOUT_MS = 120_000;

/** A capture: 12 bytes of coordinates and an 8-byte id slot per row. */
const CAPTURE_PER_ROW = 20;

/**
 * A session holding `NODES` nodes and `EDGES` edges as its baseline, with a fake layout.
 * @returns The harness.
 */
async function bigGraph(): Promise<Harness> {
    const harness = blankHarness({ baselineWindow: true });
    const session = harness.session as ElementSession;
    const nodes = Array.from({ length: NODES }, (_, at) => ({ id: `v${String(at)}` }));
    const edges = Array.from({ length: EDGES }, (_, at) => ({
        src: `v${String(at % NODES)}`,
        dst: `v${String(((at % NODES) + 1 + Math.floor(at / NODES) * 7919) % NODES)}`,
    }));
    await dispatcherOf(session).dispatch({
        op: "batch",
        setup: true,
        steps: [
            { op: "data.apply", mutation: { kind: "add-nodes", records: nodes } },
            { op: "data.apply", mutation: { kind: "add-edges", records: edges } },
        ],
    } as unknown as { op: string });
    fakeLayout(session);
    return harness;
}

/**
 * What the top step retains, less the fixed overhead every step carries.
 * @param session - The session.
 * @returns Bytes.
 */
function topBytes(session: ElementSession): number {
    const { history } = session;
    const step = history.steps[history.position - 1];
    assert.isDefined(step, "a step was recorded");
    return step.bytes - STEP_OVERHEAD_BYTES;
}

describe("what each kind of step retains, at the largest graph a session holds", () => {
    let harness: Harness;
    let session: ElementSession;
    let rows: number;

    beforeAll(async () => {
        harness = await bigGraph();
        session = harness.session as ElementSession;
        rows = session.snapshot().nodeCount;
        assert.strictEqual(rows, NODES);
        assert.strictEqual(session.snapshot().edgeCount, EDGES);
        assert.lengthOf(session.history.steps, 0, "the graph is the baseline");
    }, TIMEOUT_MS);

    it("editing one node's attributes: the prior values, under 1 KB", async () => {
        await session.data.updateNodes([{ id: "v5", values: { weight: 1 } }]);
        assert.isBelow(topBytes(session), 1024);
    });

    it("a style, set or settings edit: the replaced values, a few KB", async () => {
        await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        assert.isAtMost(topBytes(session), 4096);
        session.sets.create({ kind: "fixed", nodes: ["v1", "v2", "v3"], reading: "induced" }, { name: "Some" });
        assert.isAtMost(topBytes(session), 4096);
        await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
        assert.isAtMost(topBytes(session), 4096);
    });

    it("a member edit on a 500,000-member set: both whole records, 8 bytes a node member each", () => {
        const members = Array.from({ length: 500_000 }, (_, at) => `m${String(at)}`);
        const id = session.sets.create({ kind: "fixed", nodes: members, reading: "induced" }, { name: "Big" });
        const created = topBytes(session);
        assert.isAtLeast(created, 8 * 500_000, "the created record");
        assert.isAtMost(created, 8 * 500_000 + 4096);

        session.sets.addMembers(id, { nodes: ["v1"] });
        const edited = topBytes(session);
        // The record before is the create's too, so it is charged to the older step.
        assert.isAtLeast(edited, 8 * 500_001, "the record after");
        assert.isAtMost(edited, 8 * 500_001 + 4096);
        assert.isAtLeast(
            session.history.bytes,
            2 * 8 * 500_000,
            "both whole records are held, once each, across the two steps",
        );
    });

    it("a filter edit: the replaced filter, and once undone at most one byte per element for the masks", async () => {
        await session.visibility.set({ kind: "degree", min: 3 });
        assert.isAtMost(topBytes(session), 4096);
        const { history } = session;
        await session.undo();
        const undone = history.steps[history.position].bytes - STEP_OVERHEAD_BYTES;
        assert.isAtMost(undone, 4096 + rows + EDGES);
        await session.redo();
    });

    it("a pin: the ids pinned", async () => {
        await session.positions.pin(["v1", "v2", "v3", "v4"]);
        assert.isAtMost(topBytes(session), 64 * 4);
    });

    it("positions.set of a few rows: 36 bytes a row; of more than a third of them, one capture and nothing else", async () => {
        await session.positions.set(
            Array.from({ length: 10 }, (_, at) => ({ id: `v${String(at)}`, x: at, y: 0, z: 0 })),
        );
        assert.isAtMost(topBytes(session), 36 * 10);

        // Not merged into the step above: a merge keeps both estimates.
        await session.styles.add({
            name: "Between",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        const many = Math.ceil(rows / 3) + 1;
        await session.positions.set(
            Array.from({ length: many }, (_, at) => ({ id: `v${String(at + 1000)}`, x: at, y: 1, z: 0 })),
        );
        assert.strictEqual(topBytes(session), CAPTURE_PER_ROW * rows);
    });

    it("a degree run: one value, rank and percentile per node, 24 bytes a node", async () => {
        await session.runs.start("degree", {}, { as: "deg", style: false });
        const bytes = topBytes(session);
        assert.isAtLeast(bytes, 24 * rows);
        assert.isAtMost(bytes, 24 * rows + 1024);
    });

    it("a layout switch or a dimension switch: one capture", async () => {
        await session.layout.set("circular");
        assert.strictEqual(topBytes(session), CAPTURE_PER_ROW * rows);
        await session.layout.setDimension("2d");
        assert.strictEqual(topBytes(session), CAPTURE_PER_ROW * rows);
    });

    it("adding nodes or edges: what was added", async () => {
        await session.data.addNodes([{ id: "a1" }, { id: "a2" }]);
        assert.isAtMost(topBytes(session), 256 * 2);
        await session.data.addEdges([{ src: "a1", dst: "a2" }]);
        assert.isAtMost(topBytes(session), 256);
    });

    it("an expansion and a merging import: a before-capture at most, and what they added", async () => {
        const held = session.snapshot().nodeCount;
        await session.execute({
            op: "data.expand",
            seed: "v1",
            nodes: [{ id: "x1" }],
            edges: [{ src: "v1", dst: "x1" }],
        });
        assert.isAtMost(topBytes(session), CAPTURE_PER_ROW * held + 1024);
        await session.data.import(
            {
                type: "json",
                config: { data: JSON.stringify({ nodes: [{ id: "m1" }], edges: [{ src: "m1", dst: "v1" }] }) },
            },
            { mode: "merge" },
        );
        assert.isAtMost(topBytes(session), CAPTURE_PER_ROW * (held + 1) + 1024);
    });

    it("removing 1000 nodes: their records and incident edges, under 320 bytes a row", async () => {
        const before = session.snapshot();
        const doomed = Array.from({ length: 1000 }, (_, at) => `v${String(10_000 + 7 * at)}`);
        await session.data.removeNodes(doomed);
        const after = session.snapshot();
        const taken = before.nodeCount - after.nodeCount + (before.edgeCount - after.edgeCount);
        assert.isAbove(taken, 1000, "the incident edges went too");
        assert.isAtMost(topBytes(session), 320 * taken);
    });

    it("thirty removals from the middle of the rows, undone without awaiting, cost one rebuild, at the next read", async () => {
        for (let at = 0; at < 30; at++) {
            await session.data.removeNodes([`v${String(20_000 + at * 101)}`]);
        }

        const rebuilds = harness.store.rebuildCount;
        await Promise.all(Array.from({ length: 30 }, () => session.undo()));
        assert.strictEqual(harness.store.rebuildCount, rebuilds, "no rebuild before anything read the graph");
        session.snapshot();
        assert.strictEqual(harness.store.rebuildCount, rebuilds + 1, "one rebuild for all thirty");
    });

    it("a replacing import: the graph it replaced, kept as the latest step though it is over the budget, and evicted after", async () => {
        const replaced = session.snapshot();
        const { history } = session;
        history.limitBytes = 8 * 1024 * 1024;
        await session.data.import(
            { type: "json", config: { data: JSON.stringify({ nodes: [{ id: "r1" }], edges: [] }) } },
            { mode: "replace" },
        );
        const bytes = topBytes(session);
        assert.isAtLeast(bytes, snapshotBytes(replaced), "the replaced snapshot is counted");
        assert.isAbove(bytes, history.limitBytes, "over the budget on its own");
        assert.lengthOf(history.steps, 1, "and kept as the only step");

        await session.styles.add({
            name: "After",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#00ff00" },
        });
        assert.isAtMost(history.bytes, history.limitBytes, "within the budget once it could be evicted");
        assert.notInclude(
            history.steps.map((step) => step.label),
            "Loaded json",
            "the replacing import went",
        );
    });

    it(
        "a run of steps that each keep a capture stays within the budget",
        async () => {
            const { history } = session;
            await session.data.import(
                {
                    type: "json",
                    config: {
                        data: JSON.stringify({
                            nodes: Array.from({ length: NODES }, (_, at) => ({ id: `w${String(at)}` })),
                            edges: [],
                        }),
                    },
                },
                { mode: "replace" },
            );
            history.limitBytes = 10 * CAPTURE_PER_ROW * NODES;
            for (const layout of [
                "circular",
                "spiral",
                "shell",
                "random",
                "grid",
                "circular",
                "spiral",
                "shell",
                "random",
                "grid",
                "circular",
                "spiral",
                "shell",
            ]) {
                await session.layout.set(layout);
                assert.isAtMost(history.bytes, history.limitBytes, `after switching to ${layout}`);
            }

            assert.isAtLeast(history.steps.length, 2, "the latest steps are kept");
        },
        TIMEOUT_MS,
    );
});

describe("at a million nodes and five million edges, without a scene", () => {
    const MILLION = 1_000_000;
    const ARCS = 5 * MILLION;

    it(
        "a snapshot and a degree result are estimated at their storage, and a history of steps that size stays within 256 MiB",
        () => {
            const src = new Uint32Array(ARCS);
            const dst = new Uint32Array(ARCS);
            for (let at = 0; at < ARCS; at++) {
                src[at] = at % MILLION;
                dst[at] = (at % MILLION) + 1 + ((Math.floor(at / MILLION) * 7919) % (MILLION - 1));
                dst[at] %= MILLION;
            }

            const snapshot = fromEdgeArrays({ nodeCount: MILLION, src, dst, directed: true });
            const graphBytes = snapshotBytes(snapshot);
            const storage = snapshot.rowPtr.byteLength + snapshot.colIdx.byteLength;
            assert.isAtLeast(graphBytes, storage, "the adjacency arrays are counted");
            assert.isAtMost(graphBytes, storage + 64 * MILLION + 1024 * 1024, "and the id map, at most");

            const degrees = snapshot.degree();
            const result = createRunResult({
                runId: "deg" as never,
                shape: "node-metric",
                fields: [
                    {
                        name: "value",
                        plainName: "value",
                        technicalName: "value",
                        kind: "node",
                        type: "number",
                        path: "results.deg.value",
                    },
                ],
                measured: { nodes: MILLION, edges: ARCS },
                nodes: Array.from({ length: MILLION }, (_, at) => ({ id: at, values: { value: degrees[at] } })),
                caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", notes: [] },
                durationMs: 1,
            });
            assert.isAtLeast(retentionOf(result).bytes, 24 * MILLION, "a value, a rank and a percentile per node");
            assert.isAtMost(retentionOf(result).bytes, 24 * MILLION + 1024 * 1024);

            // The steps a million-node session records: a replacing import keeping that graph,
            // captures, runs of that size, and small edits between them.
            const history = new History<null>({
                forward: () => undefined,
                backward: () => undefined,
                merge: () => null,
            });
            const capture = CAPTURE_PER_ROW * MILLION;
            const sizes = [
                graphBytes,
                capture,
                retentionOf(result).bytes,
                1024,
                capture,
                retentionOf(result).bytes,
                capture,
                512,
                capture,
            ];
            for (let round = 0; round < 4; round++) {
                for (const size of sizes) {
                    history.record({ label: "Step", patch: null, bytes: { done: size, undone: size } });
                    const protectedSteps = Math.min(history.steps.length, 1);
                    assert.isTrue(
                        history.bytes <= history.limitBytes || history.steps.length <= protectedSteps,
                        `${String(history.bytes)} bytes over ${String(history.limitBytes)}`,
                    );
                }
            }

            assert.strictEqual(history.limitBytes, 256 * 1024 * 1024);
            assert.isAtLeast(history.steps.length, 4, "the budget holds a few of the largest steps");
        },
        TIMEOUT_MS,
    );
});
