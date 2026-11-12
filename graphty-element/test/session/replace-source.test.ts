/**
 * @file Replacing a load with a newer copy: `data.replaceSource` counts what the copy added,
 * removed and changed, keeps styles, filters and runs, and one undo brings the earlier data back;
 * `data.matchesSource` names the load a file with the same header is a newer copy of.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** Supplier ids s01 to s40, or as many as asked. */
const supplier = (at: number, count = 40): string => `s${String((at % count) + 1).padStart(2, "0")}`;

/** The suppliers: a node file. */
function suppliersCsv(count = 40): string {
    const rows = Array.from(
        { length: count },
        (_unused, at) =>
            `${supplier(at, count)},Supplier ${String(at)},${at % 2 === 0 ? "DE" : "FR"},${String(at % 3)}`,
    );
    return ["id,name,country,tier", ...rows].join("\n");
}

/**
 * September's shipments: each supplier ships to the next four, the first `edges` of those pairs.
 * @param edges - how many edges
 * @param count - how many suppliers
 * @returns the rows, as [from, to]
 */
function pairs(edges: number, count: number): [string, string][] {
    return Array.from({ length: edges }, (_unused, at) => [
        supplier(Math.floor(at / 4), count),
        supplier(Math.floor(at / 4) + (at % 4) + 1, count),
    ]);
}

/**
 * The September file, and an October file with the same headers in another order: the first
 * three edges gone, twelve new ones (a supplier to the fifth after it), and forty volumes changed.
 * @param edges - how many September edges (150 for the fixture)
 * @param count - how many suppliers
 * @returns both files' text
 */
function shipments(edges = 150, count = 40): { september: string; october: string } {
    const september = pairs(edges, count).map(([from, to], at) => ({ from, to, volume: 100 + at, lead: at % 9 }));
    const changed = new Set(Array.from({ length: 40 }, (_unused, at) => at + 10));
    const october = [
        ...september.slice(3).map((row, at) => (changed.has(at + 3) ? { ...row, volume: row.volume + 1000 } : row)),
        ...Array.from({ length: 12 }, (_unused, at) => ({
            from: supplier(at, count),
            to: supplier(at + 5, count),
            volume: 7,
            lead: 1,
        })),
    ];
    return {
        september: [
            "from,to,volume,lead_days",
            ...september.map((row) => `${row.from},${row.to},${String(row.volume)},${String(row.lead)}`),
        ].join("\n"),
        october: [
            "lead_days,volume,to,from",
            ...october.map((row) => `${String(row.lead)},${String(row.volume)},${row.to},${row.from}`),
        ].join("\n"),
    };
}

/**
 * A file, as a dropped file arrives.
 * @param text - its text
 * @param name - its name
 * @returns the source
 */
const file = (text: string, name: string): { config: { file: File } } => ({ config: { file: new File([text], name) } });

/**
 * A session holding the suppliers and September's shipments, each loaded as a reader drops it.
 * @param edges - how many September edges
 * @param count - how many suppliers
 * @returns the session and the October file's text
 */
async function supplyChain(edges = 150, count = 40): Promise<{ session: GraphSession; october: string }> {
    const session = createGraphSession();
    const { september, october } = shipments(edges, count);
    await (await session.data.prepare(file(suppliersCsv(count), "suppliers.csv"))).load();
    await (await session.data.prepare(file(september, "ships-to-2024-09.csv"))).load({ mode: "merge" });
    return { session, october };
}

/**
 * The volume on the edge between two suppliers.
 * @param session - the session
 * @param from - one end
 * @param to - the other
 * @returns its volume, or undefined without such an edge
 */
function volume(session: GraphSession, from: string, to: string): unknown {
    return session.data.edges().find((each) => each.source === from && each.target === to)?.volume;
}

