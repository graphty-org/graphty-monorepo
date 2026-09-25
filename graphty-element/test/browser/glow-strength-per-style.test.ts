/**
 * @file Two glowing styles on screen are each drawn at their own strength.
 *
 * Glow is drawn by ONE Babylon `GlowLayer` per scene. Its `intensity` belongs to the layer, and
 * `NodeEffects.applyGlowEffect` used to write the style's strength there, so the last glowing
 * style applied set the strength of every glowing node: a faint glow and a strong one drew
 * identically. This file paints a faint glow on one node and a strong one on the other and reads
 * the pixels around each.
 */

import { type InstancedMesh, Matrix, Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

const WIDTH = 480;
const HEIGHT = 360;
const FRAMES = 8;
const FRAME_MS = 10;
/**
 * The strong-to-faint glow ratio with placement cancelled out. Drawn at one strength it is exactly
 * 1. Each at its own strength it measured 2.1, not 10: the strong glow's centre saturates the 8-bit
 * glow map, so brightness grows less than the strength does.
 */
const RATIO_FLOOR = 1.5;

describe("glow strength per style", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();

        await graph.addNodes([{ id: "faint" }, { id: "strong" }]);
        // Circular, so the frame does not drift between reads.
        await graph.setLayout("circular", { scale: 0.2 });
        await graph.operationQueue.waitForCompletion();
    }, 60000);

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    async function frame(): Promise<Uint8Array> {
        await graph.operationQueue.waitForCompletion();

        for (let at = 0; at < FRAMES; at++) {
            graph.scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        const { engine } = graph;

        return (await engine.readPixels(
            0,
            0,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        )) as unknown as Uint8Array;
    }

    /**
     * Where a node lands in the frame, in readPixels coordinates (bottom row first).
     * @param id - The node.
     * @returns The pixel the node's centre projects to.
     */
    function project(id: string): { x: number; y: number } {
        const node = graph.getDataManager().getNode(id);
        assert.isDefined(node, `node ${id} exists`);
        const { engine } = graph;
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const camera = graph.scene.activeCamera;
        assert.isNotNull(camera);
        const p = Vector3.Project(
            node.mesh.getAbsolutePosition(),
            Matrix.Identity(),
            graph.scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );

        return { x: Math.round(p.x), y: Math.round(height - p.y) };
    }

    /**
     * Sum of the red and blue channels in a square around a point: the glow is magenta.
     * @param pixels - The frame.
     * @param at - The centre.
     * @param half - Half the side of the square.
     * @returns The summed brightness.
     */
    function brightness(pixels: Uint8Array, at: { x: number; y: number }, half: number): number {
        const width = graph.engine.getRenderWidth();
        const height = graph.engine.getRenderHeight();
        let total = 0;

        for (let y = at.y - half; y <= at.y + half; y++) {
            for (let x = at.x - half; x <= at.x + half; x++) {
                if (x < 0 || y < 0 || x >= width || y >= height) {
                    continue;
                }

                const offset = (y * width + x) * 4;
                total += pixels[offset] + pixels[offset + 2];
            }
        }

        return total;
    }

    /**
     * Paint a faint glow on one node and a strong one on the other, measure what each adds over
     * the baseline, then take both styles away again.
     * @param baseline - A frame with no glow.
     * @param faintId - The node given strength 0.3.
     * @param strongId - The node given strength 3.
     * @returns The glow each node adds, and the source mesh each is drawn through.
     */
    async function paint(
        baseline: Uint8Array,
        faintId: string,
        strongId: string,
    ): Promise<{ faintGlow: number; strongGlow: number; faintSource: number; strongSource: number }> {
        const faint = await session.styles.add({
            name: "faint glow",
            target: "node",
            selector: { match: "ids", nodes: [faintId] },
            set: { "node.glow": "#ff00ff", "node.glowStrength": 0.3 },
        });
        const strong = await session.styles.add({
            name: "strong glow",
            target: "node",
            selector: { match: "ids", nodes: [strongId] },
            set: { "node.glow": "#ff00ff", "node.glowStrength": 3 },
        });
        const glowing = await frame();

        const faintNode = graph.getDataManager().getNode(faintId);
        const strongNode = graph.getDataManager().getNode(strongId);
        assert.isDefined(faintNode);
        assert.isDefined(strongNode);
        // uniqueIds rather than the meshes: a failing assertion on a Babylon mesh makes chai walk
        // the whole scene graph to print it, and the page dies before the message arrives.
        const faintSource = (faintNode.mesh as InstancedMesh).sourceMesh.uniqueId;
        const strongSource = (strongNode.mesh as InstancedMesh).sourceMesh.uniqueId;

        const faintAt = project(faintId);
        const strongAt = project(strongId);
        const apart = Math.hypot(faintAt.x - strongAt.x, faintAt.y - strongAt.y);
        const half = Math.min(40, Math.floor(apart / 2) - 1);
        assert.isTrue(
            [faintAt.x, faintAt.y, strongAt.x, strongAt.y, half].every((v) => Number.isFinite(v)) && half > 4,
            `both nodes project to separate points on screen: ${JSON.stringify({ faintAt, strongAt })}`,
        );

        const faintGlow = brightness(glowing, faintAt, half) - brightness(baseline, faintAt, half);
        const strongGlow = brightness(glowing, strongAt, half) - brightness(baseline, strongAt, half);

        await session.styles.remove(strong.id);
        await session.styles.remove(faint.id);
        await graph.operationQueue.waitForCompletion();

        return { faintGlow, strongGlow, faintSource, strongSource };
    }

    it("draws a faint glow and a strong glow at different strengths", async () => {
        const baseline = await frame();
        const first = await paint(baseline, "faint", "strong");
        const swapped = await paint(baseline, "strong", "faint");

        assert.notStrictEqual(
            first.faintSource,
            first.strongSource,
            "Two glow strengths need two source meshes: Babylon keys a glow's per-mesh intensity " +
                "by the SOURCE mesh an instance is drawn through.",
        );
        for (const run of [first, swapped]) {
            assert.isAbove(run.faintGlow, 0, "the faint glow draws something");
        }

        // Each node is measured once at each strength, so where a node sits in the frame (one
        // window may be clipped by the edge) cancels out of the geometric mean. Drawn at one
        // strength, both runs' ratios are reciprocal and the mean is exactly 1.
        const ratio = Math.sqrt((first.strongGlow / first.faintGlow) * (swapped.strongGlow / swapped.faintGlow));
        assert.isAbove(
            ratio,
            RATIO_FLOOR,
            `A strength of 3 added ${String(ratio)}x what a strength of 0.3 added (placement ` +
                `cancelled): two glowing styles are being drawn at one strength. ${JSON.stringify({ first, swapped })}`,
        );
    });

    it("draws a glow at its own strength after the strength was raised and lowered again", async () => {
        const baseline = await frame();
        const at = project("faint");
        const half = 20;
        const set = (strength: number): { "node.glow": string; "node.glowStrength": number } => ({
            "node.glow": "#ff00ff",
            "node.glowStrength": strength,
        });
        const layer = await session.styles.add({
            name: "slider glow",
            target: "node",
            selector: { match: "ids", nodes: ["faint"] },
            set: set(0.1),
        });
        const fresh = brightness(await frame(), at, half) - brightness(baseline, at, half);

        // The 100 source mesh stays cached with no instances once the node leaves it. If it
        // still counted toward the layer's strength, 0.1 would be 1/1000 of it and round to 0.
        await session.styles.update(layer.id, { set: set(100) });
        await frame();
        await session.styles.update(layer.id, { set: set(0.1) });
        const after = brightness(await frame(), at, half) - brightness(baseline, at, half);
        await session.styles.remove(layer.id);

        assert.isAbove(fresh, 0, "a glow of 0.1 draws something");
        assert.approximately(
            after / fresh,
            1,
            0.25,
            `a glow of 0.1 added ${String(fresh)} fresh and ${String(after)} after a trip to 100`,
        );
    });
});
