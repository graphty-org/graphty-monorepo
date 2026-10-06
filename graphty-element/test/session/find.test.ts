/**
 * @file `session.find`: what a find box lists as the reader types, without selecting anything.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type FindHit, type GraphSession, isGraphtyError } from "../../session";

/**
 * A small cast: nodes carry a name and a group, edges a kind and, like the nodes, a group.
 * @returns The session, loaded.
 */
async function cast(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "n1", name: "Valjean", group: 2 },
        { id: "n2", name: "Javert", group: 2 },
        { id: "n3", name: "Fantine", group: 3 },
        { id: "val", name: "Cosette", group: 2 },
        { id: "n5", name: "Valjeanne", group: 12, note: "not Valjean" },
    ]);
    await session.data.addEdges([
        { source: "n1", target: "n2", kind: "enemies", group: 2 },
        { source: "n1", target: "val", kind: "family" },
    ]);
    await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
    return session;
}

/**
 * The refusal code a call throws.
 * @param call - The call.
 * @returns The code, or what was thrown.
 */
function codeOf(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : error;
    }

    return "no error";
}

/**
 * A hit as a compact row for comparing.
 * @param hit - The hit.
 * @returns Its kind, id and where it matched.
 */
function row(hit: FindHit): [string, string | number, string] {
    return [hit.kind, hit.id, hit.match.path];
}

