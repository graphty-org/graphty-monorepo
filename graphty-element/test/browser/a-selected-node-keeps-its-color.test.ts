/**
 * @file A selected node is drawn in its own colour, ringed by the selection halo. The halo is a
 * translucent sphere larger than the node; drawing its near side blended it over the whole node,
 * so the click-to-expand story's seed -- selected by the double-click that expanded it -- drew
 * gray-brown (its blue under 40% gold) after the expansion completed or was collapsed, while the
 * style stack said blue. Read off the canvas, because the style stack was right all along.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { SourceExpanded } from "../../src/session/sources/types";
import { loadRecordedSeed, PEOPLE_SEED } from "../../stories/fixtures/expand/source";
import { doubleClick } from "../helpers/real-input";

/** How far a channel may move before a pixel counts as another colour: rounding, not a tint. */
const CHANNEL_TOLERANCE = 3;

/** The default node colour, which the seed has when no layer matches it. */
const NODE_BLUE = [99, 102, 241];

/** The story's layer colour for a node with more to fetch. */
const PARTIAL_ORANGE = [232, 89, 12];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted 2D element holding the recorded source's seed at the origin, with the
 * click-to-expand story's layer and double-click expansion three neighbors at a time.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "More to fetch",
        target: "node",
        selector: { match: "expression", where: "data._source.expansion == 'partial'" },
        set: { "node.color": "#e8590c" },
    });
    await loadRecordedSeed(element.session, "recorded", { position: { x: 0, y: 0, z: 0 } });
    element.layoutBehavior = { expand: { trigger: "double-click", limit: 3 } };
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    element.autoFrame = false;
    await element.setCameraState({ zoom: 0.35, pan: { x: 0, y: 0 } });
    await element.waitForStableFrame();
    return element;
}

/**
 * The colour drawn at a distance from the seed's centre, to its right.
 * @param element - The element.
 * @param radii - How far from the centre, in the seed's drawn radii.
 * @returns [r, g, b].
 */
async function seedPixel(element: Graphty, radii: number): Promise<number[]> {
    await element.waitForStableFrame();
    const at = element.nodeScreenPosition(PEOPLE_SEED.id);
    assert.isDefined(at, "the seed is drawn");
    const { engine, canvas } = element.graph;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const box = canvas.getBoundingClientRect();
    const x = Math.round(((at.x + at.radius * radii) * width) / box.width);
    const y = Math.round(height - (at.y * height) / box.height);
    const pixel = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
    return [pixel[0], pixel[1], pixel[2]];
}

/**
 * Whether two colours are the same but for rounding.
 * @param actual - What was drawn.
 * @param expected - What should have been.
 * @returns True when every channel is within the tolerance.
 */
function same(actual: readonly number[], expected: readonly number[]): boolean {
    return actual.every((channel, i) => Math.abs(channel - expected[i]) <= CHANNEL_TOLERANCE);
}

/**
 * Double-click the seed and wait for the expansion it starts to land.
 * @param element - The element.
 */
async function expandSeed(element: Graphty): Promise<void> {
    const expanded = new Promise<SourceExpanded>((resolve) => {
        const off = element.session.on("source:expanded", (detail) => {
            off();
            resolve(detail);
        });
    });
    const at = element.nodeScreenPosition(PEOPLE_SEED.id);
    assert.isTrue(at?.visible === true, "the seed is on screen");
    await doubleClick(element, { x: at?.x ?? 0, y: at?.y ?? 0 });
    await expanded;
    await operationQueueOf(element.graph).waitForCompletion();
}

describe("a selected node", () => {
    it("is drawn in its own colour inside its halo, through expansion and collapse", async () => {
        const element = await mounted();
        assert.deepEqual(element.session.selection.nodes, []);
        assert.isTrue(same(await seedPixel(element, 0), NODE_BLUE), "the seed starts blue");

        await expandSeed(element);
        assert.deepEqual(element.session.selection.nodes, [PEOPLE_SEED.id], "the double-click selected the seed");
        const partial = await seedPixel(element, 0);
        assert.isTrue(same(partial, PARTIAL_ORANGE), `a partial seed is the layer's orange; drew ${partial.join(",")}`);

        await expandSeed(element);
        await element.session.data.collapse(PEOPLE_SEED.id);
        await operationQueueOf(element.graph).waitForCompletion();
        const collapsed = await seedPixel(element, 0);
        assert.isTrue(same(collapsed, NODE_BLUE), `a collapsed seed is blue again; drew ${collapsed.join(",")}`);

        // The halo is still drawn: just outside the node, the background shows gold through it.
        const ring = await seedPixel(element, 1.2);
        assert.isAbove(ring[0] - ring[2], 40, `the halo rings the seed; drew ${ring.join(",")} beside it`);
    });
});
