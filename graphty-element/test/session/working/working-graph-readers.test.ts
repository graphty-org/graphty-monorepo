/**
 * The session readers under the working graph (design/working-graph/design.md section 5): with
 * `workingGraph: "visible"`, a reader that names no scope reads what the filter and the time window
 * leave shown, and `scope: "graph"` reads the whole graph by name. In the default `"documented"`
 * mode every reader keeps the default it documents.
 */
import { assert, beforeAll, describe, it } from "vitest";

import { setDefaultFeatures } from "../../../src/features/resolve";
import { createGraphSession, type GraphSession } from "../../../src/session";

beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/**
 * A line of ten nodes s0..s9, s0..s5 of kind "a" and s6..s9 of kind "b", each carrying a `step`.
 * @param options - Passed to the session.
 * @returns The session, with `step` designated as the time field.
 */
async function line(options: Parameters<typeof createGraphSession>[0] = {}): Promise<GraphSession> {
    const session = createGraphSession(options);
    const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `s${String(i)}`,
        step: i,
        kind: i < 6 ? "a" : "b",
        size: i * 10,
    }));
    const edges = Array.from({ length: 9 }, (_, i) => ({
        source: `s${String(i)}`,
        target: `s${String(i + 1)}`,
        step: i + 1,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });
    await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });

    return session;
}

/** Keeps the six "a" nodes, s0..s5, and the five edges among them. */
const KIND_A = { kind: "categories", attribute: "data.kind", values: ["a"] } as const;

/**
 * The same line, with the "a" filter on, in a mode.
 * @param mode - The working-graph mode.
 * @returns The session.
 */
async function filtered(mode: "visible" | "documented"): Promise<GraphSession> {
    const session = await line({ workingGraph: mode });
    await session.visibility.set(KIND_A);
    return session;
}

