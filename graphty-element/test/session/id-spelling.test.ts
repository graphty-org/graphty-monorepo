/**
 * @file Every node and edge lookup a consumer can reach takes an integer id in either spelling:
 * node `34` answers to `"34"` and node `"35"` to `35`, and edge `"0"` answers to `0`. Text that is
 * not the decimal printing of the id (" 34", "34.0", "1e1") names nothing.
 */

import { assert, beforeEach, describe, it } from "vitest";

import type { EdgeId, NodeId } from "../../src/catalog/types";
import type { GraphSession } from "../../src/session/types";
import { blankSession } from "./history/fixture-session";

/** The edge between node 34 and node "35". */
let edge: EdgeId;
let session: GraphSession;

beforeEach(async () => {
    session = blankSession();
    await session.data.addNodes([{ id: 34 }, { id: "35" }, { id: "x" }]);
    await session.data.addEdges([{ source: 34, target: "35" }]);
    [{ id: edge }] = session.data.edges();
    return (): void => {
        session.dispose();
    };
});

/** The two nodes, each under its own id and the other spelling of it. */
const NODES: readonly (readonly [NodeId, NodeId])[] = [
    [34, 34],
    ["34", 34],
    ["35", "35"],
    [35, "35"],
];

/** Text that is not an integer id's decimal printing, so names no node. */
const NOT_SPELLINGS: readonly NodeId[] = [" 34", "34.0", "3.4e1", 34.5];

/**
 * The edge id as the number it spells.
 * @returns The number.
 */
function edgeNumber(): number {
    return Number(edge);
}

