/**
 * @file `behavior.layout.visibleOnly` on an accelerated force layout (issue #7964). A node the filter hides gets no
 * row in the accelerated simulation (the working graph, design/working-graph/design.md section 7), so it exerts no
 * force and nothing has to be made inert for it. A group that follows its members is still in the simulation and is
 * taken out of the forces with `setInert`; an accelerator whose simulation has no `setInert` is refused with
 * `E_UNSUPPORTED` there, never run over the group in silence.
 */

import "../../src/graphty-element";

import { maskTest } from "@graphty/graph-format";
import type { ForceAtlas2Options } from "@graphty/layout";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { type GraphtyError, isGraphtyError } from "../../src/errors";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import type { ElementSession } from "../../src/session/types";
import { createFakeAccelerator, type FakeAccelerator, type FakeSimulation } from "../../src/testing/fakeAccelerator";

/** Twenty nodes on a path. */
const IDS = Array.from({ length: 20 }, (_, index) => `n${String(index)}`);

/** Every other node: what the filter shows. */
const SHOWN = IDS.filter((_id, index) => index % 2 === 0);

/** A Graphviz cluster the file stores no position for: a group the element places round its members. */
const CLUSTER = `digraph {
  a -> m1;
  subgraph clusterC { label="c"; m1; m2; m1 -> m2; }
}`;

/**
 * A fake accelerator whose ForceAtlas2 simulations cannot take rows out of the forces, as a third-party one may not.
 * @returns The accelerator.
 */
function withoutSetInert(): FakeAccelerator {
    const fake = createFakeAccelerator();
    const build = fake.forceAtlas2.bind(fake);
    fake.forceAtlas2 = (options?: ForceAtlas2Options): FakeSimulation => {
        const simulation = build(options);
        Object.defineProperty(simulation, "setInert", { value: undefined });
        return simulation;
    };
    return fake;
}

describe("a filtered force layout on an accelerator", () => {
    let graph: Graph;
    let container: HTMLDivElement;
    let session: ElementSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(IDS.map((id) => ({ id })));
        await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })));
        await operationQueueOf(graph).waitForCompletion();
        session = graph.getSession() as ElementSession;
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Turn `visibleOnly` on and show only some nodes.
     * @param ids - The nodes to show.
     */
    async function showOnly(ids: readonly string[]): Promise<void> {
        graph.setLayoutBehavior({ layout: { visibleOnly: true } });
        await session.visibility.set({ kind: "member", of: { nodes: ids } });
        await operationQueueOf(graph).waitForCompletion();
    }

    it("gives the hidden nodes no row in the accelerated simulation", async () => {
        graph.acceleration.setAccelerator(createFakeAccelerator());
        await showOnly(SHOWN);
        await graph.setLayout("forceatlas2", { seed: 3 });

        const engine = graph.getLayoutManager().layoutEngine as SimulationLayoutEngine;
        assert.isTrue(engine.isAccelerated, "the layout runs on the accelerator");
        const { snapshot } = engine.simulation as FakeSimulation;
        assert.strictEqual(snapshot?.nodeCount, SHOWN.length, "the simulation holds only the shown nodes");
    });

    it("runs an accelerator with no setInert over only the shown nodes", async () => {
        graph.acceleration.setAccelerator(withoutSetInert());
        await showOnly(SHOWN);
        await graph.setLayout("forceatlas2", { seed: 3 });

        const engine = graph.getLayoutManager().layoutEngine as SimulationLayoutEngine;
        assert.strictEqual(engine.type, "forceatlas2");
        assert.isTrue(engine.isAccelerated);
        assert.strictEqual((engine.simulation as FakeSimulation).snapshot?.nodeCount, SHOWN.length);
    });

    it("takes a group that follows its members out of the accelerated simulation's forces", async () => {
        graph.acceleration.setAccelerator(createFakeAccelerator());
        await graph.addDataFromSource("dot", { data: CLUSTER });
        await operationQueueOf(graph).waitForCompletion();
        await graph.setLayout("forceatlas2", { seed: 3 });

        const engine = graph.getLayoutManager().layoutEngine as SimulationLayoutEngine;
        assert.isTrue(engine.isAccelerated, "the layout runs on the accelerator");
        const { inert } = engine.simulation as FakeSimulation;
        assert.isNotNull(inert);
        for (const node of graph.getDataManager().nodes.values()) {
            const group = String(node.id) === "clusterC";
            assert.strictEqual(maskTest(inert ?? new Uint32Array(), node.index), group, `${String(node.id)} inert`);
        }
    });

    it("refuses with E_UNSUPPORTED when the accelerated simulation cannot leave a following group out", async () => {
        graph.acceleration.setAccelerator(withoutSetInert());
        await graph.addDataFromSource("dot", { data: CLUSTER });
        await operationQueueOf(graph).waitForCompletion();

        const refused = await graph.setLayout("forceatlas2", { seed: 3 }).catch((error: unknown) => error);

        assert.isTrue(isGraphtyError(refused), "the refusal carries a code a consumer can switch on");
        assert.strictEqual((refused as GraphtyError).code, "E_UNSUPPORTED");
        assert.strictEqual((refused as GraphtyError).details?.reason, "simulation-cannot-leave-nodes-out");
        assert.notStrictEqual(graph.getLayoutManager().layoutEngine?.type, "forceatlas2", "it did not run");
    });

    it("runs that accelerator when nothing is hidden", async () => {
        graph.acceleration.setAccelerator(withoutSetInert());
        await graph.setLayout("forceatlas2", { seed: 3 });

        const engine = graph.getLayoutManager().layoutEngine as SimulationLayoutEngine;
        assert.strictEqual(engine.type, "forceatlas2");
        assert.isTrue(engine.isAccelerated);
    });
});
