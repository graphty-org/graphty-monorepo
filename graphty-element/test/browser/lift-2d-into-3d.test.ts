/**
 * @file Switching a settled 2D force drawing to 3D lifts it into depth instead of laying it out
 * again (issue #9372).
 *
 * The 3D force engine used to be built with fresh bodies, placed by ngraph near the origin: for a
 * few seconds the canvas showed a ball, which then spread into a different drawing, and the reader
 * lost their mental map. Then it started from the 2D drawing a seeded 5% of its width off the
 * plane, and a settled drawing, with next to no force out of the plane, kept that sliver of depth
 * and settled in its first frame. Now the 3D layout starts where the 2D drawing left every node and
 * the drawing rises into depth over the frames after the switch while the simulation runs.
 *
 * Both force engines (ngraph and d3) on both render paths (a node object per node, and batched
 * rows with no node object), and one seed twice gives one 3D drawing (issue #9475).
 */

import { afterEach, assert, describe, test } from "vitest";

import { Graphty } from "../../src/graphty-element";

/** Five five-node cliques joined in a ring: 25 nodes in clusters a reader would remember. */
const NODES = Array.from({ length: 25 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES: { source: string; target: string }[] = [];
for (let cluster = 0; cluster < 5; cluster++) {
    const first = cluster * 5;
    for (let a = first; a < first + 5; a++) {
        for (let b = a + 1; b < first + 5; b++) {
            EDGES.push({ source: `n${String(a)}`, target: `n${String(b)}` });
        }
    }

    EDGES.push({ source: `n${String(first)}`, target: `n${String(((cluster + 1) % 5) * 5)}` });
}

const hosts: HTMLElement[] = [];

afterEach(() => {
    for (const host of hosts.splice(0)) {
        host.remove();
    }
});

/**
 * Every node's published position, by row.
 * @param element - The element.
 * @returns One [x, y, z] per row.
 */
function positions(element: Graphty): [number, number, number][] {
    const session = element.graph.getSession();
    const at = { x: 0, y: 0, z: 0 };
    const out: [number, number, number][] = [];
    for (let row = 0; row < session.snapshot().nodeCount; row++) {
        session.positions.read(row, at);
        out.push([at.x, at.y, at.z]);
    }

    return out;
}

/**
 * How far the drawing spans along one axis.
 * @param drawn - The positions.
 * @param axis - 0, 1 or 2.
 * @returns The span.
 */
function span(drawn: [number, number, number][], axis: 0 | 1 | 2): number {
    const values = drawn.map((p) => p[axis]);
    return Math.max(...values) - Math.min(...values);
}

/**
 * Wait for the layout to come to rest and the frame to show it.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/** The force engines and render paths a lift is checked on; d3 has no seed and runs the same every time. */
const CASES = [
    { layout: "ngraph", config: { seed: 7 }, path: "objects" },
    { layout: "ngraph", config: { seed: 7 }, path: "batched" },
    { layout: "d3", config: {}, path: "objects" },
    { layout: "d3", config: {}, path: "batched" },
] as const;

type Case = (typeof CASES)[number];

/**
 * Draw the graph in 2D with the case's layout and render path, settled.
 * @param c - The case.
 * @returns The element.
 */
async function drawFlat(c: Case): Promise<Graphty> {
    const host = document.createElement("div");
    host.style.width = "600px";
    host.style.height = "400px";
    document.body.append(host);
    hosts.push(host);

    const element = new Graphty();
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    element.renderPath = c.path;
    element.viewMode = "2d";
    element.layout = c.layout;
    element.layoutConfig = { ...c.config };
    element.nodeData = NODES;
    element.edgeData = EDGES;
    host.append(element);
    await settle(element);
    return element;
}

describe.each(CASES)("switching a 2D $layout drawing to 3D on the $path path", (c) => {
    test("starts the 3D layout from the 2D drawing and lifts it into depth over the frames after", async () => {
        const element = await drawFlat(c);

        const flat = positions(element);
        const width = Math.max(span(flat, 0), span(flat, 1));
        assert.isAbove(width, 0, "the 2D drawing is spread out");

        // The 3D layout's first published arrangement, read the moment it is built.
        let start: [number, number, number][] | null = null;
        element.addEventListener("layout-initialized", () => {
            start ??= positions(element);
        });

        await element.setViewMode("3d");
        assert.isNotNull(start, "the switch to 3D built the 3D layout");
        const started = start as unknown as [number, number, number][];
        for (const [row, [x, y, z]] of started.entries()) {
            assert.closeTo(x, flat[row][0], width * 1e-3, `row ${String(row)} starts at its 2D X`);
            assert.closeTo(y, flat[row][1], width * 1e-3, `row ${String(row)} starts at its 2D Y`);
            assert.isAtMost(Math.abs(z), width * 0.05, `row ${String(row)} starts on the plane`);
        }

        // The depth of every frame drawn until the layout comes to rest.
        const depths: number[] = [];
        let resting = false;
        const sample = (): void => {
            if (!resting) {
                depths.push(span(positions(element), 2));
                requestAnimationFrame(sample);
            }
        };
        requestAnimationFrame(sample);
        await settle(element);
        resting = true;

        const depth = span(positions(element), 2);
        const rises = depths.filter((d, i) => i > 0 && d > depths[i - 1]).length;
        assert.isAtLeast(rises, 10, `the depth grew over many frames, not at once: ${depths.join(", ")}`);
        assert.isAtLeast(depth, width * 0.3, `the settled 3D drawing has real depth (width ${String(width)})`);
        assert.isAtMost(depths[0], width * 0.1, "the first frame after the switch is still near the plane");
    });

    test("lifts the same drawing to the same 3D drawing every time", async () => {
        const drawn: [number, number, number][][] = [];
        for (let run = 0; run < 2; run++) {
            const element = await drawFlat(c);
            await element.setViewMode("3d");
            await settle(element);
            drawn.push(positions(element));
        }

        const [first, second] = drawn;
        const width = Math.max(span(first, 0), span(first, 1), span(first, 2));
        assert.isAtLeast(span(first, 2), width * 0.3, "the lifted drawing has real depth");
        for (const [row, at] of first.entries()) {
            for (const axis of [0, 1, 2] as const) {
                assert.closeTo(second[row][axis], at[axis], width * 1e-6, `row ${String(row)} axis ${String(axis)}`);
            }
        }
    });
});
