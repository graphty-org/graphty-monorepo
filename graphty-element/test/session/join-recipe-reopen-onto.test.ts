/**
 * @file A join recipe's reach beyond one step: committed joins reopened as its first steps
 * (`prepareJoins({ edit })`), a key matched against one load only (`JoinKey.onto`), each key's own
 * counts (`report.byKey`), several rows merged into one held edge, the shape suggested among all
 * four row outcomes (`suggest(from, before, { among })`), a compare's region filter
 * (`joinRegionRule`), and a network load's `_source.` bookkeeping kept out of every join.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, JOIN_REGIONS, joinRegionRule } from "../../session";

/** Three people, keyed by id, each with a badge. */
const PEOPLE = ["id,badge_id,name", "P1,B-1,Alex", "P2,B-2,Maria", "P3,B-3,Sam"].join("\n");

/** Two buildings; one shares an id with a person. */
const BUILDINGS = ["id,name", "b1,North", "P3,South"].join("\n");

/**
 * A session holding the people and the buildings, each its own load.
 * @returns the session
 */
async function loaded(): Promise<GraphSession> {
    const session = createGraphSession();
    const people = await session.data.prepare({ type: "csv", config: { data: PEOPLE }, name: "people.csv" });
    await people.load({ mapping: { rowsAre: "nodes", key: "id" } });
    const buildings = await session.data.prepare({ type: "csv", config: { data: BUILDINGS }, name: "buildings.csv" });
    await buildings.load({ mode: "merge", mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/**
 * A load's key by its name.
 * @param session - the session
 * @param name - the load's name
 * @returns its key
 */
function keyOf(session: GraphSession, name: string): string {
    const found = session.data.sources().find((each) => each.name === name);
    assert.isDefined(found, name);
    return found?.key ?? "";
}

/** Visits: each row a person and a building. */
const VISITS = [
    { who: "P1", where: "b1", hours: 2 },
    { who: "P1", where: "b1", hours: 3 },
    { who: "P2", where: "P3", hours: 1 },
];

/** The visits as edges between a person and a building. */
const VISIT_EDGES = {
    shape: "edges",
    keys: [
        { file: "who", graph: "id" },
        { file: "where", graph: "id" },
    ],
} as const;

describe("matching against one load (onto)", () => {
    it("matches only the nodes that load supplied, and counts keyMatches the same way", async () => {
        const session = await loaded();
        const people = keyOf(session, "people.csv");
        const buildings = keyOf(session, "buildings.csv");
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "notes.csv", rows: [{ ref: "P3" }, { ref: "b1" }] });

        const all = recipe.keyMatches(table, "ref").find((each) => each.graph === "id");
        assert.strictEqual(all?.rows, 2);
        const onlyPeople = recipe.keyMatches(table, "ref", { onto: people }).find((each) => each.graph === "id");
        assert.strictEqual(onlyPeople?.rows, 1);
        const onlyBuildings = recipe.keyMatches(table, "ref", { onto: buildings }).find((each) => each.graph === "id");
        assert.strictEqual(onlyBuildings?.rows, 2);

        const step = recipe.add({
            from: table,
            choices: { shape: "node-values", keys: [{ file: "ref", graph: "id", onto: people }] },
        });
        assert.strictEqual(recipe.outcome(step).report?.matched, 1);
        recipe.discard();
    });

    it("matches an edge's end onto the load named for it, and onto the nodes an earlier step added", async () => {
        const session = await loaded();
        const people = keyOf(session, "people.csv");
        const recipe = session.data.prepareJoins();
        const rooms = recipe.hold({ name: "rooms.csv", rows: [{ room: "r1" }, { room: "r2" }] });
        const made = recipe.add({
            from: rooms,
            choices: {
                shape: "row-nodes",
                rowNode: { id: "room", kind: "room" },
                keys: [{ file: "room", graph: "id", unknown: "add", kind: "room-name" }],
            },
        });
        const stays = recipe.hold({ name: "stays.csv", rows: [{ who: "P3", room: "r1" }] });
        const step = recipe.add({
            from: stays,
            choices: {
                shape: "edges",
                keys: [
                    { file: "who", graph: "id", onto: people },
                    { file: "room", graph: "id", onto: made },
                ],
            },
        });
        const { report } = recipe.outcome(step);
        assert.strictEqual(report?.newEdges, 1);
        assert.strictEqual(report?.newNodes, 0);
        recipe.discard();
    });

    it("refuses a key no load or step has as the step's error", async () => {
        const session = await loaded();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "notes.csv", rows: [{ ref: "P3" }] });
        const step = recipe.add({
            from: table,
            choices: { shape: "node-values", keys: [{ file: "ref", graph: "id", onto: "nowhere" }] },
        });
        assert.strictEqual(recipe.outcome(step).error?.code, "E_SOURCE_UNKNOWN");
        recipe.discard();
    });
});