describe("replacing a load with a newer copy", () => {
    it("names the load a file with the same header is a copy of, and none for another", async () => {
        const { session, october } = await supplyChain();
        assert.deepStrictEqual(
            session.data.sources().map((each) => [each.key, each.name]),
            [
                ["s1", "suppliers.csv"],
                ["s2", "ships-to-2024-09.csv"],
            ],
        );
        assert.strictEqual(await session.data.matchesSource(file(october, "ships-to-2024-10.csv")), "s2");
        assert.strictEqual(await session.data.matchesSource(file(suppliersCsv(), "suppliers-2.csv")), "s1");
        assert.isNull(await session.data.matchesSource(file("a,b\n1,2\n", "other.csv")));
        session.dispose();
    });

    it("counts +12 -3 and 40 changed edges, keeps the style and the filter, and undoes in one step", async () => {
        const { session, october } = await supplyChain();
        const layer = await session.styles.add({
            name: "Big",
            target: "edge",
            selector: { match: "expression", where: "data.volume > `1000`" },
            set: { "edge.color": "#ff0000" },
        });
        await session.visibility.set({ kind: "categories", attribute: "data.country", values: ["DE"] });
        const { filter } = session.visibility;
        const before = session.history.steps.length;
        const septemberVolume = volume(session, "s04", "s05");

        const report = await session.data.replaceSource("s2", file(october, "ships-to-2024-10.csv"));

        assert.deepStrictEqual(report, {
            nodes: { added: 0, removed: 0, changed: 0 },
            edges: { added: 12, removed: 3, changed: 40 },
            unbound: [],
        });
        assert.strictEqual(session.history.steps.length, before + 1);
        assert.strictEqual(session.data.edges().length, 150 - 3 + 12);
        assert.isUndefined(volume(session, "s01", "s02"), "a September edge October dropped");
        assert.strictEqual(volume(session, "s01", "s06"), 7, "an October edge");
        assert.notStrictEqual(volume(session, "s04", "s05"), septemberVolume);
        assert.deepStrictEqual(
            session.data.sources().map((each) => [each.key, each.name, each.counts]),
            [
                ["s1", "suppliers.csv", { nodes: 40, edges: 0 }],
                ["s2", "ships-to-2024-10.csv", { nodes: 40, edges: 159 }],
            ],
        );
        assert.isDefined(session.styles.get(layer.id));
        assert.deepStrictEqual(session.visibility.filter, filter);

        await session.undo();
        assert.strictEqual(session.data.edges().length, 150);
        assert.strictEqual(volume(session, "s04", "s05"), septemberVolume);
        assert.strictEqual(volume(session, "s01", "s02"), 100);
        assert.deepStrictEqual(
            session.data.sources().map((each) => [each.key, each.name]),
            [
                ["s1", "suppliers.csv"],
                ["s2", "ships-to-2024-09.csv"],
            ],
        );
        session.dispose();
    });

    it("removes a node only the load supplied and keeps one another load supplied", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target\nA,B\nB,C\n" }, name: "a.csv" });
        await session.data.import(
            { type: "csv", config: { data: "source,target\nC,D\nD,E\n" }, name: "b.csv" },
            { mode: "merge" },
        );
        const report = await session.data.replaceSource("s2", {
            type: "csv",
            config: { data: "source,target\nC,D\n" },
        });
        assert.deepStrictEqual(report.nodes, { added: 0, removed: 1, changed: 0 });
        assert.deepStrictEqual(report.edges, { added: 0, removed: 1, changed: 0 });
        assert.sameMembers(
            session.data.nodes().map((each) => each.id),
            ["A", "B", "C", "D"],
        );
        session.dispose();
    });

    it("reports a style layer that reads a column the copy dropped", async () => {
        const { session } = await supplyChain(20, 10);
        const layer = await session.styles.add({
            name: "Slow",
            target: "edge",
            selector: { match: "expression", where: "data.lead_days > `5`" },
            set: { "edge.color": "#0000ff" },
        });
        const copy = ["from,to,volume", ...pairs(20, 10).map(([from, to]) => `${from},${to},1`)].join("\n");
        const report = await session.data.replaceSource("s2", file(copy, "ships.csv"));
        assert.deepStrictEqual(report.unbound, [
            { code: "style-layer", params: { layer: layer.id, kind: "edge", column: "lead_days" } },
        ]);
        assert.strictEqual(report.edges.changed, 20);
        session.dispose();
    });

    it("refuses a key no load has", async () => {
        const { session, october } = await supplyChain(8, 4);
        const error = await session.data.replaceSource("s9", file(october, "x.csv")).catch((thrown: unknown) => thrown);
        assert.propertyVal(error, "code", "E_SOURCE_UNKNOWN");
        session.dispose();
    });

    it("SessionDataApi.replaceSource: no more than linear in the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const { session, october } = await supplyChain(size, size / 4);
                const visits = await visitsDuring(() =>
                    session.data.replaceSource("s2", file(october, "ships-to-2024-10.csv")),
                );
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by SessionDataApi.replaceSource" },
        );
    });
});
