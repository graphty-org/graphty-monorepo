/**
 * @file The join shapes a recipe card chooses by what each incoming row becomes: a node of its own
 * linked to each thing it names (`shape: "row-nodes"`), an edge whose values merge into an edge the
 * graph already holds (`existingEdges: "merge"`), and the keys suggested for a chosen shape
 * (`draft.suggest(from, before, { shape })`).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/** Four people, keyed by person_id, each with a badge. */
const PEOPLE = [
    "person_id,badge_id,name",
    "P001,B-1,Alex Kim",
    "P002,B-2,Maria Garcia",
    "P003,B-3,Sam Patel",
    "P004,B-4,Priya Nguyen",
].join("\n");

/** Two buildings. */
const BUILDINGS = ["id,name", "bldg-01,North Lab", "bldg-02,South Lab"].join("\n");

/** Six door entries: one unknown person, one unknown building, a blank and a repeated entry id. */
const ENTRIES = [
    { entryId: "E1", personId: "P001", badgeId: "B-1", buildingId: "bldg-01", door: "north" },
    { entryId: "E2", personId: "P002", badgeId: "B-2", buildingId: "bldg-02", door: "south" },
    { entryId: "E3", personId: "P099", badgeId: "B-99", buildingId: "bldg-01", door: "north" },
    { entryId: "E4", personId: "P003", badgeId: "B-3", buildingId: "bldg-09", door: "east" },
    { entryId: "", personId: "P004", badgeId: "B-4", buildingId: "bldg-02", door: "south" },
    { entryId: "E2", personId: "P004", badgeId: "B-4", buildingId: "bldg-01", door: "north" },
];

/**
 * A session holding the people and the buildings, each its own load.
 * @returns the session
 */