describe("each key's own counts (byKey)", () => {
    it("counts the rows a key matched and the nodes it made", async () => {
        const session = await loaded();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({
            name: "entries.csv",
            rows: [
                { entry: "E1", who: "P1", door: "north" },
                { entry: "E2", who: "P9", door: "south" },
                { entry: "E3", who: "P2", door: "north" },
            ],
        });
        const step = recipe.add({
            from: table,
            choices: {
                shape: "row-nodes",
                rowNode: { id: "entry" },
                keys: [
                    { file: "who", graph: "id" },
                    { file: "door", graph: "id", unknown: "add", kind: "door" },
                ],
            },
        });
        assert.deepEqual(recipe.outcome(step).report?.byKey, [
            { matched: 2, created: 0 },
            { matched: 0, created: 2 },
        ]);
        recipe.discard();
    });
});

describe("several rows merging into one held edge", () => {
    it("writes one update per edge, its values a list, and counts the edge once", async () => {
        const session = await loaded();
        const first = session.data.prepareJoins();
        const base = first.hold({ name: "base.csv", rows: [{ who: "P1", where: "b1" }] });
        first.add({ from: base, choices: VISIT_EDGES });
        await first.commit();

        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "visits.csv", rows: VISITS });
        const step = recipe.add({
            from: table,
            choices: { ...VISIT_EDGES, existingEdges: "merge", repeated: "both" },
        });
        const { report } = recipe.outcome(step);
        assert.strictEqual(report?.edgesMerged, 1);
        // P2 -> P3 is new; the two P1 -> b1 rows merge into the held edge.
        assert.strictEqual(report?.newEdges, 1);
        await recipe.commit();

        const held = session.data.edges().filter((edge) => edge.source === "P1");
        assert.strictEqual(held.length, 1);
        assert.deepEqual(held[0].hours, [2, 3]);
        const join = session.data.joins().find((each) => each.table.name === "visits.csv");
        await session.data.removeSource(join?.source ?? "");
        assert.isUndefined(session.data.edges().find((edge) => edge.source === "P1")?.hours);
    });
});

describe("suggesting the shape among all four row outcomes", () => {
    const AMONG = ["node-values", "edges", "row-nodes", "link"] as const;

    it("suggests row-nodes for a table three of whose columns name nodes", async () => {
        const session = await loaded();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({
            name: "meetings.csv",
            rows: [
                { meeting: "M1", host: "P1", guest: "P2", room: "b1" },
                { meeting: "M2", host: "P2", guest: "P1", room: "b1" },
            ],
        });
        const suggestion = recipe.suggest(table, undefined, { among: AMONG });
        assert.strictEqual(suggestion.shape, "row-nodes");
        assert.deepEqual(
            suggestion.keys.map((key) => key.file),
            ["host", "guest", "room"],
        );
        // Without among, the shape is one suggested before.
        assert.notStrictEqual(recipe.suggest(table).shape, "row-nodes");
        recipe.discard();
    });

    it("suggests link for the graph's own nodes sharing a value", async () => {
        const session = createGraphSession();
        const csv = ["id,phone", "A1,555", "A2,555", "A3,777", "A4,888"].join("\n");
        const accounts = await session.data.prepare({ type: "csv", config: { data: csv }, name: "accounts.csv" });
        await accounts.load({ mapping: { rowsAre: "nodes", key: "id" } });
        const recipe = session.data.prepareJoins();
        const suggestion = recipe.suggest(keyOf(session, "accounts.csv"), undefined, { among: AMONG });
        assert.strictEqual(suggestion.shape, "link");
        assert.deepEqual(suggestion.link?.columns, ["phone"]);
        recipe.discard();
    });
});

describe("a compare's region filter (joinRegionRule)", () => {
    it("keeps the chosen regions on the membership column, and nothing for every region", () => {
        const choices = { shape: "merge", compare: true, keys: [{ file: "id", graph: "id" }] } as const;
        assert.deepEqual(joinRegionRule(choices, ["both"]), {
            kind: "categories",
            attribute: "data.membership",
            values: ["both"],
            missing: "include",
        });
        assert.strictEqual(
            joinRegionRule({ ...choices, membership: "seen" }, ["only-from"])?.kind === "categories" &&
                (joinRegionRule({ ...choices, membership: "seen" }, ["only-from"]) as { attribute: string }).attribute,
            "data.seen",
        );
        assert.isNull(joinRegionRule(choices, JOIN_REGIONS));
        assert.isNull(joinRegionRule({ ...choices, compare: false }, ["both"]));
    });
});

