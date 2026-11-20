/**
 * @file What the staged section and the join card read before anything is built (design
 * design/data/multiple-data-sources-design.md, sections 5.1, 5.2 and 9.2), on the founding door
 * entries example: a source's tables and one column's profile, the profile of a space's keys, the
 * committed source a staged one is named like, a staged source's mapping changed outside a draft,
 * Make an edge ignoring spaces, and a merge's unmatched rows and repeated keys changed after a
 * preview. All behind the `source-steps` experiment.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { refused } from "./scenario";

/**
 * A CSV source.
 * @param name - Its name.
 * @param data - Its lines.
 * @returns What `import` and `stage` take.
 */
function csv(name: string, ...data: string[]): { type: string; config: { data: string }; name: string } {
    return { type: "csv", config: { data: data.join("\n") }, name };
}

const PEOPLE = csv("people.csv", "badge,name,dept", "B1,Ann,Ops", "B2,Bo,Lab", "B3,Cy,Sales");
/** B9 badges no person, b3 is B3 typed in lower case, B1 and B2 badged in twice. */
const ENTRIES = csv(
    "entries.csv",
    "entry,badge,door",
    "E1,B1,D1",
    "E2,B1,D2",
    "E3,B2,D1",
    "E4,B9,D1",
    "E5,b3,D3",
    "E6,B2,D2",
);
/** Visitors: V1 is new, B1 is a person already. */
const VISITORS = csv("visitors.csv", "badge,name", "B1,Ann", "V1,Val");

/**
 * People in the graph, typed person.
 * @returns The session and the people source.
 */
async function withPeople(): Promise<{ session: GraphSession; people: string }> {
    const session = createGraphSession({ features: ["source-steps"] });
    await session.data.import(PEOPLE, { key: "badge", type: "person" });
    return { session, people: session.data.sources({ staged: true })[0]?.key ?? "" };
}

describe("source-steps: a source's tables and profiles", () => {
    it("profiles a staged column: kind, valid, empty, distinct, repeated keys and rows, samples", async () => {
        const { session } = await withPeople();
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
        const table = session.data.sourceTable(entries);
        assert.strictEqual(table.source, entries);
        assert.deepStrictEqual(table.profile("badge"), {
            kind: "text",
            rows: 6,
            valid: 6,
            empty: 0,
            distinct: 4,
            repeated: { keys: 2, rows: 4 },
            samples: ["B1", "B2", "B9", "b3"],
        });
        assert.deepInclude(table.profile("door"), { distinct: 3, repeated: { keys: 2, rows: 5 } });
        assert.deepInclude(table.profile("entry"), { distinct: 6, repeated: { keys: 0, rows: 0 } });

        const facts = table.summary();
        assert.strictEqual(facts.tables.length, 1);
        assert.deepInclude(facts.tables[0], { table: "nodes", rows: 6 });
        assert.sameMembers([...(facts.tables[0]?.columns ?? [])], ["entry", "badge", "door"]);
        assert.strictEqual(facts.size, new TextEncoder().encode(ENTRIES.config.data).byteLength);
        assert.strictEqual(facts.format, "csv");
        assert.isTrue(facts.origin.startsWith("sha256:"));
        assert.isFalse(Number.isNaN(Date.parse(facts.loadedAt ?? "")), "read time is RFC 3339");
        assert.strictEqual(facts.delimiter?.value, ",");

        const missing = await refused(() => Promise.resolve(table.profile("floor")), "E_UNKNOWN_ATTRIBUTE");
        assert.deepStrictEqual(missing, { source: entries, column: "floor", table: "nodes" });
        await refused(() => Promise.resolve(session.data.sourceTable("src_none")), "E_LOAD_UNKNOWN");
        session.dispose();
    });

    it("reads a number column, empty cells, and a built source's rows", async () => {
        const { session, people } = await withPeople();
        const scores = await session.data.stage(csv("scores.csv", "badge,score", "B1,4", "B2,", "B3,x", "B4,7"), {
            key: "badge",
        });
        assert.deepInclude(session.data.sourceTable(scores).profile("score"), {
            kind: "number",
            rows: 4,
            valid: 2,
            empty: 1,
            distinct: 3,
        });
        assert.deepInclude(session.data.sourceTable(people).profile("dept"), { rows: 3, distinct: 3 });
        session.dispose();
    });

    it("profiles the keys of a space: Field 1's Key, in the session and in a draft", async () => {
        const { session } = await withPeople();
        assert.deepStrictEqual(session.data.profile({ space: "person" }), {
            kind: "text",
            rows: 3,
            valid: 3,
            empty: 0,
            distinct: 3,
            repeated: { keys: 0, rows: 0 },
            samples: ["B1", "B2", "B3"],
        });
        assert.strictEqual(session.data.profile({ space: "nowhere" }).rows, 0);

        const visitors = await session.data.stage(VISITORS, { key: "badge", type: "visitor" });
        const draft = session.data.draft();
        assert.deepStrictEqual(draft.sourceTable(visitors).profile("badge").samples, ["B1", "V1"]);
        const staged = await draft.stage(ENTRIES, { key: "entry" });
        assert.strictEqual(draft.sourceTable(staged).profile("badge").distinct, 4, "a source the draft staged");
        draft.add(visitors);
        assert.strictEqual(draft.profile({ space: "visitor" }).rows, 2, "the draft's build");
        assert.strictEqual(session.data.profile({ space: "visitor" }).rows, 0, "the committed build");
        draft.dispose();
        session.dispose();
    });

    it("names the committed source a staged one is named like", async () => {
        const { session, people } = await withPeople();
        const again = await session.data.stage(PEOPLE, { key: "badge" });
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const byKey = new Map(session.data.sources({ staged: true }).map((s) => [s.key, s]));
        assert.strictEqual(byKey.get(again)?.sameName, people);
        assert.isUndefined(byKey.get(people)?.sameName, "a built source names none");
        assert.isUndefined(byKey.get(entries)?.sameName, "no committed source is named entries.csv");
        session.dispose();
    });
});

