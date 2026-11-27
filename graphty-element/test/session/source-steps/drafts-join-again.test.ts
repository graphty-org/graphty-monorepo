/**
 * @file Joins made one after another: a source merged into what was merged, two matches of one source, NodeIds
 * across renames, replacements and removals, rows left out one by one, and what a removal takes along.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession, type SourceDraft } from "../../../session";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const on = (): GraphSession => createGraphSession({ features: ["source-steps"] });

/**
 * One column of the graph's nodes, by NodeId.
 * @param session - The session.
 * @param column - The column.
 * @returns Each value, by the node's id as text.
 */
function values(session: GraphSession, column: string): Record<string, unknown> {
    return Object.fromEntries(session.data.nodes().map((node) => [String(node.id), node[column]]));
}

/**
 * The graph as a project file saved now opens it.
 * @param session - The session.
 * @returns The opened session.
 */
async function reopened(session: GraphSession): Promise<GraphSession> {
    const { text } = await session.project.save();
    const other = on();
    await other.project.open(text);
    return other;
}

const ids = (session: GraphSession): string[] => session.data.nodes().map((node) => String(node.id));

describe("source-steps drafts: two merges in a row", () => {
    it("a source rows were merged into takes them along when it is merged itself", async () => {
        for (const translateFirst of [true, false]) {
            const session = on();
            await session.data.import(csv("genes.csv", "symbol,len", "TP53,10", "BRCA1,20"), {
                key: "symbol",
                type: "gene",
            });
            const map = await session.data.stage(csv("map.csv", "ensembl,symbol", "E1,TP53", "E2,BRCA1"), {
                key: "ensembl",
                type: "ens",
            });
            const expr = await session.data.stage(csv("expr.csv", "gene_id,tumor", "E1,5", "E2,7"), {
                key: "gene_id",
            });
            const d = session.data.draft();
            if (translateFirst) {
                d.merge({ from: { source: map, field: "symbol" }, into: { space: "gene" } });
                d.merge({ from: { source: expr, field: "gene_id" }, into: { space: "gene", field: "ensembl" } });
            } else {
                d.merge({ from: { source: expr, field: "gene_id" }, into: { source: map } });
                d.merge({ from: { source: map, field: "symbol" }, into: { space: "gene" } });
            }
            await d.commit();
            assert.deepStrictEqual(values(session, "tumor"), { TP53: 5, BRCA1: 7 });
            session.dispose();
        }
    });

    it("a source of its own folded into leaves with what was folded into it, under No match skip", async () => {
        const session = on();
        await session.data.import(csv("acc.csv", "account", "A1"), { key: "account", type: "account" });
        const ident = await session.data.stage(csv("ident.csv", "id,account,phone", "i1,A1,555", "i2,A9,777"), {
            key: "id",
            type: "ident",
        });
        const watch = await session.data.stage(csv("watch.csv", "row,phone,risk", "w1,555,high", "w2,777,low"), {
            key: "row",
        });
        const d = session.data.draft();
        d.merge({ from: { source: watch, field: "phone" }, into: { source: ident, field: "phone" } });
        d.merge({ from: { source: ident, field: "account" }, into: { space: "account" }, unmatchedFrom: "drop" });
        await d.commit();
        assert.deepStrictEqual(values(session, "risk"), { A1: "high" });

        // a row that went with the node it was folded into is still there for a later match
        await session.data.import(csv("more.csv", "account,tel", "A7,777"), {
            key: "account",
            type: "account",
            mode: "merge",
        });
        const again = session.data.draft();
        again.merge({ from: { source: watch, field: "phone" }, into: { space: "account", field: "tel" } });
        await again.commit();
        assert.strictEqual(session.data.node("A7")?.risk, "low");
        session.dispose();
    });
});

