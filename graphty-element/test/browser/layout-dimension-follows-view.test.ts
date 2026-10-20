/**
 * A 2D view always draws a layout computed in 2D; a 3D view draws the dimension the caller chose.
 *
 * A caller's `dim: 3` used to win over the view: switched to 2D, the force layout kept simulating
 * in 3D and the view dropped the Z, so the drawing was a flattened 3D layout with nodes on top of
 * each other. Now the 2D view builds the layout in 2D and reports the replaced option as a
 * `layout-warning` with code `W_DIMENSION_OVERRIDDEN`; back in 3D the caller's `dim: 3` holds again.
 * In 3D a caller's `dim: 2` is kept, so a 3D view can show a flat layout.
 */
import { afterEach, assert, describe, test } from "vitest";

import type { LayoutWarningEvent } from "../../src/events";
import { Graphty } from "../../src/graphty-element";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }];
const EDGES = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "b", target: "d" },
    { source: "c", target: "d" },
    { source: "d", target: "e" },
    { source: "e", target: "f" },
    { source: "f", target: "a" },
];

const hosts: HTMLElement[] = [];

afterEach(() => {
    for (const host of hosts.splice(0)) {
        host.remove();
    }
});

/**
 * Mount a 3D graph with the force layout and the given options, settled.
 * @param layoutConfig - The layout's options.
 * @returns The element and the layout warnings it has emitted.
 */
async function mount3D(
    layoutConfig: Record<string, unknown>,
): Promise<{ element: Graphty; warnings: LayoutWarningEvent[] }> {
    const host = document.createElement("div");
    host.style.width = "600px";
    host.style.height = "400px";
    document.body.append(host);
    hosts.push(host);

    const element = new Graphty();
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    const warnings: LayoutWarningEvent[] = [];
    element.addEventListener("layout-warning", (event) => {
        warnings.push(event.detail);
    });
    element.viewMode = "3d";
    element.layout = "ngraph";
    element.layoutConfig = { seed: 42, ...layoutConfig };
    element.nodeData = NODES;
    element.edgeData = EDGES;
    host.append(element);

    await settle(element);
    return { element, warnings };
}

/**
 * Wait for the layout to come to rest and the frame to show it.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/**
 * The dimension the running force simulation was built in.
 * @param element - The element.
 * @returns 2 or 3.
 */
function simulatedDimension(element: Graphty): number {
    const engine = element.graph.getLayoutManager().layoutEngine;
    assert.instanceOf(engine, NGraphEngine, "the force layout runs on the CPU force engine");
    return engine.ngraphLayout.simulator.settings.dimensions;
}

/**
 * Every node's drawn Z.
 * @param element - The element.
 * @returns The Z of each node's mesh.
 */
function drawnZ(element: Graphty): number[] {
    const nodes = [...element.graph.getNodes()];
    assert.lengthOf(nodes, NODES.length, "every node is loaded");
    return nodes.map((node) => node.mesh.position.z);
}

describe("the layout's dimension follows the view", () => {
    test("a 3D force layout with dim: 3 is computed in 2D after the switch to 2D, and in 3D after the switch back", async () => {
        const { element, warnings } = await mount3D({ dim: 3 });
        assert.strictEqual(simulatedDimension(element), 3);
        assert.isTrue(
            drawnZ(element).some((z) => Math.abs(z) > 0.01),
            "the 3D layout puts some node off the plane",
        );

        await element.setViewMode("2d");
        await settle(element);

        assert.strictEqual(simulatedDimension(element), 2, "a 2D view computes its layout in 2D");
        for (const z of drawnZ(element)) {
            assert.closeTo(z, 0, 1e-6, "every node lies on the 2D plane");
        }

        const overridden = warnings.filter((w) => w.code === "W_DIMENSION_OVERRIDDEN");
        assert.lengthOf(overridden, 1, "the replaced option is reported once");
        assert.deepEqual(overridden[0].params, { requested: { dim: 3 }, used: { dim: 2 } });

        await element.setViewMode("3d");
        await settle(element);

        assert.strictEqual(simulatedDimension(element), 3, "back in 3D the caller's dim: 3 holds");
        assert.isTrue(
            drawnZ(element).some((z) => Math.abs(z) > 0.01),
            "the 3D layout takes some node off the plane again",
        );
        assert.lengthOf(
            warnings.filter((w) => w.code === "W_DIMENSION_OVERRIDDEN"),
            1,
            "nothing is overridden in 3D",
        );
    });

    test("a 3D view with dim: 2 keeps every node on the plane", async () => {
        const { element, warnings } = await mount3D({ dim: 2 });

        assert.strictEqual(simulatedDimension(element), 2);
        for (const z of drawnZ(element)) {
            assert.closeTo(z, 0, 1e-6, "a dim: 2 layout keeps every node on the plane");
        }

        assert.isFalse(warnings.some((w) => w.code === "W_DIMENSION_OVERRIDDEN"));
    });
});
