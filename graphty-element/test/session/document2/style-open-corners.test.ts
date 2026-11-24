/**
 * @file A version 2 style section (spec 4.2) opened and saved through `project.open` and
 * `project.save` with the `save-files-v2` experiment on: layers this release cannot apply are
 * kept with their reason while the rest apply, the style tree is read row by row, value labels
 * are read only when whole, the open's column mapping renames edge layers' paths, and a save
 * writes an inline rule set's member selector as the rule it is and a kept set by its bare id.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2"] };

/**
 * A session holding three nodes and two edges.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    const session = createGraphSession(ON);
    await session.data.addNodes([
        { id: "a", dept: 1 },
        { id: "b", dept: 2 },
        { id: "c", dept: 1 },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b", weight: 2 },
        { source: "b", target: "c", weight: 3 },
    ]);
    return session;
}

/**
 * A style section file holding the given members.
 * @param body - The members.
 * @returns The file's text.
 */
function styleFile(body: JsonObject): string {
    return JSON.stringify({ kind: "graphty-style", version: 2, generator: { name: "test", version: "0" }, ...body });
}

/**
 * A node layer that sets a size.
 * @param id - Its id and name.
 * @param selector - Its selector.
 * @returns The layer.
 */
function sized(id: string, selector: JsonObject): JsonObject {
    return { id, name: id, target: "node", selector, set: { "node.size": 2 } };
}

/**
 * The names of the session's own layers (not the locked defaults).
 * @param session - The session.
 * @returns The names, bottom first.
 */
function ownNames(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => !layer.locked)
        .map((layer) => layer.name);
}

/**
 * The reasons the open kept each layer it did not apply, by pointer.
 * @param problems - The open's problems.
 * @returns `<pointer> <reason>` for each kept layer.
 */
function kept(problems: readonly DocumentProblem[]): string[] {
    return problems
        .filter((problem) => problem.code === "W_UNKNOWN_MEMBER" && problem.params.reason !== undefined)
        .map((problem) => `${String(problem.params.pointer)} ${String(problem.params.reason)}`);
}