describe("source-steps drafts: what a chain of merges keeps apart", () => {
    it("each source's own value of one column, and what two matches brought", async () => {
        const session = on();
        await session.data.import(csv("acc.csv", "account", "A1"), { key: "account", type: "account" });
        const ident = await session.data.stage(csv("ident.csv", "id,account,phone,device,note", "i1,A1,p1,d1,mine"), {
            key: "id",
            type: "ident",
        });
        const watch = await session.data.stage(
            csv("watch.csv", "row,value,note,risk", "w1,p1,theirs,high", "w2,d1,theirs,low"),
            { key: "row" },
        );
        const d = session.data.draft();
        for (const field of ["phone", "device"]) {
            d.merge({ from: { source: watch, field: "value" }, into: { source: ident, field } });
        }
        const second = d.steps().at(-1)?.index ?? 0;
        d.merge({ from: { source: ident, field: "account" }, into: { space: "account" } });
        const risk = d
            .steps()
            .find((step) => step.index === second)
            ?.valuesDiffer.filter(({ params }) => params.column === "risk");
        assert.lengthOf(risk ?? [], 1, "the two values are still two, on the account now");
        await d.commit();
        const note = session.data.values({ space: "account", key: "A1" }, "note")?.list;
        assert.deepStrictEqual(
            note?.map(({ source, value }) => [source, value]).sort(),
            [
                [ident, "mine"],
                [watch, "theirs"],
            ].sort(),
        );
        session.dispose();
    });
});

describe("source-steps drafts: two matches of one source", () => {
    const ACCOUNTS = csv("accounts.csv", "account,phone,device", "A1,555,d1", "A2,777,d2", "A3,888,d3");
    const WATCH = csv("watch.csv", "value,risk", "555,high", "d1,mid", "d3,low", "404,none");
    const watched = async (
        second: Partial<Parameters<SourceDraft["merge"]>[0]> = {},
        rows: "edges" | "nodes" = "edges",
    ): Promise<{ session: GraphSession; d: SourceDraft }> => {
        const session = on();
        await session.data.import(ACCOUNTS, { key: "account", type: "account" });
        const w = await session.data.stage(WATCH, { key: "value" });
        const d = session.data.draft();
        if (rows === "edges") {
            d.setMapping(w, { rows: "edges", edges: { source: "value", target: "risk" } });
        }
        d.merge({ from: { source: w, field: "value" }, into: { space: "account", field: "phone" } });
        d.merge({ from: { source: w, field: "value" }, into: { space: "account", field: "device" }, ...second });
        return { session, d };
    };

    it("read as edges, the second joins the rows the first left as nodes, and makes none of those it joined", async () => {
        const { session, d } = await watched();
        assert.deepInclude(d.steps().at(-2)?.buckets, { newNodes: 1, keptNew: 1 }, "404 alone stays a node");
        await d.commit();
        assert.deepStrictEqual(values(session, "risk"), { A1: "high", A2: undefined, A3: "low", 404: "none" });
        session.dispose();
    });

    it("that bring one node two values ask how to settle them", async () => {
        for (const [rows, clash, shown] of [
            ["edges", undefined, "high"],
            ["edges", "overwrite", "mid"],
            ["nodes", undefined, "high"],
            ["nodes", "overwrite", "mid"],
        ] as const) {
            const { session, d } = await watched(clash === undefined ? {} : { clash }, rows);
            const step = d.steps().at(-1);
            assert.deepStrictEqual(
                step?.valuesDiffer.flatMap(({ params }) => (params.column === "risk" ? [params.count] : [])),
                [1],
                `${rows}: the column is listed`,
            );
            await d.commit();
            assert.strictEqual(session.data.node("A1")?.risk, shown, `${rows} ${String(clash)}`);
            session.dispose();
        }
        const { session, d } = await watched({ clash: { risk: "both" } });
        await d.commit();
        const key = session.data.sources().at(-1)?.key ?? "";
        assert.deepStrictEqual(
            [session.data.node("A1")?.risk, session.data.node("A1")?.[`risk (${key})`]],
            ["high", "mid"],
        );
        session.dispose();
        const most = on();
        await most.data.import(csv("a.csv", "id,p,q", "A1,1,2"), { key: "id", type: "a" });
        const w = await most.data.stage(csv("w.csv", "k,score", "1,5", "2,9"), { key: "k" });
        const m = most.data.draft();
        m.merge({ from: { source: w, field: "k" }, into: { space: "a", field: "p" } });
        m.merge({ from: { source: w, field: "k" }, into: { space: "a", field: "q" }, clash: { score: "max" } });
        await m.commit();
        assert.strictEqual(most.data.node("A1")?.score, 9);
        most.dispose();
    });

    it("that write a node a row of their own each ask too, whichever row came first", async () => {
        const session = on();
        await session.data.import(csv("acc.csv", "account,phone", "A1,p1", "A2,p2"), {
            key: "account",
            type: "account",
        });
        const c = await session.data.stage(csv("c.csv", "cid,acct,tel,level", "c1,A1,p2,low", "c2,A2,p1,high"), {
            key: "cid",
        });
        const d = session.data.draft();
        d.merge({ from: { source: c, field: "acct" }, into: { space: "account" } });
        d.merge({
            from: { source: c, field: "tel" },
            into: { space: "account", field: "phone" },
            clash: { level: "overwrite" },
        });
        const { valuesDiffer = [] } = d.steps().at(-1) ?? {};
        assert.deepStrictEqual(
            valuesDiffer.flatMap(({ params }) => (params.column === "level" ? [params.count] : [])),
            [2],
        );
        await d.commit();
        assert.deepStrictEqual(values(session, "level"), { A1: "high", A2: "low" });
        session.dispose();
    });

    it("gather the rows of both, each once", async () => {
        const session = on();
        await session.data.import(csv("acc.csv", "account,phone", "A1,p1", "A2,p2"), {
            key: "account",
            type: "account",
        });
        const c = await session.data.stage(csv("c.csv", "cid,acct,tel,amount", "c1,A1,p1,10", "c2,A1,p2,20"), {
            key: "cid",
        });
        const d = session.data.draft();
        const list = { repeated: "aggregate", aggregate: { amount: "list" } } as never;
        d.merge({ from: { source: c, field: "acct" }, into: { space: "account" }, ...(list as object) });
        d.merge({ from: { source: c, field: "tel" }, into: { space: "account", field: "phone" }, ...(list as object) });
        await d.commit();
        assert.deepStrictEqual(values(session, "amount"), { A1: [10, 20], A2: [20] });
        session.dispose();
    });
});