describe("data readers read the working graph with the option on", () => {
    it("statistics: shown by default, the whole graph by name, and 'all' still the whole graph", async () => {
        const session = await filtered("visible");
        assert.strictEqual(session.data.statistics().nodeCount, 6);
        assert.strictEqual(session.data.statistics().edgeCount, 5);
        assert.strictEqual(session.data.statistics({ scope: "graph" }).nodeCount, 10);
        assert.strictEqual(session.data.statistics({ scope: "all" }).nodeCount, 10);

        const documented = await filtered("documented");
        assert.strictEqual(documented.data.statistics().nodeCount, 10);
        assert.strictEqual(documented.data.statistics({ scope: "graph" }).nodeCount, 10);
        assert.strictEqual(documented.data.statistics({ scope: "visible" }).nodeCount, 6);
        session.dispose();
        documented.dispose();
    });

    it("nodePage and edgePage: shown by default, the whole graph by name", async () => {
        const session = await filtered("visible");
        assert.strictEqual(session.data.nodePage().total, 6);
        assert.strictEqual(session.data.edgePage().total, 5);
        assert.strictEqual(session.data.nodePage({ scope: "graph" }).total, 10);
        assert.strictEqual(session.data.edgePage({ scope: "graph" }).total, 9);

        const documented = await filtered("documented");
        assert.strictEqual(documented.data.nodePage().total, 10);
        session.dispose();
        documented.dispose();
    });

    it("neighbors: a hidden neighbor is left out by default and listed, marked, by name", async () => {
        const session = await filtered("visible");
        const shown = session.data.neighbors("s5");
        assert.deepStrictEqual(
            shown.records.map((each) => each.node.id),
            ["s4"],
        );

        const whole = session.data.neighbors("s5", { scope: "graph" });
        assert.strictEqual(whole.total, 2);
        assert.deepStrictEqual(whole.records.find((each) => each.node.id === "s6")?.excludedBy, { kind: "filter" });

        const documented = await filtered("documented");
        assert.strictEqual(documented.data.neighbors("s5").total, 2);
        session.dispose();
        documented.dispose();
    });

    it("find: a hidden hit is left out by default and found, marked, by name", async () => {
        const session = await filtered("visible");
        assert.strictEqual(session.find("s9").totals.node, 0);

        const whole = session.find("s9", { scope: "graph" });
        assert.strictEqual(whole.totals.node, 1);
        assert.deepStrictEqual(whole.records[0]?.excludedBy, { kind: "filter" });

        const documented = await filtered("documented");
        assert.strictEqual(documented.find("s9").totals.node, 1);
        session.dispose();
        documented.dispose();
    });

    it("nodes and edges: shown by default, the whole graph by name", async () => {
        const session = await filtered("visible");
        assert.deepStrictEqual(
            session.data.nodes().map((each) => each.id),
            ["s0", "s1", "s2", "s3", "s4", "s5"],
        );
        assert.lengthOf(session.data.edges(), 5);
        assert.lengthOf(session.data.nodes({ scope: "graph" }), 10);
        assert.lengthOf(session.data.edges({ scope: "graph" }), 9);

        const documented = await filtered("documented");
        assert.lengthOf(documented.data.nodes(), 10);
        // A scope named in the documented mode is read too.
        assert.lengthOf(documented.data.nodes({ scope: "visible" }), 6);
        session.dispose();
        documented.dispose();
    });

    it("valueCounts and histogram: shown by default, the whole graph by name", async () => {
        const session = await filtered("visible");
        assert.deepStrictEqual(session.data.valueCounts("data.kind").values, [{ value: "a", count: 6 }]);
        assert.strictEqual(session.data.valueCounts("data.kind").total, 6);
        assert.strictEqual(session.data.valueCounts("data.kind", { scope: "graph" }).total, 10);

        const histogram = session.data.histogram({ kind: "node", name: "kind" });
        assert.deepStrictEqual(histogram.kind === "categorical" ? histogram.values : null, [{ value: "a", count: 6 }]);
        const whole = session.data.histogram({ kind: "node", name: "kind" }, { scope: "graph" });
        assert.strictEqual(whole.kind === "categorical" ? whole.values.length : 0, 2);

        const numbers = session.data.histogram({ kind: "node", name: "size" });
        assert.strictEqual(numbers.kind === "numeric" ? numbers.max : null, 50);

        const documented = await filtered("documented");
        assert.strictEqual(documented.data.valueCounts("data.kind").total, 10);
        session.dispose();
        documented.dispose();
    });

    it("attributes: the same columns, measured over what is shown by default", async () => {
        const session = await filtered("visible");
        const size = session.data.attributes().find((each) => each.path === "data.size");
        assert.strictEqual(size?.max, 50);
        assert.strictEqual(size?.completeness, 1);
        const kind = session.data.attributes().find((each) => each.path === "data.kind");
        assert.strictEqual(kind?.uniqueCount, 1);

        const whole = session.data.attributes({ scope: "graph" }).find((each) => each.path === "data.size");
        assert.strictEqual(whole?.max, 90);
        assert.strictEqual(
            session.data.attributes().length,
            session.data.attributes({ scope: "graph" }).length,
            "a filter never takes a column away",
        );

        const documented = await filtered("documented");
        assert.strictEqual(documented.data.attributes().find((each) => each.path === "data.size")?.max, 90);
        session.dispose();
        documented.dispose();
    });

    it("structureValue: a node's degree counts its shown edges by default, every edge by name", async () => {
        const session = await filtered("visible");
        assert.strictEqual(session.data.structureValue("s5", "graphty.degree"), 1);
        assert.strictEqual(session.data.structureValue("s5", "graphty.outDegree"), 0);
        assert.strictEqual(session.data.structureValue("s5", "graphty.degree", { within: "graph" }), 2);
        assert.strictEqual(session.data.structureValue("s4", "graphty.degree"), 2);

        const documented = await filtered("documented");
        assert.strictEqual(documented.data.structureValue("s5", "graphty.degree"), 2);
        assert.strictEqual(documented.data.structureValue("s5", "graphty.degree", { within: "visible" }), 1);
        session.dispose();
        documented.dispose();
    });

    it("time.bins: counts what passes the filter by default, everything by name", async () => {
        const session = await filtered("visible");
        const count = (bins: ReturnType<GraphSession["time"]["bins"]>): number =>
            (bins ?? []).reduce((sum, bin) => sum + bin.nodes, 0);
        assert.strictEqual(count(session.time.bins({ count: 5 })), 6);
        assert.strictEqual(count(session.time.bins({ count: 5, scope: "graph" })), 10);
        assert.strictEqual(count(session.time.bins({ count: 5, scope: "all" })), 10);

        const documented = await filtered("documented");
        assert.strictEqual(count(documented.time.bins({ count: 5 })), 10);
        session.dispose();
        documented.dispose();
    });

    it("issues: an issue only hidden records carry is not listed by default, and is by name", async () => {
        const session = createGraphSession({ workingGraph: "visible" });
        const nodes = Array.from({ length: 10 }, (_, i) => ({
            id: `c${String(i)}`,
            kind: i < 6 ? "a" : "b",
            city: i === 9 ? "PARIS" : "Paris",
        }));
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
        const variant = (scope?: "graph"): number | undefined =>
            session.data.issues(scope === undefined ? {} : { scope }).find((each) => each.code === "case-variant")
                ?.count;
        assert.strictEqual(variant(), 1, "nothing hidden yet");

        await session.visibility.set(KIND_A);
        assert.isUndefined(variant());
        assert.strictEqual(variant("graph"), 1);
        session.dispose();
    });

    it("lookups by id answer for hidden nodes in either mode", async () => {
        const session = await filtered("visible");
        assert.strictEqual(session.data.node("s9")?.id, "s9");
        assert.strictEqual(session.data.name("s9"), "s9");
        session.dispose();
    });
});

