/**
 * @file `node.outline` is drawn outside a node's border and outer border, never over them.
 *
 * THE DEFECT (#10426). The ring was sized from the fill alone, from 0.9 to 1.35 of its half-extent,
 * and drawn in front of the node: an outside border (1.0 to 1.5 radii) was covered from its inner
 * edge outward, all of it at the long ends of an elongated node, and an inside or centered border
 * lost its outer tenth.
 *
 * WHAT IS MEASURED. Two identical unlit red nodes with a blue border and a green outer border; only
 * node "a" has a yellow outline. Walking out from each node's center on screen in four directions,
 * the blue and green pixels on node "a"'s walk must be as many as on node "b"'s (blending aside).
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const WIDTH = 640;
const HEIGHT = 360;

/** Pixels of blending allowed between the two walks' border runs. */
const SLACK = 2;

type Pixel = "fill" | "border" | "outer" | "ring" | "other";
type Runs = Record<"border" | "outer", number>;

const CASES: { name: string; set: Record<string, unknown> }[] = [
    { name: "a capsule with an outside border", set: { "node.shape": "capsule", "node.borderWidth": 0.45 } },
    {
        name: "a wide ellipse with an outside border",
        set: { "node.shape": "ellipse", "node.width": 4, "node.height": 2, "node.borderWidth": 0.45 },
    },
    {
        name: "a sphere with an inside border",
        set: { "node.shape": "sphere", "node.borderWidth": 0.3, "node.borderPosition": "inside" },
    },
    {
        name: "a sphere with a centered border",
        set: { "node.shape": "sphere", "node.borderWidth": 0.3, "node.borderPosition": "center" },
    },
    {
        name: "a sphere with an outer border",
        set: {
            "node.shape": "sphere",
            "node.borderWidth": 0.2,
            "node.outerBorderWidth": 0.2,
            "node.outerBorderColor": "#00ff00",
        },
    },
];

describe("node.outline around a node with a border", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
        graph = undefined;
        container = undefined;
    });

    /**
     * Draw node "a" (outlined) and node "b" (not), and two corners that set the framing.
     * @param mode - The view mode.
     * @param set - The shape and border channels.
     * @returns The graph.
     */
    async function draw(mode: "2d" | "3d", set: Record<string, unknown>): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        await g.setViewMode(mode);
        await g.addNodes([
            { id: "a", position: { x: -6, y: 0, z: 0 } },
            { id: "b", position: { x: 6, y: 0, z: 0 } },
            { id: "c1", position: { x: -14, y: -7, z: 0 } },
            { id: "c2", position: { x: 14, y: 7, z: 0 } },
        ]);
        await g.setLayout("fixed", { dim: mode === "2d" ? 2 : 3 });
        const { styles } = g.getSession();
        await styles.add({
            name: "red nodes, blue border",
            target: "node",
            selector: { match: "everything" },
            set: { "node.unlit": true, "node.color": "#ff0000", "node.size": 2, "node.borderColor": "#0000ff", ...set },
        });
        await styles.add({
            name: "node a outlined in yellow",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.outline": "#ffff00" },
        });
        await operationQueueOf(g).waitForCompletion();
        await g.waitForStableFrame();
        await g.scene.whenReadyAsync();
        return g;
    }

    /**
     * The border and outer border pixels on walks out from a node's center on screen.
     * @param g - The graph.
     * @param id - The node.
     * @returns The runs per direction.
     */
    async function runs(g: Graph, id: string): Promise<Runs[]> {
        const { engine, scene } = g;
        scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const mesh = g.getNode(id)?.mesh;
        assert.isOk(mesh);
        const s = Vector3.Project(
            mesh.getAbsolutePosition(),
            Matrix.Identity(),
            scene.getTransformMatrix(),
            camera.viewport.toGlobal(width, height),
        );
        const x0 = Math.round(s.x);
        const y0 = Math.round(height - s.y);
        const kind = (x: number, y: number): Pixel => {
            const at = (y * width + x) * 4;
            const [r, gr, b] = [pixels[at], pixels[at + 1], pixels[at + 2]];
            if (r > 200 && gr < 80 && b < 80) {
                return "fill";
            }
            if (b > 150 && r < 80 && gr < 80) {
                return "border";
            }
            if (gr > 150 && r < 80 && b < 80) {
                return "outer";
            }
            return r > 150 && gr > 150 && b < 100 ? "ring" : "other";
        };
        const inside = (x: number, y: number): boolean => x > 0 && y > 0 && x < width - 1 && y < height - 1;
        const walk = (dx: number, dy: number): Runs => {
            const counted: Runs = { border: 0, outer: 0 };
            let [x, y] = [x0, y0];
            let quiet = 0;
            // out past the fill, counting border pixels, until the ring or a stretch of background
            while (inside(x, y) && quiet < 4) {
                const k = kind(x, y);
                if (k === "ring") {
                    break;
                }
                if (k === "border" || k === "outer") {
                    counted[k]++;
                }
                quiet = k === "other" ? quiet + 1 : 0;
                x += dx;
                y += dy;
            }
            return counted;
        };
        return [walk(-1, 0), walk(1, 0), walk(0, -1), walk(0, 1)];
    }

    for (const mode of ["2d", "3d"] as const) {
        for (const { name, set } of CASES) {
            it(`leaves the border of ${name} uncovered in ${mode}`, async () => {
                const g = await draw(mode, set);
                const outlined = await runs(g, "a");
                const bare = await runs(g, "b");
                for (const [i, want] of bare.entries()) {
                    for (const part of ["border", "outer"] as const) {
                        assert.isAtLeast(
                            outlined[i][part],
                            want[part] - SLACK,
                            `walk ${String(i)} ${part}: outlined ${JSON.stringify(outlined)}, bare ${JSON.stringify(bare)}`,
                        );
                    }
                    assert.isAbove(
                        want.border,
                        0,
                        `walk ${String(i)} crosses node b's border: ${JSON.stringify(bare)}`,
                    );
                }
            });
        }
    }
});
