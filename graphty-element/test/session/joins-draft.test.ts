/**
 * @file A join recipe held as a draft: `data.prepareJoins()`. Steps over loaded sources and held
 * tables run on a copy of the graph; `commit()` joins them all as one undo step.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** Six people; two share a name; one has no department. */
const PEOPLE = [
    "person_id,name,dept,tags",
    "P001,Alex Kim,Research,contractor;night-shift",
    "P002,Maria Garcia,Security,",
    "P003,Sam Patel,,first-aid",
    "P004,Alex Kim,Finance,keyholder",
    "P005,Priya Nguyen,Research,remote;first-aid",
    "P006,Jordan Smith,Facilities,",
].join("\n");

/** Three buildings. */
const BUILDINGS = ["id,name,floors", "bldg-01,North Lab,4", "bldg-02,South Lab,3", "bldg-03,HQ,9"].join("\n");

/**
 * Eight door entries: P001 twice into bldg-01, one person the graph lacks, one building the graph
 * lacks, one building id in upper case.
 */
const ENTRIES = [
    { entryId: "E1", personId: "P001", buildingId: "bldg-01", time: "2026-10-01 08:00" },
    { entryId: "E2", personId: "P001", buildingId: "bldg-01", time: "2026-10-02 08:10" },
    { entryId: "E3", personId: "P002", buildingId: "bldg-02", time: "2026-10-02 09:00" },
    { entryId: "E4", personId: "P003", buildingId: "BLDG-03", time: "2026-10-03 10:00" },
    { entryId: "E5", personId: "P066", buildingId: "bldg-01", time: "2026-10-03 11:00" },
    { entryId: "E6", personId: "P004", buildingId: "bldg-09", time: "2026-10-04 12:00" },
    { entryId: "E7", personId: "P005", buildingId: "bldg-03", time: "2026-10-05 13:00" },
    { entryId: "E8", personId: "P006", buildingId: "bldg-02", time: "2026-10-06 14:00" },
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

/** The door entries as an edges join: person to building. */
const EDGES = {
    shape: "edges",
    keys: [
        { file: "personId", graph: "data.person_id" },
        { file: "buildingId", graph: "id" },
    ],
} as const;

describe("data.prepareJoins", () => {
    it("lists the loads and the held tables as inputs", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });

        assert.deepEqual(
            recipe.inputs.map((input) => [input.name, input.held, input.rows]),
            [
                ["people.csv", false, 6],
                ["buildings.csv", false, 3],
                ["door_entries.csv", true, 8],
            ],
        );
        assert.match(entries, /^held:/);
        recipe.discard();
    });

    it("leaves a load's _source. bookkeeping out of its columns, so no step guesses a key on it", async () => {
        const session = createGraphSession();
        // A network load stamps every record with "_source." facts, all "none" on a fresh load.
        const rows = ["person_id,name,_source.expansion", "P001,Alex Kim,none", "P002,Maria Garcia,none"];
        const people = await session.data.prepare({
            type: "csv",
            config: { data: rows.join("\n") },
            name: "people.csv",
        });
        await people.load({ mapping: { rowsAre: "nodes", key: "person_id" } });
        const recipe = session.data.prepareJoins();
        const [input] = recipe.inputs;
        assert.include(input.columns, "name");
        assert.notInclude(input.columns, "_source.expansion");
        const step = recipe.add({
            from: input.key,
            choices: { shape: "node-values", keys: [{ file: "person_id", graph: "id" }] },
        });
        assert.notProperty(recipe.rows(step).items[0]?.values, "_source.expansion");
        recipe.discard();
    });

    it("counts each step against the graph and changes nothing before commit", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        const step = recipe.add({ from: entries, choices: EDGES });

        const { report } = recipe.outcome(step);
        assert.isDefined(report);
        // E5 (unknown person) and E6 (unknown building) add new ends; BLDG-03 is new without ignoreCase.
        assert.strictEqual(report?.newNodes, 3);
        assert.strictEqual(report?.repeatedKeys, 1);
        assert.strictEqual(report?.extraIgnoringCase, 1);
        assert.deepEqual(report?.rowFates, [
            "joined",
            "repeat",
            "joined",
            "new-end",
            "new-end",
            "new-end",
            "joined",
            "joined",
        ]);

        const preview = recipe.preview();
        assert.strictEqual(preview.edges.length, 7);
        assert.isTrue(preview.edges.every((edge) => edge.fate === "added"));
        assert.strictEqual(preview.nodes.filter((node) => node.fate === "added").length, 3);
        assert.strictEqual(recipe.preview({ step, before: true }).edges.length, 0);

        assert.strictEqual(session.data.edges().length, 0);
        assert.strictEqual(session.data.nodes().length, 9);
        recipe.discard();
        assert.strictEqual(session.data.sources().length, 2);
    });

    it("chains steps: a later step matches what an earlier one wrote", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const sites = recipe.hold({
            name: "sites.csv",
            rows: [
                { building: "bldg-01", site: "Campus A" },
                { building: "bldg-02", site: "Campus A" },
                { building: "bldg-03", site: "Campus B" },
            ],
        });
        const zones = recipe.hold({ name: "zones.csv", rows: [{ site: "Campus A", zone: "west" }] });
        recipe.add({ from: sites, choices: { shape: "node-values", keys: [{ file: "building", graph: "id" }] } });
        const second = recipe.add({
            from: zones,
            choices: { shape: "node-values", keys: [{ file: "site", graph: "data.site" }] },
        });

        assert.strictEqual(recipe.outcome(second).report?.matched, 2);
        const zoned = recipe.preview().nodes.filter((node) => node.data.zone === "west");
        assert.deepEqual(zoned.map((node) => node.id).sort(), ["bldg-01", "bldg-02"]);
        assert.isTrue(zoned.every((node) => node.fate === "updated"));
        recipe.discard();
    });

    it("undoes and redoes edits to the steps", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        const step = recipe.add({ from: entries, choices: EDGES });
        recipe.change(step, { from: entries, choices: { ...EDGES, ignoreCase: true } });

        assert.strictEqual(recipe.outcome(step).report?.newNodes, 2);
        recipe.undo();
        assert.strictEqual(recipe.outcome(step).report?.newNodes, 3);
        recipe.undo();
        assert.deepEqual(recipe.steps, []);
        assert.isFalse(recipe.canUndo);
        recipe.redo();
        recipe.redo();
        assert.strictEqual(recipe.outcome(step).report?.newNodes, 2);
        assert.isFalse(recipe.canRedo);
        recipe.discard();
    });

    it("reports a step it cannot run and leaves it out", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        const step = recipe.add({ from: entries, choices: { keys: [{ file: "badge", graph: "id" }] } });

        assert.strictEqual(recipe.outcome(step).error?.code, "E_BAD_COMMAND");
        assert.strictEqual(recipe.preview().edges.length, 0);
    });

    it("pages a step's rows, by fate", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        const step = recipe.add({ from: entries, choices: EDGES });

        const page = recipe.rows(step, { offset: 2, limit: 3 });
        assert.strictEqual(page.total, 8);
        assert.deepEqual(
            page.items.map((row) => [row.index, row.values.entryId, row.fate]),
            [
                [2, "E3", "joined"],
                [3, "E4", "new-end"],
                [4, "E5", "new-end"],
            ],
        );
        assert.deepEqual(
            recipe.rows(step, { fate: "repeat" }).items.map((row) => row.values.entryId),
            ["E2"],
        );
        recipe.discard();
    });

    it("commits every step as one undo step, saved as joins", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const entries = recipe.hold({ name: "door_entries.csv", rows: ENTRIES });
        const sites = recipe.hold({ name: "sites.csv", rows: [{ building: "bldg-01", site: "Campus A" }] });
        recipe.add({ from: entries, choices: { ...EDGES, ignoreCase: true } });
        recipe.add({ from: sites, choices: { shape: "node-values", keys: [{ file: "building", graph: "id" }] } });
        await recipe.commit();

        assert.strictEqual(session.data.edges().length, 7);
        assert.strictEqual(session.data.node("bldg-01")?.site, "Campus A");
        assert.deepEqual(
            session.data.joins().map((join) => join.table.name),
            ["door_entries.csv", "sites.csv"],
        );
        assert.throws(() => recipe.preview(), /committed or discarded/);

        await session.undo();
        assert.strictEqual(session.data.edges().length, 0);
        assert.isUndefined(session.data.node("bldg-01")?.site);
        assert.deepEqual(session.data.joins(), []);
    });

    it("matches a key written as text to the number it spells", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", phone: 15550142 },
            { id: "b", phone: 15550199 },
        ]);
        const recipe = session.data.prepareJoins();
        const watchlist = recipe.hold({
            name: "watchlist.csv",
            rows: [{ value: "+15550142" }, { value: "+1 555 0123" }, { value: "Zoe Reyes" }],
        });
        const step = recipe.add({
            from: watchlist,
            choices: { shape: "node-values", keys: [{ file: "value", graph: "data.phone" }] },
        });

        assert.strictEqual(recipe.outcome(step).report?.matched, 1);
        recipe.discard();
    });

    it("commits no step that changes nothing, so a key matching nothing adds no source", async () => {
        const session = await doors();
        const before = session.data.sources().map((source) => source.name);
        const recipe = session.data.prepareJoins();
        const sites = recipe.hold({ name: "sites.csv", rows: [{ building: "bldg-99", site: "Campus Z" }] });
        recipe.add({ from: sites, choices: { shape: "node-values", keys: [{ file: "building", graph: "id" }] } });
        await recipe.commit();

        assert.deepEqual(session.data.joins(), []);
        assert.deepEqual(
            session.data.sources().map((source) => source.name),
            before,
        );
    });

    it("names each committed step's load by the step's own name, else by its input's", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const [people] = recipe.inputs;
        const ends = { file: "person_id", graph: "data.person_id" } as const;
        const kind = recipe.add({
            from: people.key,
            name: "people.csv kind",
            choices: { shape: "node-values", keys: [ends], columns: ["dept"] },
        });
        recipe.add({ from: people.key, choices: { shape: "node-values", keys: [ends], columns: ["name"] } });
        assert.strictEqual(recipe.steps.find((each) => each.id === kind)?.name, "people.csv kind");
        await recipe.commit();

        assert.deepEqual(
            session.data.joins().map((join) => join.table.name),
            ["people.csv kind", "people.csv"],
        );
        const named = session.data
            .sources()
            .filter((each) => each.join !== undefined)
            .map((each) => each.name);
        assert.deepEqual(named, ["people.csv kind", "people.csv"]);
    });

    it("reads a loaded source as its records, and a held mapping table as via", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const [people] = recipe.inputs;
        // Each person's tags split into tag nodes: an edges join of the people onto themselves.
        const step = recipe.add({
            from: people.key,
            choices: {
                shape: "edges",
                keys: [
                    { file: "person_id", graph: "data.person_id" },
                    { file: "tags", graph: "id" },
                ],
                split: { tags: ";" },
                endKinds: { target: "tag" },
                unknownEnds: "add",
            },
        });
        const { report } = recipe.outcome(step);
        // Six tags over four people: contractor, night-shift, first-aid, keyholder, remote.
        assert.strictEqual(report?.newNodes, 5);
        assert.strictEqual(report?.newEdges, 6);

        const badges = recipe.hold({ name: "badges.csv", rows: [{ badge: "B-1", person: "P002" }] });
        const crosswalk = recipe.hold({ name: "map.csv", rows: [{ badge: "B-1", person: "P002" }] });
        const seen = recipe.add({
            from: badges,
            choices: {
                shape: "node-values",
                keys: [{ file: "badge", graph: "data.person_id" }],
                via: crosswalk,
                mapping: { columns: ["badge", "person"] },
                columns: [],
                flag: "badged",
            },
        });
        assert.strictEqual(recipe.outcome(seen).report?.matched, 1);
        await recipe.commit();
        assert.strictEqual(session.data.node("P002")?.badged, true);
        assert.strictEqual(session.data.nodes().filter((node) => node.kind === "tag").length, 5);
        // The split join read the four people who have tags, of the six: every edge has a new end.
        const tagged = session.data.joins().find((join) => join.choices.split !== undefined);
        assert.deepInclude(tagged, { rows: 6, joinedRows: 4 });
        assert.strictEqual(
            session.data.joins().find((join) => join.choices.flag !== undefined)?.joinedRows,
            1,
            "a values join counts the rows that matched",
        );
    });

    it("fuses a clashing column and pages its clashes", async () => {
        const session = await doors();
        const recipe = session.data.prepareJoins();
        const floors = recipe.hold({
            name: "survey.csv",
            rows: [
                { id: "bldg-01", floors: 6 },
                { id: "bldg-02", floors: 3 },
                { id: "bldg-03", floors: 11 },
            ],
        });
        const step = recipe.add({
            from: floors,
            choices: { shape: "node-values", keys: [{ file: "id", graph: "id" }], fuse: { floors: "max" } },
        });

        assert.deepEqual(recipe.outcome(step).report?.clashes, [{ column: "floors", code: "clash" }]);
        assert.deepEqual(
            recipe.clashes(step, "floors", { limit: 1 }).items.map((each) => [each.id, each.incoming]),
            [["bldg-01", 6]],
        );
        assert.strictEqual(recipe.clashes(step, "floors").total, 2);
        const hq = recipe.preview().nodes.find((node) => node.id === "bldg-03");
        assert.strictEqual(hq?.data.floors, 11);
        recipe.discard();
    });
});

describe("join recipe cost", () => {
    it("JoinsDraft.commit: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession();
                await session.data.addNodes(Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` })));
                const recipe = session.data.prepareJoins();
                const scores = recipe.hold({
                    name: "scores.csv",
                    rows: Array.from({ length: size }, (_, at) => ({ name: `n${String(at)}`, score: at })),
                });
                const pairs = recipe.hold({
                    name: "pairs.csv",
                    rows: Array.from({ length: size }, (_, at) => ({
                        a: `n${String(at)}`,
                        b: `n${String((at + 1) % size)}`,
                    })),
                });
                recipe.add({ from: scores, choices: { keys: [{ file: "name", graph: "id" }], shape: "node-values" } });
                recipe.add({
                    from: pairs,
                    choices: {
                        shape: "edges",
                        keys: [
                            { file: "a", graph: "id" },
                            { file: "b", graph: "id" },
                        ],
                    },
                });
                const visits = await visitsDuring(() => recipe.commit());
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by JoinsDraft.commit" },
        );
    });
});
