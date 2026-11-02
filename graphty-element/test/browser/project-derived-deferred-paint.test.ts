/**
 * @file `project:derived` follows the pass that paints, not only the pass a commit scheduled
 * (issue #3543). In the element the `graph` hook leaves the whole-graph repaint to a later pass
 * while another graph write waits behind the edit (`paintOwed`). That later pass is started by
 * `graph.touch("paint")` when the waiting write ends, with no commit and no `project:changed`
 * behind it. When the event was tied to the commit, it fired after the pass that did not paint,
 * and nothing was published after the one that did: a legend read on it stayed stale for good.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { dispatcherOf } from "../../src/session/GraphSession";

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

/**
 * Mount a graphty-element with nodes a (kind x) and b (kind y) and wait for it to settle.
 * @returns the element
 */
async function mount(): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "100%";
    element.style.height = "100%";
    container.appendChild(element);
    mounted = element;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element finished initialising");
    });
    await element.session.data.addNodes([
        { id: "a", kind: "x" },
        { id: "b", kind: "y" },
    ]);
    await element.waitForSettled();
    return element;
}

describe("project:derived in the element", () => {
    test("a legend read on it is current after an edit whose paint a waiting write deferred", async () => {
        const element = await mount();
        const s = element.session;
        await s.styles.add({
            name: "Kind",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito" } },
        });
        await s.styles.settled();
        const categories = (): string[] =>
            s.styles.legend().flatMap((block) => ("swatches" in block ? block.swatches.map((w) => w.label) : []));
        assert.deepEqual(categories(), ["x", "y"]);

        const reads: string[][] = [];
        s.on("project:derived", () => {
            reads.push(categories());
        });
        // The edit's pass sees the second write waiting and leaves the paint owed; the second
        // write commits nothing, and its end schedules the pass that paints.
        const edit = s.data.updateNodes([{ id: "b", values: { kind: "z" } }]);
        const nothing = s.data.updateNodes([{ id: "nobody", values: { kind: "q" } }]);
        await Promise.allSettled([edit, nothing]);
        await s.styles.settled();
        await dispatcherOf(s).lane.settled();
        assert.deepEqual(categories(), ["x", "z"], "the legend itself is current");

        await vi.waitFor(() => {
            assert.deepEqual(reads.at(-1), ["x", "z"], "the last read on project:derived is current");
        });
    });

    test("no read on it in a burst of queued edits answers for a picture the burst has left", async () => {
        const element = await mount();
        const s = element.session;
        await s.styles.add({
            name: "Kind",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito" } },
        });
        await s.styles.settled();
        const categories = (): string[] =>
            s.styles.legend().flatMap((block) => ("swatches" in block ? block.swatches.map((w) => w.label) : []));

        const reads: string[][] = [];
        s.on("project:derived", () => {
            reads.push(categories());
        });
        // Queued together: every pass but the last leaves the paint to the write behind it.
        await Promise.allSettled([
            s.data.updateNodes([{ id: "b", values: { kind: "z" } }]),
            s.data.updateNodes([{ id: "a", values: { kind: "q" } }]),
            s.data.updateNodes([{ id: "b", values: { kind: "w" } }]),
        ]);
        await s.styles.settled();
        await dispatcherOf(s).lane.settled();
        assert.deepEqual(categories(), ["q", "w"], "the legend itself is current");

        await vi.waitFor(() => {
            assert.isAtLeast(reads.length, 1, "the burst published a project:derived");
        });
        for (const read of reads) {
            assert.deepEqual(read, ["q", "w"], "a read on project:derived answers for the painted picture");
        }
    });
});