describe("a network load's bookkeeping", () => {
    it("is never a match target nor a preview value", async () => {
        const session = createGraphSession();
        const csv = ["id,name,_source.expansion", "n1,One,none", "n2,Two,none"].join("\n");
        const draft = await session.data.prepare({ type: "csv", config: { data: csv }, name: "nodes.csv" });
        await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "t.csv", rows: [{ ref: "none" }] });
        const graphs = recipe.keyMatches(table, "ref").map((each) => each.graph);
        assert.notInclude(graphs, "data._source.expansion");
        assert.isTrue(recipe.preview().nodes.every((node) => !("_source.expansion" in node.data)));
        recipe.discard();
    });
});

describe("reopening committed joins as steps (prepareJoins({ edit }))", () => {
    /**
     * A session with the visits committed as edges.
     * @returns the session and the join's key
     */
    async function joined(): Promise<{ session: GraphSession; key: string }> {
        const session = await loaded();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "visits.csv", rows: VISITS });
        recipe.add({ from: table, choices: VISIT_EDGES, name: "visits -> edges" });
        await recipe.commit();
        const [join] = session.data.joins();
        return { session, key: join.source };
    }

    it("starts from the graph with the join taken back, the join its first step", async () => {
        const { session, key } = await joined();
        assert.strictEqual(session.data.edges().length, 2);
        const recipe = session.data.prepareJoins({ edit: [key] });
        assert.strictEqual(recipe.steps.length, 1);
        const [step] = recipe.steps;
        assert.strictEqual(step.joined, key);
        assert.strictEqual(step.name, "visits -> edges");
        assert.deepEqual(step.choices.keys, VISIT_EDGES.keys);
        // The step's own graph before it holds no visit edge; after it, the same two.
        assert.strictEqual(recipe.preview({ step: step.id, before: true }).edges.length, 0);
        assert.strictEqual(recipe.preview().edges.length, 2);
        assert.strictEqual(recipe.outcome(step.id).report?.newEdges, 2);
        recipe.discard();
        assert.strictEqual(session.data.edges().length, 2);
    });

    it("commits nothing when the recipe is left as it opened", async () => {
        const { session, key } = await joined();
        const recipe = session.data.prepareJoins({ edit: [key] });
        await recipe.commit();
        assert.deepEqual(
            session.data.joins().map((each) => each.source),
            [key],
        );
        await session.undo();
        assert.strictEqual(session.data.edges().length, 0);
    });

    it("joins a changed step again in the join's place, as one undo step", async () => {
        const { session, key } = await joined();
        const recipe = session.data.prepareJoins({ edit: [key] });
        const [step] = recipe.steps;
        recipe.change(step.id, { from: step.from, choices: { ...step.choices, repeated: "both" } });
        assert.strictEqual(recipe.steps[0].joined, key);
        await recipe.commit();

        assert.strictEqual(session.data.edges().length, 3);
        assert.strictEqual(session.data.joins().length, 1);
        await session.undo();
        assert.strictEqual(session.data.edges().length, 2);
        assert.strictEqual(session.data.joins().length, 1);
    });

    it("takes a join back when its step is removed", async () => {
        const { session, key } = await joined();
        const recipe = session.data.prepareJoins({ edit: [key] });
        recipe.remove(recipe.steps[0].id);
        await recipe.commit();
        assert.strictEqual(session.data.edges().length, 0);
        assert.strictEqual(session.data.joins().length, 0);
    });

    it("commits a key matched onto an earlier step's nodes as matched onto that step's join", async () => {
        const session = await loaded();
        const people = keyOf(session, "people.csv");
        const recipe = session.data.prepareJoins();
        const rooms = recipe.hold({ name: "rooms.csv", rows: [{ room: "r1" }, { room: "r2" }] });
        const made = recipe.add({
            from: rooms,
            choices: {
                shape: "row-nodes",
                rowNode: { id: "room", kind: "room" },
                keys: [{ file: "room", graph: "id", unknown: "add", kind: "room-name" }],
            },
        });
        const stays = recipe.hold({ name: "stays.csv", rows: [{ who: "P3", room: "r1" }] });
        recipe.add({
            from: stays,
            choices: {
                shape: "edges",
                keys: [
                    { file: "who", graph: "id", onto: people },
                    { file: "room", graph: "id", onto: made },
                ],
            },
        });
        await recipe.commit();

        const [roomsJoin, staysJoin] = session.data.joins();
        assert.strictEqual(staysJoin.choices.keys[1].onto, roomsJoin.source);
        assert.isTrue(session.data.edges().some((edge) => edge.source === "P3" && edge.target === "r1"));
        // Reopened, the stored key still matches onto the rooms join's nodes.
        const again = session.data.prepareJoins({ edit: [roomsJoin.source, staysJoin.source] });
        assert.strictEqual(again.outcome(again.steps[1].id).report?.newEdges, 1);
        again.discard();
    });

    it("refuses to commit while a step cannot run, and keeps every committed join", async () => {
        const { session, key } = await joined();
        const recipe = session.data.prepareJoins({ edit: [key] });
        const [step] = recipe.steps;
        const [who, where] = step.choices.keys;
        recipe.change(step.id, {
            from: step.from,
            choices: { ...step.choices, keys: [who, { ...where, onto: "nowhere" }] },
        });
        let code: unknown;
        try {
            await recipe.commit();
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }

        assert.strictEqual(code, "E_BAD_COMMAND");
        assert.deepEqual(
            session.data.joins().map((each) => each.source),
            [key],
        );
        assert.strictEqual(session.data.edges().length, 2);
        recipe.discard();
    });

    it("leaves a reopened join the recipe did not change as it is", async () => {
        const session = await loaded();
        const first = session.data.prepareJoins();
        first.add({ from: first.hold({ name: "visits.csv", rows: VISITS }), choices: VISIT_EDGES });
        const notes = first.hold({ name: "notes.csv", rows: [{ badge: "B-1", note: "early" }] });
        first.add({ from: notes, choices: { shape: "node-values", keys: [{ file: "badge", graph: "badge_id" }] } });
        await first.commit();
        const [visits, noted] = session.data.joins();
        const edges = session.data.edges().map((edge) => edge.id);
        // A reader's own edit on an edge the visits join made.
        await session.data.updateEdges([{ id: edges[0], values: { checked: true } }]);

        const recipe = session.data.prepareJoins({ edit: [visits.source, noted.source] });
        const step = recipe.steps[1];
        recipe.change(step.id, { from: step.from, choices: { ...step.choices, flag: "noted" } });
        recipe.add({
            from: recipe.hold({ name: "tags.csv", rows: [{ id: "P2", tag: "x" }] }),
            choices: { shape: "node-values", keys: [{ file: "id", graph: "id" }] },
        });
        await recipe.commit();

        const now = session.data.joins();
        assert.strictEqual(now.length, 3);
        assert.strictEqual(now[0].source, visits.source);
        assert.deepEqual(
            session.data.edges().map((edge) => edge.id),
            edges,
        );
        assert.strictEqual(session.data.edges()[0].checked, true);
        assert.strictEqual(session.data.node("P1")?.noted, true);
        await session.undo();
        assert.isUndefined(session.data.node("P1")?.noted);
        assert.strictEqual(session.data.node("P1")?.note, "early");
    });

    it("joins again a reopened join after a changed one when its input changed", async () => {
        const session = await loaded();
        const first = session.data.prepareJoins();
        const zones = first.hold({
            name: "zones.csv",
            rows: [
                { id: "P1", zone: "z1" },
                { id: "p2", zone: "z2" },
            ],
        });
        first.add({ from: zones, choices: { shape: "node-values", keys: [{ file: "id", graph: "id" }] } });
        const floors = first.hold({
            name: "floors.csv",
            rows: [
                { zone: "z1", floor: 1 },
                { zone: "z2", floor: 2 },
            ],
        });
        first.add({ from: floors, choices: { shape: "node-values", keys: [{ file: "zone", graph: "zone" }] } });
        await first.commit();
        const sources = session.data.joins().map((each) => each.source);
        assert.isUndefined(session.data.node("P2")?.floor);

        const recipe = session.data.prepareJoins({ edit: sources });
        const step = recipe.steps[0];
        recipe.change(step.id, { from: step.from, choices: { ...step.choices, ignoreCase: true } });
        await recipe.commit();

        assert.strictEqual(session.data.joins().length, 2);
        assert.strictEqual(session.data.node("P2")?.floor, 2);
    });

    it("holds one table for reopened joins that read the same table", async () => {
        const session = await loaded();
        const first = session.data.prepareJoins();
        const table = first.hold({ name: "visits.csv", rows: VISITS });
        first.add({ from: table, choices: VISIT_EDGES });
        first.add({ from: table, choices: { shape: "node-values", keys: [{ file: "who", graph: "id" }] } });
        await first.commit();

        const recipe = session.data.prepareJoins({ edit: session.data.joins().map((each) => each.source) });
        assert.strictEqual(recipe.inputs.filter((each) => each.held).length, 1);
        assert.strictEqual(recipe.steps[0].from, recipe.steps[1].from);
        recipe.discard();
    });

    it("refuses a key that is no join", async () => {
        const session = await loaded();
        assert.throws(() => session.data.prepareJoins({ edit: ["nope"] }), /nope/);
    });
});
