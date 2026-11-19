/**
 * @file What a node draws over its face stays centered on a solid node in the 3D view, from any side.
 *
 * Stripes, a pie, a chart, an image and a glyph were drawn on a flat card at the solid's least z and never turned
 * with the camera: from the front the card sat off the sphere (its rim showed beside it), and with the camera orbited
 * 90 degrees it was seen edge-on or hidden. Each decoration is drawn here in red and green on a gray icosphere that
 * is not at the middle of the screen, from the front and with the camera orbited 90 degrees, and the red and green
 * pixels' centroid must sit within 10% of the node's screen diameter of the node's projected center.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { StaticStyle } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import { asData } from "../helpers/testSetup";

const WIDTH = 480;
const HEIGHT = 360;
/** How far the decoration's centroid may sit from the node's center, in node screen diameters. */
const TOLERANCE = 0.1;

/**
 * A two-color picture, red on the left and green on the right, as a data URL.
 * @returns The URL.
 */
function redGreenImage(): string {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, 32, 64);
    context.fillStyle = "#00ff00";
    context.fillRect(32, 0, 32, 64);
    return canvas.toDataURL("image/png");
}

const DECORATIONS: Record<string, () => StaticStyle> = {
    stripes: () => ({ "node.stripeColors": "#ff0000 #00ff00" }),
    pie: () => ({ "node.pieColors": "#ff0000 #00ff00" }),
    chart: () => ({ "node.chartValues": "2 2", "node.chartColors": "#ff0000 #00ff00" }),
    image: () => ({ "node.image": redGreenImage() }),
    glyph: () => ({ "node.glyph": "W", "node.glyphColor": "#ff0000", "node.glyphSize": 3 }),
};

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    container = undefined;
});

/**
 * Mount a decorated icosphere and a plain node beside it, in 3D.
 * @param set - The decoration's channels.
 * @returns The graph.
 */
async function mount(set: StaticStyle): Promise<Graph> {
    container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.append(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setViewMode("3d");
    await graph.setLayout("fixed", { dim: 3 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await graph.addNode(asData({ id: "B", position: { x: 5, y: 6, z: -5 } }));
    const session = graph.getSession();
    await session.styles.add({
        name: "gray",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#888888", "node.shape": "icosphere", "node.size": 3 },
    });
    await session.styles.add({ name: "decorated", target: "node", selector: { match: "ids", nodes: ["A"] }, set });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    return graph;
}

/**
 * Turn the camera about its target.
 * @param g - The graph.
 * @param yaw - How far, in radians.
 */
async function orbit(g: Graph, yaw: number): Promise<void> {
    const state = g.getCameraState();
    const target = state.target ?? { x: 0, y: 0, z: 0 };
    const position = state.position ?? { x: 0, y: 0, z: 1 };
    const radius = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
    const alpha = Math.atan2(position.z - target.z, position.x - target.x) + yaw;
    await g.setCameraState({ alpha, beta: Math.PI / 2, radius, target });
    await g.waitForStableFrame();
}

/**
 * Where node A is drawn and how wide, in readPixels coordinates (bottom row first).
 * @param g - The graph.
 * @returns Its center and its screen diameter.
 */
function nodeOnScreen(g: Graph): { x: number; y: number; diameter: number } {
    const node = g.getDataManager().getNode("A");
    assert.isDefined(node);
    const camera = g.scene.activeCamera;
    assert.isNotNull(camera);
    const width = g.engine.getRenderWidth();
    const height = g.engine.getRenderHeight();
    const viewport = camera.viewport.toGlobal(width, height);
    const transform = g.scene.getTransformMatrix();
    const center = node.mesh.getAbsolutePosition();
    const radius = node.mesh.getBoundingInfo().boundingSphere.radiusWorld;
    const up = camera.upVector.normalizeToNew().scale(radius);
    const a = Vector3.Project(center, Matrix.Identity(), transform, viewport);
    const b = Vector3.Project(center.add(up), Matrix.Identity(), transform, viewport);
    return { x: a.x, y: height - a.y, diameter: 2 * Math.hypot(b.x - a.x, b.y - a.y) };
}

/**
 * The centroid of the red and green pixels.
 * @param g - The graph.
 * @returns The centroid and how many pixels.
 */
async function decorationCentroid(
    g: Graph,
): Promise<{ x: number; y: number; count: number; redX: number; greenX: number }> {
    g.scene.render();
    const width = g.engine.getRenderWidth();
    const pixels = (await g.engine.readPixels(0, 0, width, g.engine.getRenderHeight())) as unknown as Uint8Array;
    let [sx, sy, count, redSx, redCount] = [0, 0, 0, 0, 0];
    for (let i = 0; i < pixels.length; i += 4) {
        const [r, gr, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
        const red = r > 150 && gr < 90 && b < 90;
        const green = gr > 150 && r < 90 && b < 90;
        if (red || green) {
            const p = i / 4;
            sx += p % width;
            sy += Math.floor(p / width);
            count++;
            if (red) {
                redSx += p % width;
                redCount++;
            }
        }
    }

    const greenCount = count - redCount;
    return {
        x: sx / Math.max(1, count),
        y: sy / Math.max(1, count),
        count,
        redX: redSx / Math.max(1, redCount),
        greenX: (sx - redSx) / Math.max(1, greenCount),
    };
}

/**
 * Which side each two-color decoration draws red on, as a reader sees it, so a mirrored face swaps them: stripes and
 * the image run left to right, and a pie's slices run clockwise from 12 o'clock, so its first (red) half is on the
 * right.
 */
const RED_SIDE: Readonly<Record<string, "left" | "right">> = { stripes: "left", image: "left", pie: "right" };

describe("face decorations on a solid in 3D", () => {
    for (const [name, set] of Object.entries(DECORATIONS)) {
        it(`centers ${name} on the node from the front and from 90 degrees round`, async () => {
            const g = await mount(set());
            for (const yaw of [0, Math.PI / 2]) {
                if (yaw !== 0) {
                    await orbit(g, yaw);
                }

                const at = nodeOnScreen(g);
                const drawn = await decorationCentroid(g);
                assert.isAbove(drawn.count, 0, `${name} draws at yaw ${String(yaw)}`);
                const off = Math.hypot(drawn.x - at.x, drawn.y - at.y);
                assert.isAtMost(
                    off,
                    TOLERANCE * at.diameter,
                    `${name} at yaw ${String(yaw)}: centroid ${JSON.stringify(drawn)} vs node ${JSON.stringify(at)}`,
                );
                const side = RED_SIDE[name] as "left" | "right" | undefined;
                if (side !== undefined) {
                    assert.strictEqual(
                        drawn.redX < drawn.greenX ? "left" : "right",
                        side,
                        `${name} at yaw ${String(yaw)} reads the right way round: ${JSON.stringify(drawn)}`,
                    );
                }
            }
        });
    }
});
