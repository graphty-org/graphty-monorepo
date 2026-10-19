/**
 * @file `AttributeDescriptor.roles`: which column is the key, the name, the weight (issue #893).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * The roles one column plays.
 * @param session - the session
 * @param kind - nodes or edges
 * @param name - the column's literal name
 * @returns its roles, or undefined when it plays none
 */
function rolesOf(session: GraphSession, kind: "node" | "edge", name: string): readonly string[] | undefined {
    const column = session.data.attributes().find((each) => each.kind === kind && each.name === name);
    assert.isDefined(column, `a ${kind} column ${name}`);
    return column?.roles;
}

describe("AttributeDescriptor.roles", () => {
    it("tags a GML file's id, label and value columns", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { nodeLabelPath: "label" } } });
        const data =
            'graph [ node [ id 1 label "Valjean" ] node [ id 2 label "Javert" ] edge [ source 1 target 2 value 3 ] ]';
        await session.data.import({ type: "gml", config: { data } });

        assert.deepStrictEqual(rolesOf(session, "node", "id"), ["key"]);
        assert.deepStrictEqual(rolesOf(session, "node", "label"), ["label"]);
        assert.deepStrictEqual(rolesOf(session, "edge", "value"), ["weight"]);
        session.dispose();
    });

    it("tags the weight column a CSV edge list was loaded with", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { edgeWeightPath: "trips" } } });
        await session.data.import({ type: "csv", config: { data: "source,target,trips\na,b,4\nb,c,2\n" } });

        assert.deepStrictEqual(rolesOf(session, "edge", "trips"), ["weight"]);
        session.dispose();
    });

    it("matches a column with spaces by its literal name, as a key or a quoted expression", async () => {
        const session = createGraphSession();
        await session.config.set({
            data: { knownFields: { nodeIdPath: '"person id"', edgeWeightPath: "shared chapters" } },
        });
        await session.data.addNodes([{ "person id": "a" }, { "person id": "b" }]);
        await session.data.addEdges([{ source: "a", target: "b", "shared chapters": 2 }]);

        assert.deepStrictEqual(rolesOf(session, "node", "person id"), ["key"]);
        assert.deepStrictEqual(rolesOf(session, "edge", "shared chapters"), ["weight"]);
        session.dispose();
    });

    it("hands back the same array until something it reads moves, and drops roles with an undone import", async () => {
        const session = createGraphSession();
        const data = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [{ source: "a", target: "b", weight: 2 }],
        });
        await session.data.import({ type: "json", config: { data } });
        const first = session.data.attributes();
        assert.strictEqual(session.data.attributes(), first);
        assert.deepStrictEqual(rolesOf(session, "edge", "weight"), ["weight"]);

        await session.config.set({ data: { knownFields: { nodeLabelPath: "id" } } });
        assert.notStrictEqual(session.data.attributes(), first);
        assert.deepStrictEqual(rolesOf(session, "node", "id"), ["key", "label"]);

        await session.undo();
        await session.undo();
        assert.isUndefined(
            session.data.attributes().find((each) => each.roles !== undefined),
            "no column plays a role once the import is undone",
        );
        session.dispose();
    });
});