describe("the selection reads what the filter shows with the option on", () => {
    it("reads the selected nodes the filter shows, and brings hidden ones back when it shows them", async () => {
        const session = await filtered("visible");
        const delta = await session.selection.apply({ nodes: ["s4", "s5", "s6"] });

        assert.deepStrictEqual(session.selection.nodes, ["s4", "s5"]);
        assert.strictEqual(session.selection.size, 2);
        assert.isFalse(session.selection.has("s6"));
        assert.strictEqual(delta.nodes, 2);
        assert.strictEqual(delta.storedCount, 3);

        await session.visibility.set(null);
        assert.deepStrictEqual(session.selection.nodes, ["s4", "s5", "s6"]);

        const documented = await filtered("documented");
        const plain = await documented.selection.apply({ nodes: ["s4", "s5", "s6"] });
        assert.deepStrictEqual(documented.selection.nodes, ["s4", "s5", "s6"]);
        assert.isUndefined(plain.storedCount);
        session.dispose();
        documented.dispose();
    });

    it("keeps a member the time window hides selected and counted", async () => {
        const session = await line({ workingGraph: "visible" });
        await session.selection.apply({ nodes: ["s4", "s8"] });
        await session.time.window({ from: 0, to: 5 });

        assert.isFalse(session.data.working().has("s8"));
        assert.deepStrictEqual(session.selection.nodes, ["s4", "s8"]);
        session.dispose();
    });

    it("replace and clear drop a hidden member; add and remove touch only what they name", async () => {
        const session = await filtered("visible");
        await session.selection.apply({ nodes: ["s4", "s6"] });
        await session.selection.apply({ nodes: ["s1"] }, "add");
        await session.selection.apply({ nodes: ["s4"] }, "remove");
        await session.visibility.set(null);
        assert.deepStrictEqual(session.selection.nodes, ["s1", "s6"], "add and remove left the hidden s6 alone");

        await session.visibility.set(KIND_A);
        await session.selection.apply({ nodes: ["s2"] });
        await session.visibility.set(null);
        assert.deepStrictEqual(session.selection.nodes, ["s2"], "a replace said what the selection is now");

        await session.selection.apply({ nodes: ["s6"] });
        await session.visibility.set(KIND_A);
        session.selection.clear();
        await session.visibility.set(null);
        assert.deepStrictEqual(session.selection.nodes, []);
        session.dispose();
    });

    it("walks a neighborhood within what is shown, keeping a hidden member, and the whole graph by name", async () => {
        const session = await filtered("visible");
        await session.selection.apply({ nodes: ["s7"] });
        await session.selection.apply({ neighborsOf: ["s5"] });
        assert.deepStrictEqual(session.selection.nodes, ["s4", "s5"]);
        await session.visibility.set(null);
        assert.deepStrictEqual(session.selection.nodes, ["s4", "s5", "s7"], "the walk replaced within what it reached");

        await session.visibility.set(KIND_A);
        const whole = await session.selection.count({ neighborsOf: ["s5"], scope: "graph" });
        assert.strictEqual(whole.nodes, 3);

        const documented = await filtered("documented");
        await documented.selection.apply({ neighborsOf: ["s5"] });
        assert.deepStrictEqual(documented.selection.nodes, ["s4", "s5", "s6"]);
        session.dispose();
        documented.dispose();
    });

    it("inverts and matches a rule within what is shown, and over the whole graph by name", async () => {
        const session = await filtered("visible");
        await session.selection.apply({ nodes: ["s0"] });
        await session.selection.apply({ invert: true });
        assert.deepStrictEqual(session.selection.nodes, ["s1", "s2", "s3", "s4", "s5"]);
        await session.visibility.set(null);
        assert.notInclude(session.selection.nodes, "s6");

        await session.visibility.set(KIND_A);
        assert.strictEqual((await session.selection.count({ where: "data.kind == 'b'" })).nodes, 0);
        assert.strictEqual((await session.selection.count({ where: "data.kind == 'b'", scope: "graph" })).nodes, 4);
        assert.strictEqual((await session.selection.count({ text: "s9" })).nodes, 0);

        await session.selection.apply({ nodes: ["s0"] });
        assert.strictEqual((await session.selection.count({ invert: true, scope: "graph" })).nodes, 9);
        session.dispose();
    });

    it("statistics count shown edges by default and every edge by name", async () => {
        const session = await filtered("visible");
        await session.selection.apply({ nodes: ["s5", "s6"] });
        const shown = await session.selection.statistics();
        assert.strictEqual(shown.nodes, 1);
        assert.strictEqual(shown.cutEdges, 1);
        assert.deepStrictEqual(shown.degree, { min: 1, max: 1 });

        const whole = await session.selection.statistics({ scope: "graph" });
        assert.deepStrictEqual(whole.degree, { min: 2, max: 2 });
        assert.strictEqual(whole.cutEdges, 2, "s5-s6 is cut too: s6 is kept but not read as selected");

        const documented = await filtered("documented");
        await documented.selection.apply({ nodes: ["s5", "s6"] });
        const plain = await documented.selection.statistics();
        assert.strictEqual(plain.nodes, 2);
        assert.strictEqual(plain.inducedEdges, 1);
        session.dispose();
        documented.dispose();
    });

    it("saves the members as read as a set", async () => {
        const session = await filtered("visible");
        await session.selection.apply({ nodes: ["s4", "s6"] });
        const id = await session.sets.createFrom("selection");
        const definition = session.sets.get(id)?.definition;
        assert.deepStrictEqual(definition !== undefined && "nodes" in definition ? definition.nodes : null, ["s4"]);
        session.dispose();
    });
});

