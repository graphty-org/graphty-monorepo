/**
 * @file A `{ match: "ids" }` style selector resolves each id the way `session.data.node()` does:
 * the exact id first, the other spelling of an integer id only when no element holds the exact
 * one. Ids that name nothing are reported as `W_UNKNOWN_ID`, never matched in silence.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { StyleChange } from "../../../src/session/styles/StylesApi";

/**
 * A session whose node ids are numbers, as karate.gml loads them.
 * @returns The session.
 */
async function integerIds(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    await session.data.addEdges([
        { source: 1, target: 2 },
        { source: 3, target: 4 },
    ]);

    return session;
}

describe('a { match: "ids" } style selector', () => {
    it("paints integer-id nodes named as text", async () => {
        const session = await integerIds();
        const layer = await session.styles.add({
            name: "Odd",
            target: "node",
            selector: { match: "ids", nodes: ["1", "3"] },
            set: { "node.color": "#ff0000" },
        });

        assert.strictEqual(session.styles.counts(layer.id).matched, 2);
        assert.deepStrictEqual(session.styles.counts(layer.id).painted, { "node.color": 2 });
        session.dispose();
    });

    it("paints text-id nodes named as numbers", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "1" }, { id: "2" }]);
        const layer = await session.styles.add({
            name: "One",
            target: "node",
            selector: { match: "ids", nodes: [1] },
            set: { "node.color": "#ff0000" },
        });

        assert.strictEqual(session.styles.counts(layer.id).matched, 1);
        session.dispose();
    });

    it('keeps exact matching on a graph holding both 1 and "1"', async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: 1 }, { id: "1" }, { id: 2 }]);
        const text = await session.styles.add({
            name: "Text one",
            target: "node",
            selector: { match: "ids", nodes: ["1"] },
            set: { "node.color": "#ff0000" },
        });
        const both = await session.styles.add({
            name: "Both",
            target: "node",
            selector: { match: "ids", nodes: ["1", 1] },
            set: { "node.size": 3 },
        });

        assert.strictEqual(session.styles.counts(text.id).matched, 1);
        assert.strictEqual(
            session.styles.explain({ node: "1" }).channels.find((c) => c.channel === "node.color")?.layerId,
            text.id,
        );
        assert.notStrictEqual(
            session.styles.explain({ node: 1 }).channels.find((c) => c.channel === "node.color")?.layerId,
            text.id,
        );
        assert.strictEqual(session.styles.counts(both.id).matched, 2);
        session.dispose();
    });

    it("paints an edge named by the number its id spells", async () => {
        const session = await integerIds();
        const [{ id: edge }] = session.data.edges();
        const layer = await session.styles.add({
            name: "Edge",
            target: "edge",
            selector: { match: "ids", edges: [Number(edge) as unknown as string] },
            set: { "edge.color": "#ff0000" },
        });

        assert.strictEqual(session.styles.counts(layer.id).matched, 1);
        session.dispose();
    });

    it("follows the graph: a node added later under the named spelling is painted", async () => {
        const session = await integerIds();
        const layer = await session.styles.add({
            name: "Five",
            target: "node",
            selector: { match: "ids", nodes: ["5"] },
            set: { "node.color": "#ff0000" },
        });
        assert.strictEqual(session.styles.counts(layer.id).matched, 0);

        await session.data.addNodes([{ id: 5 }]);
        assert.strictEqual(session.styles.counts(layer.id).matched, 1);
        session.dispose();
    });
});

describe('W_UNKNOWN_ID: a { match: "ids" } selector naming nothing', () => {
    it("validate reports the ids no node answers to, as given, and the layer is still valid", async () => {
        const session = await integerIds();
        const result = session.styles.validate({
            name: "Some",
            target: "node",
            selector: { match: "ids", nodes: ["1", "9", 10, " 3"] },
            set: { "node.color": "#ff0000" },
        });

        assert.isTrue(result.ok);
        assert.deepStrictEqual(result.warnings, [
            { code: "W_UNKNOWN_ID", params: { target: "node", ids: ["9", 10, " 3"] } },
        ]);
        session.dispose();
    });

    it("reports nothing when every id names a node or an edge", async () => {
        const session = await integerIds();
        const [{ id: edge }] = session.data.edges();

        assert.deepStrictEqual(
            session.styles.validate({
                name: "All",
                target: "node",
                selector: { match: "ids", nodes: ["1", 2] },
                set: { "node.color": "#ff0000" },
            }).warnings,
            [],
        );
        assert.deepStrictEqual(
            session.styles.validate({
                name: "Edge",
                target: "edge",
                selector: { match: "ids", edges: [edge] },
                set: { "edge.color": "#ff0000" },
            }).warnings,
            [],
        );
        session.dispose();
    });

    it("reports unknown edge ids for an edge layer", async () => {
        const session = await integerIds();
        const result = session.styles.validate({
            name: "Edges",
            target: "edge",
            selector: { match: "ids", edges: ["999"] },
            set: { "edge.color": "#ff0000" },
        });

        assert.deepStrictEqual(result.warnings, [{ code: "W_UNKNOWN_ID", params: { target: "edge", ids: ["999"] } }]);
        session.dispose();
    });

    it("rides on the style:changed change of the add that wrote the layer", async () => {
        const session = await integerIds();
        const changes: StyleChange[] = [];
        session.on("style:changed", (change) => changes.push(change));

        await session.styles.add({
            name: "Missing",
            target: "node",
            selector: { match: "ids", nodes: ["1", "42"] },
            set: { "node.color": "#ff0000" },
        });

        assert.deepStrictEqual(
            changes.map((change) => change.warnings),
            [[{ code: "W_UNKNOWN_ID", params: { target: "node", ids: ["42"] } }]],
        );
        session.dispose();
    });
});
