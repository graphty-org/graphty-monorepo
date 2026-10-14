/**
 * @file An arrowhead is drawn over a node's outline, never under it (issue #2324).
 *
 * A node outline (`node.outline`) is a highlight layer: a glow composited over the finished frame
 * wherever the stencil buffer does not say "outlined node". An arrowhead's tip sits on the node's
 * surface, inside that glow, so the glow painted over it -- and a file that gives its nodes a
 * border (DOT, yEd GraphML, Cytoscape.js and Pajek files mostly do) loaded with every arrowhead
 * it asked for resolved and none of them on screen. A cap now marks its pixels in the stencil the
 * way an outlined node does, so the glow passes over it.
 *
 * Measured from the render, because the glow is a post-process with no geometry to read: the
 * pixels of the arrowheads' own colour with the outline on, against the same picture with it off.
 */
import { afterEach, assert, describe, test } from "vitest";

import { EdgeArrowTypes } from "../../src/config/EdgeStyle";
import { Graph, operationQueueOf } from "../../src/Graph";
import { styleEveryEdge } from "../helpers/testSetup";

/** How much redder than green or blue a pixel is, to be an arrowhead's: they are drawn pure red. */
const RED_MARGIN = 60;

/**
 * A directed star, every edge into the hub, in each format whose files carry node borders. A
 * Cytoscape.js document is read through the JSON reader's paths, as a consumer reads one.
 */
const FILES: Record<string, { name: string; text: string; paths?: object }> = {
    dot: { name: "star.gv", text: "digraph star { a -> hub; b -> hub; c -> hub; }" },
    graphml: {
        name: "star.graphml",
        text: `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
<graph id="star" edgedefault="directed">
<node id="a"/><node id="b"/><node id="c"/><node id="hub"/>
<edge source="a" target="hub"/><edge source="b" target="hub"/><edge source="c" target="hub"/>
</graph></graphml>`,
    },
    cytoscapejs: {
        name: "star.json",
        text: JSON.stringify({
            elements: {
                nodes: ["a", "b", "c", "hub"].map((id) => ({ data: { id } })),
                edges: ["a", "b", "c"].map((id) => ({ data: { id: `${id}-hub`, source: id, target: "hub" } })),
            },
        }),
        paths: { node: { path: "elements.nodes[].data" }, edge: { path: "elements.edges[].data" } },
    },
    pajek: { name: "star.net", text: '*Vertices 4\n1 "a"\n2 "b"\n3 "c"\n4 "hub"\n*Arcs\n1 4\n2 4\n3 4\n' },
};

/** Every arrowhead that draws something. */
const KINDS = EdgeArrowTypes.options.filter((kind) => kind !== "none");

describe("an arrowhead is drawn over a node's outline", () => {
    let container: HTMLElement | null = null;
    let graph: Graph | null = null;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
        graph = null;
        container = null;
    });

    /**
     * Load one file into a fresh 2D graph, laid out in a circle and framed so that a node and its
     * arrowheads are a few pixels across -- the size an outline's glow swallows whole, as it did
     * on the file samples.
     * @param file - The file: its name, which names its format, its text, and the JSON paths of a
     *     Cytoscape.js document.
     * @returns The graph.
     */
    async function load(file: (typeof FILES)[string]): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setViewMode("2d");
        await (file.paths === undefined
            ? graph.loadFromFile(new File([file.text], file.name))
            : graph.addDataFromSource("json", {
                  data: `data:application/json,${encodeURIComponent(file.text)}`,
                  ...file.paths,
              }));
        await graph.setLayout("circular", { scalingFactor: 30 });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        return graph;
    }

    /**
     * How many pixels of the arrowheads' red the next frame draws.
     * @param g - The graph.
     * @returns The count.
     */
    async function arrowPixels(g: Graph): Promise<number> {
        await operationQueueOf(g).waitForCompletion();
        await g.waitForStableFrame();
        const scene = g.getScene();
        scene.render();
        const engine = scene.getEngine();
        const pixels = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        let count = 0;
        for (let at = 0; at < pixels.length; at += 4) {
            // Red over anything else in the picture: an open cap is a thin stroke, blended with
            // the background at its edges, so a pixel counts by its hue rather than its exact value.
            if (pixels[at] - Math.max(pixels[at + 1], pixels[at + 2]) > RED_MARGIN) {
                count++;
            }
        }

        return count;
    }

    for (const [format, file] of Object.entries(FILES)) {
        test(`${format}: every arrowhead kind on a directed file is as visible outlined as not`, async () => {
            const g = await load(file);
            const session = g.getSession();
            const seen: string[] = [];

            for (const kind of KINDS) {
                await styleEveryEdge(
                    g,
                    {
                        "edge.arrowHead": kind,
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadColor": "#ff0000",
                        "edge.color": "#00a000",
                    },
                    `arrow ${kind}`,
                );
                const bare = await arrowPixels(g);
                await session.styles.add({
                    name: `outline ${kind}`,
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.outline": "#000000" },
                });
                const outlined = await arrowPixels(g);
                seen.push(`${kind} ${String(outlined)}/${String(bare)}`);

                assert.isAbove(bare, 0, `${format} ${kind}: the arrowhead is drawn at all (${seen.join(", ")})`);
                assert.isAtLeast(
                    outlined,
                    bare * 0.9,
                    `${format} ${kind}: outlined/bare arrowhead pixels ${seen.join(", ")}`,
                );

                for (const layer of session.styles.list()) {
                    if (layer.name === `arrow ${kind}` || layer.name === `outline ${kind}`) {
                        await session.styles.remove(layer.id);
                    }
                }
            }
        });
    }
});
