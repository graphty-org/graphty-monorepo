/**
 * @file Counted-work scaling of two ways into a `<graphty-element>`: an attribute set on it
 * (`attributeChangedCallback`, here the `layout` attribute, which lays out every node again) and
 * a load from a network source (`loadFromSource`, which reads n rows into the graph). A graph of n
 * and of 4n nodes, and the elements each visits (see `visitsDuring`) may grow no faster than the
 * graph: 4x, never 16x (issue #1643). Counted, never timed.
 *
 * The render loop is stopped, so no frame runs while a call is counted, and strict state is off,
 * as it is for a consumer.
 */
import "../../src/graphty-element";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { defineSource, registerSource } from "../../session";
import { operationQueueOf } from "../../src/Graph";
import { dispatcherOf } from "../../src/session/GraphSession";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two graph sizes: big enough that a quadratic path is 16x, small enough to stay cheap. */
const SIZES = [100, 400] as const;

registerSource(
    defineSource({
        id: "element-entry-path",
        descriptor: {
            plainName: "Path",
            defaultEndpoint: "https://element-entry.example.com",
            params: [{ name: "size", plainName: "Size", type: "integer", required: true }],
        },
        records: (params: { size: number }) => {
            const ids = Array.from({ length: params.size }, (_, at) => `n${String(at)}`);
            return Promise.resolve({
                nodes: ids.map((id) => ({ id })),
                edges: ids.slice(1).map((id, at) => ({ source: ids[at], target: id })),
            });
        },
    }),
);

/**
 * Wait until every queued operation has run and the pass that derives it has drawn it.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await dispatcherOf(element.graph.getSession()).lane.settled();
}

/**
 * Mount a graphty-element with `size` nodes on a path, its render loop stopped and a static layout.
 * @param size - The node count; 0 for an empty element.
 * @returns The element.
 */
async function mount(size: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    const { graph } = element;
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    if (size > 0) {
        const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
        await graph.addNodes(ids.map((id) => ({ id })));
        await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    }

    await settled(element);
    return element;
}

describe("the ways into the element do work in proportion to the graph", () => {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    let strict: boolean | undefined;

    beforeAll(() => {
        strict = scope.__GRAPHTY_STRICT_STATE__;
        scope.__GRAPHTY_STRICT_STATE__ = false;
    });

    afterAll(() => {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    });

    it("Graphty.attributeChangedCallback: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const element = await mount(size);
                try {
                    const visits = await visitsDuring(async () => {
                        element.setAttribute("layout", "circular");
                        await settled(element);
                    });
                    assert.strictEqual(element.graph.getLayoutManager().layoutType, "circular");
                    return visits;
                } finally {
                    element.remove();
                }
            },
            { sizes: SIZES, counter: "elements visited setting the layout attribute" },
        );
    });

    it("Graphty.loadFromSource: no more than linear in what it loads", async () => {
        await assertScalesLinearly(
            async (size) => {
                const element = await mount(0);
                try {
                    const visits = await visitsDuring(async () => {
                        await element.loadFromSource("element-entry-path", { size });
                        await settled(element);
                    });
                    assert.strictEqual(element.graph.getDataManager().nodes.size, size, "the rows were loaded");
                    return visits;
                } finally {
                    element.remove();
                }
            },
            { sizes: SIZES, counter: "elements visited by Graphty.loadFromSource" },
        );
    });
});
