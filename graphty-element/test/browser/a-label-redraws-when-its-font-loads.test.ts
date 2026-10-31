/**
 * @file A label whose web font is still loading when it is built is drawn again in that font once
 * it loads (issue #3531).
 *
 * THE DEFECT. A label is measured and drawn on a canvas with whatever face its font has at that
 * moment. A web font that has not loaded yet draws in the fallback face, and nothing rebuilt the
 * label when the font arrived, so the label's texture, its width and the framing box built from it
 * kept the fallback's for good, and which one a page showed depended on load timing.
 *
 * WHAT IS MEASURED. Each test registers a face of the committed Inter file under a family name of
 * its own, not loaded yet, so the label built with it is what starts the load and is built in the
 * fallback. Once the graph's picture is final, the label must be as wide as one built with the
 * font already loaded, and the camera must frame the graph as it frames it when the font loaded
 * first.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { PINNED_LABEL_FONT_URL } from "../helpers/pin-label-font";

/** Long words in a large size, so the label decides the framing and Inter differs from the fallback. */
const WORDS = "Mmmmmmmmmmmmmmmmmmm wide label";

let family = 0;

/**
 * Register a face under a new family name without loading it.
 * @returns The family name.
 */
function unloadedFont(): string {
    family++;
    const name = `Slow Font ${String(family)} ${String(Date.now())}`;
    document.fonts.add(new FontFace(name, `url(${PINNED_LABEL_FONT_URL})`));
    return name;
}

describe("a label built while its web font loads", () => {
    let container: HTMLElement;
    const graphs: Graph[] = [];

    beforeEach(() => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
    });

    afterEach(() => {
        for (const graph of graphs.splice(0)) {
            graph.dispose();
        }

        container.remove();
    });

    /**
     * A graph of two labelled nodes at fixed places, its labels in a font, drawn to a final picture.
     * @param font - The labels' font family.
     * @returns The graph.
     */
    async function mount(font: string): Promise<Graph> {
        const graph = new Graph(container);
        graphs.push(graph);
        await graph.init();
        await graph.addNodes([
            { id: "a", position: { x: 0, y: 0, z: 0 } },
            { id: "b", position: { x: 1, y: 0, z: 0 } },
        ]);
        await graph.addEdges([{ src: "a", dst: "b" }]);
        await graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
        const labelStyle = { font: `"${font}", serif`, sizePx: 48 };
        await graph.getSession().styles.add({
            name: "node labels in a web font",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": WORDS, "node.labelStyle": labelStyle },
        });
        await graph.getSession().styles.add({
            name: "edge labels in a web font",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.label": WORDS, "edge.labelStyle": labelStyle },
        });
        await graph.waitForStableFrame();
        return graph;
    }

    /**
     * How wide a graph's node label is drawn, in its own canvas units.
     * @param graph - The graph.
     * @returns The width.
     */
    function labelWidth(graph: Graph): number {
        const label = graph.getNodes()[0]?.label;
        assert.isDefined(label, "the node has a label");
        return (label as unknown as { actualDimensions: { width: number } }).actualDimensions.width;
    }

    /**
     * Dispose a graph before the next one is mounted in the same container.
     * @param graph - The graph.
     */
    function unmount(graph: Graph): void {
        graphs.splice(graphs.indexOf(graph), 1);
        graph.dispose();
    }

    /**
     * How wide a graph's first edge label is drawn, in its own canvas units.
     * @param graph - The graph.
     * @returns The width.
     */
    function edgeLabelWidth(graph: Graph): number {
        const label = [...graph.getDataManager().edges.values()][0]?.label;
        assert.isNotNull(label ?? null, "the edge has a label");
        return (label as unknown as { actualDimensions: { width: number } }).actualDimensions.width;
    }

    it("is drawn as wide as one built after the font loaded, and framed the same", async () => {
        const font = unloadedFont();

        const late = await mount(font);
        await document.fonts.load(`48px "${font}"`);
        await late.waitForStableFrame();
        const lateNode = labelWidth(late);
        const lateEdge = edgeLabelWidth(late);
        const lateDistance = late.getCameraState().cameraDistance;
        unmount(late);

        const early = await mount(font);
        const earlyNode = labelWidth(early);
        const earlyEdge = edgeLabelWidth(early);
        const earlyDistance = early.getCameraState().cameraDistance;

        assert.strictEqual(lateNode, earlyNode, "the node label is as wide as one built with the font loaded");
        assert.strictEqual(lateEdge, earlyEdge, "the edge label is rebuilt too");
        assert.isDefined(lateDistance);
        assert.isDefined(earlyDistance);
        assert.closeTo(
            lateDistance ?? 0,
            earlyDistance ?? 0,
            1e-3 * (earlyDistance ?? 1),
            "framed for the loaded font",
        );
    });

    it("reaches a final picture in the fallback when its font fails to load", async () => {
        family++;
        const name = `Missing Font ${String(family)}`;
        document.fonts.add(new FontFace(name, "url(/no-such-font-3531.woff2)"));
        const fallback = await mount("No Such Family 3531");
        const fallbackNode = labelWidth(fallback);
        unmount(fallback);

        const graph = await mount(name);

        assert.strictEqual(labelWidth(graph), fallbackNode, "the label stays in the fallback face");
    });
});
