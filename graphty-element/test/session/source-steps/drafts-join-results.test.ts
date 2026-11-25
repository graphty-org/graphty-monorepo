/**
 * @file What a join leaves behind, whatever else the draft holds: an edge's columns, the nodes and NodeIds
 * the graph had, and what its card's lists say. Each case that a project file can hold is read back from one.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, replayFetch } from "../../../session";
import { readsAsDate } from "../../../src/session/time/parse";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const PEOPLE = csv("people.csv", "person,badge,dept", "P1,B1,x", "P2,B2,x", "P3,B3,y");
const BUILDINGS = csv("buildings.csv", "building,city", "D1,Rome", "D2,Oslo");
const ENTRIES = csv(
    "entries.csv",
    "entry,person,badge,building,time",
    "E1,P1,B1,D1,9",
    "E2,P2,B2,D2,10",
    "E3,,B3,D1,11",
    "E4,P9,B9,D9,12",
);
const ACCOUNTS = csv("accounts.csv", "account,phone,device", "A1,555,d1", "A2,777,d2", "A3,888,d1", "A4,999,d9");
const WATCH = csv("watch.csv", "value,risk", "555,high", "d1,mid", "404,none");

const on = (): GraphSession => createGraphSession({ features: ["source-steps"] });

/**
 * The graph's nodes and edges.
 * @param session - The session.
 * @returns Them.
 */
function graphOf(session: GraphSession): unknown {
    return { nodes: session.data.nodes(), edges: session.data.edges() };
}

/**
 * The graph as a project file saved now opens it.
 * @param session - The session.
 * @returns Its nodes and edges.
 */
async function reopened(session: GraphSession): Promise<unknown> {
    const { text } = await session.project.save();
    const other = on();
    await other.project.open(text);
    const out = graphOf(other);
    other.dispose();
    return out;
}

/**
 * The columns the edges matching a test carry.
 * @param session - The session.
 * @param from - The NodeId they start at; absent, every edge.
 * @returns One sorted list per edge.
 */
function edgeColumns(session: GraphSession, from?: string): string[][] {
    return session.data
        .edges()
        .filter((edge) => from === undefined || edge.source === from)
        .map((edge) =>
            Object.keys(edge)
                .filter((name) => !["id", "source", "target", "_source.loads"].includes(name))
                .sort((a, b) => a.localeCompare(b)),
        );
}

/**
 * People and buildings in the graph, entries staged.
 * @returns The session and the entries' key.
 */
async function doors(): Promise<{ session: GraphSession; entries: string }> {
    const session = on();
    await session.data.import(PEOPLE, { key: "person", type: "person" });
    await session.data.import(BUILDINGS, { key: "building", type: "building", mode: "merge" });
    const entries = await session.data.stage(ENTRIES, { key: "entry" });
    return { session, entries };
}

/** What a door entry's edge between a person, by the field given, and a building is made of. */
const door = (
    entries: string,
    field: "person" | "badge",
): Parameters<ReturnType<GraphSession["data"]["draft"]>["connect"]>[0] => ({
    from: { source: entries, field },
    into: field === "person" ? { space: "person" } : { space: "person", field: "badge" },
    to: { field: "building", into: { space: "building" } },
});

