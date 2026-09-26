/**
 * @file A kept mask copy is never put back once a node attribute has changed through
 * `Graph.updateNodes`: undoing a filter after the edit shows what the earlier filter matches now,
 * not what it matched when its masks were copied. Undoing the edit as well brings the rows and
 * records back exactly, and with them the earlier filter's masks. The renderer half of the tag
 * cases in `test/session/visibility/undo.test.ts`.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` with two hosts and two services.
 * @returns The graph.
 */
async function loadedGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.setLayout("circular");
    await graph.addNodes([
        { id: "h1", type: "host" },
        { id: "h2", type: "host" },
        { id: "s1", type: "service" },
        { id: "s2", type: "service" },
    ]);
    await graph.operationQueue.waitForCompletion();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * The visible node ids, sorted.
 * @param graph - The graph.
 * @returns The ids.
 */
function visible(graph: Graph): string[] {
    return [...graph.getSession().visibility.nodes].map(String).sort();
}

/** Hosts only. */
const HOSTS = { kind: "categories", attribute: "data.type", values: ["host"] } as const;

/** Services only. */
const SERVICES = { kind: "categories", attribute: "data.type", values: ["service"] } as const;

/** A style step: it ends a filter step, so the next filter is a step of its own. */
const BETWEEN = {
    name: "Between",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#ff0000" },
} as const;

describe("a filter undone after an attribute edit", () => {
    it("evaluates the earlier filter against the edited attributes", async () => {
        const graph = await loadedGraph();
        const session = graph.getSession();

        await session.visibility.set(HOSTS);
        await session.styles.add(BETWEEN);
        // The edit is a step of its own, and it moves the graph token.
        await graph.updateNodes([{ id: "s1", type: "host" }]);
        assert.deepEqual(visible(graph), ["h1", "h2", "s1"], "the filter in force sees the edit");
        await session.visibility.set(SERVICES);
        assert.deepEqual(visible(graph), ["s2"]);

        await session.undo();

        assert.deepEqual(visible(graph), ["h1", "h2", "s1"], "not the hosts as they were before the edit");
    });

    it("puts the earlier masks back once the edit itself is undone", async () => {
        const graph = await loadedGraph();
        const session = graph.getSession();

        await session.visibility.set(HOSTS);
        await session.styles.add(BETWEEN);
        await session.visibility.set(SERVICES);
        await graph.updateNodes([{ id: "s1", type: "host" }]);
        assert.deepEqual(visible(graph), ["s2"]);

        await session.undo();
        await session.undo();

        assert.deepEqual(visible(graph), ["h1", "h2"], "the rows and records are back, and so are the hosts");
    });
});