describe("a version 2 style section opened", () => {
    it("keeps each layer it cannot apply with its reason, and applies the rest", async () => {
        const session = await graph();
        const report = await session.project.open(
            styleFile({
                layers: [
                    "not a layer",
                    sized("unknown match", { match: "telepathy" }),
                    sized("bad types", { match: "type", types: ["router", 3] }),
                    {
                        id: "no channel",
                        name: "no channel",
                        target: "node",
                        selector: { match: "everything" },
                        set: { "node.nope": 1 },
                    },
                    sized("everything", { match: "everything" }),
                    {
                        ...sized("typed edges", { match: "member", of: { types: ["link"] } }),
                        target: "edge",
                        set: { "edge.width": 2 },
                    },
                ],
            }),
        );
        const problems = report.problems as readonly DocumentProblem[];
        assert.includeMembers(kept(problems), [
            "/layers/0 E_BAD_LAYER",
            "/layers/1 E_BAD_SELECTOR",
            "/layers/2 E_BAD_SELECTOR",
            "/layers/3 E_UNKNOWN_CHANNEL",
        ]);
        assert.deepStrictEqual(ownNames(session), ["everything", "typed edges"]);
        // A type selector is applied as the ids of that type, which these edges have none of.
        const typed = session.styles.list().find((layer) => layer.name === "typed edges");
        assert.deepStrictEqual(typed?.selector, { match: "ids", edges: [] });
        session.dispose();
    });

    it("reports a member selector naming a set no open set is, and applies the layer as written", async () => {
        const session = await graph();
        const report = await session.project.open(
            styleFile({ layers: [sized("in set", { match: "member", of: { set: `set_${"0".repeat(26)}` } })] }),
        );
        assert.deepInclude(report.problems as readonly DocumentProblem[], {
            code: "W_REFERENCE_UNBOUND",
            params: { section: "style", pointer: "/layers/0", ref: `set_${"0".repeat(26)}` },
        });
        session.dispose();
    });

    it("keeps alone a layer the session refuses, applying the others and the section's shaders", async () => {
        const session = await graph();
        const report = await session.project.open(
            styleFile({
                layers: [
                    sized("fine", { match: "everything" }),
                    sized("broken", { match: "expression", where: "data.dept == == `1`" }),
                    sized("also fine", { match: "expression", where: "data.dept == `1`" }),
                ],
                shaders: [{ id: "glow", text: "not a shader" }, { id: 4 }],
            }),
        );
        assert.deepStrictEqual(ownNames(session), ["fine", "also fine"]);
        const reasons = kept(report.problems as readonly DocumentProblem[]);
        assert.lengthOf(reasons, 1);
        assert.match(reasons[0], /^\/layers\/1 E_/);
        session.dispose();
    });

    it("reads the style tree row by row: flags, folders and their children, and drops rows naming no applied layer", async () => {
        const session = await graph();
        await session.project.open(
            styleFile({
                layers: [sized("one", { match: "everything" }), sized("two", { match: "everything" })],
                tree: [
                    "not a row",
                    { layer: "missing" },
                    { layer: "one", pin: "top", locked: true, hidden: false },
                    { folder: "Group", hidden: true, children: [{ layer: "two" }, { layer: "gone" }] },
                    { neither: true },
                ],
            }),
        );
        assert.deepStrictEqual(ownNames(session), ["one", "two"]);
        const rows = session.styles.tree();
        const one = rows.find((row) => row.name === "one");
        assert.deepInclude(one, { kind: "layer", pin: "top", locked: true, hidden: false });
        const folder = rows.find((row) => row.kind === "folder");
        assert.deepInclude(folder, { name: "Group", hidden: true });
        assert.deepStrictEqual(
            folder?.children.map((row) => row.name),
            ["two"],
        );
        session.dispose();
    });

    it("reads a value label only when its path, label and value are whole", async () => {
        const session = await graph();
        await session.project.open(
            styleFile({
                layers: [],
                valueLabels: [
                    { path: "data.dept", value: 1, label: "Research" },
                    { path: "data.dept", value: { no: 1 }, label: "Object" },
                    { path: "data.dept", value: 2 },
                    "not a label",
                ],
            }),
        );
        assert.deepStrictEqual([...session.data.valueLabels("data.dept").values()], ["Research"]);
        session.dispose();
    });

    it("renames the columns an edge layer reads to the open data's, by the edge table's mapping", async () => {
        const session = await graph();
        await session.project.open(
            styleFile({
                layers: [
                    {
                        id: "heavy",
                        name: "heavy",
                        target: "edge",
                        selector: { match: "expression", where: "data.strength > `2`" },
                        encode: { "edge.width": { by: "data.strength", scale: "linear" } },
                    },
                    sized("node kept", { match: "expression", where: "data.strength > `2`" }),
                ],
            }),
            { columns: { edge: { strength: "weight" } } },
        );
        const byName = new Map(session.styles.list().map((layer) => [layer.name, layer]));
        assert.deepStrictEqual(byName.get("heavy")?.selector, { match: "expression", where: "data.weight > `2`" });
        assert.strictEqual((byName.get("heavy")?.encode?.["edge.width"] as { by?: unknown }).by, "data.weight");
        // A node layer reads the node table's mapping, which names none.
        assert.deepStrictEqual(byName.get("node kept")?.selector, {
            match: "expression",
            where: "data.strength > `2`",
        });
        session.dispose();
    });
});

describe("a version 2 style section saved", () => {
    it("writes an inline rule set's member selector as the rule and a kept set by its bare id", async () => {
        const session = await graph();
        const core = session.sets.create(
            { kind: "rule", where: "data.dept == `1`", reading: "induced" },
            { name: "Dept" },
        );
        await session.styles.add({
            name: "inline text",
            target: "node",
            selector: {
                match: "member",
                of: { define: { kind: "rule", where: "data.dept == `2`", reading: "induced" } },
            },
            set: { "node.size": 2 },
        });
        await session.styles.add({
            name: "inline tree",
            target: "node",
            selector: {
                match: "member",
                of: {
                    define: {
                        kind: "rule",
                        where: { kind: "range", attribute: "data.dept", min: 2 },
                        reading: "listed",
                    },
                },
            },
            set: { "node.size": 3 },
        });
        await session.styles.add({
            name: "kept set",
            target: "node",
            selector: { match: "member", of: { set: core } },
            set: { "node.size": 4 },
        });
        const saved = JSON.parse((await session.project.save({ format: 2, markSaved: false })).text) as JsonObject;
        const { style } = saved.sections as Record<string, JsonObject>;
        const selectors = new Map(
            (style.layers as JsonObject[]).map((layer) => [layer.name, layer.selector as JsonObject]),
        );
        assert.deepStrictEqual(selectors.get("inline text"), {
            match: "rule",
            where: { kind: "expression", where: "data.dept == `2`" },
            edges: "induced",
        });
        assert.deepStrictEqual(selectors.get("inline tree"), {
            match: "rule",
            where: { kind: "range", attribute: "data.dept", min: 2 },
            edges: "listed",
        });
        const member = selectors.get("kept set");
        assert.strictEqual(member?.match, "member");
        assert.match(String((member?.of as JsonObject).set), /^set_[0-9A-HJKMNP-TV-Z]{26}$/);
        session.dispose();
    });
});
