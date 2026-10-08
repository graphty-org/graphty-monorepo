/**
 * @file A graph's arrowheads are drawn in bulk, and still look like themselves (issue #25).
 *
 * Every arrowhead used to be its own mesh with its own shader material, so the default edge
 * style -- which draws a head on every edge -- cost one extra draw call per edge per frame.
 * Now a scene keeps one mesh per arrow shape and each head is a THIN instance of it, with its
 * direction, size and colour as per-instance attributes. This file checks both halves on a real
 * WebGL engine: the heads cost a draw call per shape rather than per edge, and heads of two
 * different colours in that one call still reach the screen in their own colours.
 */
import { Matrix, SceneInstrumentation, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** How many nodes sit on the circle. */
const NODE_COUNT = 12;

/** Two edges leave every node, so there are this many edges, and heads. */
const EDGE_COUNT = NODE_COUNT * 2;

/** How wide the canvas is. */
const WIDTH = 640;

/** How tall it is. */
const HEIGHT = 480;

/** How many frames to render before reading one. */
const FRAMES = 8;

/** How long to leave between them. */
const FRAME_MS = 10;

/** How many pixels of a colour must be on screen before it counts as drawn. */
const ENOUGH = 20;

describe("arrowheads are drawn in bulk", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({ id: `n${String(i)}` }));
        const edges = nodes.flatMap((_, i) => [
            { src: `n${String(i)}`, dst: `n${String((i + 1) % NODE_COUNT)}`, group: "a" },
            { src: `n${String(i)}`, dst: `n${String((i + 5) % NODE_COUNT)}`, group: "b" },
        ]);
        await graph.addNodes(nodes);
        await graph.addEdges(edges);

        // A fixed arrangement, so two frames of an unchanged graph are the same picture.
        await graph.setLayout("circular", { scale: 0.5 });
        await operationQueueOf(graph).waitForCompletion();

        // Grey nodes and lines, so the only red and blue on screen are the heads.
        await session.styles.add({
            name: "grey graph, red heads",
            target: "edge",
            selector: { match: "everything" },
            set: {
                "edge.color": "#404040",
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 5,
                "edge.arrowHeadColor": "#FF0000",
            },
        });
        await session.styles.add({
            name: "grey nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#404040" },
        });
        await session.styles.add({
            name: "blue heads on group b",
            target: "edge",
            selector: { match: "expression", where: "data.group == 'b'" },
            set: { "edge.arrowHeadColor": "#0000FF" },
        });
        await frame();
    }, 60000);

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /** Let the last repaint reach the scene and render a few frames. */
    async function frame(): Promise<void> {
        await operationQueueOf(graph).waitForCompletion();

        for (let at = 0; at < FRAMES; at++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }
    }

    /**
     * Render one frame and count its draw calls.
     * @returns How many draw calls the frame made
     */
    function drawCalls(): number {
        const counter = new SceneInstrumentation(graph.scene).drawCallsCounter;
        counter.fetchNewFrame();
        graph.scene.render();
        return counter.current;
    }

    /**
     * Count the pixels on screen near a pure colour.
     * @param want - Which channel is lit: 0 red, 2 blue
     * @returns How many pixels are that colour
     */
    async function pixelsOf(want: 0 | 2): Promise<number> {
        const { engine } = graph;
        const pixels = (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
        let count = 0;

        for (let at = 0; at < pixels.length; at += 4) {
            const lit = pixels[at + want];
            const others = pixels[at] + pixels[at + 1] + pixels[at + 2] - lit;
            if (lit > 200 && others < 80) {
                count++;
            }
        }

        return count;
    }

    it("costs a draw call per arrow shape, not one per edge", async () => {
        assert.equal(graph.getDataManager().edges.size, EDGE_COUNT, "the graph must actually load");

        const withHeads = drawCalls();

        await session.styles.add({
            name: "no heads",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "none" },
        });
        await frame();
        const withoutHeads = drawCalls();

        // Before the batching this difference was EDGE_COUNT: one call for every head.
        assert.isAtMost(
            withHeads - withoutHeads,
            2,
            `${String(EDGE_COUNT)} heads cost ${String(withHeads - withoutHeads)} draw calls`,
        );
    });

    /**
     * Count the blue pixels in a square around where the world origin lands on screen.
     *
     * Nothing in this graph sits at the origin -- the nodes are on a circle round it and no chord
     * crosses it -- so a head drawn there is one that should not be drawn at all.
     * @param half - Half the square's side, in pixels.
     * @returns How many blue pixels the square holds.
     */
    async function bluePixelsAtOrigin(half: number): Promise<number> {
        const { engine, scene } = graph;
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const camera = scene.activeCamera;
        assert(camera, "the scene has a camera");
        const onScreen = Vector3.Project(
            Vector3.Zero(),
            Matrix.Identity(),
            scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );
        // readPixels counts rows from the bottom; Project counts them from the top.
        const x = Math.round(onScreen.x) - half;
        const y = height - Math.round(onScreen.y) - half;
        const pixels = (await engine.readPixels(x, y, half * 2, half * 2)) as unknown as Uint8Array;
        let count = 0;

        for (let at = 0; at < pixels.length; at += 4) {
            if (pixels[at + 2] > 200 && pixels[at] + pixels[at + 1] < 80) {
                count++;
            }
        }

        return count;
    }

    it("draws nothing for a head its edge gave up", async () => {
        // Group b's heads change shape, so each of those edges hands its "normal" slot back to a
        // batch group a's heads keep alive. A handed-back slot holds a zero matrix, and the
        // billboard shader read that as "a full-size head at the world origin" -- which in the
        // 3D all-arrows story is where the tee edge's target node sits, so the tee drew a
        // stray arrowhead beside it.
        await session.styles.add({
            name: "tee heads on group b",
            target: "edge",
            selector: { match: "expression", where: "data.group == 'b'" },
            set: { "edge.arrowHead": "tee" },
        });
        await frame();

        for (const edge of graph.getDataManager().edges.values()) {
            const caps = edge.drawnCaps.filter((cap) => cap.end === "arrowHead").map((cap) => cap.name);
            const wanted = edge.data.group === "b" ? "filled-tee-arrow" : "filled-triangle-arrow";
            assert.deepEqual(caps, [wanted], `edge ${edge.id} draws one head, ${wanted}`);
        }

        assert.isAbove(await pixelsOf(2), ENOUGH, "the tee heads are on screen");
        assert.equal(await bluePixelsAtOrigin(40), 0, "a given-up head is drawn at the origin");
    });

    it("draws heads of two colours in one batch, each in its own colour", async () => {
        assert.isAbove(await pixelsOf(0), ENOUGH, "no red heads on screen");
        assert.isAbove(await pixelsOf(2), ENOUGH, "no blue heads on screen");
    });
});
