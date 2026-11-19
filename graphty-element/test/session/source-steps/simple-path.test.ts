/**
 * @file The simple path under the source-steps experiment (design
 * design/data/multiple-data-sources-design.md, section 9.1): every load is a source plus
 * `join.add`, a replacing load starts again, the direct edits are the reader's own source, and a
 * NodeId is the key when one space holds it, else `<space>:<key>`. Ported from the reference
 * model's roundtrips, review-round-9 and late-findings cases.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

/**
 * A session with the source-steps experiment on.
 * @returns The session.
 */
function stepsSession(): GraphSession {
    return createGraphSession({ features: ["source-steps"] });
}

/**
 * A CSV load with no other options.
 * @param name - The file's name.
 * @param data - The CSV text.
 * @returns What `import` takes.
 */
function csv(name: string, data: string): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data }, name };
}

/**
 * The node ids the graph holds, sorted as text.
 * @param session - The session.
 * @returns The ids.
 */
function nodeIds(session: GraphSession): string[] {
    const { ids } = session.data.store.getSnapshot();
    return Array.from({ length: ids.size }, (_, row) => String(ids.idOf(row))).sort();
}

describe("source-steps: the simple path", () => {
    it("two merged imports with no options leave two sources, each in its own space; a reserved space is refused", async () => {
        const session = stepsSession();
        await session.data.import(csv("one.csv", "id\nn1\n"));
        await session.data.import(csv("two.csv", "id\nn1\n"), { mode: "merge" });
        const sources = session.data.sources();
        assert.strictEqual(sources.length, 2);
        assert.strictEqual(session.data.store.getSnapshot().ids.size, 2, "each in its own space");
        assert.deepStrictEqual(
            nodeIds(session),
            sources.map((s) => `source:${s.key}:n1`).sort(),
            "a key two spaces hold is <space>:<key>",
        );
        assert.deepStrictEqual(
            session.data.steps().map((s) => [s.op, s.source]),
            sources.map((s) => ["join.add", s.key]),
        );
        await session.data.import(csv("three.csv", "id\nn1\n"), { mode: "merge", space: "graph:x" }).then(
            () => assert.fail("a graph: space is reserved"),
            (error: unknown) => assert.strictEqual((error as { code?: string }).code, "E_SPACE_RESERVED"),
        );
        session.dispose();
    });

    it("a NodeId is the key when one space holds it, else <space>:<key>; { space, key } also works (9.1)", async () => {
        const session = stepsSession();
        await session.data.import(csv("people.csv", "id,name\na,Ann\nb,Bo\n"), { type: "person" });
        assert.deepStrictEqual(nodeIds(session), ["a", "b"]);
        assert.deepStrictEqual(session.data.ref("a"), { space: "person", key: "a" });
        assert.strictEqual(session.data.node("a")?.id, "a");
        await session.data.import(csv("pets.csv", "id,kind\na,cat\n"), { mode: "merge", type: "pet" });
        assert.deepStrictEqual(nodeIds(session), ["b", "person:a", "pet:a"]);
        assert.throws(() => session.data.ref("a"), /space/u);
        assert.strictEqual(session.data.node("a", { space: "pet" })?.id, "pet:a");
        assert.deepStrictEqual(session.data.ref("a", { space: "pet" }), { space: "pet", key: "a" });
        session.dispose();
    });

    it("a direct edit naming a key two spaces hold is refused with E_AMBIGUOUS_ID and changes nothing (8.3, 9.1)", async () => {
        const session = stepsSession();
        await session.data.import(csv("people.csv", "id\na\n"), { type: "person" });
        await session.data.import(csv("pets.csv", "id\na\n"), { mode: "merge", type: "pet" });
        const before = nodeIds(session);
        const refused = (error: unknown): void =>
            assert.strictEqual((error as { code?: string }).code, "E_AMBIGUOUS_ID");
        await session.data
            .updateNodes([{ id: "a", values: { score: 5 } }])
            .then(() => assert.fail("updateNodes must name the space"), refused);
        await session.data
            .addEdges([{ source: "a", target: "pet:a" }])
            .then(() => assert.fail("addEdges must name the space"), refused);
        await session.data.removeNodes(["a"]).then(() => assert.fail("removeNodes must name the space"), refused);
        assert.deepStrictEqual(session.data.edits(), []);
        assert.deepStrictEqual(nodeIds(session), before);
        await session.data.updateNodes([{ id: "pet:a", values: { score: 5 } }]);
        assert.deepStrictEqual(nodeIds(session), before, "the spelled NodeId edits the pet, minting nothing");
        session.dispose();
    });

    it("two plain imports sharing a key: an edge to the bare key is refused, not drawn to a new reader node", async () => {
        const session = stepsSession();
        await session.data.import(csv("1.csv", "source,target\na,b\n"));
        await session.data.import(csv("2.csv", "source,target\nb,c\n"), { mode: "merge" });
        const before = nodeIds(session);
        await session.data.addEdges([{ source: "b", target: "c" }]).then(
            () => assert.fail("b is held in two spaces"),
            (error: unknown) => assert.strictEqual((error as { code?: string }).code, "E_AMBIGUOUS_ID"),
        );
        assert.deepStrictEqual(nodeIds(session), before);
        session.dispose();
    });

    it("a replacing load takes every source out first, so the app's open-a-file keeps working", async () => {
        const session = stepsSession();
        await session.data.import(csv("one.csv", "source,target\na,b\nb,c\n"));
        assert.deepStrictEqual(nodeIds(session), ["a", "b", "c"]);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 2);
        await session.data.import(csv("two.csv", "source,target\nx,y\n"));
        assert.strictEqual(session.data.sources().length, 1);
        assert.deepStrictEqual(nodeIds(session), ["x", "y"]);
        await session.undo();
        assert.deepStrictEqual(nodeIds(session), ["a", "b", "c"]);
        assert.strictEqual(session.data.sources()[0]?.name, "one.csv");
        await session.redo();
        assert.deepStrictEqual(nodeIds(session), ["x", "y"]);
        session.dispose();
    });

    it("a node the reader adds goes in space source:reader (late findings, settled 3.1)", async () => {
        const session = stepsSession();
        await session.data.import(csv("t.csv", "source,target\na,b\n"));
        await session.data.addNodes([{ id: "X-1" }]);
        assert.deepStrictEqual(session.data.ref("X-1"), { space: "source:reader", key: "X-1" });
        assert.deepStrictEqual(
            session.data.edits().map((e) => [e.op, e.target]),
            [["add", { space: "source:reader", key: "X-1" }]],
        );
        assert.deepStrictEqual(session.data.sourcesOf("X-1"), ["reader"], "the reader supplies it (3.1)");
        await session.data.addEdges([{ source: "X-1", target: "a" }]);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 2);
        await session.data.updateNodes([{ id: "a", values: { score: 3 } }]);
        assert.strictEqual(session.data.node("a")?.score, 3);
        assert.notInclude(session.data.sourcesOf("a"), "reader", "an edit never credits the reader");
        const { text } = await session.project.save();
        assert.include(text, '{"id":"X-1","_source.loads":["reader"]}', "saved with its source");
        const [added, edge] = session.data.edits();
        await session.data.removeEdit(edge.id);
        assert.strictEqual(session.data.store.getSnapshot().edgeCount, 1, "taking back the edge");
        await session.data.removeEdit(added.id);
        assert.strictEqual(session.data.ref("X-1"), null, "taking back the add");
        await session.undo();
        assert.deepStrictEqual(session.data.ref("X-1"), { space: "source:reader", key: "X-1" }, "undo puts it back");
        await session.data.removeNodes(["b"]);
        assert.notInclude(nodeIds(session), "b");
        session.dispose();
    });

    it("mergeNodes is refused with E_UNSUPPORTED reason later", async () => {
        const session = stepsSession();
        await session.data.import(csv("t.csv", "source,target\na,b\n"));
        await session.data.mergeNodes(["a", "b"]).then(
            () => assert.fail("refused"),
            (error: unknown) => {
                const e = error as { code?: string; details?: { reason?: string } };
                assert.deepStrictEqual([e.code, e.details?.reason], ["E_UNSUPPORTED", "later"]);
            },
        );
        session.dispose();
    });
});
