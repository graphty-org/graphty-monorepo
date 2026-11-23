/**
 * @file Each style feature draws its nodes and edges in the same places on both render paths, and
 * both paths frame the same graph the same way.
 *
 * The graph is the lazy fixture: eight nodes in disjoint parts (two pairs, a triangle and a lone
 * node), undirected and arrowed edges, loaded into an element already drawn, so on `"batched"` most
 * rows have no Node or Edge object (asserted before each look). For each look a layer sets, the
 * canvas is read on `"objects"` and on `"batched"`, and the ink is sorted by hue into a node mask
 * (blue), an edge mask (magenta) and a mask for a second node color (green). Masks are compared,
 * not pixels: a pixel of ink on one path counts as missing when the other path has no ink of the
 * same kind within {@link REACH} pixels, which forgives antialiasing and catches an edge drawn
 * elsewhere, a node hidden or a different node on top.
 *
 * Besides the style looks: positions set before the first frame, a hidden node with plain edges,
 * a Graphviz-routed layout and two overlapping nodes of different colors. The motion check switches
 * the fixture to a seeded ngraph simulation and reads the {@link MOVING_FRAMES}th frame that moves
 * a node, inside that frame (which only WebGL keeps), so edges that lag their moving nodes show; two
 * objects loads are compared first, so a difference is the path's. The framing check reads the
 * public camera state after the graph settles.
 *
 * How to run, from graphty-element (part of the render-parity project, the full run's
 * graphty-element-render-parity-* shards):
 *   npx vitest run --project=render-parity test/render-parity/feature-matrix.test.ts
 */

import "../../src/graphty-element";
import "../../src/layout/index";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { blue, magenta } from "../helpers/drawn-invariants";
import { type CanvasFrame, png, readCanvas } from "../helpers/whole-canvas";

type Path = "objects" | "batched";
type View = "2d" | "3d";

const N = 8;
const IDS = Array.from({ length: N }, (_, i) => String(i));
/** Two pairs, a triangle, a lone node; plain and arrowed edges. */
const EDGES = [
    { source: "0", target: "1", directed: false },
    { source: "2", target: "3" },
    { source: "4", target: "5", directed: false },
    { source: "5", target: "6", directed: false },
    { source: "6", target: "4" },
];
/** The second node color, for the overlap case. */
const GREEN = "#20c040";

/** How far, in canvas pixels, ink on one path may sit from the same ink on the other. */
const REACH = 2;
/** The share of a mask's ink that may go unmatched: a few antialiased pixels. */
const MISS_SHARE = 0.02;

/**
 * Where node i stands: on a ring of radius 4.
 * @param i - The node.
 * @returns The position.
 */