describe("source-steps drafts: what counts as two values", () => {
    it("is neither a list of the value held nor one code as text and as a number", async () => {
        const session = on();
        const nodes = [
            { id: "a1", duns: "007", rating: 4 },
            { id: "a2", duns: "12", rating: 5 },
        ];
        const held = { type: "json", config: { data: JSON.stringify({ nodes }) }, name: "a.json" };
        await session.data.import(held, { space: "a" });
        const b = await session.data.stage(csv("b.csv", "idb,duns,rating", "b1,12,5", "b2,12,5"), { key: "idb" });
        assert.deepStrictEqual(
            [session.data.node("a2")?.duns, session.data.sourceTable(b).rows().rows[0]?.duns],
            ["12", 12],
        );
        const d = session.data.draft();
        d.merge({
            from: { source: b, field: "duns" },
            into: { space: "a", field: "duns" },
            aggregate: { rating: "list" },
        });
        assert.deepStrictEqual(
            d
                .steps()
                .at(-1)
                ?.valuesDiffer.map(({ params }) => params.column),
            [],
        );
        d.dispose();
        session.dispose();
    });
});

describe("source-steps: a NodeId names one node", () => {
    const two = async (): Promise<{ session: GraphSession; items: string; shops: string }> => {
        const session = on();
        await session.data.import(csv("items.csv", "id,name", "1,Item1", "2,Item2"), { key: "id" });
        const shops = await session.data.stage(csv("shops.csv", "id,name", "1,Shop1", "2,Shop2"), { key: "id" });
        await session.data.add(shops);
        return { session, items: session.data.sources()[0]?.key ?? "", shops };
    };
    const named = (session: GraphSession): unknown[] =>
        [...session.selection.nodes].map((id) => session.data.node(id)?.name);

    it("whatever is renamed, taken out, replaced, deleted or turned off around it", async () => {
        const { session, items, shops } = await two();
        const all = { 1: "Item1", 2: "Item2", "shops.csv:1": "Shop1", "shops.csv:2": "Shop2" };
        assert.deepStrictEqual(values(session, "name"), all);
        await session.selection.apply({ nodes: ["shops.csv:1"] });
        await session.data.renameSource("stores", shops);
        assert.deepStrictEqual(values(session, "name"), all);
        assert.deepStrictEqual(named(session), ["Shop1"]);

        await session.selection.apply({ nodes: ["2"] });
        await session.data.replaceSource(items, csv("items.csv", "id,name", "1,Item1"));
        assert.deepStrictEqual(named(session), [], "Item2 is gone, and Shop2 is not it");
        await session.data.setStepOff(0, true);
        assert.deepStrictEqual(ids(session), ["shops.csv:1", "shops.csv:2"]);
        const back = await reopened(session);
        assert.deepStrictEqual(ids(back), ["shops.csv:1", "shops.csv:2"], "a saved project keeps them");
        back.dispose();
        await session.data.setStepOff(0, false);
        assert.deepStrictEqual(ids(session).sort(), ["1", "shops.csv:1", "shops.csv:2"]);

        await session.selection.apply({ nodes: ["1"] });
        await session.data.removeNodes(["1"]);
        assert.deepStrictEqual(ids(session), ["shops.csv:1", "shops.csv:2"]);
        await session.undo();
        await session.data.removeSource(items);
        const alone = await reopened(session);
        const [shop] = alone.data.sources();
        await alone.data.renameSource("other", shop?.key ?? "");
        await alone.data.updateNodes([{ id: "shops.csv:2", values: { name: "Shop two" } }]);
        assert.deepStrictEqual(values(alone, "name"), { "shops.csv:1": "Shop1", "shops.csv:2": "Shop two" });
        alone.dispose();
        assert.deepStrictEqual(ids(session), ["shops.csv:1", "shops.csv:2"]);
        assert.deepStrictEqual(named(session), []);
        session.dispose();
    });

    it("a node built first later does not take the id another node has", async () => {
        const { session, items } = await two();
        await session.data.replaceSource(items, csv("items.csv", "id,name", "1,Item1"));
        const shops = await session.data.stage(csv("more.csv", "id,name", "7,More7"), { key: "id" });
        await session.data.add(shops);
        await session.data.replaceSource(items, csv("items.csv", "id,name", "1,Item1", "7,Item7"));
        assert.strictEqual(values(session, "name")["7"], "More7");
        session.dispose();
    });

    it("when two spaces spell one alike", async () => {
        const session = on();
        await session.data.import(csv("p.csv", "id,n", "b:c,1", "c,2"), { key: "id", type: "p" });
        for (const [type, key] of [
            ["a", "b:c"],
            ["a:b", "c"],
        ]) {
            await session.data.import(csv(`${type}.csv`, "id,n", `${key},9`), { key: "id", type, mode: "merge" });
        }
        assert.lengthOf(new Set(ids(session)), 4);
        session.dispose();
    });
});

