/**
 * @file What joining the owner's sample files needs of a draft: a value several nodes hold, edges that
 * carry their rows' columns, counts by row, rows no edge reaches, new nodes in a space of their own, and
 * a step changed without losing what another one needs. Each case that a project file can hold is read
 * back from one.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft } from "../../../src/session";
import { visitsDuring } from "../../helpers/cost";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const ACCOUNTS = csv("accounts.csv", "account,phone", "A1,555", "A2,555", "A3,777", "A4,");
const PEOPLE = csv("people.csv", "person,name", "P1,Ann", "P2,Bo");
const BUILDINGS = csv("buildings.csv", "id,name", "BLDG-01,North", "BLDG-02,South");
const ENTRIES = csv(
    "entries.csv",
    "entry,person,building,time",
    "E1,P1,BLDG-01,07:58",
    "E2,P2,bldg-02 ,08:19",
    "E3,,BLDG-02,08:20",
    "E4,P9,bldg-77,08:21",
);

const on = (): GraphSession => createGraphSession({ features: ["source-steps"] });

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
 * The graph's nodes and edges.
 * @param session - The session.
 * @returns Them.
 */
function graphOf(session: GraphSession): unknown {
    return { nodes: session.data.nodes(), edges: session.data.edges() };
}

/**
 * Accounts in the graph, a watchlist of phones staged.
 * @returns The session, an open draft and the watchlist's key.
 */
async function watchlist(rows: string[] = []): Promise<{ session: GraphSession; d: SourceDraft; w: string }> {
    const session = on();
    await session.data.import(ACCOUNTS, { key: "account", type: "account" });
    const w = await session.data.stage(csv("watch.csv", "value,risk", "555,high", "777,low", "999,high", ...rows), {
        key: "value",
    });
    return { session, d: session.data.draft(), w };
}