describe("source-steps drafts: the columns a join's edges carry", () => {
    it("are its own step's, whatever another card of the same rows or of others reads", async () => {
        const { session, entries } = await doors();
        const first = session.data.draft();
        first.connect(door(entries, "person"));
        await first.commit();
        const own = ["badge", "entry", "time"];
        assert.deepStrictEqual(edgeColumns(session), [own, own]);

        const second = session.data.draft();
        second.connect(door(entries, "badge"));
        second.link({ source: session.data.sources()[0].key, columns: ["dept"], nodes: "person" });
        await second.commit();
        assert.deepStrictEqual(
            edgeColumns(session),
            [
                own,
                own,
                ["entry", "person", "time"],
                ["entry", "person", "time"],
                ["entry", "time"],
                ["directed", "shared"],
            ],
            "the edges drawn before keep their badge and gain no end; the new ones carry what they do not end by",
        );
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("stay on an edge another card folds its rows into", async () => {
        const { session, entries } = await doors();
        const d = session.data.draft();
        d.connect(door(entries, "person"));
        d.connect({ ...door(entries, "badge"), existing: "merge" });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newEdges: 1, mergedEdges: 2 });
        await d.commit();
        assert.deepStrictEqual(edgeColumns(session), [
            ["badge", "entry", "time"],
            ["badge", "entry", "time"],
            ["entry", "time"],
        ]);
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("say a link between nodes sharing a value runs neither way", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const d = session.data.draft();
        d.link({ source: session.data.sources()[0].key, columns: ["dept"] });
        await d.commit();
        assert.deepStrictEqual(
            session.data.edges().map((edge) => [edge.source, edge.target, edge.directed]),
            [["P1", "P2", false]],
        );
        assert.notStrictEqual(session.data.statistics().directedness, "directed");
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });
});

describe("source-steps drafts: the other end of a Connect by a column of its nodes", () => {
    it("is looked up by it, at either end, read back and saved", async () => {
        const { session, entries } = await doors();
        const d = session.data.draft();
        d.connect({
            from: { source: entries, field: "building" },
            into: { space: "building" },
            to: { field: "badge", into: { space: "person", field: "badge" } },
        });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newEdges: 3, unmatched: 1 });
        assert.deepStrictEqual(d.steps().at(-1)?.act?.to, {
            field: "badge",
            into: { space: "person", field: "badge" },
        });
        const act = d.steps().at(-1)?.act;
        d.replaceStep(d.steps().length - 1, {
            act: "connect",
            options: {
                from: { source: entries, field: "building" },
                into: act?.into ?? { space: "" },
                to: act?.to,
                direction: "from-into",
            },
        });
        assert.deepInclude(d.steps().at(-1)?.act, { direction: "from-into", to: act?.to });
        await d.commit();
        assert.deepStrictEqual(
            session.data.edges().map((edge) => [edge.source, edge.target]),
            [
                ["P1", "D1"],
                ["P2", "D2"],
                ["P3", "D1"],
            ],
        );
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("may be a staged source's field, added first", async () => {
        const session = on();
        await session.data.import(BUILDINGS, { key: "building", type: "building" });
        const people = await session.data.stage(PEOPLE, { key: "person", type: "person" });
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const d = session.data.draft();
        d.connect({
            from: { source: entries, field: "building" },
            into: { space: "building" },
            to: { field: "badge", into: { source: people, field: "badge" } },
        });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newEdges: 3 });
        assert.isTrue(d.steps().find((step) => step.source === people)?.joined);
        session.dispose();
    });
});

