/**
 * @file Columns into new nodes (`extract`) from a source's node rows: one file split into several
 * node types, a cell split on a separator, and columns carried onto the new nodes. Each is
 * previewed, committed, read back by `steps()`, edited, undone, and saved and reopened as the same
 * graph.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors/GraphtyError";
import { createGraphSession, type GraphSession } from "../../../src/session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

/** P3 has no tag, P4 repeats one. */
const PEOPLE = csv(
    "people.csv",
    "person,tags,bldg,floors",
    "P1,keyholder,H1,4",
    "P2,night-shift; contractor;keyholder,H1,4",
    "P3,,H2,9",
    "P4,contractor;;contractor,,",
);

/**
 * Each edge as `<source>-<target>`, sorted.
 * @param session - The session.
 * @returns The edges.
 */
const drawn = (session: GraphSession): string[] =>
    session.data
        .edges()
        .map((e) => `${String(e.source)}-${String(e.target)}`)
        .sort();

/**
 * The graph and the Extracts its steps read back.
 * @param session - The session.
 * @returns The edges, the nodes with their values, and the Extracts.
 */
const now = (session: GraphSession): { edges: string[]; nodes: unknown[]; extracts: unknown[] } => ({
    edges: drawn(session),
    nodes: session.data.nodes().map((n) => [n.id, n.tags, n.bldg, n.floors]),
    extracts: session.data.steps().map((row) => row.extract),
});

/**
 * The graph after a save and an open, as `now` reads it.
 * @param session - The session.
 * @returns The reopened graph.
 */
async function reopened(session: GraphSession): Promise<ReturnType<typeof now>> {
    const { text } = await session.project.save();
    const other = createGraphSession({ features: ["source-steps"] });
    const report = await other.project.open(text);
    assert.deepStrictEqual(report.problems, []);
    const out = now(other);
    other.dispose();
    return out;
}

/**
 * The nodes of each type, by key.
 * @param session - The session.
 * @param space - The type's space.
 * @returns The keys, sorted.
 */
const keysIn = (session: GraphSession, space: string): string[] =>
    session.data
        .nodes()
        .map((n) => session.data.nodeRef(n.id))
        .flatMap((ref) => (ref?.space === space ? [ref.key] : []))
        .sort();

/**
 * The reason of the `E_BAD_COMMAND` a call throws.
 * @param call - The call.
 * @returns The reason.
 */
function reason(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        if (isGraphtyError(error) && error.code === "E_BAD_COMMAND") {
            return error.details.reason;
        }
        throw error;
    }
    return assert.fail("nothing was refused");
}