describe("finding without selecting", () => {
    it("lists node hits by name with what matched, and changes neither the selection nor the history", async () => {
        const session = await cast();
        const { version } = session.history;

        const found = session.find("valjean");

        assert.deepEqual(found.records.map(row), [
            ["node", "n1", "data.name"],
            ["node", "n5", "data.name"],
        ]);
        const [first] = found.records;
        assert.strictEqual(first.kind === "node" ? first.name : null, "Valjean");
        assert.deepEqual(first.match, { path: "data.name", value: "Valjean" });
        assert.strictEqual(found.total, 2);
        assert.strictEqual(found.offset, 0);
        assert.lengthOf(session.selection.nodes, 0, "the selection did not change");
        assert.strictEqual(session.history.version, version, "no step was recorded");
        session.dispose();
    });

    it("ranks an exact name or id first and names before attribute values, ties in graph order", async () => {
        const session = await cast();

        assert.deepEqual(session.find("val").records.map(row), [
            ["node", "val", "id"],
            ["node", "n1", "data.name"],
            ["node", "n5", "data.name"],
        ]);
        assert.deepEqual(
            session.find("not").records.map(row),
            [["node", "n5", "data.note"]],
            "an attribute value is found",
        );
        session.dispose();
    });

    it("selects exactly the hit through its target", async () => {
        const session = await cast();

        const [hit] = session.find("javert").records;
        await session.selection.apply(hit.target);

        assert.deepEqual(session.selection.nodes, ["n2"]);
        assert.lengthOf(session.selection.edges, 0);
        session.dispose();
    });

    it("finds an edge by its own values, with its ends' ids and names, never by its id or its ends", async () => {
        const session = await cast();

        const found = session.find("enem");

        assert.lengthOf(found.records, 1);
        const [hit] = found.records;
        assert.strictEqual(hit.kind, "edge");
        assert.deepEqual(hit.match, { path: "data.kind", value: "enemies" });
        assert.deepEqual(hit.kind === "edge" ? hit.ends : null, {
            source: { id: "n1", name: "Valjean" },
            target: { id: "n2", name: "Javert" },
        });
        await session.selection.apply(hit.target);
        assert.lengthOf(session.selection.edges, 1);
        assert.lengthOf(session.selection.nodes, 0);

        assert.deepEqual(session.find("1", { kinds: ["edge"] }).records, [], 'edge ids are "0" and "1"');
        assert.deepEqual(session.find("javert", { kinds: ["edge"] }).records, [], "an end's name finds no edge");
        session.dispose();
    });

    it("lists at most three value rows, commonest first, each target selecting exactly its count of one kind", async () => {
        const session = await cast();

        const { values } = session.find("2");

        assert.deepEqual(
            values.map(({ kind, path, value, count }) => [kind, path, value, count]),
            [
                ["node", "data.group", 2, 3],
                ["edge", "data.group", 2, 1],
            ],
            "the number 12 does not match a typed 2: numbers match only whole",
        );
        await session.selection.apply(values[0].target);
        assert.deepEqual([...session.selection.nodes].sort(), ["n1", "n2", "val"]);
        assert.lengthOf(session.selection.edges, 0, "a node row selects no edges, though edges carry the path");
        await session.selection.apply(values[1].target);
        assert.lengthOf(session.selection.edges, 1);
        assert.lengthOf(session.selection.nodes, 0);
        session.dispose();
    });

    it("says when a filter hides a hit", async () => {
        const session = await cast();
        await session.visibility.set({ kind: "member", of: { nodes: ["n2", "n3"] } });

        assert.isUndefined(session.find("javert").records[0].excludedBy);
        assert.deepEqual(session.find("valjean").records[0].excludedBy, { kind: "filter" });
        assert.strictEqual(session.find("valjean", { scope: "visible" }).total, 0, "the visible scope drops it");
        assert.isUndefined(session.find("javert", { scope: "visible" }).records[0].excludedBy);
        session.dispose();
    });

    it("searches only a scope when one is named, and counts value rows in it", async () => {
        const session = await cast();

        const found = session.find("2", { scope: { nodes: ["n1", "n3"] } });

        assert.deepEqual(
            found.values.map((value) => [value.kind, value.count]),
            [["node", 1]],
        );
        assert.deepEqual(session.find("valjean", { scope: { nodes: ["n5"] } }).records.map(row), [
            ["node", "n5", "data.name"],
        ]);
        session.dispose();
    });

    it("pages with offset and limit, reports the total and the revision, and finds nothing for blank text", async () => {
        const session = await cast();

        const page = session.find("n", { kinds: ["node"], offset: 1, limit: 2 });

        assert.lengthOf(page.records, 2);
        assert.strictEqual(page.offset, 1);
        assert.isAbove(page.total, 3);
        const blank = session.find("   ");
        assert.deepEqual([blank.records, blank.values, blank.total], [[], [], 0]);

        await session.data.addNodes([{ id: "n6", name: "Marius" }]);
        assert.notStrictEqual(session.find("n").revision, page.revision, "a data change moves the revision");
        assert.strictEqual(session.find("marius").records.length, 1, "and the index sees the new node");
        session.dispose();
    });

    it("reads the text box grammar: exact:, <attribute>:, and refuses regex: and = while typing", async () => {
        const session = await cast();

        assert.deepEqual(session.find("exact:valjean").records.map(row), [["node", "n1", "data.name"]]);
        assert.deepEqual(session.find("id:val").records.map(row), [["node", "val", "id"]]);
        assert.deepEqual(session.find("kind:fam").records.map(row), [["edge", "1", "data.kind"]]);
        assert.deepEqual(
            session.find("data.kind:fam").records.map(row),
            [["edge", "1", "data.kind"]],
            "the column key as match.path reports it is also a prefix",
        );
        assert.strictEqual(session.find("regex:^V").notSearchable, "regex");
        assert.strictEqual(session.find("=data.group == `2`").notSearchable, "expression");
        assert.lengthOf(session.find("regex:(").records, 0, "a half-typed pattern does not throw");
        session.dispose();
    });

    it("ignores case and accents", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a", city: "Montréal" }]);

        assert.deepEqual(session.find("MONTREAL").records.map(row), [["node", "a", "data.city"]]);
        session.dispose();
    });

    it("finds and selects numeric ids, and names a node by its id when no label column is set", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: 1 }, { id: 10 }]);

        const found = session.find("1");

        assert.deepEqual(found.records.map(row), [
            ["node", 1, "id"],
            ["node", 10, "id"],
        ]);
        const [hit] = found.records;
        assert.strictEqual(hit.kind === "node" ? hit.name : null, "1");
        await session.selection.apply(hit.target);
        assert.deepEqual(session.selection.nodes, [1]);
        session.dispose();
    });

    it("finds a column whose name holds spaces and dots by its literal key", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", "shared chapters": "twelve" },
            { id: "b", "a.b": "twelve" },
        ]);

        const { values } = session.find("twelve");

        assert.sameDeepMembers(
            values.map(({ path, count }) => [path, count]),
            [
                ["data.shared chapters", 1],
                ["data.a.b", 1],
            ],
        );
        for (const value of values) {
            await session.selection.apply(value.target);
            assert.deepEqual(session.selection.nodes, [value.path === "data.a.b" ? "b" : "a"]);
        }
        session.dispose();
    });

    it("refuses a bad window or kind", async () => {
        const session = await cast();

        assert.strictEqual(
            codeOf(() => session.find("v", { limit: -1 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => session.find("v", { offset: 1.5 })),
            "E_OPTION_RANGE",
        );
        assert.strictEqual(
            codeOf(() => session.find("v", { kinds: ["value" as "node"] })),
            "E_OPTION_RANGE",
        );
        session.dispose();
    });
});
