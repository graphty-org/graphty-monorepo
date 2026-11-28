/**
 * @file `node.outline` is drawn round the outline the node shows the camera, against its outer border.
 *
 * THE DEFECT (#10503). The ring was an ellipse (or the node's front outline) stretched along the camera's
 * right and up axes to the node's reach along them, measured from its bounding ellipsoid grown on all three
 * axes by the border. That is not the outline the camera sees: on a rolled 2D view a wide ellipse's ring stood
 * off it along the short diagonal and cut into it along the long one; a tetrahedron's, a box's and a cone's ring
 * cut across their slanted sides and stood off their corners; and a flat hexagon seen nearly edge-on, its slab
 * depth grown by the border, had its ring float far above and below it.
 *
 * WHAT IS MEASURED. One unlit red node with a blue border and a green outer border is drawn, then given a
 * yellow outline. Walking out from the node's center on screen in eight directions: the outline must not cover
 * any of the border or outer border the bare node showed, and must start right where the node's last pixel is,
 * with no background between.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const WIDTH = 640;
const HEIGHT = 480;

/** Pixels of blending allowed: border pixels lost under the ring, and background between the node and the ring. */
const SLACK = 3;

type Pixel = "fill" | "border" | "outer" | "ring" | "other";
interface Walk {
    border: number;
    outer: number;
    /** Background pixels between the node's last pixel and the ring; -1 when no ring was met. */
    gap: number;
}

const BORDERS = {
    "node.borderWidth": 0.2,
    "node.outerBorderWidth": 0.2,
    "node.outerBorderColor": "#00ff00",
};

const CASES: {
    name: string;
    mode: "2d" | "3d";
    set: Record<string, unknown>;
    camera: Record<string, unknown>;
}[] = [
    {
        name: "a wide ellipse on a rolled 2D view",
        mode: "2d",
        set: { "node.shape": "ellipse", "node.width": 4, "node.height": 2 },
        camera: { orthoLeft: -6, orthoRight: 6, orthoTop: 4.5, orthoBottom: -4.5, pan: { x: 0, y: 0 }, rotation: 0.8 },
    },
    {
        name: "a tetrahedron in 2D",
        mode: "2d",
        set: { "node.shape": "tetrahedron", "node.size": 1.5 },
        camera: { orthoLeft: -6, orthoRight: 6, orthoTop: 4.5, orthoBottom: -4.5, pan: { x: 0, y: 0 } },
    },
    {
        name: "a box seen obliquely in 3D",
        mode: "3d",
        set: { "node.shape": "box", "node.size": 3 },
        camera: { position: { x: 5, y: 5, z: -7.07 }, target: { x: 0, y: 0, z: 0 } },
    },
    {
        name: "a cone seen obliquely in 3D",
        mode: "3d",
        set: { "node.shape": "cone", "node.size": 3 },
        camera: { position: { x: 5, y: 5, z: -7.07 }, target: { x: 0, y: 0, z: 0 } },
    },
    {
        name: "a wide hexagon seen 76 degrees off its front",
        mode: "3d",
        set: { "node.shape": "hexagon", "node.width": 4, "node.height": 2 },
        camera: { position: { x: 0, y: 9.7, z: -2.43 }, target: { x: 0, y: 0, z: 0 } },
    },
];

describe("node.outline follows the outline the node shows the camera", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
        graph = undefined;
        container = undefined;
    });

    /**
     * Draw one node with a border and an outer border, under a camera.
     * @param mode - The view mode.
     * @param set - The shape channels.
     * @param camera - The camera state.
     * @returns The graph.
     */
    async function draw(
        mode: "2d" | "3d",
        set: Record<string, unknown>,
        camera: Record<string, unknown>,
    ): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        await g.setViewMode(mode);
        await g.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
        await g.setLayout("fixed", { dim: mode === "2d" ? 2 : 3 });
        await g.getSession().styles.add({
            name: "red node, blue border, green outer border",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.unlit": true,
                "node.color": "#ff0000",
                "node.size": 2,
                "node.borderColor": "#0000ff",
                ...BORDERS,
                ...set,
            },
        });
        await settle(g);
        await g.setCameraState(camera, { animate: false });
        await settle(g);
        return g;
    }

    /**
     * Wait until the graph has drawn what it was given.
     * @param g - The graph.
     */
    async function settle(g: Graph): Promise<void> {
        await operationQueueOf(g).waitForCompletion();
        await g.waitForStableFrame();
        await g.scene.whenReadyAsync();
    }

    /**
     * Walks out from the node's center on screen in eight directions.
     * @param g - The graph.
     * @returns Each walk's border and outer border pixels, and its gap before the ring.
     */
    async function walks(g: Graph): Promise<Walk[]> {
        const { engine, scene } = g;
        scene.render();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
        const camera = scene.activeCamera;
        assert.isNotNull(camera);
        const mesh = g.getNode("a")?.mesh;
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
            // rows are bottom-up as WebGL reads them
            const at = ((height - 1 - y) * width + x) * 4;
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
        const inside = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height;
        const walk = (dx: number, dy: number): Walk => {
            const counted: Walk = { border: 0, outer: 0, gap: -1 };
            let [x, y] = [x0, y0];
            let lastNode = 0;
            for (let step = 0; inside(x, y); step++) {
                const k = kind(x, y);
                if (k === "ring") {
                    counted.gap = step - lastNode - 1;
                    break;
                }
                if (k === "border" || k === "outer") {
                    counted[k]++;
                }
                if (k !== "other") {
                    lastNode = step;
                }
                x += dx;
                y += dy;
            }
            return counted;
        };
        return [walk(-1, 0), walk(1, 0), walk(0, -1), walk(0, 1), walk(-1, -1), walk(1, -1), walk(-1, 1), walk(1, 1)];
    }

    for (const { name, mode, set, camera } of CASES) {
        it(`rings ${name} against its outer border`, async () => {
            const g = await draw(mode, set, camera);
            const bare = await walks(g);
            await g.getSession().styles.add({
                name: "outlined in yellow",
                target: "node",
                selector: { match: "everything" },
                set: { "node.outline": "#ffff00" },
            });
            await settle(g);
            const outlined = await walks(g);
            const seen = `outlined ${JSON.stringify(outlined)}, bare ${JSON.stringify(bare)}`;
            for (const [i, want] of bare.entries()) {
                assert.isAbove(
                    want.border + want.outer,
                    0,
                    `walk ${String(i)} crosses the bare node's borders: ${seen}`,
                );
                for (const part of ["border", "outer"] as const) {
                    assert.isAtLeast(
                        outlined[i][part],
                        want[part] - SLACK,
                        `walk ${String(i)} ${part} covered: ${seen}`,
                    );
                }
                assert.isAtLeast(outlined[i].gap, 0, `walk ${String(i)} meets the ring: ${seen}`);
                assert.isAtMost(outlined[i].gap, SLACK, `walk ${String(i)}: background between node and ring: ${seen}`);
            }
        });
    }
});