function onRing(i: number): { x: number; y: number; z: number } {
    const a = (2 * Math.PI * i) / N;
    return { x: 4 * Math.cos(a), y: 4 * Math.sin(a), z: 0 };
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** What one case does to the fixture. */
interface Case {
    /** A node layer's values, added after the load. */
    node?: Record<string, unknown>;
    /** An edge layer's values, added after the load. */
    edge?: Record<string, unknown>;
    /** Runs after the data is added and before the first settled frame. */
    after?: (element: Graphty) => Promise<void>;
    /** Positions to load the nodes at, instead of the ring. */
    at?: (i: number) => { x: number; y: number; z: number };
    /** Whether the case builds every row on purpose (Graphviz routes read Edge objects). */
    builds?: boolean;
}

/**
 * An element already drawn, then given the fixture, as the graphty app loads a file.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param look - The case.
 * @returns The element, settled.
 */
async function mount(path: Path, view: View, look: Case): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "Node ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", "node.size": 0.6 },
    });
    await element.session.styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#ff00ff", "edge.width": 4 },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    await element.session.data.addNodes(IDS.map((id, i) => ({ id, position: (look.at ?? onRing)(i) })));
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await look.after?.(element);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    if (path === "batched" && look.builds !== true) {
        assert.isBelow(dataManagerInternals.nodesBuilt(element.graph.getDataManager()), N, "some rows have no Node");
    }

    if (look.node !== undefined) {
        await element.session.styles.add({
            name: "Look",
            target: "node",
            selector: { match: "everything" },
            set: look.node,
        });
    }

    if (look.edge !== undefined) {
        await element.session.styles.add({
            name: "Look",
            target: "edge",
            selector: { match: "everything" },
            set: look.edge,
        });
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Whether a pixel is the second node color.
 * @param p - The pixel.
 * @returns True when green leads red and blue.
 */
function green(p: readonly number[]): boolean {
    return p[1] > p[0] + 60 && p[1] > p[2] + 40;
}

const KINDS = { node: blue, edge: magenta, green } as const;
type Kind = keyof typeof KINDS;

/**
 * The pixels of one kind of ink.
 * @param frame - The canvas.
 * @param kind - Which ink.
 * @returns One flag per pixel.
 */
function mask(frame: CanvasFrame, kind: Kind): Uint8Array {
    const test = KINDS[kind];
    const out = new Uint8Array(frame.width * frame.height);
    for (let i = 0; i < out.length; i++) {
        const p = frame.pixels.subarray(i * 4, i * 4 + 3);
        out[i] = test(p as unknown as readonly number[]) ? 1 : 0;
    }

    return out;
}

/**
 * How many inked pixels of one mask have no ink of the other within {@link REACH}.
 * @param one - The mask read.
 * @param other - The mask looked in.
 * @param width - The canvas width.
 * @returns The count, and the first few such pixels.
 */
function unmatched(one: Uint8Array, other: Uint8Array, width: number): { count: number; ink: number; first: string[] } {
    const height = one.length / width;
    let count = 0;
    let ink = 0;
    const first: string[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (one[y * width + x] === 0) {
                continue;
            }

            ink++;
            let found = false;
            for (let dy = -REACH; dy <= REACH && !found; dy++) {
                for (let dx = -REACH; dx <= REACH && !found; dx++) {
                    const X = x + dx;
                    const Y = y + dy;
                    found = X >= 0 && Y >= 0 && X < width && Y < height && other[Y * width + X] === 1;
                }
            }

            if (!found) {
                count++;
                if (first.length < 5) {
                    first.push(`(${String(x)},${String(height - 1 - y)})`);
                }
            }
        }
    }

    return { count, ink, first };
}

/**
 * Assert two pictures put each kind of ink in the same places.
 * @param objects - The objects picture.
 * @param batched - The batched picture.
 * @param kinds - The inks to compare.
 * @param what - The case, for the message.
 */
function assertSameInk(objects: CanvasFrame, batched: CanvasFrame, kinds: readonly Kind[], what: string): void {
    const problems: string[] = [];
    for (const kind of kinds) {
        const a = mask(objects, kind);
        const b = mask(batched, kind);
        for (const [from, one, other] of [
            ["objects", a, b],
            ["batched", b, a],
        ] as const) {
            const { count, ink, first } = unmatched(one, other, objects.width);
            if (count > Math.max(4, ink * MISS_SHARE)) {
                problems.push(
                    `${String(count)} of ${String(ink)} ${kind} pixels on ${from} have none on the other path near them, first at ${first.join(" ")} (y down)`,
                );
            }
        }
    }

    if (problems.length > 0) {
        console.log(`${what}: objects frame (y as read) ${png(objects)}`);
        console.log(`${what}: batched frame (y as read) ${png(batched)}`);
    }

    assert.equal(problems.length, 0, `${what}: the paths draw different ink: ${problems.join("; ")}`);
}

