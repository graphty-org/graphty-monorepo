/**
 * @file Accelerated work asked for before a graph is drawn. A graph only waits for its renderer's
 * device when a renderer is really on its way: with none coming the accelerator takes its own
 * device, and neither a run nor a layout may wait for an init that nobody has promised.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { type AcceleratorFactoryOptions, acceleratorRegistry } from "../../src/acceleration";
import { Graph } from "../../src/Graph";
import type { RendererRequest } from "../../src/managers/RenderManager";

const FACTORY_NAME = "before-init-test-accelerator";

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }];
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
];

const graphs: Graph[] = [];

/**
 * Registers an accelerator that declines, recording what it was asked.
 * @returns The options of every call.
 */
function registerDecliner(): AcceleratorFactoryOptions[] {
    const calls: AcceleratorFactoryOptions[] = [];
    acceleratorRegistry.register({
        name: FACTORY_NAME,
        factory: (options = {}) => {
            calls.push(options);
            return Promise.resolve(null);
        },
    });
    return calls;
}

/**
 * Loads a small graph, runs an algorithm and sets a simulation layout, without any init.
 * @param graph - The graph.
 */
async function workBeforeInit(graph: Graph): Promise<void> {
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.runAlgorithm("graphty", "pagerank");
    await graph.setLayout("forceatlas2", { maxIter: 1 });
}

afterEach(() => {
    while (graphs.length > 0) {
        graphs.pop()?.shutdown();
    }

    if (acceleratorRegistry.has(FACTORY_NAME)) {
        acceleratorRegistry.remove(FACTORY_NAME);
    }
});

describe("accelerated work before a graph is drawn", () => {
    for (const request of ["webgl", "webgpu", "auto"] as RendererRequest[]) {
        it(`finishes on a graph that asked for ${request} and was never initialized`, async () => {
            const calls = registerDecliner();
            const graph = new Graph(document.createElement("div"));
            graphs.push(graph);
            graph.setRenderer(request);

            await workBeforeInit(graph);

            assert.isAbove(calls.length, 0, "the accelerator was asked for");
            assert.isUndefined(calls[0].device, "with no renderer on its way there is no device to share");
        });
    }

    it("finishes on an element that has not been attached", async () => {
        const calls = registerDecliner();
        const element = document.createElement("graphty-element");
        graphs.push(element.graph);

        await workBeforeInit(element.graph);

        assert.isAbove(calls.length, 0, "the accelerator was asked for");
    });
});
