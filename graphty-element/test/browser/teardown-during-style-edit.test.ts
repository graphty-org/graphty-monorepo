/**
 * @file Disposing a graph or clearing its data while a style edit or a repaint is pending.
 *
 * A style edit is a queued run, and the element queues a whole-graph repaint behind loads and
 * behind every finished run. Nothing used to stop either one at teardown: a style edit issued
 * just before `dispose()` never settled, so a consumer awaiting it hung, and a repaint came due
 * against a session that had already been disposed. The style-layer tests drained the queue
 * before every `dispose()` to stay clear of it. A consumer has no such drain.
 */

import "../../src/algorithms";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayerSpec } from "../../session";
import { Graph } from "../../src/Graph";
import type { ElementSession } from "../../src/session";

/** A square. */
const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

/** Its edges. */
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "a" },
];

/** A different graph, for the reload. */
const RELOADED = [{ id: "x" }, { id: "y" }, { id: "z" }];

/** The layer every case adds. */
const LAYER: LayerSpec = {
    name: "teardown - every node crimson",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "crimson" },
};

/** How long a pending promise gets to settle before it counts as hung. */
const SETTLE_MS = 2000;

/**
 * Whether a promise settles in time, and how.
 * @param promise - The promise.
 * @returns "resolved", the rejection's name, or "pending" when it did not settle.
 */
async function outcomeOf(promise: PromiseLike<unknown>): Promise<string> {
    return Promise.race([
        Promise.resolve(promise).then(
            () => "resolved",
            (error: unknown) => (error instanceof Error || error instanceof DOMException ? error.name : "rejected"),
        ),
        new Promise<string>((resolve) => setTimeout(() => resolve("pending"), SETTLE_MS)),
    ]);
}

describe("tearing down around a style edit", () => {
    let container: HTMLElement;
    let graph: Graph;
    let errors: string[];
    let unhandled: string[];

    /**
     * Record an unhandled rejection.
     * @param event - The rejection.
     */
    const onUnhandled = (event: PromiseRejectionEvent): void => {
        unhandled.push(String(event.reason));
    };

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        errors = [];
        unhandled = [];
        graph.on("error", (event) => {
            errors.push(JSON.stringify(event));
        });
        window.addEventListener("unhandledrejection", onUnhandled);

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.waitForSettled();
    });

    afterEach(() => {
        window.removeEventListener("unhandledrejection", onUnhandled);
        graph.dispose();
        container.remove();
    });

    it("settles a style edit issued just before dispose(), with an AbortError", async () => {
        const edit = graph.getSession().styles.add(LAYER);
        graph.dispose();

        assert.strictEqual(
            await outcomeOf(edit),
            "AbortError",
            "the edit never settled, so a consumer awaiting it across a dispose waits for ever",
        );
        assert.deepStrictEqual(errors, [], "disposing is not an error");
        assert.deepStrictEqual(unhandled, []);
    });

    it("finishes no repaint once dispose() has run, even for a run that ended just before", async () => {
        const session = graph.getSession() as ElementSession;
        const { paint } = session;
        const repaintAll = paint.repaintAll.bind(paint);
        let disposed = false;
        // A pass that completes after the dispose is a pass over a torn-down graph, whether it
        // was asked for before the dispose or after it.
        const finishedAfterDispose: string[] = [];

        (paint as { repaintAll: typeof paint.repaintAll }).repaintAll = async (stack, context) => {
            const report = await repaintAll(stack, context);

            if (disposed) {
                finishedAfterDispose.push("a whole-graph repaint");
            }

            return report;
        };

        // Subscribed after the graph's own handler, so the graph has already asked for its
        // after-run repaint when this disposes it: the repaint is pending, not yet run.
        const stop = session.on("run:changed", (change) => {
            if (change.phase === "end") {
                stop();
                disposed = true;
                graph.dispose();
            }
        });

        await Promise.resolve(graph.run("degree")).catch(() => undefined);
        await new Promise((resolve) => setTimeout(resolve, 100));

        assert.isTrue(disposed, "the run never ended");
        assert.deepStrictEqual(finishedAfterDispose, [], "a repaint ran to the end against a disposed graph");
        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(unhandled, []);
    });

    it("stops a whole-graph repaint that is in flight when the data is cleared", async () => {
        const session = graph.getSession() as ElementSession;
        const { paint } = session;
        const repaintAll = paint.repaintAll.bind(paint);
        let release = (): void => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        let started = (): void => undefined;
        const inFlight = new Promise<void>((resolve) => {
            started = resolve;
        });
        const signals: AbortSignal[] = [];

        (paint as { repaintAll: typeof paint.repaintAll }).repaintAll = async (stack, context) => {
            signals.push(context.signal);
            started();
            await gate;

            return repaintAll(stack, context);
        };

        // Private, so reached through a cast: this is the pass the data-add trigger and the
        // after-run repaint both queue.
        const pass = (graph as unknown as { repaintFromSession: () => Promise<boolean> }).repaintFromSession();
        await inFlight;
        graph.clearData();
        release();

        assert.isFalse(await pass, "the pass kept painting across the clear");
        assert.isTrue(signals[0]?.aborted, "the pass was never told the data it was painting is gone");
        assert.deepStrictEqual(errors, [], "clearing the data is not an error");
        assert.deepStrictEqual(unhandled, []);
    });

    it("paints the new data when the data is cleared straight after a style edit", async () => {
        const session = graph.getSession();
        const edit = session.styles.add(LAYER);
        graph.clearData();
        await graph.addNodes(RELOADED);
        await edit;
        await graph.waitForSettled();

        for (const { id } of RELOADED) {
            const painters = session.styles.explain({ node: id }).contributions.map((entry) => entry.name);

            assert.include(painters, LAYER.name, `node ${id} of the new data was not painted by the layer`);
        }

        assert.deepStrictEqual(errors, []);
        assert.deepStrictEqual(unhandled, []);
    });
});