async function doors(): Promise<GraphSession> {
    const session = createGraphSession();
    const people = await session.data.prepare({ type: "csv", config: { data: PEOPLE }, name: "people.csv" });
    await people.load({ mapping: { rowsAre: "nodes", key: "person_id" } });
    const buildings = await session.data.prepare({ type: "csv", config: { data: BUILDINGS }, name: "buildings.csv" });
    await buildings.load({ mode: "merge", mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/** Each door entry a node linked to its person and its building. */
const ROW_NODES = {
    shape: "row-nodes",
    rowNode: { id: "entryId", kind: "entry" },
    keys: [
        { file: "personId", graph: "id" },
        { file: "buildingId", graph: "id" },
    ],
} as const;

describe("a row becomes a node with edges (row-nodes)", () => {
    it("makes one node per row, linked to each node its keys name, and counts it", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        const step = recipe.add({ from: entries, choices: ROW_NODES });
        const { report } = recipe.outcome(step);

        assert.isDefined(report);
        // E1, E2, E3, E4: four entry nodes; the blank id is left out and the second E2 repeats.
        assert.deepEqual(report?.rowFates, ["joined", "joined", "joined", "joined", "left-out", "repeat"]);
        assert.strictEqual(report?.newNodes, 4);
        // E1: 2 edges, E2: 2, E3: building only, E4: person only.
        assert.strictEqual(report?.newEdges, 6);
        assert.strictEqual(report?.matched, 5);
        const preview = recipe.preview();
        const e1 = preview.nodes.find((node) => node.id === "E1");
        assert.strictEqual(e1?.data.kind, "entry");
        assert.strictEqual(e1?.data.door, "north");
        assert.strictEqual(e1?.fate, "added");
        assert.strictEqual(preview.nodes.find((node) => node.id === "P001")?.fate, "matched");
        assert.deepEqual(
            preview.edges
                .filter((edge) => edge.source === "E1")
                .map((edge) => [edge.target, edge.data.kind])
                .sort(),
            [
                ["P001", "personId"],
                ["bldg-01", "buildingId"],
            ],
        );
        recipe.discard();
    });

    it("adds a node for a value naming nothing when a key says add, kind its own", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        const step = recipe.add({
            from: entries,
            choices: {
                ...ROW_NODES,
                keys: [...ROW_NODES.keys, { file: "door", graph: "id", unknown: "add", kind: "door" }],
            },
        });
        const { report } = recipe.outcome(step);

        // Four entries and three doors: north, south, east.
        assert.strictEqual(report?.newNodes, 7);
        assert.strictEqual(report?.rowFates[0], "new-end");
        const north = recipe.preview().nodes.find((node) => node.id === "north");
        assert.strictEqual(north?.data.kind, "door");
        recipe.discard();
    });

    it("names a row node by table and row number without an id column, and keeps a made id apart", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "visits", rows: [{ who: "P001", tag: "P002" }] });
        const step = recipe.add({
            from: table,
            choices: {
                shape: "row-nodes",
                keys: [
                    { file: "who", graph: "id" },
                    { file: "tag", graph: "id", kind: "tag", unknown: "add" },
                ],
            },
        });
        const preview = recipe.preview({ step });
        const row = preview.nodes.find((node) => node.id === "visits:1");
        assert.strictEqual(row?.data.kind, "visits");
        // P002 is a person, not a tag: the tag node made for it is kept apart.
        assert.isDefined(preview.nodes.find((node) => node.id === "tag:P002"));
        recipe.discard();
    });

    it("commits as one undo step, and removing the join takes its nodes and edges back", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        recipe.add({ from: entries, choices: ROW_NODES });
        await recipe.commit();

        assert.strictEqual(session.data.nodes().length, 6 + 4);
        assert.strictEqual(session.data.edges().length, 6);
        assert.strictEqual(session.data.node("E1")?.kind, "entry");
        const [join] = session.data.joins();
        assert.strictEqual(join.shape, "row-nodes");

        await session.data.removeSource(join.source);
        assert.strictEqual(session.data.nodes().length, 6);
        assert.strictEqual(session.data.edges().length, 0);
        await session.undo();
        assert.strictEqual(session.data.edges().length, 6);
    });

    it("loads through a file's draft as the guide shows, doors made as nodes of their own kind", async () => {
        const session = await doors();
        const csv = ENTRIES.slice(0, 4).map((row) => Object.values(row).join(","));
        const file = new File([["entryId,personId,badgeId,buildingId,door", ...csv].join("\n")], "door_entries.csv");
        const draft = await session.data.prepare({ config: { file } }, { onto: "graph" });
        // The guide's example.
        const choices = {
            shape: "row-nodes",
            rowNode: { id: "entryId", kind: "entry" },
            keys: [
                { file: "personId", graph: "id" },
                { file: "buildingId", graph: "id" },
                { file: "door", graph: "id", kind: "door", unknown: "add" },
            ],
        } as const;
        await draft.load({ join: choices });

        assert.strictEqual(session.data.node("E1")?.kind, "entry");
        assert.strictEqual(session.data.node("east")?.kind, "door");
        assert.strictEqual(session.data.edges().filter((edge) => edge.kind === "door").length, 4);
    });

    it("counts key values that would match ignoring case", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({
            name: "door_entries.csv",
            rows: [{ entryId: "E1", personId: "p001", buildingId: "bldg-01" }],
        });
        const step = recipe.add({ from: entries, choices: ROW_NODES });
        assert.strictEqual(recipe.outcome(step).report?.extraIgnoringCase, 1);
        recipe.discard();
    });
});

