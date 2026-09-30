/**
 * @file What undo costs in time at scale, on a headless session. See design/undo/undo-design.md
 * sections 7, 12.6 and 14.
 *
 * Runs in the `bench` project, never under coverage, with strict state off: the checks strict
 * state makes on every dispatch are reported separately. The graph is the largest a session holds
 * (the element's node and edge ceilings, less room to add to it).
 *
 * WHY MOST BUDGETS ARE RATIOS. A stopwatch on a shared runner measures the runner. Where a cost
 * has a natural reference measured in this process at this moment -- undoing a replacing import
 * against the import itself, a freeze against the load it is part of -- the budget is that ratio.
 * Where it has none, the ceiling is a frame budget times a contention factor, and the number is
 * printed either way, so a CI log shows the trend.
 *
 * Measured on the development machine (i9-14900, Node 22), 49,000 nodes and 98,000 edges:
 * printed by each test as `[undo-scale]` lines.
 */

import { assert, beforeAll, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { DEFAULT_LIMITS } from "../../../src/session/limits";
import { frozenRecord } from "../../../src/session/project/draft";
import type { ElementSession } from "../../../src/session/types";
import { fakeLayout } from "./fakes";
import { blankHarness } from "./fixture-session";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = DEFAULT_LIMITS.renderCeiling - 1000;
const EDGES = 2 * NODES;
/** One frame of main-thread work. */
const FRAME_MS = 16;
/** How much slower a busy runner measures than an idle one (see `test/session/styles/repaint.bench.test.ts`). */
const CONTENTION = 4;
const TIMEOUT_MS = 120_000;

/**
 * Report a timing.
 * @param what - What was timed.
 * @param ms - How long it took.
 */
function report(what: string, ms: number): void {
    console.log(`[undo-scale] ${what}: ${ms.toFixed(2)} ms`);
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

describe("undo at the largest graph a session holds", () => {
    let session: ElementSession;
    let loadMs = 0;

    beforeAll(async () => {
        session = blankHarness({ baselineWindow: true }).session as ElementSession;
        const { nodes, edges } = records();
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
        const start = performance.now();
        for (const record of [...nodes, ...edges]) {
            frozenRecord(record);
        }

        const freezeMs = performance.now() - start;
        report("deep-freezing every record", freezeMs);
        // Past a quarter of the load, records would be frozen lazily, on first hand-out
        // (design section 14).
        assert.isBelow(freezeMs, loadMs / 4);
    });

    it("dispatching one command over a million ids", async () => {
        const ids = Array.from({ length: 1_000_000 }, (_, at) => `v${String(at)}`);
        const ms = await time(() =>
            session.execute({
                op: "data.apply",
                mutation: { kind: "set-attributes", target: "node", ids, values: { tagged: true } },
            }),
        );
        report("dispatching set-attributes over a million ids", ms);
        // Each id the graph holds is written once; the rest are skipped. Against the load of
        // every row, it is the same order of work.
        assert.isBelow(ms, Math.max(loadMs, FRAME_MS * CONTENTION));
        await session.undo();
    });

    it("undoing an attribute edit takes a frame", async () => {
        await session.data.updateNodes([{ id: "v7", values: { weight: 3 } }]);
        const ms = await time(() => session.undo());
        report("undoing one attribute edit", ms);
        assert.isBelow(ms, FRAME_MS * CONTENTION);
    });

    it("thirty undos of removals from the middle of the rows each return at once, in proportion to their patch", async () => {
        for (let at = 0; at < 30; at++) {
            await session.data.removeNodes([`v${String(20_000 + 101 * at)}`]);
        }

        const calls: number[] = [];
        const undone: Promise<unknown>[] = [];
        for (let at = 0; at < 30; at++) {
            const start = performance.now();
            undone.push(session.undo());
            calls.push(performance.now() - start);
        }

        await Promise.all(undone);
        const read = await time(() => Promise.resolve(session.snapshot()));
        report("the slowest synchronous part of thirty undos", Math.max(...calls));
        report("the one rebuild they cost, at the next read", read);
        // One node's rows each: nowhere near a rebuild of the graph, which the read pays once.
        assert.isBelow(Math.max(...calls), FRAME_MS * CONTENTION);
    });

    it("undoing a replacing import at the state layer costs less than the import it undoes", async () => {
        const { nodes, edges } = records();
        const document = JSON.stringify({ nodes: nodes.slice(0, 10), edges: edges.slice(0, 10) });
        await session.data.import({ type: "json", config: { data: document } }, { mode: "replace" });
        const ms = await time(async () => {
            await session.undo();
            session.snapshot();
        });
        report("undoing a replacing import, with the read that rebuilds", ms);
        assert.isBelow(ms, loadMs);
        await session.redo();
        await session.undo();
    });

    it("restoreTo(null) after fifty mixed steps costs less than loading the graph", async () => {
        for (let at = 0; at < 50; at++) {
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
        }

        const start = performance.now();
        const restoring = session.history.restoreTo(null);
        const call = performance.now() - start;
        await restoring;
        session.snapshot();
        const ms = performance.now() - start;
        report("the call of restoreTo(null) over fifty steps", call);
        report("restoreTo(null) over fifty steps, with its derivation and the read that rebuilds", ms);
        // Undoing adds and removals in one move rebuilds the graph once, not once per add.
        assert.isBelow(call, FRAME_MS * CONTENTION);
        assert.isBelow(ms, loadMs);
    });

    it("reports what strict state adds to one dispatch", async () => {
        const plain = await time(() => session.data.updateNodes([{ id: "v9", values: { x: 1 } }]));
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = true;
        const strict = blankHarness().session as ElementSession;
        await strict.data.addNodes(records().nodes.slice(0, 1000));
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        const checked = await time(() => strict.data.updateNodes([{ id: "v9", values: { x: 1 } }]));
        report("one attribute edit, strict state off", plain);
        report("one attribute edit on a 1,000-node session, strict state on", checked);
        strict.dispose();
    });
});
