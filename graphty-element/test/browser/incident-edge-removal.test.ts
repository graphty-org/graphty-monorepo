/**
 * @file Removing a node removes the edges attached to it.
 *
 * The STORE side of this has worked for a while: the builder tombstones a node and every live
 * incident edge and hands back their indices, so `snapshot.edgeCount` falls. The render, layout
 * and selection side did not, and the consequences were all visible to a reader.
 *
 * The edge kept drawing, because the frame loop walks the LAYOUT ENGINE's edge list rather than
 * the data manager's. It became permanently visible and unfilterable, because an edge with no
 * store row is forced visible by the per-frame mask and a filter is addressed by index. And the
 * removed `Node` stayed reachable through `Edge.srcNode`, so disposing it freed the Babylon
 * resources and not the JavaScript retention -- which on a large graph is the removal leak that
 * matters.
 */
import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, test } from "vitest";

import type { Graph } from "../../src/Graph";

/**
 * A triangle with one extra node hanging off it, over a fresh canvas.
 *
 * `a` is the node every case removes: two of the four edges touch it and two do not, so a cascade
 * that removed too much and one that removed too little both fail.
 * @returns the graph
 */
async function makeGraph(): Promise<Graph> {
    document.body.innerHTML = '<canvas id="removal-canvas"></canvas>';
    const { Graph: GraphClass } = await import("../../src/Graph.js");
    const graph = new GraphClass(document.getElementById("removal-canvas") as HTMLCanvasElement);
    await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], undefined, { skipQueue: true });
    await graph.addEdges(
        [
            { source: "a", target: "b" },
            { source: "a", target: "c" },
            { source: "b", target: "c" },
            { source: "c", target: "d" },
        ],
        { skipQueue: true },
    );
    return graph;
}

describe("removing a node", () => {
    test("takes its edges with it, and leaves the others alone", async () => {
        const graph = await makeGraph();
        const data = graph.getDataManager();

        await graph.removeNodes(["a"], { skipQueue: true });

        assert.strictEqual(data.edges.size, 2, "the two edges at a went; the two that never touched it stayed");
        assert.strictEqual(data.edgeCache.size, 2, "the pair cache agrees");
        assert.strictEqual(graph.getSession().data.snapshot().edgeCount, 2, "and so does the store");
        assert.deepStrictEqual([...data.edgeCache.get("a", "b")], [], "no edge is reachable by a removed pair");
        graph.dispose();
    });

    test("leaves no edge behind that still points at the node that went", async () => {
        const graph = await makeGraph();
        const data = graph.getDataManager();

        await graph.removeNodes(["a"], { skipQueue: true });

        for (const edge of data.edges.values()) {
            assert.notStrictEqual(edge.srcNode.id, "a", "nothing holds the disposed node's source side");
            assert.notStrictEqual(edge.dstNode.id, "a", "nor its target side");
        }

        graph.dispose();
    });

    test("tells the layout engine, so the frame loop stops stepping what is gone", async () => {
        // The renderer walks the ENGINE's lists, not the manager's, so an edge the manager forgot
        // about would go on drawing to the disposed node's last position for the rest of the
        // session. Removing it from the manager alone would have changed nothing on screen.
        const graph = await makeGraph();

        await graph.removeNodes(["a"], { skipQueue: true });

        const engine = graph.getLayoutManager().layoutEngine;
        assert.isDefined(engine);
        assert.isFalse(
            [...(engine?.nodes ?? [])].some((node) => node.id === "a"),
            "the removed node is out of the engine's node list",
        );
        assert.isFalse(
            [...(engine?.edges ?? [])].some((edge) => edge.srcId === "a" || edge.dstId === "a"),
            "and so is every edge that touched it",
        );
        graph.dispose();
    });

    test("names everything it took in one event", async () => {
        const graph = await makeGraph();
        const session = graph.getSession();

        // The ids of the two edges at `a`, read BEFORE the removal, because afterwards there is
        // nothing left to read them off.
        const doomed = [...(await session.scope.resolve("graph")).edges].filter((id) => {
            const edge = session.data.edge(id);
            return edge?.source === "a" || edge?.target === "a";
        });
        assert.strictEqual(doomed.length, 2);

        const seen: { nodes: unknown[]; edges: unknown[] }[] = [];
        graph.addListener("elements-removed", (event) => {
            const removal = event as unknown as { nodes: unknown[]; edges: unknown[] };
            seen.push({ nodes: removal.nodes, edges: removal.edges });
        });

        await graph.removeNodes(["a"], { skipQueue: true });

        assert.strictEqual(seen.length, 1, "one event per removeNodes call, not one per element");
        assert.deepStrictEqual(seen[0].nodes, ["a"]);
        assert.deepStrictEqual([...(seen[0].edges as string[])].sort(), [...doomed].sort());

        for (const id of doomed) {
            assert.isUndefined(session.data.edge(id), "an edge the event named answers nothing afterwards");
        }

        graph.dispose();
    });

    test("removes an edge from the selection rather than leaving it selected", async () => {
        const graph = await makeGraph();
        const session = graph.getSession();
        const doomed = [...(await session.scope.resolve("graph")).edges].filter((id) => {
            const edge = session.data.edge(id);
            return edge?.source === "a";
        });

        await session.selection.apply({ edges: doomed });
        assert.strictEqual([...session.selection.edges].length, doomed.length);

        await graph.removeNodes(["a"], { skipQueue: true });

        assert.deepStrictEqual([...session.selection.edges], [], "nothing selected that the graph does not hold");
        graph.dispose();
    });

    test("does not leave an unfilterable edge behind", async () => {
        // An edge with no store row is forced visible by the per-frame mask, because `!placed`
        // used to mean "an orphan" and an orphan had to be drawn somehow. With no orphans left it
        // means only "mid-teardown", and an edge the graph no longer holds is simply absent.
        const graph = await makeGraph();
        const data = graph.getDataManager();

        await graph.removeNodes(["a"], { skipQueue: true });

        for (const edge of data.edges.values()) {
            assert.notStrictEqual(
                edge.index,
                INVALID_INDEX,
                "every surviving edge has a real row, so a filter can reach every one of them",
            );
        }

        assert.strictEqual(data.edgesByIndex.filter((edge) => edge !== undefined).length, 2);
        graph.dispose();
    });

    test("answers null for a node the graph does not hold, and changes nothing", async () => {
        const graph = await makeGraph();
        const data = graph.getDataManager();

        assert.isNull(data.removeNodeAndIncidentEdges("nobody"));
        assert.strictEqual(data.edges.size, 4);
        graph.dispose();
    });
});