/** Each look a layer sets, with what the batched path does with it (design/rendering/row-renderer.md). */
const LOOKS: Readonly<Record<string, Case>> = {
    plain: {},
    "node.size": { node: { "node.size": 1.2 } },
    "node.shape box": { node: { "node.shape": "box" } },
    "node.shape star": { node: { "node.shape": "star" } },
    "node.shape rectangle": { node: { "node.shape": "rectangle" } },
    "node.opacity": { node: { "node.opacity": 0.5 } },
    "node.wireframe": { node: { "node.wireframe": true } },
    "node.flat": { node: { "node.flat": true } },
    "node.unlit": { node: { "node.unlit": true } },
    "node.label": { node: { "node.label": "AB" } },
    "node.border": { node: { "node.borderWidth": 0.1, "node.borderColor": "#2040ff" } },
    "edge.width": { edge: { "edge.width": 8 } },
    "edge.opacity": { edge: { "edge.opacity": 0.5 } },
    "edge.arrowHead none": { edge: { "edge.arrowHead": "none" } },
    "edge.arrowHead normal": { edge: { "edge.arrowHead": "normal" } },
    "edge.arrowTail normal": { edge: { "edge.arrowTail": "normal" } },
    "edge.curvature": { edge: { "edge.curvature": true } },
    "edge.style dash": { edge: { "edge.style": "dash" } },
    "edge.route arc": { edge: { "edge.route": "arc" } },
    "edge.bends": { edge: { "edge.bends": "0.5,0.5" } },
    "edge.nodeGap": { edge: { "edge.nodeGap": 0.5 } },
    "edge.label": { edge: { "edge.label": "e" } },
};

/** The cases that are not one style look. */
const SPECIAL: Readonly<Record<string, Case & { view?: View; kinds?: readonly Kind[] }>> = {
    // Positions written before the first settled frame must be the ones drawn (the audit: overwritten on batched).
    "positions.set before the first frame": {
        after: async (element) => {
            await element.session.positions.set(
                IDS.map((id, i) => ({ id, x: 6 * Math.cos(i), y: 3 * Math.sin(2 * i), z: 0 })),
            );
        },
    },
    // A hidden node takes only its own ink away, and the plain edges touching it as the objects path does.
    "node.visible false with plain edges": {
        edge: { "edge.arrowHead": "none" },
        after: async (element) => {
            await element.session.styles.add({
                name: "Hidden",
                target: "node",
                selector: { match: "ids", nodes: ["0", "4"] },
                set: { "node.visible": false },
            } as never);
        },
    },
    // Graphviz routes edges as splines; the batched path must draw the routes, not straight lines.
    "Graphviz dot layout": {
        view: "2d",
        builds: true,
        after: async (element) => {
            await element.graph.setLayout("graphviz-dot");
        },
    },
    // Two nodes on top of each other: the same node is in front on both paths.
    "overlapping nodes": {
        at: (i) =>
            [
                { x: 0, y: 0, z: 0 },
                { x: 0.3, y: 0.2, z: 0 },
            ][i] ?? onRing(i),
        node: {},
        kinds: ["node", "edge", "green"],
        after: async (element) => {
            await element.session.styles.add({
                name: "Second color",
                target: "node",
                selector: { match: "ids", nodes: ["1"] },
                set: { "node.color": GREEN },
            } as never);
        },
    },
};

/**
 * Draw a case on both paths and read both canvases.
 * @param view - 2D or 3D.
 * @param look - The case.
 * @returns Both pictures.
 */
async function bothPaths(view: View, look: Case): Promise<Record<Path, CanvasFrame>> {
    const objects = await mount("objects", view, look);
    const objectsFrame = await readCanvas(objects.graph);
    objects.remove();
    const batched = await mount("batched", view, look);
    assert.equal(batched.graph.renderPath, "batched");
    return { objects: objectsFrame, batched: await readCanvas(batched.graph) };
}

describe.each(["3d", "2d"] as const)("feature ink on both paths, %s", (view) => {
    it.for(Object.entries(LOOKS))("%s", async ([name, look]) => {
        const frames = await bothPaths(view, look);
        assertSameInk(frames.objects, frames.batched, ["node", "edge"], `${name} in ${view}`);
    });
});

describe("special cases on both paths", () => {
    it.for(Object.entries(SPECIAL))("%s", async ([name, look]) => {
        const view = look.view ?? "3d";
        const frames = await bothPaths(view, look);
        assertSameInk(frames.objects, frames.batched, look.kinds ?? ["node", "edge"], `${name} in ${view}`);
    });
});

