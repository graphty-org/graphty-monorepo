/**
 * @file What undo costs in time at scale, on a headless session. See design/undo/undo-design.md
 * sections 7, 12.6 and 14.
 *
 * Runs in the `bench` project, never under coverage, with strict state off: the checks strict
 * state makes on every dispatch are reported separately. The graph is the largest a session holds
 * (the element's node and edge ceilings, less room to add to it).
 *
 * WHAT IS ASSERTED IS COUNTED WORK, never a stopwatch: the store's rebuilds and renumberings, the
 * elements a repaint paints, the records frozen, and the elements an operation visits as the graph
 * or the command grows (`assertScalesLinearly`). Those are the regressions each test was written
 * for -- undoing many structural steps rebuilding the graph once per step instead of once, an undo
 * that repaints the whole graph, a per-id cost that grows with the command -- and no amount of load
 * on the machine changes a count.
 *
 * THE TIMINGS ARE PRINTED, NOT ASSERTED, as `[undo-scale]` lines beside the budget each used to be
 * held to (a frame, or a share of the load), so a CI log shows the trend. The file runs in ci.yml's
 * advisory "performance" job. The test timeouts are safety limits only, set far above what a busy
 * pre-push gate stretches the tests to (issue #1277). The rebuild counts are also asserted, gating,
 * in scale.test.ts and round-trip.test.ts.
 *
 * Measured on the development machine (i9-14900, Node 22), 49,000 nodes and 98,000 edges:
 * printed by each test as `[undo-scale]` lines.
 */

import { assert, beforeAll, describe, it, vi } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { DEFAULT_LIMITS } from "../../../src/session/limits";
import { frozenRecord } from "../../../src/session/project/draft";
import type { ElementSession } from "../../../src/session/types";
import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";
import type { Harness } from "../helpers";
import { fakeLayout } from "./fakes";
import { blankHarness } from "./fixture-session";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = DEFAULT_LIMITS.renderCeiling - 1000;
const EDGES = 2 * NODES;
/** One frame of main-thread work: the budget the printed timings are read against. */
const FRAME_MS = 16;
/**
 * A safety limit for the load and for every test, not a budget: the slowest test, the fifty-step
 * restore, takes about 4 s alone.
 */
const TIMEOUT_MS = 120_000;

/**
 * Report a timing.
 * @param what - What was timed.
 * @param ms - How long it took.
 */
function report(what: string, ms: number, budget?: string): void {
    console.log(`[undo-scale] ${what}: ${ms.toFixed(2)} ms${budget === undefined ? "" : ` (budget: ${budget})`}`);
}

/**
 * Count the nodes and edges the repaints during some work painted.
 * @param session - The session.
 * @param work - The work.
 * @returns Elements painted, summed over every pass.
 */
async function paintedDuring(session: ElementSession, work: () => Promise<unknown>): Promise<number> {
    let painted = 0;
    const stop = session.paint.onPainted(() => {
        painted += session.paint.lastPainted("node").length + session.paint.lastPainted("edge").length;
    });

    try {
        await work();
    } finally {
        stop();
    }

    return painted;
}

/**
 * Time an async call.
 * @param work - The call.
 * @returns Milliseconds.
 */
async function time(work: () => Promise<unknown>): Promise<number> {
    const start = performance.now();
    await work();
    return performance.now() - start;
}

/**
 * The graph's records.
 * @returns Nodes and edges.
 */
function records(): { nodes: { id: string }[]; edges: { src: string; dst: string }[] } {
    return {
        nodes: Array.from({ length: NODES }, (_, at) => ({ id: `v${String(at)}` })),
        edges: Array.from({ length: EDGES }, (_, at) => ({
            src: `v${String(at % NODES)}`,
            dst: `v${String(((at % NODES) + 1 + Math.floor(at / NODES) * 7919) % NODES)}`,
        })),
    };
}

