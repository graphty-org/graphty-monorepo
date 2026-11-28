/**
 * @file The `kind` role: given in place with `data.setRole`, read from a load's kind mapping,
 * designated by a file that declares kinds, and counted by `data.kinds()`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

const PEOPLE = "id,type,name\na,person,Ann\nb,person,Bo\nc,account,acct-1\nd,device,\n";

/**
 * A session holding the people as nodes.
 * @returns the session
 */
async function people(): Promise<GraphSession> {
    const session = createGraphSession({ workingGraph: false });
    const draft = await session.data.prepare({ type: "csv", config: { data: PEOPLE }, name: "people.csv" });
    await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/**
 * The roles one column plays.
 * @param session - the session
 * @param kind - nodes or edges
 * @param name - the column
 * @returns the roles
 */
function rolesOf(session: GraphSession, kind: "node" | "edge", name: string): readonly string[] {
    return session.data.attributes().find((a) => a.kind === kind && a.name === name)?.roles ?? [];
}

describe("the kind role", () => {
    it("offers a column named type, and counts its kinds once it is given the role, one undo step", async () => {
        const session = await people();
        assert.strictEqual(session.data.roleCandidate("node", "kind"), "type");
        assert.deepEqual(session.data.kinds(), { nodes: null, edges: null });

        await session.data.setRole({ kind: "node", name: "type" }, "kind");

        assert.include(rolesOf(session, "node", "type"), "kind");
        assert.deepEqual(session.data.kinds().nodes, {
            column: "type",
            values: [
                { value: "person", count: 2 },
                { value: "account", count: 1 },
                { value: "device", count: 1 },
            ],
            missing: 0,
            total: 4,
        });

        await session.undo();
        assert.strictEqual(session.data.kinds().nodes, null);
        session.dispose();
    });

    it("takes the role away with null", async () => {
        const session = await people();
        await session.data.setRole({ kind: "node", name: "type" }, "kind");
        await session.data.setRole({ kind: "node", name: "type" }, null);
        assert.notInclude(rolesOf(session, "node", "type"), "kind");
        assert.strictEqual(session.data.kinds().nodes, null);
        session.dispose();
    });

    it("reads the kind a load's mapping wrote", async () => {
        const session = createGraphSession({ workingGraph: false });
        const draft = await session.data.prepare({ type: "csv", config: { data: PEOPLE }, name: "people.csv" });
        await draft.load({ mapping: { rowsAre: "nodes", key: "id", kind: "type" } });

        const { nodes } = session.data.kinds();
        assert.strictEqual(nodes?.column, "kind");
        assert.deepEqual(nodes?.values[0], { value: "person", count: 2 });
        assert.include(rolesOf(session, "node", "kind"), "kind");
        session.dispose();
    });

    it("designates the node and edge kinds a Neo4j file declares, in the load's own step", async () => {
        const session = createGraphSession({ workingGraph: false });
        const data = [
            "personId:ID,:LABEL,name",
            "p1,Person,Ann",
            "p2,Person,Bo",
            "d1,Device,phone",
            ":START_ID,:END_ID,:TYPE",
            "p1,p2,KNOWS",
            "p1,d1,OWNS",
            "p2,d1,OWNS",
        ].join("\n");
        await session.data.import({ type: "csv", config: { data, variant: "neo4j" } });

        const kinds = session.data.kinds();
        assert.deepEqual(kinds.nodes?.values, [
            { value: "Person", count: 2 },
            { value: "Device", count: 1 },
        ]);
        assert.deepEqual(kinds.edges?.values, [
            { value: "OWNS", count: 2 },
            { value: "KNOWS", count: 1 },
        ]);

        await session.undo();
        assert.deepEqual(session.data.kinds(), { nodes: null, edges: null });
        session.dispose();
    });

    it("designates the edge kind a JSON Graph Format file declares, and leaves one already set", async () => {
        const jgf = JSON.stringify({
            graph: {
                nodes: { a: {}, b: {}, c: {} },
                edges: [
                    { source: "a", target: "b", relation: "cites", metadata: { topic: "x" } },
                    { source: "b", target: "c", relation: "cites", metadata: { topic: "y" } },
                    { source: "a", target: "c", relation: "extends", metadata: { topic: "x" } },
                ],
            },
        });
        const session = createGraphSession({ workingGraph: false });
        await session.data.import({ type: "json", config: { data: jgf } });

        const { edges } = session.data.kinds();
        assert.deepEqual(edges?.values, [
            { value: "cites", count: 2 },
            { value: "extends", count: 1 },
        ]);
        assert.include(rolesOf(session, "edge", edges?.column ?? ""), "kind");

        const chosen = session.data.attributes().find((a) => a.kind === "edge" && a.name !== edges?.column);
        assert.isDefined(chosen);
        await session.data.setRole({ kind: "edge", name: chosen?.name ?? "" }, "kind");
        await session.data.import({ type: "json", config: { data: jgf } });
        assert.strictEqual(session.data.kinds().edges?.column, chosen?.name, "a kind column already set wins");
        session.dispose();
    });

    it("counts a list value once under each kind it lists", async () => {
        const session = createGraphSession({ workingGraph: false });
        const data = JSON.stringify({
            nodes: [{ id: "a", tags: ["Person", "Admin"] }, { id: "b", tags: ["Person"] }, { id: "c" }],
            edges: [],
        });
        await session.data.import({ type: "json", config: { data } });
        await session.data.setRole({ kind: "node", name: "tags" }, "kind");

        assert.deepEqual(session.data.kinds().nodes, {
            column: "tags",
            values: [
                { value: "Person", count: 2 },
                { value: "Admin", count: 1 },
            ],
            missing: 1,
            total: 3,
        });
        session.dispose();
    });
});
