/**
 * The release list: what the element tells an accelerator to free, and when.
 *
 * GPU memory is not garbage collected. An accelerator that has uploaded a snapshot keeps its
 * device buffers until it is told the snapshot is gone, so the element tells it at the two
 * moments a snapshot stops being the graph: a freeze, which replaces it, and a shutdown, which
 * ends it. Releasing nothing is the leak the WebGPU design's R-18 names.
 *
 * These run in the browser rather than in Node because they need a real `Graph`, which owns the
 * acceleration controller and the data manager the release list reads: the Node mock graph is a
 * duck-typed stand-in with a data manager and nothing else.
 */
import type { GraphSnapshot } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import { acceleratorRegistry, type GraphAccelerator } from "../../src/acceleration";
import { Graph } from "../../src/Graph";
import { createFakeAccelerator, type FakeAccelerator } from "../../src/testing/fakeAccelerator";
import { cleanupE2EGraph, createE2EGraph } from "../helpers/e2e-graph-setup";

/** The name a controller-built accelerator is registered under here. */
const FACTORY_NAME = "release-list-test-accelerator";

/** Graphs a test built, shut down after it whether it passed or not. */
const graphs: Graph[] = [];

/**
 * Builds a graph with a fake accelerator already attached.
 * @param ids - The nodes to load, connected in a path so the graph has edges too.
 * @returns The graph and the fake attached to it.
 */
async function graphWithFake(ids: string[]): Promise<{ graph: Graph; fake: FakeAccelerator }> {
    const { graph } = await createE2EGraph({
        nodes: ids.map((id) => ({ id })),
        edges: ids.slice(1).map((id, index) => ({ src: ids[index], dst: id })),
        enableAi: false,
    });
    graphs.push(graph);

    const fake = createFakeAccelerator();
    graph.acceleration.setAccelerator(fake);
    return { graph, fake };
}

afterEach(() => {
    while (graphs.length > 0) {
        graphs.pop()?.shutdown();
    }

    if (acceleratorRegistry.has(FACTORY_NAME)) {
        acceleratorRegistry.remove(FACTORY_NAME);
    }

    cleanupE2EGraph();
});

describe("the release list", () => {
    it("releases the superseded snapshot and its undirected copy on a freeze", async () => {
        const { graph, fake } = await graphWithFake(["a", "b", "c"]);
        const data = graph.getDataManager();

        const previous = data.getSnapshot();

        await graph.addNodes([{ id: "d" }]);
        const next = data.getSnapshot();
        assert.notStrictEqual(next, previous, "adding a node froze a new snapshot");

        // Read AFTER the freeze, deliberately. The derived copy is cached per snapshot, so reading
        // it first would build the copy the release list is supposed to have built itself, and the
        // case could not tell a released resident copy from one made for the occasion.
        const previousUndirected = data.undirected(previous).snapshot;
        assert.notStrictEqual(previousUndirected, previous, "a directed graph has a distinct undirected copy");

        const released: GraphSnapshot[] = fake.calls.release;
        assert.include(released, previous, "the superseded snapshot was released");
        assert.include(released, previousUndirected, "so was its undirected copy");
        assert.isBelow(
            released.indexOf(previous),
            released.indexOf(previousUndirected),
            "the snapshot is released before the copy derived from it",
        );
        assert.notInclude(released, next, "the snapshot the graph is now showing is NOT released");
    });

    it("leaves an accelerator that implements no release alone", async () => {
        const { graph } = await createE2EGraph({ nodes: [{ id: "a" }, { id: "b" }], enableAi: false });
        graphs.push(graph);

        const noResidency: GraphAccelerator = {
            name: "no-release",
            backend: "webgpu",
            forceAtlas2: (): string => "gpu",
        };
        graph.acceleration.setAccelerator(noResidency);

        const data = graph.getDataManager();
        data.getSnapshot();
        await graph.addNodes([{ id: "c" }]);

        assert.isNotNull(data.getSnapshot(), "the freeze went through with nothing to release it to");
    });

    it("shutdown releases the resident snapshot of an injected accelerator and does not dispose it", async () => {
        const { graph, fake } = await graphWithFake(["a", "b"]);
        const resident = graph.getDataManager().getSnapshot();
        const residentUndirected = graph.getDataManager().undirected(resident).snapshot;

        graphs.pop();
        graph.shutdown();

        assert.include(fake.calls.release, resident, "the snapshot the graph was showing was released");
        assert.include(fake.calls.release, residentUndirected, "so was its undirected copy");

        // `session.setAccelerator` promises that an injected accelerator "is not disposed by the
        // session -- whoever built it owns its lifetime" (src/session/types.ts). Buffers this graph
        // asked for are still freed; the device behind them is not this graph's to destroy.
        assert.strictEqual(fake.calls.dispose, 0, "an injected accelerator outlives the graph it was lent to");
    });

    it("releases the snapshot the graph was showing when the dataset is cleared", async () => {
        const { graph, fake } = await graphWithFake(["a", "b", "c"]);
        const data = graph.getDataManager();

        const cleared = data.getSnapshot();
        const clearedUndirected = data.undirected(cleared).snapshot;

        data.clear();

        assert.include(fake.calls.release, cleared, "clearing the data frees what the accelerator uploaded");
        assert.include(fake.calls.release, clearedUndirected, "so it frees the undirected copy");

        // And the shutdown that follows has nothing left to free: the cleared snapshot belonged to
        // a store that is gone, so releasing it twice -- or releasing a lookalike derived from the
        // fresh store, which the accelerator never uploaded -- would be the same bug wearing a
        // different hat.
        const releasedByClear = fake.calls.release.length;
        graphs.pop();
        graph.shutdown();
        assert.strictEqual(fake.calls.release.length, releasedByClear, "a cleared graph releases nothing again");
    });

    it("shutdown releases the resident snapshot before disposing an accelerator the controller built", async () => {
        const built = createFakeAccelerator();
        let releasesWhenDisposed = -1;
        built.dispose = (): void => {
            releasesWhenDisposed = built.calls.release.length;
            built.calls.dispose += 1;
        };
        acceleratorRegistry.register({
            name: FACTORY_NAME,
            backend: "webgpu",
            factory: (): Promise<GraphAccelerator> => Promise.resolve(built),
        });

        const { graph } = await createE2EGraph({ nodes: [{ id: "a" }, { id: "b" }], enableAi: false });
        graphs.push(graph);
        await graph.acceleration.start();
        assert.strictEqual(graph.acceleration.accelerator, built, "the controller built and attached the fake");

        const resident = graph.getDataManager().getSnapshot();

        graphs.pop();
        graph.shutdown();

        assert.include(built.calls.release, resident);
        assert.strictEqual(built.calls.dispose, 1, "the controller disposes what it built");
        assert.strictEqual(
            releasesWhenDisposed,
            built.calls.release.length,
            "every release had happened before the accelerator was disposed",
        );
        assert.isAbove(releasesWhenDisposed, 0);
    });

    it("releases nothing on the shutdown of a graph that never froze", () => {
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        const graph = new Graph(container);
        const fake = createFakeAccelerator();
        graph.acceleration.setAccelerator(fake);
        graph.shutdown();
        container.remove();

        assert.deepStrictEqual(fake.calls.release, [], "no snapshot was ever the graph, so none is freed");
    });
});