describe("an edge merges into an edge the graph holds (existingEdges)", () => {
    /**
     * A session with the people, the buildings and one visit edge P001 -> bldg-01.
     * @returns the session
     */
    async function visited(): Promise<GraphSession> {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const first = recipe.hold({
            name: "first.csv",
            rows: [{ personId: "P001", buildingId: "bldg-01", level: "low" }],
        });
        recipe.add({
            from: first,
            choices: {
                shape: "edges",
                keys: [
                    { file: "personId", graph: "id" },
                    { file: "buildingId", graph: "id" },
                ],
            },
        });
        await recipe.commit();
        return session;
    }

    const later = [
        { personId: "P001", buildingId: "bldg-01", level: "high", badge: "B-1" },
        { personId: "P002", buildingId: "bldg-02", level: "low", badge: "B-2" },
    ];

    it("writes a row's values onto the edge its ends already have, with the clash rule", async () => {
        const session = await visited();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "later.csv", rows: later });
        const step = recipe.add({
            from: table,
            choices: {
                shape: "edges",
                existingEdges: "merge",
                clash: { level: "overwrite" },
                keys: [
                    { file: "personId", graph: "id" },
                    { file: "buildingId", graph: "id" },
                ],
            },
        });
        const { report } = recipe.outcome(step);
        assert.strictEqual(report?.edgesMerged, 1);
        assert.strictEqual(report?.newEdges, 1);
        const merged = recipe.preview().edges.find((edge) => edge.source === "P001");
        assert.strictEqual(merged?.data.level, "high");
        assert.strictEqual(merged?.fate, "updated");
        await recipe.commit();

        assert.strictEqual(session.data.edges().length, 2);
        const edge = session.data.edges().find((each) => each.source === "P001");
        assert.strictEqual(edge?.level, "high");
        assert.strictEqual(edge?.badge, "B-1");

        const join = session.data.joins().find((each) => each.table.name === "later.csv");
        await session.data.removeSource(join?.source ?? "");
        const restored = session.data.edges().find((each) => each.source === "P001");
        assert.strictEqual(session.data.edges().length, 1);
        assert.strictEqual(restored?.level, "low");
        assert.isUndefined(restored?.badge);
    });

    it("keeps both values by default, the incoming one under the table's name", async () => {
        const session = await visited();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "later.csv", rows: later });
        recipe.add({
            from: table,
            choices: {
                shape: "edges",
                existingEdges: "merge",
                keys: [
                    { file: "personId", graph: "id" },
                    { file: "buildingId", graph: "id" },
                ],
            },
        });
        await recipe.commit();
        const edge = session.data.edges().find((each) => each.source === "P001");
        assert.strictEqual(edge?.level, "low");
        assert.strictEqual(edge?.["level (later.csv)"], "high");
    });

    it("adds another edge without existingEdges", async () => {
        const session = await visited();
        const recipe = session.data.prepareJoins();
        const table = recipe.hold({ name: "later.csv", rows: later });
        const step = recipe.add({
            from: table,
            choices: {
                shape: "edges",
                keys: [
                    { file: "personId", graph: "id" },
                    { file: "buildingId", graph: "id" },
                ],
            },
        });
        assert.strictEqual(recipe.outcome(step).report?.edgesMerged, 0);
        assert.strictEqual(recipe.outcome(step).report?.newEdges, 2);
        recipe.discard();
    });
});

describe("suggesting keys for a chosen shape", () => {
    it("suggests the two ends for edges, every naming column and a row id for row-nodes", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES.slice(0, 4) });

        const edges = recipe.suggest(entries, undefined, { shape: "edges" });
        assert.strictEqual(edges.shape, "edges");
        assert.deepEqual(
            edges.keys.map((key) => key.file),
            ["personId", "buildingId"],
        );

        const rows = recipe.suggest(entries, undefined, { shape: "row-nodes" });
        assert.strictEqual(rows.shape, "row-nodes");
        // badge_id names the same people as personId: one edge per person, not two.
        assert.deepEqual(
            rows.keys.map((key) => key.file),
            ["personId", "buildingId"],
        );
        assert.deepEqual(rows.rowNode, { id: "entryId" });
        recipe.discard();
    });

    it("suggests one key for values, and the key with shared columns for link", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const phones = recipe.hold({
            name: "phones.csv",
            rows: [
                { badge: "B-1", phone: "555-1" },
                { badge: "B-2", phone: "555-1" },
                { badge: "B-3", phone: "555-3" },
            ],
        });

        const values = recipe.suggest(phones, undefined, { shape: "node-values" });
        assert.deepEqual(values.keys, [{ file: "badge", graph: "data.badge_id" }]);
        const merge = recipe.suggest(phones, undefined, { shape: "merge" });
        assert.strictEqual(merge.shape, "merge");
        const link = recipe.suggest(phones, undefined, { shape: "link" });
        assert.strictEqual(link.shape, "link");
        assert.deepEqual(link.link?.columns, ["phone"]);
        recipe.discard();
    });
});