describe("source-steps drafts: what a removal takes along", () => {
    const doors = async (): Promise<{ session: GraphSession; people: string; buildings: string }> => {
        const session = on();
        await session.data.import(csv("people.csv", "person", "P1", "P2"), { key: "person", type: "person" });
        const buildings = await session.data.stage(csv("buildings.csv", "building", "D1"), {
            key: "building",
            type: "building",
        });
        await session.data.add(buildings);
        const e = await session.data.stage(csv("entries.csv", "entry,person,building", "e1,P1,D1", "e2,P2,D1"), {
            key: "entry",
            type: "entry",
        });
        const d = session.data.draft();
        d.connect({
            from: { source: e, field: "person" },
            into: { space: "person" },
            to: { field: "building", into: { space: "building" }, keepRow: true },
        });
        await d.commit();
        return { session, people: session.data.sources()[0]?.key ?? "", buildings };
    };
    const edges = (session: GraphSession): string[] =>
        session.data.edges().map((edge) => `${String(edge.source)}->${String(edge.target)}`);

    it("rows that are nodes keep their links to the source that stays", async () => {
        for (const gone of ["buildings", "people"] as const) {
            const { session, people, buildings } = await doors();
            assert.lengthOf(edges(session), 4);
            await session.data.removeSource(gone === "people" ? people : buildings);
            assert.deepStrictEqual(edges(session), gone === "people" ? ["e1->D1", "e2->D1"] : ["P1->e1", "P2->e2"]);
            const act = session.data.steps().at(-1)?.act;
            assert.strictEqual(
                act?.from.field,
                gone === "people" ? "building" : "person",
                "it reads back as that join",
            );
            const back = await reopened(session);
            assert.deepStrictEqual(edges(back), edges(session));
            back.dispose();
            await session.undo();
            assert.lengthOf(edges(session), 4);
            session.dispose();
        }
    });

    it("a source's add taken back in a draft takes the joins that name its nodes, and their rows wait again", async () => {
        const session = on();
        await session.data.import(csv("acc.csv", "account", "A1", "A2"), { key: "account", type: "account" });
        const c = await session.data.stage(csv("c.csv", "cid,account,x", "c1,A1,1", "c2,A9,2"), { key: "cid" });
        const joining = session.data.draft();
        joining.merge({ from: { source: c, field: "account" }, into: { space: "account" } });
        await joining.commit();
        const d = session.data.draft();
        d.removeStep(0, { adds: "remove" });
        assert.deepStrictEqual(d.steps(), []);
        assert.strictEqual(d.preview().after.nodes, 0);
        assert.isTrue(d.undo());
        assert.lengthOf(d.steps(), 3);
        d.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: ends matched by a column", () => {
    it("make a node of a value no node holds, once, when asked to", async () => {
        const session = on();
        await session.data.import(csv("p.csv", "id,badge", "P1,B1"), { key: "id", type: "person" });
        const rooms = await session.data.stage(csv("r.csv", "room", "R1"), { key: "room", type: "room" });
        await session.data.add(rooms);
        const e = await session.data.stage(csv("e.csv", "eid,room,badge", "e1,R1,B1", "e2,R1,B9", "e3,R1,B9"), {
            key: "eid",
        });
        const d = session.data.draft();
        const to = { field: "badge", into: { space: "person", field: "badge" } } as const;
        const from = { source: e, field: "room" };
        d.connect({ from, into: { space: "room" }, to });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newNodes: 0, newEdges: 1, unmatched: 2 });
        d.undo();
        d.connect({ from, into: { space: "room" }, to: { ...to, unmatched: "add" } });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newNodes: 1, newEdges: 3, unmatched: 0 });
        await d.commit();
        assert.strictEqual(session.data.node("B9")?.badge, "B9");
        session.dispose();
    });

    it("make a node of a value no node holds at node 1's end too, under unmatched: add", async () => {
        const session = on();
        await session.data.import(csv("p.csv", "id,badge", "P1,B1"), { key: "id", type: "person" });
        const people = session.data.sources()[0]?.key ?? "";
        const rooms = await session.data.stage(csv("r.csv", "room", "R1"), { key: "room", type: "room" });
        await session.data.add(rooms);
        const e = await session.data.stage(csv("e.csv", "eid,badge,room", "e1,B1,R1", "e2,B9,R1", "e3,B9,R7"), {
            key: "eid",
        });
        const d = session.data.draft();
        d.connect({
            from: { source: e, field: "badge" },
            into: { source: people, field: "badge" },
            to: { field: "room", into: { space: "room" } },
            unmatched: "add",
            fanOut: "each",
        });
        assert.deepInclude(d.steps().at(-1)?.buckets, { newNodes: 2, newEdges: 3 }, "B9 and R7 are made, once each");
        await d.commit();
        assert.strictEqual(session.data.node("B9")?.badge, "B9");
        session.dispose();
    });
});

