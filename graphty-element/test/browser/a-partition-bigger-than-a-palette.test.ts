/**
 * @file A run with more groups than the default palette has colours still draws a picture.
 *
 * WHAT THIS EXISTS TO CATCH, in the words the failure actually used. Two stories --
 * `Algorithms/Community Leiden` and `Algorithms/Component SCC` -- drew nothing for a week, and
 * every reading a consumer can take said the layer was fine: it was in the stack, it was enabled,
 * its selector named the right path, and `applySuggestedStyles` had answered true. Twenty nodes
 * were left at the element's default colour.
 *
 * The cause was a number nobody had yet. `encode()` chose the eight-colour default palette when
 * it planned the layer, which is before any of the run's values have been read; the run had found
 * ten groups; and a categorical palette never wraps, so the capacity check refused the binding one
 * step later, during the repaint. The repaint is allowed to swallow that -- one bad layer must not
 * take a frame down -- so the refusal went to `paint.problems()`, which no story, no assertion and
 * no consumer reads.
 *
 * So the graph below is built to hold more groups than the default palette can name, and the
 * assertions are the two halves of what went wrong: the picture, and the silence. An algorithm's
 * own suggested layer must finish a pass with NOTHING against it in `paint.problems()` -- that one
 * assertion would have caught both stories the day they broke, with the message already written.
 */

import "../../src/algorithms";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { ElementSession } from "../../src/session";
import { paintOf } from "../helpers/paint-assertions";

/** How many separate pieces the graph is cut into: more than any categorical palette can name. */
const PIECES = 12;

/** Three nodes per piece, so no piece is a lone node a layout or a reader treats specially. */
const PER_PIECE = 3;

/** The nodes, named for the piece they belong to. */
const NODES = Array.from({ length: PIECES * PER_PIECE }, (_unused, index) => ({
    id: `p${String(Math.floor(index / PER_PIECE))}n${String(index % PER_PIECE)}`,
}));

/** A cycle inside each piece and nothing between pieces, so every piece is its own component. */
const EDGES = Array.from({ length: PIECES }, (_unused, piece) =>
    Array.from({ length: PER_PIECE }, (_ignored, seat) => ({
        src: `p${String(piece)}n${String(seat)}`,
        dst: `p${String(piece)}n${String((seat + 1) % PER_PIECE)}`,
        weight: 1,
    })),
).flat();

describe("a run with more groups than the default palette has colours", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: ElementSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
        session = graph.getSession() as ElementSession;
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("paints every element it measured, in a colour per group", async () => {
        const run = graph.run("components", {}, { style: false });
        await run;

        assert.strictEqual(run.status, "succeeded", "the run finished");
        assert.isTrue(graph.applySuggestedStyles("components"), "the run refused to paint what it had measured");
        await graph.operationQueue.waitForCompletion();

        const names = new Set(
            session.styles
                .list()
                .filter((layer) => (layer.source as { by?: string } | undefined)?.by === "run")
                .map((layer) => layer.name),
        );

        assert.isAtLeast(names.size, 1, "the run's own layer is not in the stack");

        const painted = NODES.filter((node) =>
            session.styles
                .explain({ node: node.id })
                .contributions.some((contribution) => names.has(contribution.name)),
        );

        assert.strictEqual(
            painted.length,
            NODES.length,
            `the run's layer painted ${String(painted.length)} of ${String(NODES.length)} nodes. A layer that is ` +
                "in the stack, enabled, and painting nothing is the exact shape of the defect this file is named " +
                "for: the element chose a palette too small for its own result and then refused it.",
        );

        const colours = new Set(
            NODES.map((node) => session.styles.explain({ node: node.id }).merged["node.color"] as string | undefined),
        );

        assert.isAtLeast(
            colours.size,
            PIECES,
            `${String(PIECES)} pieces were drawn in ${String(colours.size)} colours, so at least two of them read ` +
                "as one group. A categorical palette must never wrap.",
        );
    });

    it("reports nothing against its own suggested layer once the pass is done", async () => {
        const run = graph.run("components", {}, { style: false });
        await run;

        assert.isTrue(graph.applySuggestedStyles("components"));
        await graph.operationQueue.waitForCompletion();

        const problems = paintOf(graph)
            .problems()
            .map((problem) => `${problem.layerId}: ${problem.code} ${problem.message}`);

        assert.deepStrictEqual(
            problems,
            [],
            "the element reported a problem against a layer it wrote itself. Whatever the layer " +
                "cannot do, a consumer who called applySuggestedStyles was told it succeeded, and " +
                "the only trace is a list nothing reads.",
        );
    });
});
