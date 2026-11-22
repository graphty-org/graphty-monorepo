/**
 * @file The framing walk leaves out every straight edge with no text (issue #9420).
 *
 * Such an edge runs between two nodes the framing box already holds, so it cannot widen it. While a
 * layout moves the nodes and the camera frames every step, a graph of plain lines walked every edge
 * for labels and curve points; now the walk grows the box only by the curved and labeled edges, and
 * the box is the same as the walk of every edge gives, on both render paths.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { framingBox, framingWalk } from "../../src/managers/UpdateManager";

const cleanups: (() => void)[] = [];

afterEach(() => {
    framingWalk.skipPlain = true;
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const NODES = Array.from({ length: 60 }, (_, id) => ({ id }));

/**
 * A chain of edges, every fifth one curved and every seventh (from the second) labeled.
 * @param mixed - False for a chain of plain lines only.
 * @returns The edges and how many are curved or labeled.
 */
function chain(mixed: boolean): { edges: Record<string, unknown>[]; widening: number } {
    const edges = NODES.slice(1).map(({ id }) => ({
        src: id - 1,
        dst: id,
        ...(mixed && id % 5 === 0 ? { curved: true } : {}),
        ...(mixed && id % 7 === 1 ? { labeled: true } : {}),
    }));
    return { edges, widening: edges.filter((edge) => "curved" in edge || "labeled" in edge).length };
}

/**
 * A graph on one render path, laid out where it was added, with its curve and label layers.
 * @param path - The render path.
 * @param edges - The edges.
 * @returns The element.
 */
async function mounted(path: "objects" | "batched", edges: Record<string, unknown>[]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath(path);
    await element.session.styles.add({
        name: "curved",
        target: "edge",
        selector: { match: "has", path: "data.curved" },
        set: { "edge.curvature": true },
    } as never);
    await element.session.styles.add({
        name: "labeled",
        target: "edge",
        selector: { match: "has", path: "data.labeled" },
        set: { "edge.label": "A caption long enough to stick out" },
    } as never);
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(edges);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Run a layout and, on each of the next framings taken while it moves, measure the framing box twice
 * in the same frame, with the skip and with the walk of every edge.
 * @param element - The element.
 * @param framings - How many moving framings.
 * @returns For each framing: the edges each measure grew the box by, and both boxes as plain numbers.
 */
async function measureWhileMoving(
    element: Graphty,
    framings: number,
): Promise<{ walked: number[]; everyEdge: number[]; skipped: number[][]; unskipped: number[][] }> {
    const { graph } = element;
    const layout = graph.getLayoutManager();
    const walked: number[] = [];
    const everyEdge: number[] = [];
    const skipped: number[][] = [];
    const unskipped: number[][] = [];
    /**
     * One measure of the box, as its corners.
     * @param skipPlain - Whether the walk leaves out plain edges.
     * @returns The corners and the edges walked.
     */
    const measure = (skipPlain: boolean): { corners: number[]; edges: number } => {
        framingWalk.skipPlain = skipPlain;
        const before = framingWalk.edges;
        // Under "batched" the rows drawn with no Node are framed from the row table, as the element's own measure does.
        const box = framingBox(layout.nodes, layout.edges, undefined, graph.getUpdateManager().columnFraming());
        framingWalk.skipPlain = true;
        assert.isDefined(box);
        return { corners: [...box.min.asArray(), ...box.max.asArray()], edges: framingWalk.edges - before };
    };
    let first = true;
    await new Promise<void>((resolve) => {
        const off = graph.on("zoom-to-fit-complete", () => {
            // The first framing of a new layout is asked for; the settling one comes at rest.
            if (first || layout.layoutEngine?.isSettled !== false || !layout.running) {
                first = false;
                return;
            }

            const skip = measure(true);
            const all = measure(false);
            walked.push(skip.edges);
            everyEdge.push(all.edges);
            skipped.push(skip.corners);
            unskipped.push(all.corners);
            if (walked.length === framings) {
                off();
                resolve();
            }
        });
        void graph.setLayout("ngraph", { dim: 3 });
    });
    return { walked, everyEdge, skipped, unskipped };
}

for (const path of ["objects", "batched"] as const) {
    describe(`the framing walk while nodes move, on "${path}"`, () => {
        it("walks no edge of a graph of plain straight lines", async () => {
            const { edges } = chain(false);
            const element = await mounted(path, edges);
            const { walked, everyEdge, skipped, unskipped } = await measureWhileMoving(element, 3);

            assert.deepEqual(walked, [0, 0, 0], "no plain edge grows the box");
            // Under "batched" an arrowed straight edge is a row line with no `Edge`, so the old walk had none to take.
            const held = path === "objects" ? edges.length : 0;
            assert.deepEqual(everyEdge, [held, held, held], "the old walk took every built edge");
            assert.strictEqual(element.graph.rowCounts.objectEdges, path === "objects" ? edges.length : 0);
            assert.deepEqual(skipped, unskipped, "the same box");
        });

        it("walks only the curved and labeled edges, and frames the same box", async () => {
            const { edges, widening } = chain(true);
            const element = await mounted(path, edges);
            const { walked, skipped, unskipped } = await measureWhileMoving(element, 3);

            assert.deepEqual(walked, [widening, widening, widening], "only the curved and labeled edges");
            assert.deepEqual(skipped, unskipped, "the same box with and without the skip");
        });
    });
}