describe("source-steps drafts: rows left out one by one", () => {
    it("of a column made nodes, a link's rows, and an edge with no id of its own", async () => {
        const session = on();
        await session.data.import(csv("people.csv", "person,tags", "P1,a;b", "P2,a"), {
            key: "person",
            type: "person",
        });
        const people = session.data.sources()[0]?.key ?? "";
        const phones = await session.data.stage(csv("phones.csv", "owner,phone", "P1,5", "P1,6", "P2,5", "P2,6"), {
            key: "owner",
        });
        const d = session.data.draft();
        d.setMapping(phones, { rows: "edges", edges: { source: "owner", target: "phone" } });
        d.extract(people, { column: "tags", split: ";" });
        d.link({ source: phones, columns: ["phone"], field: "owner", into: { space: "person" }, minShared: 2 });
        const [tags, link] = d.steps().slice(-2);
        assert.strictEqual(tags?.buckets?.newEdges, 3);
        const first = (
            step: number,
            bucket: "matched" | "newEdges" = "matched",
        ): ReturnType<ReturnType<SourceDraft["preview"]>["rows"]>["rows"][number] => {
            const [row] = d.preview().rows({ step, bucket }).rows;
            assert.isDefined(row);
            return row;
        };
        assert.strictEqual(first(link?.index ?? 0).effect, "added", "a linked row reached its link's edge");

        d.exclude(tags?.index ?? 0, [first(tags?.index ?? 0)]);
        assert.strictEqual(
            d.steps().find((step) => step.index === tags?.index)?.buckets?.newEdges,
            1,
            "a row is all its cell holds",
        );
        d.undo();
        d.exclude(tags?.index ?? 0, [first(tags?.index ?? 0, "newEdges")]);
        const kept = d.steps().find((step) => step.index === tags?.index);
        assert.strictEqual(kept?.buckets?.newEdges, 2, "one person's tag, not the tag");
        assert.deepStrictEqual(kept?.except?.values, []);
        assert.lengthOf(kept?.except?.cells?.pairs ?? [], 1);

        d.exclude(link?.index ?? 0, [first(link?.index ?? 0)]);
        const left = d.steps().find((step) => step.index === link?.index);
        assert.strictEqual(left?.buckets?.newEdges, 0, "they share one phone now");
        assert.strictEqual((left?.buckets?.matched ?? 0) + (left?.buckets?.unmatched ?? 0), 3, "three rows are read");

        d.include(tags?.index ?? 0, kept?.except?.cells?.pairs ?? []);
        assert.isNull(d.steps().find((step) => step.index === tags?.index)?.except);
        d.exclude(tags?.index ?? 0, ["a"]);
        assert.strictEqual(
            d.steps().find((step) => step.index === tags?.index)?.buckets?.newEdges,
            1,
            "a key is every row of it",
        );
        await d.commit();
        const back = await reopened(session);
        // a saved step holds its values as text
        const cells = (of: GraphSession): unknown[] =>
            of.data
                .steps()
                .map(
                    ({ except }) =>
                        except && [except.values, except.cells?.pairs.map((p) => [p.value, String(p.with)])],
                );
        assert.deepStrictEqual(cells(back), cells(session));
        back.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: a row left out by its own id", () => {
    it("is listed by it alone", async () => {
        const session = on();
        await session.data.import(csv("people.csv", "person", "P1", "P2"), { key: "person", type: "person" });
        const e = await session.data.stage(csv("e.csv", "entry,person", "e1,P1", "e2,P1"), { key: "entry" });
        const d = session.data.draft();
        d.connect({ from: { source: e, field: "person" }, into: { space: "person" } });
        const step = d.steps().at(-1)?.index ?? 0;
        d.exclude(step, d.preview().rows({ step, bucket: "newEdges", limit: 1 }).rows);
        assert.deepStrictEqual(d.steps().at(-1)?.except, { column: "entry", values: ["e1"] });
        assert.strictEqual(d.steps().at(-1)?.buckets?.newEdges, 1);
        d.dispose();
        session.dispose();
    });
});

describe("source-steps drafts: the draft drawn", () => {
    it("keeps its colors when it is drawn again: its edges may have other ids then", async () => {
        const session = on();
        await session.data.import(csv("people.csv", "person,dept", "P1,x", "P2,x"), { key: "person", type: "person" });
        const d = session.data.draft();
        d.link({ source: session.data.sources()[0]?.key ?? "", columns: ["dept"] });
        await d.display(true);
        session.styles.showDraft({
            merged: "#7048E8",
            new: "#E8590C",
            steps: [{ step: d.steps().length - 1, color: "#1971C2" }],
        });
        const color = async (drawn: SourceDraft): Promise<unknown[]> => {
            await drawn.display(true);
            await session.styles.settled();
            const [edge] = session.data.edges();
            const look = session.styles.explain({ edge: edge?.id ?? "" }).merged;
            return [(look["edge.color"] as { hex?: string } | undefined)?.hex, look["edge.style"]];
        };
        assert.deepStrictEqual(await color(d), ["#1971c2", "dash"]);
        const data = session.data as unknown as { withoutDrawnDraft: (read: () => void) => void };
        data.withoutDrawnDraft(() => {
            assert.lengthOf(session.data.edges(), 0, "a read of the project holds nothing of the draft");
        });
        assert.deepStrictEqual(await color(d), ["#1971c2", "dash"]);
        await d.commit();
        const again = session.data.draft();
        await again.display(true);
        session.styles.showDraft({
            merged: "#7048E8",
            new: "#E8590C",
            steps: [{ step: again.steps().length - 1, color: "#1971C2" }],
        });
        assert.notStrictEqual((await color(again))[1], "dash", "an edge the graph holds is not new");
        again.dispose();
        session.dispose();
    });
});

describe("source-steps: what a join leaves to read", () => {
    it("and a waiting source's own rows, a page at a time", async () => {
        const session = on();
        const key = await session.data.stage(csv("a.csv", "id,x", "1,a", "2,b", "3,c"), { key: "id" });
        const table = session.data.sourceTable(key);
        assert.deepStrictEqual(
            [table.rows({ offset: 1, limit: 1 }).rows.map((row) => row.x), table.rows().total],
            [["b"], 3],
        );
        assert.strictEqual(table.rows({ table: "edges" }).total, 0);
        session.dispose();
    });

    it("says when a file was read, after a reopen too", async () => {
        const session = on();
        await session.data.import(csv("a.csv", "id,x", "1,a"), { key: "id" });
        const at = (of: GraphSession): string | undefined =>
            of.data.sourceTable(of.data.sources()[0]?.key ?? "").summary().loadedAt;
        assert.isString(at(session));
        const back = await reopened(session);
        assert.strictEqual(at(back), at(session));
        back.dispose();
        session.dispose();
    });

    it("types its nodes and edges, and adds no column of its own to the links", async () => {
        const session = on();
        await session.data.import(csv("people.csv", "person,dept", "P1,x", "P2,x"), { key: "person", type: "person" });
        const d = session.data.draft();
        d.link({ source: session.data.sources()[0]?.key ?? "", columns: ["dept"], edgeType: "same" });
        await d.commit();
        const [edge] = session.data.edges();
        assert.strictEqual(edge?.directed, false, "a link runs neither way");
        assert.deepStrictEqual(
            session.data
                .attributes()
                .filter((each) => each.kind === "edge")
                .map((each) => each.name),
            ["shared"],
        );
        assert.deepStrictEqual(
            [
                session.data.typeOf("node", "P1"),
                session.data.typeOf("edge", edge?.id ?? ""),
                session.data.typeOf("node", "no"),
            ],
            ["person", "same", null],
        );
        session.dispose();
    });

    it("counts the nodes a reopened join gives other values", async () => {
        const session = on();
        await session.data.import(csv("a.csv", "id", "A1"), { key: "id", type: "a" });
        const c = await session.data.stage(csv("c.csv", "cid,id,x", "c1,A1,1", "c2,A1,2"), { key: "cid" });
        const d = session.data.draft();
        d.merge({ from: { source: c, field: "id" }, into: { space: "a" } });
        await d.commit();
        const again = session.data.draft();
        assert.isUndefined(again.preview().marks.nodes.changed);
        again.editStep(again.steps().at(-1)?.index ?? 0, { repeated: "last" });
        assert.strictEqual(again.preview().marks.nodes.changed, 1);
        again.dispose();
        session.dispose();
    });
});
