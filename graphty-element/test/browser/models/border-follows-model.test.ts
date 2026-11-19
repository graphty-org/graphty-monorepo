/**
 * @file A node's border is drawn round its model once the model has loaded, not round the placeholder shape drawn
 * while it loaded. Both are drawn under one style key, and the border was cached under that key alone, so the ring
 * built round the placeholder was handed back round the model until some other style change minted a new key.
 */
import { afterAll, assert, beforeAll, it } from "vitest";

import type { Graph } from "../../../src/Graph";
import type { GraphSession } from "../../../src/session";
import CLIP_MODEL_URL from "../../../stories/fixtures/models/spinning-cube.glb?url";
import { mountProbeGraph, PIXEL_CHANGE, pixelsChanged, readScene } from "../../helpers/channel-paints";

let container: HTMLElement;
let graph: Graph;
let session: GraphSession;

beforeAll(async () => {
    ({ container, graph, session } = await mountProbeGraph("3d"));
});

afterAll(() => {
    graph.dispose();
    container.remove();
});

it("rings a model with its border once the model loads, as a later repaint does", async () => {
    await session.styles.add({
        name: "model with a border",
        target: "node",
        selector: { match: "everything" },
        set: { "node.model": CLIP_MODEL_URL, "node.borderWidth": 0.3 },
    } as never);
    const loaded = await readScene(graph);

    // a style that changes nothing drawn, but makes every node paint again under a new key
    await session.styles.add({
        name: "repaint",
        target: "node",
        selector: { match: "everything" },
        set: { "node.opacity": 1 },
    } as never);
    const repainted = await readScene(graph);

    assert.isAtMost(
        pixelsChanged(loaded, repainted),
        PIXEL_CHANGE,
        "the border drawn once the model loaded is not the one a repaint draws round the model",
    );
});
