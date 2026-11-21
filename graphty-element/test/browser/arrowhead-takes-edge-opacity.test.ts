/**
 * @file On a directed graph an arrowhead is drawn at its edge's opacity (#9294).
 *
 * A layer that set `edge.opacity` faded the line and left its arrowheads at full strength, so on a
 * large directed graph (BioPlex, 75,346 heads) the heads covered the network the reader had just
 * faded. This reads the pixels: with the edge at full opacity the heads show strong red; faded, no
 * pixel is strong red any more and the heads show the same faint blend the line does.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

afterEach(() => {
    document.body.replaceChildren();
});

/** Two nodes far apart and one directed edge between them, so its head is drawn large and clear of both. */
const NODES = [
    { id: "a", position: { x: -3, y: 0, z: 0 } },
    { id: "b", position: { x: 3, y: 0, z: 0 } },
];
const EDGES = [{ src: "a", dst: "b" }];

/** A channel at or above this is "full": the head or line drawn red at full strength. */
const FULL = 200;

/** A channel at or below this is "none". */
const NONE = 90;

/** How the frame's red pixels split: drawn at full strength, and blended (red, but not full). */
interface RedCount {
    readonly strong: number;
    readonly faint: number;
}

/**
 * Mount a directed graph on one render path, its edges red with large heads at full opacity.
 * @param renderPath - The render path.
 * @returns The element, drawn and still.
 */
async function drawn(renderPath: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = renderPath;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await element.session.config.set({ data: { directed: true } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "blue nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#0000ff" },
    });
    await element.session.styles.add({
        name: "red edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff0000", "edge.arrowHeadSize": 4 },
    });
    await settled(element);
    return element;
}

/**
 * Wait for every queued change to reach a still frame.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * Count the frame's red pixels: strong (full red, no green or blue) and faint (more red than green
 * or blue, but not strong).
 * @param element - The element.
 * @returns The counts.
 */
function reds(element: Graphty): RedCount {
    element.graph.getScene().render();
    const canvas = element.graph.getScene().getEngine().getRenderingCanvas();
    assert.isNotNull(canvas);
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(canvas, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
    let strong = 0;
    let faint = 0;
    for (let at = 0; at < pixels.length; at += 4) {
        const [r, g, b] = [pixels[at] ?? 0, pixels[at + 1] ?? 0, pixels[at + 2] ?? 0];
        if (r >= FULL && g <= NONE && b <= NONE) {
            strong++;
        } else if (r - g > 20 && r - b > 20) {
            faint++;
        }
    }

    return { strong, faint };
}

describe("an arrowhead on a directed graph takes its edge's opacity (#9294)", () => {
    for (const renderPath of ["objects", "batched"] as const) {
        it(`blends the head like its line: renderPath ${renderPath}`, async () => {
            const element = await drawn(renderPath);
            const opaque = reds(element);
            // The reader fades the edges of a graph already on screen, as the app's opacity control does.
            await element.session.styles.add({
                name: "faded edges",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.opacity": 0.2 },
            });
            await settled(element);
            const faded = reds(element);

            // The control: at full opacity the head and the line are drawn strong red.
            assert.isAbove(opaque.strong, 200, `at opacity 1 the edge draws strong red: ${JSON.stringify(opaque)}`);
            // Faded, nothing is drawn at full strength: not the line, and not its head.
            assert.isBelow(
                faded.strong,
                20,
                `at opacity 0.2 no pixel should be full red, read ${JSON.stringify(faded)}: the head ignored the edge's opacity`,
            );
            // And the head is still drawn, blended: about as many red pixels as at full strength.
            assert.isAbove(
                faded.faint,
                (opaque.strong + opaque.faint) * 0.6,
                `the faded edge and head still show, blended: ${JSON.stringify({ opaque, faded })}`,
            );
        });
    }
});