describe("source-steps drafts: a value several nodes hold", () => {
    it("folds its row into each of them under fanOut: each, and reads the choice back", async () => {
        const { session, d, w } = await watchlist();
        const options = {
            from: { source: w, field: "value" },
            into: { space: "account", field: "phone" },
            unmatchedFrom: "drop",
        } as const;
        d.merge({ ...options, fanOut: "each" });
        assert.deepInclude(d.steps().at(-1)?.buckets, { merged: 3, fanOut: 0, keptNew: 0, untouched: 1 });
        assert.strictEqual(d.steps().at(-1)?.act?.fanOut, "each");
        assert.strictEqual(d.preview().marks.nodes.merged, 3, "every account the watchlist flags reads as merged");
        await d.commit();
        assert.deepStrictEqual(
            session.data.nodes().map((n) => [n.id, n.risk]),
            [
                ["A1", "high"],
                ["A2", "high"],
                ["A3", "low"],
                ["A4", undefined],
            ],
        );
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("left out, its row makes no node under unmatchedFrom: drop", async () => {
        const { session, d, w } = await watchlist();
        d.merge({
            from: { source: w, field: "value" },
            into: { space: "account", field: "phone" },
            unmatchedFrom: "drop",
        });
        assert.deepInclude(d.steps().at(-1)?.buckets, { merged: 1, fanOut: 1, keptNew: 0 });
        assert.strictEqual(d.preview().after.nodes, 4);
        session.dispose();
    });

    it("folds an edge row into each, and makes an edge to each", async () => {
        const session = on();
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const e = await session.data.stage(csv("calls.csv", "phone,tower,at", "555,T1,9", "777,T2,10"), {
            edges: { from: { column: "phone" }, to: { column: "tower" } },
        });
        const d = session.data.draft();
        const into = { space: "account", field: "phone" };
        d.merge({ from: { source: e, field: "phone" }, into, fanOut: "each", unmatchedFrom: "drop" });
        assert.deepInclude(d.steps().at(-1)?.buckets, { merged: 3, fanOut: 0 });
        d.connect({
            from: { source: e, field: "phone" },
            into,
            to: { field: "tower", into: { space: "tower" }, unmatched: "add", type: "tower" },
            fanOut: "each",
        });
        await d.commit();
        assert.deepStrictEqual(
            session.data.edges().map((each) => [each.source, each.target, each.at]),
            [
                ["A1", "T1", 9],
                ["A2", "T1", 9],
                ["A3", "T2", 10],
            ],
        );
        assert.strictEqual(session.data.node("A2")?.at, 9);
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });
});

describe("source-steps drafts: two merges of one list's rows read as edges", () => {
    it("a value the second merge folds into several nodes is no node the first one kept", async () => {
        const session = on();
        await session.data.import(csv("accounts.csv", "account,phone,device", "A1,555,d1", "A2,555,d2", "A3,777,d3"), {
            key: "account",
            type: "account",
        });
        const w = await session.data.stage(csv("watch.csv", "value,kind,risk", "555,phone,high", "d9,device,low"));
        const d = session.data.draft();
        d.setMapping(w, { rows: "edges", edges: { source: "kind", target: "risk" } });
        for (const field of ["device", "phone"]) {
            d.merge({
                from: { source: w, field: "value" },
                into: { space: "account", field },
                fanOut: "each",
                unmatchedFrom: "keep",
            });
        }
        await d.commit();
        assert.deepStrictEqual(
            session.data.nodes().map((n) => [n.id, n.risk]),
            [
                ["A1", "high"],
                ["A2", "high"],
                ["A3", undefined],
                ["d9", "low"],
            ],
            "555 folds into both accounts that hold it; d9, which neither matches, is kept",
        );
        session.dispose();
    });
});

describe("source-steps drafts: rows that become edges", () => {
    it("bring their columns, under add and one per pair alike", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const buildings = await session.data.stage(BUILDINGS, { key: "id", type: "building" });
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const d = session.data.draft();
        const options = {
            from: { source: entries, field: "person" },
            into: { space: "person" },
            to: { field: "building", into: { source: buildings } },
        };
        d.connect(options);
        const columns = (): unknown =>
            d
                .preview()
                .rows({ step: d.steps().length - 1, bucket: "newEdges" })
                .rows.map((row) => row.shown);
        assert.deepStrictEqual(columns(), [{ entry: "E1", time: "07:58" }], "the row's own id and time");
        d.replaceStep(d.steps().length - 1, { act: "connect", options: { ...options, perPair: true } });
        assert.deepStrictEqual(columns(), [{ entry: "E1", time: "07:58" }]);
        await d.commit();
        assert.deepInclude(session.data.edges()[0], { entry: "E1", time: "07:58" });
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("kept as nodes, a row no edge reaches is left out under unlinked: drop", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const buildings = await session.data.stage(BUILDINGS, { key: "id", type: "building" });
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
        const d = session.data.draft();
        const options = {
            from: { source: entries, field: "person" },
            into: { space: "person" },
            to: { field: "building", into: { source: buildings }, keepRow: true },
        };
        d.connect(options);
        assert.strictEqual(d.preview().after.nodeTypes.entry, 4, "every row stays a node");
        const at = d.steps().length - 1;
        d.replaceStep(at, { act: "connect", options: { ...options, unlinked: "drop" } });
        assert.strictEqual(d.preview().after.nodeTypes.entry, 3, "E4 names nobody here and no building");
        assert.strictEqual(d.steps().at(-1)?.act?.unlinked, "drop");
        assert.strictEqual(d.steps().at(-1)?.buckets?.newNodes, 3);
        // A row naming one thing is the source's own node, added before the edges.
        d.removeStep(d.steps().length - 1, { adds: "remove" });
        d.connect({ from: options.from, into: options.into, unlinked: "drop" });
        assert.strictEqual(d.preview().after.nodeTypes.entry, 2, "E3 and E4 reach nobody");
        await d.commit();
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });
});

describe("source-steps drafts: match counts by row", () => {
    it("counts rows, the empty ones apart, and what both toggles would match together", async () => {
        const session = on();
        await session.data.import(BUILDINGS, { key: "id", type: "building" });
        const entries = await session.data.stage(ENTRIES, { key: "entry" });
        const pair = { from: { source: entries, field: "building" }, into: { space: "building" } };
        assert.deepInclude(session.data.matchCounts(pair), {
            matched: 2,
            rows: 4,
            matchedRows: 2,
            emptyRows: 0,
            moreWithIgnoreCase: 0,
            moreRowsWithIgnoreCase: 0,
            moreRowsWithIgnoreSpaces: 0,
            moreRowsWithBoth: 1,
        });
        assert.deepInclude(session.data.matchCounts(pair, { ignoreCase: true }), {
            matchedRows: 2,
            moreRowsWithIgnoreCase: null,
            moreRowsWithIgnoreSpaces: 1,
            moreRowsWithBoth: null,
        });
        const person = { from: { source: entries, field: "person" }, into: { space: "person" } };
        assert.deepInclude(session.data.matchCounts(person), { rows: 4, matchedRows: 0, emptyRows: 1 });
        session.dispose();
    });
});

describe("source-steps drafts: new nodes of a column", () => {
    it("never land among the rows' own keys when no type is named", async () => {
        const session = on();
        const items = await session.data.stage(csv("items.csv", "id,group", "1,2", "2,2", "3,1"), { key: "id" });
        const d = session.data.draft();
        d.extract(items, { column: "group" });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newNodes: 2, newEdges: 3, selfLoops: 0 });
        assert.strictEqual(d.preview().after.nodes, 5);
        session.dispose();
    });

    it("leave a row naming none its own moved cells", async () => {
        const session = on();
        const p = await session.data.stage(csv("p.csv", "id,team,city", "1,T1,Rome", "2,,Oslo"), {
            key: "id",
            type: "person",
        });
        const d = session.data.draft();
        d.extract(p, { column: "team", type: "team", columns: ["city"] });
        await d.commit();
        assert.strictEqual(session.data.node("2")?.city, "Oslo");
        assert.isUndefined(session.data.node("1")?.city);
        assert.strictEqual(session.data.node("T1")?.city, "Rome");
        assert.deepStrictEqual(await reopened(session), graphOf(session));
        session.dispose();
    });

    it("are left out one by one of a split cell, as their list names them", async () => {
        const session = on();
        const p = await session.data.stage(csv("p.csv", "id,tags", "1,x;y", "2,y"), { key: "id", type: "person" });
        const d = session.data.draft();
        d.extract(p, { column: "tags", type: "tag", split: ";" });
        const step = d.steps().length - 1;
        const keys = d
            .preview()
            .rows({ step, bucket: "newNodes" })
            .rows.map((row) => row.key);
        assert.deepStrictEqual(keys, ["x", "y"]);
        d.exclude(step, ["x"]);
        assert.deepInclude(d.steps()[step]?.buckets, { newNodes: 1, newEdges: 2 });
        session.dispose();
    });
});