describe("source-steps: what a staged source's rows are for, as its summary reads it", () => {
    it("reads rows are, key, picked space, type and edge ends, and the type proposes the space Add asks about", async () => {
        const { session } = await withPeople();
        const visitors = await session.data.stage(VISITORS);
        const guessed = session.data.sourceTable(visitors).summary().mapping;
        assert.strictEqual(guessed.rows, "nodes");
        assert.isUndefined(guessed.space, "a space nobody picked reads unset");
        assert.isUndefined(guessed.type);

        await session.data.setMapping(visitors, { nodes: { key: "badge" }, type: "person" });
        assert.deepStrictEqual(session.data.sourceTable(visitors).summary().mapping, {
            rows: "nodes",
            key: "badge",
            type: "person",
        });
        // The type proposes the space, so Add asks whether B1 is the same person.
        const draft = session.data.draft({ askOverlap: true });
        draft.add(visitors);
        assert.deepStrictEqual(
            draft.preview().questions.map((q) => [q.params.space, q.params.count, q.params.of]),
            [["person", 1, 2]],
        );
        draft.dispose();

        await session.data.setMapping(visitors, { space: "guest" });
        assert.strictEqual(session.data.sourceTable(visitors).summary().mapping.space, "guest", "a picked space");
        await session.data.setMapping(visitors, { type: "visitor" });
        assert.strictEqual(
            session.data.sourceTable(visitors).summary().mapping.space,
            "guest",
            "a type never moves a picked space",
        );

        const visits = await session.data.stage(csv("visits.csv", "from,to,id", "B1,D1,v1", "B2,D2,v2"), {
            edges: { from: { column: "from" }, to: { column: "to" } },
        });
        await session.data.setMapping(visits, {
            edges: { sourceSpace: "person", edgeId: "id" },
            endTypes: { source: "person", target: "door" },
        });
        assert.deepStrictEqual(session.data.sourceTable(visits).summary().mapping, {
            rows: "edges",
            edges: { source: "from", target: "to", sourceSpace: "person", edgeId: "id" },
            endTypes: { source: "person", target: "door" },
        });
        session.dispose();
    });
});