describe("source-steps drafts: Extract from node rows", () => {
    it("makes a node of each tag in a split cell, joined to the row's own node", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const people = await d.stage(PEOPLE, { key: "person", type: "person" });
        const part = d.extract(people, { column: "tags", split: ";", type: "tag", edgeType: "tagged" });
        assert.deepStrictEqual(
            d.steps().map((row) => row.op),
            ["join.add", "join.edges"],
            "the staged people are added first",
        );
        const row = d.preview().steps[1];
        assert.deepInclude(row?.buckets, {
            part,
            newNodes: 3,
            newEdges: 5,
            matched: 3,
            emptyKey: 1,
            unmatched: 0,
            newNodeTypes: { tag: 3 },
            newEdgeTypes: { tagged: 5 },
        });
        assert.isNull(row?.act ?? null, "no Merge or Connect made it");
        assert.deepStrictEqual(row?.extract, {
            column: "tags",
            from: "row",
            space: "tag",
            type: "tag",
            edgeType: "tagged",
            split: ";",
        });
        await d.commit();
        assert.deepStrictEqual(keysIn(session, "tag"), ["contractor", "keyholder", "night-shift"]);
        assert.deepStrictEqual(drawn(session), [
            "P1-keyholder",
            "P2-contractor",
            "P2-keyholder",
            "P2-night-shift",
            "P4-contractor",
        ]);
        assert.isNotNull(session.data.lineage({ load: people, key: `${String(part)}/P2|keyholder` }));
        assert.deepStrictEqual(await reopened(session), now(session));
        const made = now(session);
        await session.undo();
        assert.lengthOf(session.data.nodes(), 0, "one undo step takes back the Extract and the add");
        await session.redo();
        assert.deepStrictEqual(now(session), made);
        session.dispose();
    });

    it("splits one file into two node types: the carried columns leave the rows' own nodes", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const people = await d.stage(PEOPLE, { key: "person", type: "person" });
        d.extract(people, { column: "bldg", type: "building", columns: ["floors"] });
        assert.lengthOf(d.steps(), 2, "one step carries the columns");
        assert.deepInclude(d.steps()[1]?.buckets, { newNodes: 2, newEdges: 3, matched: 3, emptyKey: 1, rowsDiffer: 0 });
        assert.deepInclude(d.steps()[1]?.extract, { column: "bldg", from: "row", columns: ["floors"] });
        d.renameColumn({ kind: "node", name: "floors" }, "storeys", { source: people });
        assert.deepInclude(d.steps()[1]?.extract, { columns: ["storeys"] }, "a rename follows into the step");
        d.undo();
        await d.commit();
        assert.strictEqual(session.data.node("H1")?.floors, 4);
        assert.strictEqual(session.data.node("H2")?.floors, 9);
        assert.isUndefined(session.data.node("P1")?.floors, "the column is the building's now");
        assert.strictEqual(session.data.node("P1")?.bldg, "H1", "the column naming it stays");
        assert.deepStrictEqual(session.data.lineage({ space: "building", key: "H1" })?.supplied, [people]);
        assert.deepStrictEqual(await reopened(session), now(session));

        // The people fold, never the buildings their rows named; and a buildings file meets them with no question.
        const more = session.data.draft({ askOverlap: true });
        const hr = await more.stage(csv("hr.csv", "id", "P1"), { key: "id", type: "hr" });
        more.add(hr);
        more.merge({ from: { source: people, field: "person" }, into: { space: "hr" } });
        assert.deepInclude(more.steps().at(-1)?.buckets, { merged: 1, keptNew: 3 });
        const buildings = await more.stage(csv("b.csv", "bldg,city", "H1,Oslo"), { key: "bldg", type: "building" });
        more.add(buildings);
        assert.lengthOf(more.preview().questions, 0);
        more.dispose();

        await session.data.setStepOff(1, true);
        assert.strictEqual(session.data.node("P1")?.floors, 4, "off, the column is the row's again");
        await session.data.removeStep(1);
        assert.lengthOf(session.data.nodes(), 4);
        session.dispose();
    });

    it("splits a file whose rows are of two kinds by the column that says which", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const all = await d.stage(csv("all.csv", "id,kind,in", "P1,person,H1", "H1,building,", "P2,person,H1"), {
            key: "id",
        });
        d.extract(all, { column: "in", space: `source:${all}` });
        d.declareType({ name: "person", kind: "node", rules: [{ source: all, column: "kind", values: ["person"] }] });
        d.declareType({
            name: "building",
            kind: "node",
            rules: [{ source: all, column: "kind", values: ["building"] }],
        });
        assert.deepStrictEqual(d.preview().after.nodeTypes, { person: 2, building: 1 });
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["P1-H1", "P2-H1"], "a value naming a row of the file meets its node");
        session.dispose();
    });

    it("edits in place: the separator, and any choice by making the act again", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const people = await d.stage(PEOPLE, { key: "person", type: "person" });
        d.extract(people, { column: "tags", type: "tag", columns: ["floors"] });
        assert.strictEqual(d.steps()[1]?.buckets?.newNodes, 3, "unsplit, each cell is one value");
        d.editStep(1, { split: ";" });
        assert.deepInclude(d.steps()[1]?.extract, { split: ";", columns: ["floors"] });
        assert.strictEqual(d.steps()[1]?.buckets?.newEdges, 5);
        d.editStep(1, { split: null });
        assert.notProperty(d.steps()[1]?.extract ?? {}, "split");
        d.undo();
        d.exclude(1, ["P2"], { column: "person" });
        assert.strictEqual(d.steps()[1]?.buckets?.newEdges, 2);
        const choices = d.steps()[1]?.extract;
        assert.isNotNull(choices ?? null);
        if (choices !== null && choices !== undefined) {
            d.replaceStep(1, {
                act: "extract",
                source: people,
                options: { ...choices, type: "label", space: "label" },
            });
        }
        assert.lengthOf(d.steps(), 2);
        assert.deepInclude(d.steps()[1]?.extract, { type: "label", split: ";" });
        assert.strictEqual(d.steps()[1]?.buckets?.newEdges, 2, "it keeps its rows left out");
        await d.commit();
        assert.deepStrictEqual(keysIn(session, "label"), ["contractor", "keyholder"]);
        session.dispose();
    });

    it("keeps an edge per row when told to, each to each of the cell's values", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const people = await d.stage(PEOPLE, { key: "person", type: "person" });
        d.extract(people, { column: "tags", split: ";", type: "tag" });
        d.editStep(1, { repeated: "both" });
        assert.strictEqual(d.steps()[1]?.buckets?.newEdges, 5);
        assert.deepStrictEqual(
            d.preview().issues.filter((each) => each.code === "E_EDGE_KEY_COLLISION"),
            [],
        );
        session.dispose();
    });

    it("makes a node of each value of a list cell", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [{ id: "a", langs: ["en", "no"] }, { id: "b" }], edges: [] }) },
        });
        const source = session.data.sources()[0]?.key ?? "";
        await session.data.extract(source, { column: "langs", from: "row", type: "language" });
        assert.deepStrictEqual(drawn(session), ["a-en", "a-no"]);
        session.dispose();
    });

    it("refuses what it cannot read, with a reason", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const d = session.data.draft();
        const people = await d.stage(PEOPLE, { key: "person", type: "person" });
        const calls = await d.stage(csv("calls.csv", "a,b,os", "x,y,z"), {
            edges: { from: { column: "a" }, to: { column: "b" } },
        });
        assert.strictEqual(
            reason(() => d.extract(people, { column: "" })),
            "no-field",
        );
        assert.strictEqual(
            reason(() => d.extract(people, { column: "tags", split: "" })),
            "split",
        );
        assert.strictEqual(
            reason(() => d.extract(people, { column: "tags", from: "target" })),
            "no-edges",
        );
        assert.strictEqual(
            reason(() => d.extract(calls, { column: "os", from: "row" })),
            "no-nodes",
        );
        assert.lengthOf(d.steps(), 0, "a refused Extract adds nothing");
        d.extract(calls, { column: "os" });
        assert.strictEqual(
            reason(() => {
                d.editStep(0, { split: ";" });
            }),
            "extract",
        );
        session.dispose();
    });
});