describe("source-steps drafts: links between a space's nodes", () => {
    /**
     * Accounts linked by the phone they carry.
     * @returns The session, the draft and the link's place.
     */
    async function linked(): Promise<{ session: GraphSession; d: SourceDraft; step: number; source: string }> {
        const session = on();
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const source = session.data.sources()[0]?.key ?? "";
        const d = session.data.draft();
        d.link({ source, columns: ["phone"], nodes: "account" });
        return { session, d, step: d.steps().length - 1, source };
    }

    it("leave out a node, or one edge, by the key their lists name it by", async () => {
        const { session, d, step } = await linked();
        assert.strictEqual(d.steps()[step]?.buckets?.newEdges, 1);
        const list = (bucket: "matched" | "newEdges"): unknown[] =>
            d
                .preview()
                .rows({ step, bucket })
                .rows.map((row) => row.key);
        assert.deepStrictEqual(list("matched"), ["A1", "A2"]);
        d.exclude(step, ["A1"]);
        assert.strictEqual(d.steps()[step]?.buckets?.newEdges, 0);
        d.include(step, ["A1"]);
        d.exclude(step, list("newEdges") as string[]);
        assert.strictEqual(d.steps()[step]?.buckets?.newEdges, 0);
        session.dispose();
    });

    it("say the space of the nodes they link, whichever other step names those nodes", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const cards = await session.data.stage(csv("cards.csv", "card,owner,phone", "C1,P1,5", "C2,P2,5"), {
            key: "card",
            type: "card",
        });
        const d = session.data.draft();
        d.link({ source: cards, columns: ["phone"] });
        const link = d.steps().length - 1;
        assert.strictEqual(d.steps()[link]?.holders, "card");
        d.connect({ from: { source: cards, field: "owner" }, into: { space: "person" } });
        assert.strictEqual(d.steps()[link]?.holders, "card");
        assert.isNull(d.steps().at(-1)?.holders);
        const rows = Object.fromEntries(d.spaces().map((row) => [row.space, [row.rowsOf, row.staged]]));
        assert.deepStrictEqual(rows.card, [[cards], cards]);
        assert.deepStrictEqual(rows.person?.[1], null, "people were there; cards only name them");
        session.dispose();
    });
});

