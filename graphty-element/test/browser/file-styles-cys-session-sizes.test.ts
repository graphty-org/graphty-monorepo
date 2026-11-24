/**
 * @file A Cytoscape session opened with its styles and the recommended layout is drawn where Cytoscape put its nodes,
 * with each node as large beside the drawing as Cytoscape draws it (issue #9297): the stored positions take the one
 * factor the node sizes take.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import cysUrl from "../../../graph-io/test/corpus/styles/cys/BasicDataVizDemo.cys?url";
import { Graph, operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

/**
 * Cytoscape's drawing in the session's view: its nodes are 75 wide (the "default" visual style's NODE_WIDTH) and its
 * node centers span 2979.4 across (the view's stored x, -1206.39 to 1773.01).
 */
const CYTOSCAPE = { width: 75, span: 1773.010978704853 - -1206.385749810772 };

describe("a Cytoscape session drawn as Cytoscape draws it", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.getSession().layout.setDimension("2d");
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("draws each node as wide beside the drawing's span as Cytoscape does", async () => {
        const session = graph.getSession();
        await session.data.import(
            { type: "cys", config: { url: cysUrl } },
            { styles: "file", layout: "recommended", styleOptions: { lengths: "spacing", framing: "file" } },
        );
        await operationQueueOf(graph).waitForCompletion();
        const manager = graph.getLayoutManager();
        while (!(manager.layoutEngine?.isSettled ?? false) || manager.running) {
            await drawnFrames(graph.getScene(), 1);
        }
        assert.strictEqual(session.layout.id, "fixed");

        const ids = session.data.nodes().map((n) => n.id);
        const widths = ids.map((id) => 2 * (graph.getNode(id)?.drawnRadius ?? Number.NaN)).sort((a, b) => a - b);
        const xs = ids.map((id) => graph.getNode(id)?.getPosition().x ?? Number.NaN);
        const span = Math.max(...xs) - Math.min(...xs);
        const ratio = widths[Math.floor(widths.length / 2)] / span / (CYTOSCAPE.width / CYTOSCAPE.span);
        assert.closeTo(ratio, 1, 0.05, `node ${String(widths[0])} wide over a span of ${String(span)}`);
    });
});
