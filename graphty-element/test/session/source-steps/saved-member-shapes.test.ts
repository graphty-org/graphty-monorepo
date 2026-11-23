/**
 * @file Opening a file whose `graphty-sources` member carries sources and steps not shaped as saved
 * (design/data/multiple-data-sources-design.md, section 10): each wrong shape is reported as
 * `E_BAD_DOCUMENT` with a pointer to the part that is wrong, and the file still opens. Also the
 * reader's own edits of every kind, and a copy holding unset and null cells in one column (saved
 * as a json column listing its unset rows), saved and reopened as the same graph.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { full } from "./scenario";

/** A saved file, parsed. */
interface SavedFile {
    members: Record<string, unknown>[];
}

/**
 * The `graphty-sources` member of a parsed file.
 * @param doc - The file.
 * @returns The member.
 */
function sourcesMember(doc: SavedFile): Record<string, unknown> & { sources: Record<string, unknown>[] } {
    const member = doc.members.find((m) => m.kind === "graphty-sources");
    assert.isDefined(member);

    return member as Record<string, unknown> & { sources: Record<string, unknown>[] };
}

/** The saved text of the full scenario: four sources, steps, types and the reader source. */
let savedText: Promise<string> | undefined;

/**
 * The full scenario's saved text, made once.
 * @returns The text.
 */
function scenarioText(): Promise<string> {
    savedText ??= (async () => {
        const { session } = await full();
        const { text } = await session.project.save();
        session.dispose();
        return text;
    })();

    return savedText;
}

/**
 * Open the scenario's file after changing its member, with the experiment on.
 * @param change - Changes the member in place.
 * @returns The pointers of the `E_BAD_DOCUMENT` problems the open reported, and how many nodes it opened.
 */
async function openChanged(
    change: (member: Record<string, unknown> & { sources: Record<string, unknown>[] }) => void,
): Promise<{ pointers: string[]; nodes: number }> {
    const doc = JSON.parse(await scenarioText()) as SavedFile;
    change(sourcesMember(doc));
    const q = createGraphSession({ features: ["source-steps"] });
    const report = await q.project.open(JSON.stringify(doc));
    const pointers = report.problems
        .filter((p) => p.code === "E_BAD_DOCUMENT")
        .map((p) => (p.params as { pointer?: string }).pointer ?? "");
    const nodes = q.data.nodes({ scope: "graph" }).length;
    q.dispose();

    return { pointers, nodes };
}

/**
 * The first source's record, which is a file source.
 * @param member - The member.
 * @returns The record.
 */
const first = (member: { sources: Record<string, unknown>[] }): Record<string, unknown> => member.sources[0];

/**
 * The reader source's saved operations.
 * @param member - The member.
 * @returns The list.
 */
function operations(member: { sources: Record<string, unknown>[] }): Record<string, unknown>[] {
    const reader = member.sources.at(-1) as { copy: { operations: Record<string, unknown>[] } };
    return reader.copy.operations;
}

/** Each wrong shape, and the end of the pointer the open reports for it. */
const WRONG: [string, (member: Record<string, unknown> & { sources: Record<string, unknown>[] }) => void, string][] = [
    ["sources that are not a list", (m) => Object.assign(m, { sources: {} }), "/sources"],
    [
        "a step with an unknown op",
        (m) => (m.joins as Record<string, unknown>[]).push({ op: "join.x", source: "s" }),
        "/joins",
    ],
    [
        "a type of an unknown kind",
        (m) => (m.types as Record<string, unknown>[]).push({ name: "t", kind: "x", rules: [] }),
        "/types",
    ],
    ["a build stamp that is not a ULID", (m) => Object.assign(m, { build: "nope" }), "/build"],
    ["a source of an unknown kind", (m) => Object.assign(first(m), { kind: "carrier-pigeon" }), "/sources/0"],
    ["a source whose label is not text", (m) => Object.assign(first(m), { label: 3 }), "/sources/0"],
    ["a source with no copy id", (m) => Object.assign(first(m), { origin: {} }), "/sources/0"],
    ["a source whose format is not text", (m) => Object.assign(first(m), { format: 7 }), "/sources/0"],
    ["a source whose options are not an object", (m) => Object.assign(first(m), { options: "x" }), "/sources/0"],
    [
        "a copy with a table that is neither nodes nor edges",
        (m) => Object.assign(first(m), { copy: { rows: {} } }),
        "/sources/0",
    ],
    ["a copy table that is a list", (m) => Object.assign(first(m), { copy: { edges: [] } }), "/sources/0"],
    [
        "a copy table whose columns differ in length",
        (m) => Object.assign(first(m), { copy: { edges: { a: [1, 2], b: [1] } } }),
        "/sources/0",
    ],
    ["a source saved twice", (m) => m.sources.splice(1, 0, structuredClone(first(m))), "/sources/1"],
    ["a reader operation of an unknown op", (m) => operations(m).push({ op: "smash" }), "/copy/operations"],
    ["an added node with no dtypes", (m) => operations(m).push({ op: "add", node: { id: "z" } }), "/copy/operations"],
    [
        "an added edge with no ends",
        (m) => operations(m).push({ op: "add", edge: { id: "z" }, dtypes: {} }),
        "/copy/operations",
    ],
    ["an add naming no node", (m) => operations(m).push({ op: "add", node: "z", dtypes: {} }), "/copy/operations"],
    [
        "an edit naming no column",
        (m) => operations(m).push({ op: "edit", node: { id: "z" }, value: 1 }),
        "/copy/operations",
    ],
    ["a removal naming nothing", (m) => operations(m).push({ op: "remove" }), "/copy/operations"],
];

