/**
 * @file A switch from 3D to 2D under the default force layout flattens the settled 3D drawing: the
 * first frame drawn in 2D shows every node at its 3D X and Y on the Z = 0 plane, at about the size
 * it was drawn in 3D -- on both render paths (issue #9279).
 *
 * The 2D engine used to place its bodies from the seed, within half a spring length of the origin,
 * and spend its pre-steps from there; the camera framed that jumble, so the canvas filled with
 * giant nodes until the 2D layout spread out again. Read on the first frame the 2D camera draws,
 * from its pixels and from `nodeScreenPosition`, never after the layout has moved on.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

/** A small tree: enough nodes that a jumble round the origin and the spread-out drawing differ. */
const N = 40;
const IDS = Array.from({ length: N }, (_, i) => String(i));
const EDGES = IDS.slice(1).map((id, i) => ({ source: String(Math.floor(i / 3)), target: id }));

/** How far from the flattened point a node may be drawn, in CSS pixels: rounding. */
const REACH = 1;

/**
 * How much bigger or smaller a node may be drawn in 2D than in 3D. The 3D camera has perspective, so
 * nodes there differ in size by depth and the 2D camera frames the flattened extent its own way; the
 * jumble drew them about seven times as large.
 */
const SIZE_RATIO = 2;

/** The limits the graphty app sets under its Cosmograph-inspired experiment, where #9279 was seen. */
const COSMOGRAPH_LIMITS = {
    renderCeiling: 1_000_000,
    edgesDrawn: 1_000_000,
    objectRows: 1_000_000,
    objectEdges: 1_000_000,
};

afterEach(() => {
    document.body.replaceChildren();
});

/** What the first 2D frame showed. */
interface FirstFrame {
    /** Each node's drawn position, from the public API. */
    readonly drawn: Map<string, { x: number; y: number; radius: number } | undefined>;
    /** Where each node's flattened 3D position projects through the 2D camera. */
    readonly expected: Map<string, { x: number; y: number }>;
    /** The frame's pixels, read before anything else drew. */
    readonly pixels: Promise<ArrayBufferView>;
    readonly width: number;
    readonly height: number;
}

describe.each([
    { path: "objects", limits: false },
    { path: "batched", limits: false },
    { path: "batched", limits: true },
] as const)("a 3D to 2D switch on the $path path (app limits: $limits)", ({ path, limits }) => {
    it("draws the settled 3D layout flattened on the first 2D frame, at the size it was", async () => {
        const element: Graphty = document.createElement("graphty-element");
        element.renderer = "webgl";
        element.renderPath = path;
        if (limits) {
            element.limits = COSMOGRAPH_LIMITS;
        }
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "400px";
        document.body.appendChild(element);
        await element.updateComplete;
        await element.setViewMode("3d");
        await element.session.styles.add({
            name: "Node ink",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#2040ff" },
        });
        await element.waitForStableFrame();
        // Loaded into an element already drawn, as a file loads in the app: on the batched path
        // rows are stored with no Node.
        await element.session.data.addNodes(IDS.map((id) => ({ id })));
        await element.session.data.addEdges(EDGES);
        await element.graph.setLayout("ngraph", { seed: 7 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();

        const settled = new Map(IDS.map((id) => [id, element.session.positions.get(id)]));
        const sizes = new Map(IDS.map((id) => [id, element.nodeScreenPosition(id)?.radius]));
        for (const [id, at] of settled) {
            assert.isDefined(at, `node ${id} is placed in 3D`);
        }
        assert.isTrue(
            [...settled.values()].some((at) => Math.abs(at?.z ?? 0) > 1),
            "the 3D layout uses its depth, so there is a Z to flatten",
        );

        const manager = element.graph.getDataManager();
        const built = dataManagerInternals.nodesBuilt(manager);
        const { engine } = element.graph;
        const scene = element.graph.getScene();
        let first: FirstFrame | undefined;
        const observer = scene.onAfterRenderObservable.add(() => {
            if (first !== undefined || !element.graph.is2D()) {
                return;
            }

            const width = engine.getRenderWidth();
            const height = engine.getRenderHeight();
            first = {
                // Started inside the frame, so it reads this frame's buffer.
                pixels: engine.readPixels(0, 0, width, height),
                width,
                height,
                drawn: new Map(IDS.map((id) => [id, element.nodeScreenPosition(id)])),
                expected: new Map(
                    IDS.map((id) => {
                        const at = settled.get(id) ?? { x: 0, y: 0, z: 0 };
                        return [id, element.worldToScreen({ x: at.x, y: at.y, z: 0 })];
                    }),
                ),
            };
        });
        try {
            await element.setViewMode("2d");
            await element.waitForStableFrame();
        } finally {
            scene.onAfterRenderObservable.remove(observer);
        }

        assert.isDefined(first, "a frame was drawn in 2D");
        // Flattening the rows stored with no Node builds none for them.
        assert.strictEqual(dataManagerInternals.nodesBuilt(manager), built, "the switch built no Node");
        const frame = first;
        const pixels = (await frame.pixels) as Uint8Array;
        const css = engine.getRenderingCanvas()?.clientWidth ?? frame.width;
        const scale = css === 0 ? 1 : frame.width / css;
        const misplaced: string[] = [];
        const resized: string[] = [];
        const unpainted: string[] = [];
        for (const id of IDS) {
            const drawn = frame.drawn.get(id);
            const expected = frame.expected.get(id);
            const before = sizes.get(id);
            if (drawn === undefined || expected === undefined) {
                misplaced.push(`${id} not drawn`);
                continue;
            }

            if (Math.hypot(drawn.x - expected.x, drawn.y - expected.y) > REACH) {
                misplaced.push(
                    `${id} at ${drawn.x.toFixed(1)},${drawn.y.toFixed(1)} not ${expected.x.toFixed(1)},${expected.y.toFixed(1)}`,
                );
            }

            if (before === undefined || drawn.radius > before * SIZE_RATIO || drawn.radius < before / SIZE_RATIO) {
                resized.push(`${id} radius ${drawn.radius.toFixed(1)} after ${String(before?.toFixed(1))}`);
            }

            // The node's blue at the flattened point, read off the frame (WebGL counts rows from the bottom).
            const px = Math.round(expected.x * scale);
            const py = frame.height - Math.round(expected.y * scale) - 1;
            const i = (py * frame.width + px) * 4;
            const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
            if (!(b > r + 60 && b > g + 60)) {
                unpainted.push(`${id} pixel ${String(r)},${String(g)},${String(b)}`);
            }
        }

        assert.deepEqual(misplaced, [], "nodes drawn away from their flattened 3D position on the first 2D frame");
        assert.deepEqual(resized, [], "nodes drawn at another size on the first 2D frame");
        assert.deepEqual(unpainted, [], "no node ink at a node's flattened position on the first 2D frame");
        for (const id of IDS) {
            const at = element.session.positions.get(id);
            assert.strictEqual(at?.z, 0, `node ${id} is on the plane in 2D`);
        }
    });
});
