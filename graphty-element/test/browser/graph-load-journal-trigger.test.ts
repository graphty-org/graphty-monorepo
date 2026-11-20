/**
 * @file The graph's own loads (`addDataFromSource`, and so `loadFromFile`, `loadFromUrl` and the
 * `data-source` attribute) mark their journal entries `trigger: "load"`, as `session.data`'s load
 * doors do, so a consumer counting reader actions does not count them.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { JournalEntry } from "../../session";
import { Graph } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real, empty `Graph`.
 * @returns The graph.
 */
async function emptyGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

describe("the graph's own loads in the journal", () => {
    it("marks a loadFromFile import trigger load, and the reader's edit after it not", async () => {
        const graph = await emptyGraph();
        const session = graph.getSession();
        const heard: JournalEntry[] = [];
        session.on("journal:appended", ({ entry }) => heard.push(entry));
        const text = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });

        await graph.loadFromFile(new File([text], "g.json", { type: "application/json" }), { format: "json" });

        assert.include(
            heard.map((entry) => entry.command.op),
            "data.import",
        );
        assert.deepEqual(
            heard.filter((entry) => entry.trigger !== "load").map((entry) => entry.command.op),
            [],
        );

        heard.length = 0;
        await session.config.set({ name: "Mine" });
        assert.lengthOf(heard, 1);
        assert.isFalse("trigger" in (heard[0] ?? {}));
    });
});