describe("styling counts read what is shown with the option on", () => {
    /**
     * A layer over s0, s1 and s6 (two of kind "a", one of kind "b") colored by kind.
     * @param session - The session.
     * @returns The layer's id.
     */
    async function byKind(session: GraphSession): Promise<string> {
        const layer = await session.styles.add({
            name: "Kinds",
            target: "node",
            selector: { match: "ids", nodes: ["s0", "s1", "s6"] },
            encode: { "node.color": { by: "data.kind", scale: "ordinal" } },
        });
        await session.styles.settled();
        return layer.id;
    }

    const counted = (rows: readonly { readonly value: unknown; readonly count: number }[]): unknown[][] =>
        rows.map((row) => [row.value, row.count]);

    it("categories count the layer's own elements in every mode, and only shown ones with the option on", async () => {
        const documented = await line();
        const plain = await byKind(documented);
        assert.deepStrictEqual(counted(documented.styles.categories(plain, "node.color")), [
            ["a", 2],
            ["b", 1],
        ]);

        const session = await filtered("visible");
        const id = await byKind(session);
        assert.deepStrictEqual(counted(session.styles.categories(id, "node.color")), [
            ["a", 2],
            ["b", 0],
        ]);
        documented.dispose();
        session.dispose();
    });

    it("groups give each value's shown count, and count only shown ones with the option on", async () => {
        const documented = await filtered("documented");
        const plain = await byKind(documented);
        assert.deepStrictEqual(
            documented.styles.groups(plain, "data.kind").map((group) => [group.value, group.count, group.visibleCount]),
            [
                ["a", 2, 2],
                ["b", 1, 0],
            ],
        );

        const session = await filtered("visible");
        const id = await byKind(session);
        assert.deepStrictEqual(counted(session.styles.groups(id, "data.kind")), [
            ["a", 2],
            ["b", 0],
        ]);
        documented.dispose();
        session.dispose();
    });

    it("the legend lists only the values shown elements carry, with their counts, with the option on", async () => {
        const rowsOf = (session: GraphSession, id: string): unknown[][] =>
            (session.styles.legend().find((block) => block.layerId === id)?.swatches ?? []).map((row) => [
                row.value,
                row.count,
            ]);
        const session = await filtered("visible");
        const id = await byKind(session);
        assert.deepStrictEqual(rowsOf(session, id), [["a", 2]]);

        const documented = await filtered("documented");
        const plain = await byKind(documented);
        assert.deepStrictEqual(
            rowsOf(documented, plain).map(([value]) => value),
            ["a", "b"],
        );
        session.dispose();
        documented.dispose();
    });

    it("counts say on how many drawn elements a layer is shown", async () => {
        const session = await filtered("visible");
        const id = await byKind(session);
        const counts = session.styles.counts(id);
        assert.strictEqual(counts.painted["node.color"], 3);
        assert.strictEqual(counts.visible?.painted?.["node.color"], 2);
        session.dispose();
    });
});