/** How many moving frames into the simulation the picture is read: before it settles (about 30). */
const MOVING_FRAMES = 8;

/**
 * Switch the fixture to a seeded simulation and read the canvas inside the Nth frame drawn after.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param edges - The edge layer's values.
 * @returns The frame.
 */
async function moving(path: Path, view: View, edges: Record<string, unknown>): Promise<CanvasFrame> {
    const element = await mount(path, view, { edge: edges });
    // The camera's re-frame is timed, not counted in frames; held still, the picture moves only with the layout.
    element.autoFrame = false;
    await element.updateComplete;
    const scene = element.graph.getScene();
    const { engine } = element.graph;
    const read = new Promise<CanvasFrame>((resolve) => {
        // Counted in frames that moved a node, not frames drawn: a browser may draw a frame no step moved.
        let moved = 0;
        let last = "";
        const observer = scene.onAfterRenderObservable.add(() => {
            const at = IDS.map((id) => {
                const p = element.nodeScreenPosition(id);
                return p === undefined ? "-" : `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
            }).join(" ");
            if (at === last) {
                return;
            }

            const first = last === "";
            last = at;
            if (first) {
                return;
            }

            moved++;
            if (moved < MOVING_FRAMES) {
                return;
            }

            scene.onAfterRenderObservable.remove(observer);
            const width = engine.getRenderWidth();
            const height = engine.getRenderHeight();
            void engine.readPixels(0, 0, width, height).then((pixels) => {
                resolve({ pixels: pixels as Uint8Array, width, height });
            });
        });
    });
    await element.graph.setLayout("ngraph", { seed: 42, dim: view === "2d" ? 2 : 3 });
    const frame = await read;
    element.remove();
    return frame;
}

describe.each(["3d", "2d"] as const)("a seeded simulation part way through its run, %s", (view) => {
    it.for([
        ["plain edges", { "edge.arrowHead": "none" }],
        ["arrowed edges", {}],
        ["curved edges", { "edge.curvature": true }],
    ] as const)("%s", async ([name, edges]) => {
        const objects = await moving("objects", view, edges);
        const again = await moving("objects", view, edges);
        assertSameInk(objects, again, ["node", "edge"], `${name} moving in ${view}, two objects loads`);
        const batched = await moving("batched", view, edges);
        assertSameInk(objects, batched, ["node", "edge"], `${name} moving in ${view}`);
    });
});

describe("framing", () => {
    // Auto-frame after a load puts the camera at the same place on both paths: the paths measure the
    // same drawn extent of the same graph.
    it.for(["3d", "2d"] as const)("frames the fixture the same on both paths in %s", async (view) => {
        const states: ReturnType<Graphty["getCameraState"]>[] = [];
        for (const path of ["objects", "batched"] as const) {
            const element = await mount(path, view, {});
            states.push(element.getCameraState());
            element.remove();
        }

        const [objects, batched] = states;
        const numbers = (state: ReturnType<Graphty["getCameraState"]>): Record<string, number> => {
            const out: Record<string, number> = {};
            for (const [key, value] of Object.entries(state)) {
                if (typeof value === "number") {
                    out[key] = value;
                } else if (typeof value === "object" && value !== null) {
                    for (const [axis, v] of Object.entries(value as Record<string, unknown>)) {
                        if (typeof v === "number") {
                            out[`${key}.${axis}`] = v;
                        }
                    }
                }
            }

            return out;
        };
        const a = numbers(objects);
        const b = numbers(batched);
        assert.deepEqual(Object.keys(b).sort(), Object.keys(a).sort(), "the same camera fields");
        const scale = Math.max(1, ...Object.values(a).map(Math.abs));
        const off = Object.keys(a).filter((key) => Math.abs(a[key] - b[key]) > 0.01 * scale);
        assert.equal(
            off.length,
            0,
            `the camera after settling differs between objects and batched in ${view}: ${off.map((key) => `${key} ${String(a[key])} vs ${String(b[key])}`).join("; ")}`,
        );
    });
});