describe("undo at the largest graph a session holds", { timeout: TIMEOUT_MS }, () => {
    let harness: Harness;
    let session: ElementSession;
    let loadMs = 0;
    /** The loaded graph's records, generated once: the tests below only read slices of them. */
    let graph: ReturnType<typeof records>;

    beforeAll(async () => {
        harness = blankHarness({ baselineWindow: true });
        session = harness.session as ElementSession;
        graph = records();
        const { nodes, edges } = graph;
        loadMs = await time(() =>
            dispatcherOf(session).dispatch({
                op: "batch",
                setup: true,
                steps: [
                    { op: "data.apply", mutation: { kind: "add-nodes", records: nodes } },
                    { op: "data.apply", mutation: { kind: "add-edges", records: edges } },
                ],
            } as unknown as { op: string }),
        );
        fakeLayout(session);
        report(`loading ${String(NODES)} nodes and ${String(EDGES)} edges`, loadMs);
    }, TIMEOUT_MS);

    it("deep-freezing the records at import is a small part of the import", () => {
        const { nodes, edges } = records();
        const all = [...nodes, ...edges];
        const freeze = vi.spyOn(Object, "freeze");
        const start = performance.now();
        let freezes = 0;

        try {
            for (const record of all) {
                frozenRecord(record);
            }
        } finally {
            freezes = freeze.mock.calls.length;
            freeze.mockRestore();
        }

        const freezeMs = performance.now() - start;
        report("deep-freezing every record", freezeMs, `a quarter of the load, ${(loadMs / 4).toFixed(0)} ms`);
        // Past a quarter of the load, records would be frozen lazily, on first hand-out (design
        // section 14). Counted: a flat record is one freeze, so freezing costs one step per record,
        // the same order as the load that copies each one, and never a walk of the whole import.
        assert.strictEqual(freezes, all.length, "one freeze per flat record");
    });

    it("dispatching one command over a million ids", async () => {
        const ids = Array.from({ length: 1_000_000 }, (_, at) => `v${String(at)}`);
        const { rebuildCount, renumberCount } = harness.store;
        const ms = await time(() =>
            session.execute({
                op: "data.apply",
                mutation: { kind: "set-attributes", target: "node", ids, values: { tagged: true } },
            }),
        );
        report("dispatching set-attributes over a million ids", ms, `the load, ${loadMs.toFixed(0)} ms`);
        await session.undo();
        // Each id the graph holds is written once and the rest are skipped: an attribute write
        // neither rebuilds nor renumbers the graph, and its work grows with the ids it names --
        // counted at two sizes the graph holds, four times apart -- not with their square.
        assert.strictEqual(harness.store.rebuildCount, rebuildCount, "no rebuild");
        assert.strictEqual(harness.store.renumberCount, renumberCount, "no renumbering");
        const scaling = await assertScalesLinearly(
            async (size) => {
                const named = ids.slice(0, size);
                const visits = await visitsDuring(() =>
                    session.execute({
                        op: "data.apply",
                        mutation: { kind: "set-attributes", target: "node", ids: named, values: { tagged: true } },
                    }),
                );
                await session.undo();
                return visits;
            },
            { sizes: [2_000, 8_000], counter: "elements visited dispatching set-attributes" },
        );
        console.log(
            `[undo-scale] elements visited dispatching set-attributes: ${String(scaling.small)} for 2,000 ids, ` +
                `${String(scaling.large)} for 8,000`,
        );
    });

    it("undoing an attribute edit takes a frame", async () => {
        await session.data.updateNodes([{ id: "v7", values: { weight: 3 } }]);
        const { rebuildCount } = harness.store;
        let ms = 0;
        const painted = await paintedDuring(session, async () => {
            ms = await time(() => session.undo());
        });
        report("undoing one attribute edit", ms, `a frame, ${String(FRAME_MS)} ms`);
        // One node's value goes back: no rebuild, and a repaint of at most that node.
        assert.strictEqual(harness.store.rebuildCount, rebuildCount, "no rebuild");
        assert.isAtMost(painted, 1, "at most the one node repainted");
    });

    it("thirty undos of removals from the middle of the rows each return at once, in proportion to their patch", async () => {
        for (let at = 0; at < 30; at++) {
            await session.data.removeNodes([`v${String(20_000 + 101 * at)}`]);
        }

        const rebuilds = harness.store.rebuildCount;
        const calls: number[] = [];
        const undone: Promise<unknown>[] = [];
        for (let at = 0; at < 30; at++) {
            const start = performance.now();
            undone.push(session.undo());
            calls.push(performance.now() - start);
        }

        await Promise.all(undone);
        assert.strictEqual(harness.store.rebuildCount, rebuilds, "no undo rebuilt the graph by itself");
        const read = await time(() => Promise.resolve(session.snapshot()));
        assert.strictEqual(harness.store.rebuildCount, rebuilds + 1, "the read rebuilt it once for all thirty");
        report("the slowest synchronous part of thirty undos", Math.max(...calls), `a frame, ${String(FRAME_MS)} ms`);
        report("the one rebuild they cost, at the next read", read);
    });

    it("undoing a replacing import at the state layer costs less than the import it undoes", async () => {
        const { nodes, edges } = graph;
        const document = JSON.stringify({ nodes: nodes.slice(0, 10), edges: edges.slice(0, 10) });
        await session.data.import({ type: "json", config: { data: document } }, { mode: "replace" });
        const rebuilds = harness.store.rebuildCount;
        const ms = await time(async () => {
            await session.undo();
            session.snapshot();
        });
        report("undoing a replacing import, with the read that rebuilds", ms, `the load, ${loadMs.toFixed(0)} ms`);
        // The large graph comes back from what the import set aside: the read rebuilds it at most
        // once, and nothing parses or adds its rows one by one again.
        assert.isAbove(session.snapshot().nodeCount, 10, "the large graph is back");
        assert.isAtMost(harness.store.rebuildCount - rebuilds, 1, "at most one rebuild");
    });

    it("a redo and an undo of that import take the graph back without rebuilding it", async () => {
        const rebuilds = harness.store.rebuildCount;
        const ms = await time(async () => {
            await session.redo();
            await session.undo();
            session.snapshot();
        });
        report("a redo and an undo of a replacing import, with the read", ms);
        // The redo swaps in an empty builder for the ten imported rows; the undo takes the graph
        // the redo set aside back whole.
        assert.strictEqual(harness.store.rebuildCount, rebuilds + 1, "no rebuild of the large graph");
    });

    it("restoreTo(null) after fifty mixed steps rebuilds the graph once and costs less than loading it", async () => {
        /** Time per kind of step, so a CI log shows which kind a regression is in. */
        const stepMs = [0, 0, 0, 0, 0];
        for (let at = 0; at < 50; at++) {
            const stepStart = performance.now();
            switch (at % 5) {
                case 0:
                    await session.data.addNodes([{ id: `n${String(at)}` }]);
                    break;
                case 1:
                    await session.positions.set([{ id: `v${String(at)}`, x: at, y: at, z: at }]);
                    break;
                case 2:
                    await session.styles.add({
                        name: `L${String(at)}`,
                        target: "node",
                        selector: { match: "everything" },
                        set: { "node.color": "#ff0000" },
                    });
                    break;
                case 3:
                    await session.data.updateNodes([{ id: `v${String(at)}`, values: { at } }]);
                    break;
                default:
                    await session.data.removeNodes([`v${String(30_000 + at)}`]);
            }
            stepMs[at % 5] += performance.now() - stepStart;
        }

        ["add", "position", "style", "attribute", "removal"].forEach((kind, at) => {
            report(`the ten ${kind} steps of the fifty`, stepMs[at]);
        });
        const rebuilds = harness.store.rebuildCount;
        const start = performance.now();
        const restoring = session.history.restoreTo(null);
        const call = performance.now() - start;
        await restoring;
        session.snapshot();
        const ms = performance.now() - start;
        report("the call of restoreTo(null) over fifty steps", call, `a frame, ${String(FRAME_MS)} ms`);
        report(
            "restoreTo(null) over fifty steps, with its derivation and the read that rebuilds",
            ms,
            `the load, ${loadMs.toFixed(0)} ms`,
        );
        // Undoing adds and removals in one move rebuilds the graph once, not once per add.
        assert.strictEqual(harness.store.rebuildCount, rebuilds + 1, "one rebuild for the fifty steps");
    });

    it("an add after a removal paints only the row it added, and the removal's renumbering moves the rest", async () => {
        // The restore above left its rows to the next read, and the picture to the next pass over
        // the whole stack; an add takes that pass.
        await session.data.addNodes([{ id: "after-the-restore" }]);
        await session.data.removeNodes([`v${String(40_000)}`]);
        const painted: number[] = [];
        const stop = session.paint.onPainted(() => {
            painted.push(session.paint.lastPainted("node").length + session.paint.lastPainted("edge").length);
        });
        // The removal's compacting freeze is paid here, by the first read after it.
        const afterRemoval = await time(() => session.data.addNodes([{ id: "after-removal" }]));
        const plain = await time(() => session.data.addNodes([{ id: "after-an-add" }]));
        stop();
        report(
            "an add after a removal, with the removal's freeze and the repaint",
            afterRemoval,
            `a quarter of the load, ${(loadMs / 4).toFixed(0)} ms`,
        );
        report("an add after an add, with its freeze and the repaint", plain);
        // Counted, not timed: one element each, where every layer used to repaint all of them.
        assert.deepEqual(painted, [1, 1]);
    });

    it("reports what strict state adds to one dispatch", async () => {
        const plain = await time(() => session.data.updateNodes([{ id: "v9", values: { x: 1 } }]));
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;
        const strict = blankHarness().session as ElementSession;
        await strict.data.addNodes(graph.nodes.slice(0, 1000));
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        const checked = await time(() => strict.data.updateNodes([{ id: "v9", values: { x: 1 } }]));
        report("one attribute edit, strict state off", plain);
        report("one attribute edit on a 1,000-node session, strict state on", checked);
        strict.dispose();
    });
});