describe("either spelling of an integer id", () => {
    it("session.data.node and name find the node and report the id the graph holds", () => {
        for (const [asked, held] of NODES) {
            assert.strictEqual(session.data.node(asked)?.id, held, `node(${JSON.stringify(asked)})`);
            assert.isString(session.data.name(asked), `name(${JSON.stringify(asked)})`);
        }

        for (const id of NOT_SPELLINGS) {
            assert.isUndefined(session.data.node(id), `node(${JSON.stringify(id)})`);
            assert.isUndefined(session.data.name(id), `name(${JSON.stringify(id)})`);
        }
    });

    it("session.data.neighbors finds the node", () => {
        for (const [asked, held] of NODES) {
            const [neighbor] = session.data.neighbors(asked).records;
            assert.strictEqual(neighbor.node.id, held === 34 ? "35" : 34, `neighbors(${JSON.stringify(asked)})`);
        }

        assert.throws(() => session.data.neighbors(" 34"), /no node/);
    });

    it("session.data.edges({ touching }) finds the node", () => {
        for (const [asked] of NODES) {
            assert.lengthOf(session.data.edgePage({ touching: asked }).records, 1, `touching ${JSON.stringify(asked)}`);
        }
    });

    it("session.data.statistics().components.componentOf finds the node", () => {
        const { components } = session.data.statistics();
        for (const [asked] of NODES) {
            assert.isNumber(components.componentOf(asked), `componentOf(${JSON.stringify(asked)})`);
        }

        assert.isUndefined(components.componentOf(" 34"));
    });

    it("session.data.edge finds the edge by the number it spells", () => {
        assert.strictEqual(session.data.edge(edgeNumber() as unknown as EdgeId)?.id, edge);
        assert.isUndefined(session.data.edge(`${edge}.0`), "a decimal point is another id");
    });

    it("session.visibility.isVisible, nodes and edges answer either spelling", () => {
        const { visibility } = session;
        for (const [asked] of NODES) {
            assert.isTrue(visibility.isVisible(asked), `isVisible(${JSON.stringify(asked)})`);
            assert.isTrue(visibility.nodes.has(asked), `nodes.has(${JSON.stringify(asked)})`);
        }

        assert.isTrue(visibility.isVisible(edgeNumber()), "isVisible(edge as a number)");
        assert.isTrue(visibility.edges.has(edgeNumber() as unknown as EdgeId), "edges.has(edge as a number)");
        assert.deepEqual([...visibility.edges], [edge], "the edge set yields only the id the graph holds");
        for (const id of NOT_SPELLINGS) {
            assert.isFalse(visibility.isVisible(id), `isVisible(${JSON.stringify(id)})`);
        }
    });

    it("a resolved scope's node and edge sets answer either spelling", async () => {
        const { nodes, edges } = await session.scope.resolve("graph");
        for (const [asked] of NODES) {
            assert.isTrue(nodes.has(asked), `nodes.has(${JSON.stringify(asked)})`);
        }

        assert.isTrue(edges.has(edgeNumber() as unknown as EdgeId), "edges.has(edge as a number)");
        assert.deepEqual([...edges], [edge], "the edge set yields only the id the graph holds");
    });

    it("session.selection.has answers either spelling of a selected node or edge", async () => {
        await session.selection.apply({ ids: [34, "35", edge] });
        for (const [asked] of NODES) {
            assert.isTrue(session.selection.has(asked), `has(${JSON.stringify(asked)})`);
        }

        assert.isTrue(session.selection.has(edgeNumber()), "has(edge as a number)");
        assert.isFalse(session.selection.has(" 34"));
    });

    it("session.sets.containing finds the node or the edge", async () => {
        for (const [asked] of NODES) {
            assert.isArray((await session.sets.containing({ node: asked })).sets, `node ${JSON.stringify(asked)}`);
        }

        assert.isArray((await session.sets.containing({ edge: edgeNumber() as unknown as EdgeId })).sets);
        let error: unknown;
        await session.sets.containing({ node: " 34" }).catch((rejection: unknown) => (error = rejection));
        assert.isDefined(error, "text that is not an id names nothing");
    });

    it("session.styles.explain finds the node or the edge", () => {
        for (const [asked] of NODES) {
            assert.isNotEmpty(session.styles.explain({ node: asked }).channels, `node ${JSON.stringify(asked)}`);
        }

        assert.isNotEmpty(session.styles.explain({ edge: edgeNumber() as unknown as EdgeId }).channels);
    });

    it("a run result's node lookup finds the node", async () => {
        const run = session.runs.start("degree", undefined, { style: false });
        const result = await run;
        for (const [asked] of NODES) {
            assert.isDefined(result.node(asked), `node(${JSON.stringify(asked)})`);
        }

        assert.isUndefined(result.node(" 34"));
    });

    it("a neighborhood filter seeds from either spelling", async () => {
        for (const [asked, held] of NODES) {
            await session.visibility.set({ kind: "neighborhood", seeds: [asked], depth: 0 });
            assert.deepEqual([...session.visibility.nodes], [held], `seed ${JSON.stringify(asked)}`);
        }
    });

    it("session.data.updateNodes writes the node under either spelling", async () => {
        await session.data.updateNodes([
            { id: "34", values: { tag: "a" } },
            { id: 35, values: { tag: "b" } },
        ]);
        assert.strictEqual(session.data.node(34)?.tag, "a");
        assert.strictEqual(session.data.node("35")?.tag, "b");
    });

    it("session.positions.set places the node under either spelling", async () => {
        await session.positions.set([
            { id: "34", x: 7, y: 8 },
            { id: 35, x: 9, y: 10 },
        ]);
        const snapshot = session.snapshot();
        const at = { x: 0, y: 0, z: 0 };
        session.positions.read(snapshot.ids.indexOf(34), at);
        assert.strictEqual(at.x, 7);
        session.positions.read(snapshot.ids.indexOf("35"), at);
        assert.strictEqual(at.x, 9);
    });

    it("session.data.removeNodes and removeEdges remove under either spelling", async () => {
        await session.data.removeEdges([edgeNumber() as unknown as EdgeId]);
        assert.strictEqual(session.snapshot().edgeCount, 0, "the edge, by the number it spells");
        await session.data.removeNodes(["34", 35]);
        assert.deepEqual(
            session.data.nodes().map((node) => node.id),
            ["x"],
        );
    });
});

describe("either spelling of an integer id in a set", () => {
    it("a fixed set naming a node in the other spelling holds it, and sets.containing agrees", async () => {
        const id = session.sets.create({ kind: "fixed", nodes: ["34", 35], reading: "listed" }, { name: "Both" });
        const { nodes } = await session.scope.resolve({ set: id });
        assert.deepEqual([...nodes].sort(), [34, "35"].sort(), "the set resolves to the ids the graph holds");

        for (const [asked] of NODES) {
            const { sets } = await session.sets.containing({ node: asked });
            assert.include(sets, id, `containing ${JSON.stringify(asked)}`);
        }
    });

    it("a path set naming its nodes in the other spelling walks them", async () => {
        const id = session.sets.create({ kind: "path", nodes: ["34", 35] }, { name: "Walk" });
        const { nodeCount, edgeCount } = await session.scope.resolve({ set: id });
        assert.deepEqual({ nodeCount, edgeCount }, { nodeCount: 2, edgeCount: 1 });
    });
});

describe("either spelling of an integer id in an edge write", () => {
    it("session.data.updateEdges writes the edge by the number it spells", async () => {
        await session.data.updateEdges([{ id: edgeNumber() as unknown as EdgeId, values: { tag: "e" } }]);
        assert.strictEqual(session.data.edge(edge)?.tag, "e");
    });
});
