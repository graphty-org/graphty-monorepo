/**
 * @file Switching a settled 2D force drawing to 3D lifts it into depth instead of laying it out
 * again (issue #9372).
 *
 * The 3D force engine used to be built with fresh bodies, placed by ngraph near the origin: for a
 * few seconds the canvas showed a ball, which then spread into a different drawing, and the reader
 * lost their mental map. Now the 3D layout starts where the 2D drawing left every node -- the same
 * X and Y, a small Z off the plane -- and the simulation lifts the clusters into depth from there.
 */

import { afterEach, assert, describe, test } from "vitest";

import { Graphty } from "../../src/graphty-element";

/** Two six-node cliques joined by one edge: two clusters a reader would remember. */
const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = [...cliqueEdges(0), ...cliqueEdges(6), { source: "n0", target: "n6" }];

/**
 * Every edge of a six-node clique.
 * @param first - The index of its first node.
 * @returns The edges.
 */
function cliqueEdges(first: number): { source: string; target: string }[] {
    const edges: { source: string; target: string }[] = [];
    for (let a = first; a < first + 6; a++) {
        for (let b = a + 1; b < first + 6; b++) {
            edges.push({ source: `n${String(a)}`, target: `n${String(b)}` });
        }
    }

    return edges;
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
 * Wait for the layout to come to rest and the frame to show it.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await element.waitForSettled();
    await element.waitForStableFrame();
}

describe("switching a 2D force drawing to 3D", () => {
    test("starts the 3D layout from the 2D drawing, just off the plane, and lifts it into depth", async () => {
        const host = document.createElement("div");
        host.style.width = "600px";
        host.style.height = "400px";
        document.body.append(host);
        hosts.push(host);

        const element = new Graphty();
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.display = "block";
        element.viewMode = "2d";
        element.layout = "ngraph";
        element.layoutConfig = { seed: 7 };
        element.nodeData = NODES;
        element.edgeData = EDGES;
        host.append(element);
        await settle(element);

        const flat = positions(element);
        const extent = Math.max(
            Math.max(...flat.map((p) => p[0])) - Math.min(...flat.map((p) => p[0])),
            Math.max(...flat.map((p) => p[1])) - Math.min(...flat.map((p) => p[1])),
        );
        assert.isAbove(extent, 0, "the 2D drawing is spread out");

        // The 3D layout's first published arrangement, read the moment it is built.
        let start: [number, number, number][] | null = null;
        element.addEventListener("layout-initialized", () => {
            start ??= positions(element);
        });

        await element.setViewMode("3d");
        assert.isNotNull(start, "the switch to 3D built the 3D layout");
        const started = start as unknown as [number, number, number][];
        for (const [row, [x, y, z]] of started.entries()) {
            assert.closeTo(x, flat[row][0], extent * 1e-3, `row ${String(row)} starts at its 2D X`);
            assert.closeTo(y, flat[row][1], extent * 1e-3, `row ${String(row)} starts at its 2D Y`);
            assert.isAtMost(Math.abs(z), extent * 0.1, `row ${String(row)} starts just off the plane`);
        }

        assert.isTrue(
            started.some(([, , z]) => z !== 0),
            "the 3D layout starts with nodes off the plane, so the simulation can lift them",
        );

        await settle(element);
        const depth = Math.max(...positions(element).map(([, , z]) => Math.abs(z)));
        const startDepth = Math.max(...started.map(([, , z]) => Math.abs(z)));
        assert.isAbove(
            depth,
            startDepth,
            `the settled 3D layout lifted the drawing into depth (extent ${String(extent)})`,
        );
    });
});