describe("source-steps drafts: what a join never takes from the graph", () => {
    it("an account a watchlist is matched to twice, its unmatched rows skipped", async () => {
        for (const fanOut of ["skip", "each"] as const) {
            const session = on();
            await session.data.import(ACCOUNTS, { key: "account", type: "account" });
            const watch = await session.data.stage(WATCH, { key: "value" });
            const d = session.data.draft();
            const by = (field: string) =>
                ({
                    from: { source: watch, field: "value" },
                    into: { space: "account", field },
                    unmatchedFrom: "drop",
                    fanOut,
                }) as const;
            d.merge(by("phone"));
            d.merge(by("device"));
            assert.strictEqual(d.preview().after.nodes, 4, fanOut);
            await d.commit();
            assert.deepStrictEqual(
                session.data.nodes().map((node) => [node.id, node.risk]),
                [
                    ["A1", "high"],
                    ["A2", undefined],
                    ["A3", fanOut === "each" ? "mid" : undefined],
                    ["A4", undefined],
                ],
                "the row for d1, which names no phone, still names two devices",
            );
            assert.deepStrictEqual(await reopened(session), graphOf(session));
            session.dispose();
        }
    });

    it("under No match add, the second match joins the rows the first left as nodes", async () => {
        const session = on();
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const watch = await session.data.stage(WATCH, { key: "value" });
        const d = session.data.draft();
        for (const field of ["phone", "device"]) {
            d.merge({ from: { source: watch, field: "value" }, into: { space: "account", field }, fanOut: "each" });
        }
        await d.commit();
        assert.deepStrictEqual(
            session.data.nodes().map((node) => [node.id, node.risk]),
            [
                ["A1", "high"],
                ["A2", undefined],
                ["A3", "mid"],
                ["A4", undefined],
                ["404", "none"],
            ],
        );
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("a row already folded joins each account its other field names, and folds no account into another", async () => {
        const session = on();
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const watch = await session.data.stage(csv("w.csv", "phone,device,risk", "555,d9,high", "777,d0,low"), {
            key: "phone",
        });
        const d = session.data.draft();
        for (const field of ["phone", "device"]) {
            d.merge({ from: { source: watch, field }, into: { space: "account", field }, unmatchedFrom: "drop" });
        }
        assert.deepInclude(d.steps().at(-1)?.buckets, { merged: 1, unmatched: 1, keptNew: 0 });
        assert.deepStrictEqual(d.preview().rows({ step: d.steps().length - 1, bucket: "merged" }).rows[0]?.key, "d9");
        await d.commit();
        assert.deepStrictEqual(
            session.data.nodes().map((node) => [node.id, node.risk]),
            [
                ["A1", "high"],
                ["A2", "low"],
                ["A3", undefined],
                ["A4", "high"],
            ],
        );
        session.dispose();
    });

    it("a node another source brought, or one loaded on its own, that a row's link leaves unlinked", async () => {
        const session = on();
        await session.data.import(csv("p.csv", "id,boss", "P1,", "P2,P1", "P3,"), { key: "id", type: "person" });
        const more = await session.data.stage(csv("m.csv", "emp,lead", "P2,P1", "P3,"), { key: "emp", type: "emp" });
        const d = session.data.draft();
        d.merge({ from: { source: more, field: "emp" }, into: { space: "person" } });
        d.connect({ from: { source: more, field: "lead" }, into: { space: "person" }, unlinked: "drop" });
        assert.strictEqual(d.preview().after.nodes, 3, "P3 is people.csv's too");
        d.undo();
        d.undo();
        d.connect({
            from: { source: session.data.sources()[0].key, field: "boss" },
            into: { space: "person" },
            unlinked: "drop",
        });
        assert.strictEqual(d.preview().after.nodes, 3, "the file was in the graph before the card");
        session.dispose();
    });

    it("but a row only the join made a node of is left out, and reads so", async () => {
        const { session, entries } = await doors();
        const d = session.data.draft();
        d.connect({ from: { source: entries, field: "person" }, into: { space: "person" }, unlinked: "drop" });
        assert.strictEqual(d.preview().after.nodes, 7);
        const { rows } = d.preview().rows({ step: d.steps().length - 1, bucket: "unmatched" });
        assert.deepStrictEqual(
            rows.map((row) => [row.key, row.effect]),
            [["E4", "left-out"]],
        );
        await d.commit();
        const facts = session.data.sources().find((source) => source.key === entries);
        assert.strictEqual(facts?.rowsLeftOut?.["left-out:unmatched"], 2, "E3 names nobody, E4 somebody not there");
        session.dispose();
    });

    it("the NodeIds nodes had, when values become nodes or a later file repeats their ids", async () => {
        const session = on();
        await session.data.import(csv("items.csv", "id,group", "1,2", "2,2", "3,1"), { key: "id" });
        const ids = (): string[] => session.data.nodes().map((node) => String(node.id));
        const d = session.data.draft();
        d.extract(session.data.sources()[0].key, { column: "group" });
        await d.commit();
        assert.deepStrictEqual(ids(), ["1", "2", "3", "group:2", "group:1"]);
        const shops = await session.data.stage(csv("shops.csv", "id,name", "1,A", "9,B"), { key: "id" });
        await session.data.add(shops);
        assert.deepStrictEqual(ids(), ["1", "2", "3", "group:2", "group:1", "shops.csv:1", "9"]);
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("and Both names its column by the source, told apart from another source of that name", async () => {
        const session = on();
        await session.data.import(csv("a.csv", "duns,city", "1,Rome", "2,Oslo"), { key: "duns", type: "supplier" });
        const d = session.data.draft();
        const keys: string[] = [];
        for (const city of ["Paris", "Lima"]) {
            const b = await d.stage(csv("b.csv", "duns,city", `1,${city}`), { key: "duns" });
            keys.push(b);
            d.merge({ from: { source: b, field: "duns" }, into: { space: "supplier" }, clash: { city: "both" } });
        }
        await d.commit();
        const node = session.data.node("1");
        assert.deepStrictEqual(
            [node?.city, node?.["city (b.csv)"], node?.[`city (${keys[1] ?? ""})`]],
            ["Rome", "Paris", "Lima"],
        );
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });
});

describe("source-steps drafts: new nodes of a column", () => {
    it("never land among the nodes a source's rows are, whichever source's", async () => {
        const session = on();
        await session.data.import(csv("p.csv", "id,name", "1,Ann", "2,Bo"), { key: "id", type: "person" });
        const items = await session.data.stage(csv("items.csv", "id,person", "i1,1", "i2,7"), {
            key: "id",
            type: "item",
        });
        const d = session.data.draft();
        d.extract(items, { column: "person" });
        assert.strictEqual(d.preview().after.nodes, 6);
        assert.strictEqual(d.steps().at(-1)?.extract?.space, "person 2");
        d.undo();
        d.extract(items, { column: "person", type: "person" });
        assert.strictEqual(d.preview().after.nodes, 5, "named, the type's own space is the one meant");
        session.dispose();
    });

    it("of edge rows land in a space named for the column", async () => {
        const session = on();
        const calls = await session.data.stage(csv("c.csv", "a,b,tower", "1,2,T1", "2,3,T1"), {
            edges: { from: { column: "a" }, to: { column: "b" } },
        });
        await session.data.add(calls);
        const d = session.data.draft();
        d.extract(calls, { column: "tower" });
        assert.strictEqual(d.steps().at(-1)?.extract?.space, "tower");
        assert.strictEqual(d.preview().after.nodes, 4);
        session.dispose();
    });

    it("leave a row's moved cells on the row when its value is left out or its cell is only separators", async () => {
        const session = on();
        const people = await session.data.stage(csv("p.csv", "id,team,city", "1,T1,Rome", "2,T2,Oslo"), {
            key: "id",
            type: "p",
        });
        const d = session.data.draft();
        d.extract(people, { column: "team", type: "team", columns: ["city"] });
        d.exclude(d.steps().length - 1, ["T1"]);
        await d.commit();
        assert.deepStrictEqual(
            session.data.nodes().map((node) => [node.id, node.city]),
            [
                ["1", "Rome"],
                ["2", undefined],
                ["T2", "Oslo"],
            ],
        );
        const split = on();
        const rows = await split.data.stage(csv("p.csv", "id,team,city", "1,x;y,Rome", "2,;,Oslo"), { key: "id" });
        const e = split.data.draft();
        e.extract(rows, { column: "team", type: "team", split: ";", columns: ["city"] });
        await e.commit();
        assert.strictEqual(split.data.node("2")?.city, "Oslo");
        session.dispose();
        split.dispose();
    });

    it("leave an edge row's moved cells on its edge when its value is left out", async () => {
        const session = on();
        const calls = await session.data.stage(csv("c.csv", "a,b,tower,city", "1,2,T1,Rome", "2,3,T2,Oslo"), {
            edges: { from: { column: "a" }, to: { column: "b" } },
        });
        await session.data.add(calls);
        const d = session.data.draft();
        d.extract(calls, { column: "tower", columns: ["city"] });
        const step = d.steps().findIndex((each) => each.extract !== null);
        d.exclude(step, ["T1"], { column: "tower" });
        await d.commit();
        assert.deepStrictEqual(
            session.data.edges().map((edge) => edge.city),
            ["Rome", undefined, undefined],
        );
        session.dispose();
    });
});

describe("source-steps drafts: what a step's counts list", () => {
    it("rows linked by a value are left out one by one, by the node each is", async () => {
        const session = on();
        const accounts = await session.data.stage(csv("a.csv", "account,phone", "A1,5", "A2,5", "A3,5", "A4,7"), {
            key: "account",
            type: "account",
        });
        const d = session.data.draft();
        d.link({ source: accounts, columns: ["phone"] });
        const step = d.steps().length - 1;
        assert.deepInclude(d.steps()[step]?.buckets, { newEdges: 3 });
        const { rows } = d.preview().rows({ step, bucket: "matched" });
        assert.deepStrictEqual(
            rows.map((row) => row.key),
            ["A1", "A2", "A3"],
        );
        d.exclude(step, ["A2"]);
        assert.deepInclude(d.steps()[step]?.buckets, { newEdges: 1 });
        assert.deepStrictEqual(d.steps()[step]?.except, { column: "account", values: ["A2"] });
        const edges = d.preview().rows({ step, bucket: "newEdges" }).rows;
        assert.deepStrictEqual(edges[0]?.ends, {
            source: { space: "account", key: "A1" },
            target: { space: "account", key: "A3" },
        });
        session.dispose();
    });

    it("nodes linked by what they carry are left out by their key, the column their list names", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const d = session.data.draft();
        d.link({ source: session.data.sources()[0].key, columns: ["dept"], nodes: "person" });
        const step = d.steps().length - 1;
        d.exclude(step, ["P1"]);
        assert.deepStrictEqual(d.steps()[step]?.except, { column: "key", values: ["P1"] });
        assert.deepInclude(d.steps()[step]?.buckets, { newEdges: 0 });
        session.dispose();
    });

    it("the nodes of a value over the hub cap, and the pairs below the minimum", async () => {
        const session = on();
        const rows = ["A1,5,x", "A2,5,x", "A3,5,y"];
        const a = await session.data.stage(csv("a.csv", "account,phone,dept", ...rows), { key: "account" });
        const d = session.data.draft();
        d.link({ source: a, columns: ["phone"], maxShared: 2 });
        const step = d.steps().length - 1;
        const hub = d.preview().rows({ step, bucket: "hub" }).rows;
        assert.deepStrictEqual(
            hub.map((row) => [row.key, row.name, row.element]),
            rows.map((row) => [row.slice(0, 2), "phone", { space: `source:${a}`, key: row.slice(0, 2) }]),
        );
        d.undo();
        d.link({ source: a, columns: ["phone", "dept"], minShared: 2 });
        const below = d.preview().rows({ step, bucket: "pairsBelowMin" }).rows;
        assert.deepStrictEqual(
            below.map((row) => [row.ends?.source.key, row.ends?.target.key]),
            [
                ["A1", "A3"],
                ["A2", "A3"],
            ],
        );
        session.dispose();
    });

    it("what a merge did not reach is its own source's and unchanged; a row kept as a node is no row left out", async () => {
        const { session, entries } = await doors();
        const hr = await session.data.stage(csv("hr.csv", "person,grade", "P1,g1"), { key: "person" });
        const pay = await session.data.stage(csv("pay.csv", "person,pay", "P1,1", "P2,2", "P3,3"), { key: "person" });
        const d = session.data.draft();
        d.merge({ from: { source: hr, field: "person" }, into: { space: "person" } });
        const step = d.steps().length - 1;
        d.merge({ from: { source: pay, field: "person" }, into: { space: "person" } });
        assert.deepStrictEqual(
            d
                .preview()
                .rows({ step, bucket: "untouched" })
                .rows.map((row) => [row.source, row.key, row.effect]),
            [
                [session.data.sources()[0].key, "P2", "unchanged"],
                [session.data.sources()[0].key, "P3", "unchanged"],
            ],
        );
        d.connect({ from: { source: entries, field: "person" }, into: { space: "person" } });
        const { rows } = d.preview().rows({ step: d.steps().length - 1, bucket: "unmatched" });
        assert.deepStrictEqual(
            rows.map((row) => [row.key, row.effect]),
            [["E4", "added"]],
        );
        session.dispose();
    });

    it("the nodes the commit takes out, and their edges", async () => {
        const session = on();
        await session.data.import(csv("e.csv", "source,target", "a,b", "b,c"), {});
        const d = session.data.draft();
        d.removeSource(session.data.sources()[0].key);
        assert.deepInclude(d.preview().marks.nodes, { removed: 3 });
        assert.deepInclude(d.preview().marks.edges, { removed: 2 });
        session.dispose();
    });

    it("the rows each space holds: those added, merged in, or kept as nodes", async () => {
        const { session, entries } = await doors();
        const hr = await session.data.stage(csv("hr.csv", "person,grade", "P1,g1"), { key: "person" });
        const visits = await session.data.stage(csv("v.csv", "person,building", "P1,D1"), {
            edges: { from: { column: "person" }, to: { column: "building" } },
        });
        const d = session.data.draft();
        d.merge({ from: { source: hr, field: "person" }, into: { space: "person" } });
        d.connect({
            ...door(entries, "person"),
            to: { field: "building", into: { space: "building" }, keepRow: true },
        });
        d.connect({
            from: { source: visits, field: "person" },
            into: { space: "person" },
            to: { field: "building", into: { space: "building" }, keepRow: true },
        });
        const rowsOf = (space: string): readonly string[] | undefined =>
            d.spaces().find((row) => row.space === space)?.rowsOf;
        assert.deepStrictEqual(rowsOf("person"), [session.data.sources()[0].key, hr]);
        assert.deepStrictEqual(rowsOf(`source:${entries}`), [entries]);
        assert.deepStrictEqual(rowsOf(`source:${visits}`), [visits]);
        d.link({ source: hr, columns: ["grade"] });
        assert.strictEqual(d.steps().at(-1)?.holders, "person", "its rows are people by then");
        session.dispose();
    });

    it("a later match reads the rows every account they folded into holds", async () => {
        const session = on();
        await session.data.import(csv("a.csv", "account,phone", "A1,5", "A2,5"), { key: "account", type: "account" });
        const watch = await session.data.stage(csv("w.csv", "value,list", "5,L1"), { key: "value" });
        const d = session.data.draft();
        d.merge({
            from: { source: watch, field: "value" },
            into: { space: "account", field: "phone" },
            fanOut: "each",
            unmatchedFrom: "drop",
        });
        const { rows } = d.preview().rows({ step: d.steps().length - 1, bucket: "merged" });
        assert.deepStrictEqual(
            rows.map((row) => [row.element, row.incoming]),
            ["A1", "A2"].map((key) => [
                { space: "account", key },
                { value: "5", list: "L1" },
            ]),
        );
        await d.commit();
        assert.strictEqual(session.data.sources().find((each) => each.key === watch)?.counts.nodes, 2);
        for (const key of ["A1", "A2"]) {
            const read = session.data.lineage({ space: "account", key })?.steps.map((step) => step.source) ?? [];
            assert.include(read, watch, `${key} was read from the list's row`);
        }
        session.dispose();
    });
});

describe("source-steps drafts: match counts and guesses", () => {
    it("say what ignoring spaces brings when the odd spelling is the graph's", async () => {
        const session = on();
        await session.data.import(csv("a.csv", "account,phone", "A1,+1 555", "A2,+1555"), {
            key: "account",
            type: "account",
        });
        const watch = await session.data.stage(csv("w.csv", "value", "+1555"), { key: "value" });
        const pair = { from: { source: watch, field: "value" }, into: { space: "account", field: "phone" } };
        assert.deepInclude(session.data.matchCounts(pair), {
            matchedRows: 1,
            moreRowsWithIgnoreSpaces: 0,
            matchedNodes: 1,
            moreNodesWithIgnoreSpaces: 1,
            moreNodesWithIgnoreCase: 0,
            moreNodesWithBoth: 1,
        });
        assert.deepInclude(session.data.matchCounts(pair, { ignoreSpaces: true }), {
            matchedNodes: 2,
            moreNodesWithIgnoreSpaces: null,
        });
        session.dispose();
    });

    it("name a staged source's keys too", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const buildings = await session.data.stage(BUILDINGS, { key: "building" });
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        assert.deepStrictEqual(
            session.data
                .draft()
                .suggestMatches(entries)
                .map((each) => each.matches[0]),
            [
                { from: { source: entries, field: "person" }, into: { space: "person" } },
                { from: { source: entries, field: "building" }, into: { source: buildings } },
            ],
        );
        session.dispose();
    });

    it("read a code as text, not as a date", async () => {
        for (const text of ["B-1027", "bldg-04", "dev-5921", "12:30", "T-1 2004"]) {
            assert.isFalse(readsAsDate(text), text);
        }
        for (const text of ["2026-01-15", "1/15/2026", "15 Jan 2026", "January 15, 2026", "2026/01/15"]) {
            assert.isTrue(readsAsDate(text), text);
        }
        const session = on();
        await session.data.import(csv("d.csv", "device,building", "dev-5921,bldg-04", "dev-1,bldg-06"), {
            key: "device",
        });
        const table = session.data.sourceTable(session.data.sources()[0].key);
        assert.deepInclude(table.profile("building"), { kind: "text", valid: 2 });
        assert.deepInclude(table.profile("device"), { kind: "text", valid: 2 });
        session.dispose();
    });
});

describe("source-steps drafts: taking things back", () => {
    it("redo makes again what undo took back, until a new act", async () => {
        const { session, entries } = await doors();
        const d = session.data.draft();
        assert.deepStrictEqual([d.canUndo, d.canRedo], [false, false]);
        d.connect(door(entries, "person"));
        const steps = JSON.stringify(d.steps());
        assert.isTrue(d.undo());
        assert.deepStrictEqual([d.canUndo, d.canRedo], [false, true]);
        assert.isTrue(d.redo());
        assert.strictEqual(JSON.stringify(d.steps()), steps);
        assert.isFalse(d.redo());
        d.undo();
        d.connect(door(entries, "badge"));
        assert.deepStrictEqual([d.canUndo, d.canRedo], [true, false]);
        session.dispose();
    });

    it("a removed source takes the joins that name its nodes, and their rows wait again", async () => {
        const { session, entries } = await doors();
        const d = session.data.draft();
        d.connect(door(entries, "person"));
        await d.commit();
        const [, buildings] = session.data.sources();
        await session.data.removeSource(buildings.key);
        assert.deepStrictEqual(
            session.data.steps().map((step) => step.op),
            ["join.add"],
        );
        assert.deepStrictEqual(
            session.data.staged().map((source) => source.key),
            [entries],
        );
        assert.strictEqual(session.data.nodes().length, 3);
        session.dispose();
    });
});

describe("source-steps: a source read from an address", () => {
    const ADDRESS = "https://files.example.com/q.csv";

    it("is read from it again, and still is in a project opened later", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const bodies = ["name,team\nAnn,x\nBo,y\n", "name,team\nAnn,x\nBo,y\nCy,z\n", "name,team\nAnn,x\n"];
        const fetched = replayFetch(bodies.map((body) => ({ url: ADDRESS, body })));
        const real = globalThis.fetch;
        globalThis.fetch = fetched;
        try {
            const key = await session.data.stage({ source: "url", config: { url: ADDRESS } });
            await session.data.add(key);
            assert.deepStrictEqual((await session.data.reloadSource(key, {})).nodes, {
                added: 1,
                removed: 0,
                changed: 0,
            });
            const { text } = await session.project.save();
            const other = on();
            await other.project.open(text);
            const opened = other.data.sources().find((source) => source.kind === "url");
            assert.isTrue(opened?.reloadable);
            assert.strictEqual(opened?.url, ADDRESS);
            assert.deepStrictEqual((await other.data.reloadSource(opened?.key ?? "", {})).nodes, {
                added: 0,
                removed: 2,
                changed: 0,
            });
            other.dispose();
        } finally {
            globalThis.fetch = real;
        }
        session.dispose();
    });

    it("has no key of its own when its rows were numbered for want of one", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const real = globalThis.fetch;
        globalThis.fetch = replayFetch([{ url: ADDRESS, body: "value,kind\na,x\na,y\nb,x\n" }]);
        try {
            const key = await session.data.stage({ source: "url", config: { url: ADDRESS } });
            const facts = session.data.sourceTable(key).summary();
            assert.strictEqual(facts.mapping.key, undefined);
            assert.deepStrictEqual(facts.tables[0]?.columns, ["value", "kind"]);
            // loaded rather than staged, as the first source of a project is
            const loaded = on();
            const fetched = replayFetch([{ url: ADDRESS, body: "value,kind\na,x\na,y\nb,x\n" }]);
            await loaded.data.import({ source: "url", config: { url: ADDRESS } }, { fetch: fetched });
            const first = loaded.data.sourceTable(loaded.data.sources()[0].key).summary();
            assert.strictEqual(first.mapping.key, undefined);
            assert.deepStrictEqual(first.tables[0]?.columns, ["value", "kind"]);
            assert.strictEqual(loaded.data.nodes().length, 3);
            loaded.dispose();
        } finally {
            globalThis.fetch = real;
        }
        session.dispose();
    });
});
