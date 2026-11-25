/**
 * A node removed and another added while the ngraph force layout runs leaves every kept node at its own place, on
 * both render paths, in 2D and 3D (issue #9918).
 *
 * A seeded layout starts over from its seed when data arrives, and the seed places bodies in row order. Before the
 * fix the add after a removal started it over, so each node after the removed one took the place drawn for the node
 * before it, and the edges between kept nodes were suddenly as long as the distance between two unjoined nodes.
 *
 * Read through the public API, in layout space: `session.positions` by each node's row in `session.snapshot()`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { drawnFrames } from "../helpers/drawn-frames";

interface Place {
    x: number;
    y: number;
    z: number;
}

/** Twelve pairs and two triangles: 30 nodes in 14 components. */
const PAIRS = Array.from({ length: 12 }, (_, i) => [`p${String(i)}a`, `p${String(i)}b`] as const);
const TRIANGLES = [0, 1].map((t) => [`t${String(t)}a`, `t${String(t)}b`, `t${String(t)}c`] as const);
const IDS = [...PAIRS.flat(), ...TRIANGLES.flat()];
const JOINS: (readonly [string, string])[] = [
    ...PAIRS,
    ...TRIANGLES.flatMap(([a, b, c]) => [[a, b] as const, [b, c] as const, [c, a] as const]),
];
/** A node on a row before most of the others, so every row after it is renumbered. */
const REMOVED = "p3a";
/** How many times longer or shorter a kept edge may become across the step: a layout keeps joined nodes close. */
const STRETCH = 2;

const elements: Graphty[] = [];
afterEach(() => {
    for (const element of elements.splice(0)) {
        element.remove();
    }
});

/**
 * Each node's place in layout space.
 * @param element - The element.
 * @param ids - The nodes.
 * @returns Their places.
 */
function places(element: Graphty, ids: readonly string[]): Map<string, Place> {
    const { ids: index } = element.session.snapshot();
    return new Map(
        ids.map((id) => {
            const place = { x: 0, y: 0, z: 0 };
            element.session.positions.read(index.requireIndex(id), place);
            return [id, place] as const;
        }),
    );
}

/**
 * The kept edges whose length changed more than {@link STRETCH} times across the step.
 * @param before - Places before the step.
 * @param after - Places after it.
 * @param joins - The kept edges.
 * @returns The stretched edges, described.
 */
function stretched(
    before: ReadonlyMap<string, Place>,
    after: ReadonlyMap<string, Place>,
    joins: readonly (readonly [string, string])[],
): string[] {
    const length = (at: ReadonlyMap<string, Place>, a: string, b: string): number => {
        const p = at.get(a) as Place;
        const q = at.get(b) as Place;
        return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
    };
    return joins.flatMap(([a, b]) => {
        const was = length(before, a, b);
        const is = length(after, a, b);
        const ratio = Math.max(is / was, was / is);
        return ratio > STRETCH ? [`${a}-${b} ${was.toFixed(2)} -> ${is.toFixed(2)}`] : [];
    });
}

/**
 * An element with the fixture loaded after its first frame, as a file loads in the graphty app.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @returns The element.
 */
async function mounted(path: RenderPath, view: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.setAttribute("acceleration", "off");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    elements.push(element);
    await element.updateComplete;
    await element.setViewMode(view);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await element.session.data.addNodes(
        IDS.map((id, i) => ({ id, position: { x: (i % 6) * 4 - 10, y: Math.floor(i / 6) * 4 - 8, z: 0 } })),
    );
    await element.session.data.addEdges(JOINS.map(([source, target]) => ({ source, target, directed: false })));
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe.each(["objects", "batched"] as const)("ngraph on the %s path", (path) => {
    it.each(["2d", "3d"] as const)(
        "keeps every kept node at its own place across a removal and an add in %s",
        async (view) => {
            const element = await mounted(path, view);
            await element.setLayout("ngraph", { seed: 7 });
            const scene = element.graph.getScene();
            // Let the layout spread the nodes: an edge's length is then about the spring length.
            await drawnFrames(scene, 20);
            assert.isTrue(element.isRunning(), "the layout is still running when the step is taken");

            const kept = IDS.filter((id) => id !== REMOVED);
            const keptJoins = JOINS.filter(([a, b]) => a !== REMOVED && b !== REMOVED);
            const before = places(element, kept);
            await element.session.data.removeNodes([REMOVED]);
            await element.session.data.addNodes([{ id: "late", position: { x: 0, y: 0, z: 0 } }]);
            await element.session.data.addEdges([{ source: "late", target: "p6a", directed: false }]);
            await drawnFrames(scene, 1);

            assert.deepEqual(
                stretched(before, places(element, kept), keptJoins),
                [],
                "every kept edge kept its length",
            );
        },
    );
});