describe("source-steps: a member not shaped as saved", () => {
    it("opens the scenario's own file with no problems", async () => {
        const opened = await openChanged(() => undefined);
        assert.deepStrictEqual(opened.pointers, []);
        assert.isAbove(opened.nodes, 0);
    });

    it.each(WRONG)("reports %s at its pointer and still opens the graph", async (_name, change, pointer) => {
        const opened = await openChanged(change);
        assert.lengthOf(opened.pointers, 1, JSON.stringify(opened.pointers));
        assert.isTrue(opened.pointers[0].endsWith(pointer), `${opened.pointers[0]} ends with ${pointer}`);
        assert.isAbove(opened.nodes, 0, "the embedded graph opens");
    });
});

/**
 * The graph's nodes and edges as sorted text, edge ids left out.
 * @param session - The session.
 * @returns The text.
 */
function graphOf(session: GraphSession): string {
    const sorted = (r: Readonly<Record<string, unknown>>): string =>
        JSON.stringify(Object.fromEntries(Object.entries(r).sort(([a], [b]) => (a < b ? -1 : 1))));
    return JSON.stringify([
        session.data.nodes({ scope: "graph" }).map(sorted).sort(),
        session.data
            .edges({ scope: "graph" })
            .map(({ id: _id, ...e }) => sorted(e))
            .sort(),
    ]);
}

/**
 * Save a session and open the file in a fresh one with the experiment on.
 * @param session - The session to save; disposed.
 * @returns The opened session and the open's problem codes.
 */
async function reopen(session: GraphSession): Promise<{ q: GraphSession; problems: string[] }> {
    const { text } = await session.project.save();
    session.dispose();
    const q = createGraphSession({ features: ["source-steps"] });
    const report = await q.project.open(text);
    return { q, problems: report.problems.map((p) => p.code) };
}

describe("source-steps: what a save writes and a reopen reads back", () => {
    it("the reader's added, edited and removed nodes and an added edge", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
                    edges: [{ source: "a", target: "b" }],
                }),
            },
        });
        await session.data.addNodes([{ id: "d", tags: ["x"], weight: 2, on: true }]);
        await session.data.updateNodes([{ id: "a", values: { note: "first" } }]);
        await session.data.removeNodes(["c"]);
        await session.data.addEdges([{ source: "b", target: "d", weight: 4 }]);
        const graph = graphOf(session);

        const { q, problems } = await reopen(session);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(graphOf(q), graph);
        assert.sameMembers(
            q.data.nodes({ scope: "graph" }).map((n) => n.id),
            ["a", "b", "d"],
        );
        q.dispose();
    });

    it("a column holding an unset cell, a null and a value reopens as the same graph", async () => {
        // The null and the unset cell are both left out of the graph's records; the copy keeps them apart.
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [{ id: "a", x: 1 }, { id: "b", x: null }, { id: "c" }],
                    edges: [],
                }),
            },
        });
        const graph = graphOf(session);

        const { q, problems } = await reopen(session);
        assert.deepStrictEqual(problems, []);
        assert.strictEqual(graphOf(q), graph);
        const byId = new Map(q.data.nodes({ scope: "graph" }).map((n) => [n.id, n]));
        assert.strictEqual(byId.get("a")?.x, 1);
        assert.isFalse(Object.hasOwn(byId.get("c") ?? {}, "x"), "the unset cell stays unset");
        q.dispose();
    });
});