describe("source-steps: a staged source's mapping outside a draft", () => {
    it("changes the key the live match counts read, writes the type rule at once, and records no step", async () => {
        const { session, people } = await withPeople();
        const visitors = await session.data.stage(VISITORS, { key: "name" });
        const steps = session.history.steps.length;
        const pair = { from: { source: visitors, field: "badge" }, into: { source: people } } as const;
        const before = session.data.matchCounts(pair);
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const into = { from: { source: entries, field: "badge" }, into: { source: visitors } } as const;
        assert.deepInclude(session.data.matchCounts(into), { matched: 0, only1: 2 }, "keyed by name, no badge meets");

        await session.data.setMapping(visitors, { nodes: { key: "badge" }, type: "person" });
        const visitorsRow = session.data.sources({ staged: true }).find((s) => s.key === visitors);
        assert.strictEqual(visitorsRow?.state, "staged", "still staged");
        assert.strictEqual(session.history.steps.length, steps, "it joins the step before it");
        const person = session.data.types().find((t) => t.name === "person");
        assert.deepInclude(person?.rules ?? [], { source: visitors });

        // Joining entries onto the visitors now reads their badges as keys.
        assert.deepInclude(session.data.matchCounts(into), { matched: 1, only1: 1, only2: 3 });
        assert.deepStrictEqual(session.data.matchCounts(pair), before, "people's side reads the same badges");

        await session.data.setMapping(visitors, { type: null });
        assert.notDeepInclude(session.data.types().find((t) => t.name === "person")?.rules ?? [], {
            source: visitors,
        });
        session.dispose();
    });

    it("writes an edge source's end types and spaces, and is refused for a built source", async () => {
        const { session, people } = await withPeople();
        const visits = await session.data.stage(csv("visits.csv", "from,to", "B1,D1", "B2,D2"), {
            edges: { from: { column: "from" }, to: { column: "to" } },
        });
        await session.data.setMapping(visits, {
            edges: { sourceSpace: "person", targetSpace: "door" },
            endTypes: { source: "person", target: "door" },
        });
        const rules = session.data.types().flatMap((t) => t.rules.map((r) => [t.name, r] as const));
        assert.deepInclude(rules, ["person", { source: visits, end: "source" }]);
        assert.deepInclude(rules, ["door", { source: visits, end: "target" }]);
        assert.deepInclude(
            session.data.matchCounts({ from: { source: visits, field: "from" }, into: { space: "person" } }),
            {
                matched: 2,
            },
        );

        const notStaged = await refused(() => session.data.setMapping(people, { type: "staff" }), "E_BAD_COMMAND");
        assert.strictEqual(notStaged.reason, "not-staged");
        const noNodes = await refused(
            () => session.data.setMapping(visits, { nodes: { key: "from" } }),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(noNodes.reason, "no-nodes");
        session.dispose();
    });

    it("keeps one edge end's type when the other end's changes after a save and reopen", async () => {
        const { session } = await withPeople();
        const visits = await session.data.stage(csv("visits.csv", "from,to", "B1,D1", "B2,D2"), {
            edges: { from: { column: "from" }, to: { column: "to" } },
        });
        await session.data.setMapping(visits, {
            edges: { sourceSpace: "person", targetSpace: "door" },
            endTypes: { source: "person", target: "door" },
        });
        const { text } = await session.project.save();
        session.dispose();

        const opened = createGraphSession({ features: ["source-steps"] });
        await opened.project.open(text);
        await opened.data.setMapping(visits, { endTypes: { target: "room" } });
        const rules = opened.data.types().flatMap((t) => t.rules.map((r) => [t.name, r] as const));
        assert.deepInclude(rules, ["person", { source: visits, end: "source" }], "the source end keeps its type");
        assert.deepInclude(rules, ["room", { source: visits, end: "target" }]);
        assert.notDeepInclude(rules, ["door", { source: visits, end: "target" }]);
        opened.dispose();
    });

    it("changes what a staged source's rows are: nodes, edges, or both", async () => {
        const { session, people } = await withPeople();
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const tablesOf = (): string[] =>
            session.data
                .sourceTable(entries)
                .summary()
                .tables.map((t) => t.table);
        assert.deepStrictEqual(tablesOf(), ["nodes"]);

        await session.data.setMapping(entries, {
            rows: "edges",
            edges: { source: "badge", target: "door", sourceSpace: "person", targetSpace: "door" },
        });
        assert.deepStrictEqual(tablesOf(), ["edges"]);
        assert.deepInclude(session.data.sourceTable(entries).summary().tables[0], { table: "edges", rows: 6 });
        const byBadge = { from: { source: entries, field: "badge" }, into: { source: people } } as const;
        assert.deepInclude(
            session.data.matchCounts(byBadge),
            { matched: 2, only1: 1, only2: 2 },
            "B9 and b3 meet no one",
        );
        assert.strictEqual(session.data.sources({ staged: true }).find((s) => s.key === entries)?.state, "staged");

        await session.data.setMapping(entries, { rows: "both", nodes: { key: "entry" } });
        assert.deepStrictEqual(tablesOf(), ["nodes", "edges"]);

        await session.data.setMapping(entries, { rows: "nodes" });
        assert.deepStrictEqual(tablesOf(), ["nodes"]);
        await refused(() => session.data.setMapping(entries, { edges: { source: "badge" } }), "E_BAD_COMMAND");

        const noEnds = await refused(() => session.data.setMapping(entries, { rows: "edges" }), "E_BAD_COMMAND");
        assert.strictEqual(noEnds.reason, "no-ends");
        const badEnd = await refused(
            () => session.data.setMapping(entries, { rows: "edges", edges: { source: "badge", target: "floor" } }),
            "E_UNKNOWN_ATTRIBUTE",
        );
        assert.deepInclude(badEnd, { source: entries, column: "floor", table: "edges" });
        const badKey = await refused(
            () => session.data.setMapping(entries, { nodes: { key: "nope" } }),
            "E_UNKNOWN_ATTRIBUTE",
        );
        assert.deepInclude(badKey, { source: entries, column: "nope", table: "nodes" });
        assert.deepStrictEqual(tablesOf(), ["nodes"], "a refused change leaves the source as it was");

        await session.data.add(entries);
        assert.strictEqual(session.data.count().nodes, 9, "three people and six entries");
        session.dispose();
    });

    it("a draft changes what the rows of a source it staged are, and its commit keeps them", async () => {
        const { session, people } = await withPeople();
        const draft = session.data.draft();
        const entries = await draft.stage(ENTRIES, { key: "entry" });
        draft.setMapping(entries, {
            rows: "edges",
            edges: { source: "badge", target: "door", sourceSpace: "person", targetSpace: "door" },
        });
        draft.add(entries);
        await draft.commit();
        assert.deepStrictEqual(
            session.data
                .sourceTable(entries)
                .summary()
                .tables.map((t) => t.table),
            ["edges"],
        );
        assert.strictEqual(session.data.count().edges, 6, "one edge per entry");
        assert.isDefined(session.data.sources({ staged: true }).find((s) => s.key === people));
        session.dispose();
    });
});

describe("source-steps: matching choices the join card sets", () => {
    it("Make an edge ignoring spaces meets a padded badge", async () => {
        const { session, people } = await withPeople();
        const pads = await session.data.stage(csv("pads.csv", "entry,badge", 'E7,"B 1"'), { key: "entry" });
        const pair = { from: { source: pads, field: "badge" }, into: { source: people } } as const;
        assert.deepInclude(session.data.matchCounts(pair), { matched: 0, moreWithIgnoreSpaces: 1 });

        const draft = session.data.draft();
        draft.connect({ ...pair, edgeType: "by" });
        assert.strictEqual(draft.preview().after.edges, 0, "an exact match meets nothing");
        draft.undo();
        draft.connect({ ...pair, edgeType: "by", ignoreSpaces: true });
        assert.strictEqual(draft.preview().after.edges, 1);
        draft.dispose();

        await session.data.connect({ ...pair, edgeType: "by", ignoreSpaces: true });
        assert.strictEqual(session.data.count().edges, 1, "the committed door takes it too");
        session.dispose();
    });

    it("a merge's unmatched rows are kept or dropped after a preview, and repeats aggregated", async () => {
        const { session, people } = await withPeople();
        const visitors = await session.data.stage(VISITORS, { key: "badge" });
        const draft = session.data.draft();
        draft.merge({ from: { source: visitors, field: "badge" }, into: { source: people } });
        const merge = draft.steps().findIndex((s) => s.op === "join.merge");
        const kept = draft.preview().after.nodes;
        assert.strictEqual(kept, 4, "V1 stays its own node");
        draft.editStep(merge, { unmatchedFrom: "drop" });
        assert.strictEqual(draft.preview().after.nodes, kept - 1, "Only 2 dropped");
        draft.editStep(merge, { unmatchedFrom: "keep" });
        assert.strictEqual(draft.preview().after.nodes, kept);

        const add = draft.steps().findIndex((s) => s.op === "join.add");
        const wrong = await refused(
            () => Promise.resolve(draft.editStep(add, { unmatchedFrom: "drop" })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(wrong.reason, "unmatched-from");
        draft.dispose();

        const scores = await session.data.stage(csv("scores.csv", "badge,score", "B1,1", "B1,3", "B2,5"), {
            key: "badge",
        });
        const second = session.data.draft();
        second.merge({ from: { source: scores, field: "badge" }, into: { source: people } });
        const at = second.steps().findIndex((s) => s.op === "join.merge" && s.source === scores);
        second.editStep(at, { aggregate: { score: "sum" } });
        await second.commit();
        assert.strictEqual(session.data.values({ space: "person", key: "B1" }, "score")?.shown, 4);
        session.dispose();
    });

    it("refuses each new member while the experiment is off", async () => {
        const session = createGraphSession();
        await refused(() => Promise.resolve(session.data.sourceTable("src_x")), "E_FEATURE_OFF");
        await refused(() => Promise.resolve(session.data.profile({ space: "person" })), "E_FEATURE_OFF");
        await refused(() => session.data.setMapping("src_x", { type: "person" }), "E_FEATURE_OFF");
        session.dispose();
    });
});
