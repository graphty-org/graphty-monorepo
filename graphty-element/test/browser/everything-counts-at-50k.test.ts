/**
 * @file The Everything row's painted counts on a 50,000-node graph (issue #9187). A panel reads
 * `styles.counts()` on `project:derived`, as the element's docs tell it to. At 50,000 nodes the
 * pass that first prepares the Everything layer can land after an early read answered "painted on
 * 0", and that answer was kept after the pass (the edges' half read 0 of 157,194 painted), so the
 * graphty app showed the row as painted over until the pointer moved. The read made on the last
 * `project:derived` before the picture is painted, and a read after it, must both count the layer
 * as painting what it matches.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";

/** The size the issue was seen at. */
const NODES = 50_000;

/** One reading of a layer's counts: what it matches and what it paints of each property. */
interface Reading {
    readonly matched: number;
    readonly painted: readonly number[];
}

/**
 * Read the counts of the Everything row's part painting one kind.
 * @param session - The session.
 * @param target - Which kind.
 * @returns The reading, or undefined before the row exists.
 */
function everything(session: GraphSession, target: "node" | "edge"): Reading | undefined {
    const layer = session.styles.list().find((each) => each.name === "Everything" && each.target === target);
    if (layer === undefined) {
        return undefined;
    }

    const counts = session.styles.counts(layer.id);
    return { matched: counts.matched, painted: Object.values(counts.painted) };
}

describe("the Everything row's counts on 50,000 nodes", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: GraphSession;
    /** What the row read on each `project:derived`, nodes then edges. */
    const reads: { node: Reading | undefined; edge: Reading | undefined }[] = [];

    beforeAll(async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        session = graph.getSession();
        // As a panel does: read the counts again each time the picture has caught up.
        session.on("project:derived", () => {
            reads.push({ node: everything(session, "node"), edge: everything(session, "edge") });
        });
        // A panel also re-renders, and so reads the counts, as soon as the data changes: that read
        // lands after the edges arrive and before the pass that paints them, and answers "painted
        // on 0". It must not be the answer kept for the reads after that pass.
        session.on("project:changed", () => {
            everything(session, "node");
            everything(session, "edge");
        });
        await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
        await session.data.generate("lfr", { n: NODES, seed: 1 });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForPainted();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    it("paints what it matches in the reading made on the last project:derived", () => {
        const last = reads.at(-1);
        assert.isDefined(last, "project:derived was published");
        for (const kind of ["node", "edge"] as const) {
            const reading: Reading | undefined = last?.[kind];
            assert.isDefined(reading, `the Everything row paints ${kind}s`);
            assert.isAbove(reading?.matched ?? 0, 0, `it matches ${kind}s`);
            assert.isTrue(
                reading?.painted.some((n) => n > 0),
                `the last ${kind} reading counts something painted: ${JSON.stringify(reading)}`,
            );
        }
    });

    it("paints what it matches when read after the picture is painted", () => {
        for (const kind of ["node", "edge"] as const) {
            const reading = everything(session, kind);
            assert.isTrue(
                reading?.painted.some((n) => n > 0),
                `${kind} reading counts something painted: ${JSON.stringify(reading)}`,
            );
        }
    });
});