describe("source-steps drafts: a step changed or taken out", () => {
    it("leaves the sources another step's removal kept, and takes back two added into one space", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
        const hr = await session.data.stage(csv("hr.csv", "person,title", "P1,Lead"), { key: "person" });
        const d = session.data.draft();
        const merge = { from: { source: hr, field: "person" }, into: { space: "person" } };
        d.merge(merge);
        d.connect({ from: { source: entries, field: "person" }, into: { space: "person" } });
        d.removeStep(d.steps().length - 1);
        assert.strictEqual(d.preview().after.nodeTypes.entry, 4, "kept, as removeStep's default says");
        const at = d.steps().findIndex((step) => step.op === "join.merge");
        d.replaceStep(at, { act: "merge", options: { ...merge, ignoreCase: true } });
        assert.strictEqual(d.preview().after.nodeTypes.entry, 4);
        session.dispose();

        const other = on();
        const a = await other.data.stage(csv("a.csv", "id,v", "1,x"), { key: "id", type: "thing" });
        const b = await other.data.stage(csv("b.csv", "id,v", "2,y"), { key: "id", type: "thing" });
        const r = await other.data.stage(csv("r.csv", "from,to", "1,2"), {
            edges: { from: { column: "from" }, to: { column: "to" } },
        });
        const draft = other.data.draft();
        draft.connect({
            from: { source: r, field: "from" },
            into: { source: a },
            to: { field: "to", into: { source: b } },
        });
        assert.strictEqual(draft.preview().after.nodes, 2);
        draft.removeStep(draft.steps().length - 1, { adds: "remove" });
        assert.lengthOf(draft.steps(), 0);
        other.dispose();
    });

    it("may change a step that reads only a source's rows, though a later step adds the source", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
        const d = session.data.draft();
        const link = { source: entries, field: "person", into: { space: "person" }, columns: ["building"] };
        d.link(link);
        d.connect({ from: { source: entries, field: "person" }, into: { space: "person" } });
        const at = d.steps().findIndex((step) => step.link !== null);
        assert.isAbove(
            d.steps().findIndex((step) => step.op === "join.add" && step.source === entries),
            at,
        );
        d.replaceStep(at, { act: "link", options: { ...link, maxShared: 100 } });
        assert.strictEqual(d.steps()[at]?.link?.maxShared, 100);
        session.dispose();
    });

    it("repaints nothing the graph no longer holds when a drawn draft takes nodes away", async () => {
        const session = on();
        const rows = Array.from({ length: 60 }, (_, i) => `P${String(i)},t${String(i % 6)}`);
        const p = await session.data.stage(csv("p.csv", "id,tag", ...rows), { key: "id", type: "person" });
        const d = session.data.draft();
        d.extract(p, { column: "tag", type: "tag" });
        await d.commit();
        await session.styles.add({
            name: "by draft",
            target: "node",
            selector: { match: "expression", where: "graphty.draft != 'merged' && id != 'nobody'" },
            set: { "node.size": 2 },
        });
        const failed: string[] = [];
        session.on("style:repaint-failed", (failure) => failed.push(failure.error.code));
        const draft = session.data.draft();
        await draft.display(true);
        session.styles.showDraft({ merged: "#7048e8", new: "#e8590c" });
        await session.styles.settled();
        const visits = await visitsDuring(async () => {
            draft.removeStep(draft.steps().findIndex((step) => step.extract !== null));
            await draft.display(true);
            await session.styles.settled();
        });
        // One paint of the graph once After landed (about 22,600), not another racing the write (39,700).
        assert.isBelow(visits, 30_000);
        assert.strictEqual(session.data.nodes().length, 60);
        assert.deepStrictEqual(failed, []);
        session.dispose();
    });

    it("keeps the space the reader picked for its rows", async () => {
        const session = on();
        await session.data.import(PEOPLE, { key: "person", type: "person" });
        const entries = await session.data.stage(ENTRIES, { key: "entry", type: "entry" });
        const d = session.data.draft();
        d.setMapping(entries, { space: "visits" });
        const options = {
            from: { source: entries, field: "person" },
            into: { space: "person" },
            to: { field: "building", into: { space: "building" }, keepRow: true, unmatched: "add" },
        } as const;
        d.connect(options);
        assert.include(
            d.spaces().map((row) => row.space),
            "visits",
        );
        d.replaceStep(d.steps().length - 1, { act: "connect", options: { ...options, direction: "from-into" } });
        assert.include(
            d.spaces().map((row) => row.space),
            "visits",
        );
        d.removeStep(d.steps().length - 1, { adds: "remove" });
        assert.strictEqual(d.sourceTable(entries).summary().mapping.space, "visits");
        session.dispose();
    });
});

