/**
 * @file Renaming the loaded source writes one graph value, which no style layer reads, so it does
 * about the same work at any graph size: it must not repaint every node and edge (issue #2734).
 * Counted with `visitsDuring`, never timed, with the render loop stopped and strict state off.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/**
 * A graph of `size` nodes and a path through them, as an inline JSON document.
 * @param size - The node count.
 * @returns The document.
 */
function jsonOf(size: number): string {
    const nodes = Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` }));
    const edges = Array.from({ length: size - 1 }, (_, at) => ({
        source: `n${String(at)}`,
        target: `n${String(at + 1)}`,
    }));
    return JSON.stringify({ nodes, edges });
}

/**
 * Wait until every queued operation has run and the pass that derives it has drawn it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
}

/**
 * Mount a graphty-element with its render loop stopped and a static layout.
 * @returns The element.
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    element.graph.engine.stopRenderLoop();
    await element.graph.setLayout("random");
    return element;
}

describe("SessionDataApi.renameSource", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    it("does about the same work at any graph size", async () => {
        await assertScalesLinearly(
            async (size) => {
                const element = await mount();
                try {
                    const session = element.graph.getSession();
                    await session.data.import({ type: "json", config: { data: jsonOf(size) } });
                    await settled(element);
                    const visits = await visitsDuring(async () => {
                        await session.data.renameSource("Renamed");
                        await settled(element);
                    });
                    assert.strictEqual(session.data.source()?.name, "Renamed");
                    return visits;
                } finally {
                    element.remove();
                }
            },
            { sizes: [100, 400], growth: "constant", counter: "elements visited by SessionDataApi.renameSource" },
        );
    });
});
