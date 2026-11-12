/**
 * @file Bulk lane keys on a real element (design/rendering/cosmos-gap.md, G4). Under the "batched"
 * render path a forward `addEdges` marks its edges dirty as one range key; the element's
 * DataManager walks that range when the graph moves any other way. A load followed by per-edge
 * edits, a rolled-back add, a restore back across the load and forward again, and an autosave read back by a
 * remounted element end with the same graph, and the same edges drawn, as on the "objects" path.
 * In the "autosave-engines" project because it writes the browser's own IndexedDB.
 */

import "../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { dispatcherOf } from "../../../src/session/GraphSession";
import { dataDigest } from "../../../src/session/project/digest";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Mount an element that autosaves under a key, on one render path.
 * @param key - The autosave key.
 * @param path - The render path.
 * @returns The element, once its autosave has read back what the key holds.
 */
async function mount(key: string, path: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.setAttribute("autosave", key);
    element.renderPath = path;
    element.layout = "fixed";
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.autosaver.ready;
    return element;
}

/**
 * What the graph is and what is drawn of it.
 * @param element - The element.
 * @returns The slice digest and the edges the DataManager holds.
 */
function state(element: Graphty): { digest: string; drawnEdges: number } {
    return {
        digest: dataDigest(dispatcherOf(element.session).state.graph, () => element.session.data.snapshot()),
        drawnEdges: element.graph.getDataManager().edges.size,
    };
}

/**
 * Load, edit, restore across the load and back, then autosave and read it back.
 * @param path - The render path.
 * @returns What the graph was after each move.
 */
async function trail(path: "objects" | "batched"): Promise<{ digest: string; drawnEdges: number }[]> {
    const key = `test.autosave.bulk-lane-keys.${path}.${crypto.randomUUID()}`;
    const element = await mount(key, path);
    const seen: { digest: string; drawnEdges: number }[] = [];
    await element.session.data.addEdges(
        Array.from({ length: 120 }, (_, i) => ({ source: i, target: (i + 1) % 120, w: i })),
    );
    const ids = element.session.data.edges().map((edge) => edge.id);
    await element.session.data.updateEdges(ids.slice(10, 15).map((id) => ({ id, values: { w: -1 } })));
    seen.push(state(element));
    // A forward add that is rolled back: its range key reaches the DataManager on the rollback.
    await element.session
        .transaction("Refused", async (tx) => {
            await tx.data.addEdges(Array.from({ length: 30 }, (_, i) => ({ source: `r${String(i)}`, target: i })));
            throw new Error("refused");
        })
        .catch(() => undefined);
    await element.session.styles.settled();
    seen.push(state(element));
    const last = element.session.history.steps.at(-1)?.id ?? null;
    await element.session.history.restoreTo(null);
    seen.push(state(element));
    await element.session.history.restoreTo(last);
    seen.push(state(element));
    await element.autosaver.flush();
    element.remove();

    const again = await mount(key, path);
    await again.session.styles.settled();
    seen.push(state(again));
    return seen;
}

describe("bulk lane keys on an element", () => {
    it("a load, per-edge edits, a restore across the load and an autosave end equal on both paths", async () => {
        const batched = await trail("batched");
        const objects = await trail("objects");
        assert.deepStrictEqual(batched, objects);
        assert.deepStrictEqual(
            batched.map((seen) => seen.drawnEdges),
            [120, 120, 0, 120, 120],
            "every edge is drawn after the load, none of a rolled-back add, none before the load, and all again after the restore and the read back",
        );
    });
});
