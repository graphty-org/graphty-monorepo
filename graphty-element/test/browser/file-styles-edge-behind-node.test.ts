/**
 * A line to a node drawn behind every edge (a 2D node below z-index 0, as a file's group is drawn behind its members)
 * ends at the node's outline, as yEd and Cytoscape.js end one at a compound node's border: no node hides the stretch
 * under it, so a line run to its middle would be seen crossing it (graphml-galaxy-lcms-workflow's bands into the "3
 * tabulars" group). A node at z-index 0 still takes the line to its middle, which it hides.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { Projector, readEdge } from "../fidelity/drawn-scene";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Where the line from `free` to `back` ends, as a share of `back`'s half width from its middle.
 * @param zIndex - The z-index `back` is drawn at.
 * @param port - Whether the line ends at a port at `back`'s middle, as yEd's do (`edge.targetPort` "0,0").
 * @returns The share: 0 at its middle, 1 at its outline.
 */
async function endShare(zIndex: number, port = false): Promise<number> {
    mounted?.remove();
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:480px;height:360px";
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "back",
        target: "node",
        selector: { match: "ids", nodes: ["back"] },
        set: { "node.shape": "rectangle", "node.size": 4, "node.zIndex": zIndex },
    });
    // a line with no cap, as yEd's framed bands are: its bare end is where the node leaves it
    await element.session.styles.add({
        name: "bare",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none", ...(port ? { "edge.targetPort": "0,0" } : {}) },
    });
    await element.session.data.addNodes([
        { id: "back", position: { x: 0, y: 0, z: 0 } },
        { id: "free", position: { x: 10, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ src: "free", dst: "back" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    const { nodes, edges } = element.graph.getDataManager();
    const back = nodes.get("back");
    const [edge] = [...edges.values()];
    assert.exists(back);
    assert.exists(edge);
    // the line as drawn, in render pixels: its end nearer `back`
    const p = new Projector(element.graph.getScene());
    const ends = readEdge(edge, p).lineEnds;
    assert.exists(ends);
    const centre = p.point(back.drawnPosition);
    const halfPx = back.drawnHalfExtents.x * p.pxPerWorld(back.drawnPosition);
    const reach = Math.min(...ends.map(([x, y]) => Math.hypot(x - centre.x, y - centre.y)));
    return reach / halfPx;
}

describe("a line to a node drawn behind every edge", () => {
    it("ends at the node's outline", async () => {
        assert.closeTo(await endShare(-1), 1, 0.05);
    });

    it("ends at the node's outline though its port is at the node's middle", async () => {
        assert.closeTo(await endShare(-1, true), 1, 0.05);
    });

    it("runs to the middle of a node at z-index 0, which hides it", async () => {
        assert.isBelow(await endShare(0), 0.05);
    });
});