describe("source-steps drafts: Extract from edge rows", () => {
    /**
     * Calls in the graph and a draft open.
     * @returns The session, the draft and the calls' key.
     */
    async function calls(): Promise<{
        session: GraphSession;
        d: ReturnType<GraphSession["data"]["draft"]>;
        c: string;
    }> {
        const session = createGraphSession({ features: ["source-steps"] });
        const ends = {
            edges: { from: { column: "a", space: "person" }, to: { column: "b", space: "person" } },
        };
        await session.data.import(csv("calls.csv", "a,b,apps,ver", "x,y,sms|web,2", "y,x,web,2", "x,z,,3"), ends);
        return { session, d: session.data.draft(), c: session.data.sources()[0]?.key ?? "" };
    }

    it("splits a cell from either end, and the carried columns leave the edges", async () => {
        const { session, d, c } = await calls();
        d.extract(c, { column: "apps", split: "|", from: "target", type: "app", columns: ["ver"] });
        assert.lengthOf(d.steps(), 2);
        assert.deepStrictEqual(d.steps()[1]?.extract, {
            column: "apps",
            from: "target",
            space: "app",
            type: "app",
            columns: ["ver"],
            split: "|",
        });
        assert.deepInclude(d.steps()[1]?.buckets, { newNodes: 2, newEdges: 3, matched: 2, emptyKey: 1 });
        await d.commit();
        assert.deepStrictEqual(drawn(session), ["x-web", "x-y", "x-z", "y-sms", "y-web", "y-x"]);
        assert.strictEqual(session.data.node("web")?.ver, 2);
        assert.isFalse(session.data.edges().some((e) => e.ver !== undefined));
        assert.deepStrictEqual(await reopened(session), now(session));
        session.dispose();
    });

    it("reads back the columns a step of their own moves, and that step goes with it", async () => {
        const { session, d, c } = await calls();
        d.extract(c, { column: "apps", type: "app", columns: ["ver"] });
        assert.deepStrictEqual(
            d.steps().map((row) => row.op),
            ["join.add", "join.edges", "join.node-values"],
        );
        const choices = d.steps()[1]?.extract;
        assert.deepStrictEqual(choices, {
            column: "apps",
            from: "source",
            space: "app",
            type: "app",
            columns: ["ver"],
        });
        if (choices !== null && choices !== undefined) {
            d.exclude(1, ["x"]);
            d.replaceStep(1, { act: "extract", source: c, options: { ...choices, from: "target" } });
        }
        assert.deepStrictEqual(
            d.steps().map((row) => row.op),
            ["join.add", "join.edges", "join.node-values"],
        );
        assert.deepInclude(d.steps()[1]?.extract, { from: "target", columns: ["ver"] });
        assert.isNotNull(d.steps()[1]?.except ?? null, "it keeps its rows left out");
        d.removeStep(1);
        assert.lengthOf(d.steps(), 1);
        await d.commit();
        assert.isTrue(
            session.data.edges().every((e) => e.ver !== undefined),
            "the column is the edges' again",
        );
        session.dispose();
    });
});
