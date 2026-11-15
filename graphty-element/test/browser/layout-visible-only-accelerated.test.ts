/**
 * @file `behavior.layout.visibleOnly` on an accelerated force layout (issue #7964). The hidden nodes are taken out of
 * the accelerated simulation's forces with `setInert`; an accelerator whose simulation has no `setInert` is refused
 * with `E_UNSUPPORTED`, never run over the whole graph in silence.
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

    it("takes exactly the hidden nodes out of the accelerated simulation's forces", async () => {
        graph.acceleration.setAccelerator(createFakeAccelerator());
        await showOnly(SHOWN);
        await graph.setLayout("forceatlas2", { seed: 3 });

        const engine = graph.getLayoutManager().layoutEngine as SimulationLayoutEngine;
        assert.isTrue(engine.isAccelerated, "the layout runs on the accelerator");
        const { inert } = engine.simulation as FakeSimulation;
        assert.isNotNull(inert);
        for (const node of graph.getDataManager().nodes.values()) {
            const hidden = !SHOWN.includes(String(node.id));
            assert.strictEqual(maskTest(inert ?? new Uint32Array(), node.index), hidden, `${String(node.id)} inert`);
        }
    });

    it("refuses with E_UNSUPPORTED when the accelerated simulation cannot leave the hidden nodes out", async () => {
        graph.acceleration.setAccelerator(withoutSetInert());
        await showOnly(SHOWN);

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
