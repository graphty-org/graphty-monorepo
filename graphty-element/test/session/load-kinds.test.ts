/**
 * @file Kinds of node at load: an event table's endpoint columns given a kind each
 * (`sourceKind`, `targetKind`), a node table's `kind` column, and `kindIds` deciding whether an id
 * that appears under two kinds is one node or one per kind.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, LOAD_ROLES } from "../../src/session";
import type { GraphSession, LoadChoices } from "../../src/session/types";

/** An auth log: "admin" is both a user and a host. */
const AUTH_LOG = [
    "time,user,host,ip,result",
    "2026-01-01T08:00:00Z,alice,web1,10.0.0.1,ok",
    "2026-01-01T09:00:00Z,bob,db1,10.0.0.2,fail",
    "2026-01-02T08:00:00Z,admin,web1,10.0.0.3,ok",
    "2026-01-02T09:00:00Z,alice,admin,10.0.0.1,ok",
    "2026-01-03T08:00:00Z,admin,db1,10.0.0.3,ok",
].join("\n");

const KINDS: LoadChoices = {
    mapping: { rowsAre: "edges", source: "user", target: "host", sourceKind: "user", targetKind: "host" },
};

/**
 * A session with the auth log prepared.
 * @returns The session and its draft.
 */
async function prepared(): Promise<{
    session: GraphSession;
    draft: Awaited<ReturnType<GraphSession["data"]["prepare"]>>;
}> {
    const session = createGraphSession();
    const draft = await session.data.prepare({ config: { file: new File([AUTH_LOG], "auth-log.csv") } });
    return { session, draft };
}

/**
 * The ids of the nodes of each kind.
 * @param session - The session.
 * @returns The ids by kind, sorted.
 */
function idsByKind(session: GraphSession): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const node of session.data.nodes()) {
        const kind = String(node.kind);
        (out[kind] ??= []).push(String(node.id));
    }

    for (const ids of Object.values(out)) {
        ids.sort();
    }

    return out;
}

describe("kinds of node at load", () => {
    it("lists kind as a role of both kinds of table", () => {
        assert.include(LOAD_ROLES.nodes.takes, "kind");
        assert.include(LOAD_ROLES.edges.takes, "kind");
    });

    it("reports the id that appears under two kinds, the same under either choice", async () => {
        const { session, draft } = await prepared();
        const shared = await draft.report(KINDS);
        const scoped = await draft.report({ ...KINDS, kindIds: "scoped" });

        assert.deepEqual(shared.kinds, { sharedIds: 1, byKind: { user: 3, host: 3 } });
        assert.deepEqual(scoped.kinds, shared.kinds);
        // Shared: alice, bob, admin, web1, db1. Scoped: admin twice.
        assert.strictEqual(shared.counts.nodes, 5);
        assert.strictEqual(scoped.counts.nodes, 6);
        draft.dispose();
        session.dispose();
    });

    it("makes one admin node under 'shared', with the first kind it appeared under", async () => {
        const { session, draft } = await prepared();
        await draft.load(KINDS);

        assert.deepEqual(idsByKind(session), { user: ["admin", "alice", "bob"], host: ["db1", "web1"] });
        assert.deepEqual(session.data.lastImport()?.kinds, { sharedIds: 1, byKind: { user: 3, host: 3 } });
        session.dispose();
    });

    it("makes two admin nodes under 'scoped', and only the shared id changes", async () => {
        const { session, draft } = await prepared();
        await draft.load({ ...KINDS, kindIds: "scoped" });

        assert.deepEqual(idsByKind(session), {
            user: ["alice", "bob", "user:admin"],
            host: ["db1", "host:admin", "web1"],
        });
        const ends = session.data
            .edges()
            .map((edge) => `${String(edge.source)}>${String(edge.target)}`)
            .sort();
        assert.deepEqual(ends, ["alice>host:admin", "alice>web1", "bob>db1", "user:admin>db1", "user:admin>web1"]);
        session.dispose();
    });

    it("reads kinds from a column with { column }, and a node table's kind role", async () => {
        const session = createGraphSession();
        const nodes = "id,type\nx,person\ny,place\n";
        const edges = "source,target,how\nx,y,walk\n";
        const draft = await session.data.prepare({
            config: { nodeFile: new File([nodes], "n.csv"), edgeFile: new File([edges], "e.csv") },
        });
        const report = await draft.report({ mapping: { tables: { nodes: { kind: "type" }, edges: { kind: "how" } } } });
        assert.deepEqual(report.kinds, { sharedIds: 0, byKind: { person: 1, place: 1 } });

        await draft.load({ mapping: { tables: { nodes: { kind: "type" }, edges: { kind: "how" } } } });
        assert.deepEqual(idsByKind(session), { person: ["x"], place: ["y"] });
        assert.strictEqual(session.data.edges()[0]?.kind, "walk");
        session.dispose();
    });

    it("takes an endpoint kind from a column", async () => {
        const session = createGraphSession();
        const csv = "a,b,ka,kb\n1,1,cat,dog\n2,1,cat,dog\n";
        const draft = await session.data.prepare({ config: { file: new File([csv], "pets.csv") } });
        await draft.load({
            mapping: {
                rowsAre: "edges",
                source: "a",
                target: "b",
                sourceKind: { column: "ka" },
                targetKind: { column: "kb" },
            },
            kindIds: "scoped",
        });

        assert.deepEqual(idsByKind(session), { cat: ["2", "cat:1"], dog: ["dog:1"] });
        session.dispose();
    });

    it("refuses an endpoint kind column the table lacks, and leaves the report without kinds when none is named", async () => {
        const { session, draft } = await prepared();
        const refused = await draft
            .report({ mapping: { rowsAre: "edges", source: "user", target: "host", sourceKind: { column: "nope" } } })
            .then(
                () => null,
                (error: unknown) => error as { code?: string },
            );
        assert.strictEqual(refused?.code, "E_UNKNOWN_ATTRIBUTE");

        const plain = await draft.report({ mapping: { rowsAre: "edges", source: "user", target: "host" } });
        assert.isUndefined(plain.kinds);
        draft.dispose();
        session.dispose();
    });

    it("lets a style layer color by kind", async () => {
        const { session, draft } = await prepared();
        await draft.load({ ...KINDS, kindIds: "scoped" });

        const kind = session.data.attributes().find((each) => each.kind === "node" && each.name === "kind");
        assert.isDefined(kind);
        if (kind === undefined) {
            return;
        }

        await session.data.declare(kind, { measurement: "categorical" });
        const layer = await session.styles.encode({ column: kind, channel: "node.color" });
        assert.deepInclude(layer.encode?.["node.color"], { by: "data.kind" });
        const [block] = session.styles.legend();
        assert.sameMembers(
            block.swatches.map((swatch) => String(swatch.value)),
            ["user", "host"],
        );
        session.dispose();
    });
});