describe("source-steps drafts: a project file whose steps are misshapen", () => {
    it("says which step is wrong and still opens, never failing in the build", async () => {
        const session = on();
        const a = await session.data.stage(csv("a.csv", "id,v", "x,1", "z,1"), { key: "id", type: "a" });
        const d = session.data.draft();
        d.link({ source: a, columns: ["v"] });
        d.extract(a, { column: "v", type: "val", split: ";", columns: ["v"] });
        await d.commit();
        const { text } = await session.project.save();
        type SavedStep = Record<string, unknown>;
        const wrong = async (op: "link" | "extract", change: (step: SavedStep) => void): Promise<string[]> => {
            const file = JSON.parse(text) as { members: { kind?: string; joins?: SavedStep[] }[] };
            const joins = file.members.find((member) => member.kind === "graphty-sources")?.joins ?? [];
            joins.filter((step) => step[op] !== undefined).forEach(change);
            const other = on();
            const { problems } = await other.project.open(JSON.stringify(file));
            other.dispose();
            return problems.flatMap((problem) =>
                problem.code === "E_BAD_DOCUMENT" ? [String((problem.params as { pointer?: string }).pointer)] : [],
            );
        };
        const at = d.steps().findIndex((step) => step.link !== null);
        assert.deepStrictEqual(await wrong("link", () => undefined), []);
        for (const change of [
            { read: null },
            { link: { columns: "v", maxShared: 10, minShared: 1 } },
            { link: null },
        ]) {
            const pointers = await wrong("link", (step) => Object.assign(step, change));
            assert.lengthOf(pointers, 1);
            assert.match(pointers[0], new RegExp(`/joins/${String(at)}$`));
        }
        for (const extract of [null, { split: 5 }, { columns: "v" }]) {
            assert.lengthOf(await wrong("extract", (step) => Object.assign(step, { extract })), 1);
        }
        session.dispose();
    });
});
