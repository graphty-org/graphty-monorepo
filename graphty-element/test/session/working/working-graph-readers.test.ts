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

describe("counts follow the filter while kept between calls", () => {
    it("a second call answers the same, and a filter change moves the drawn count", async () => {
        const session = await line({ workingGraph: "visible" });
        const layer = await session.styles.add({
            name: "All",
            target: "node",
            selector: { match: "ids", nodes: Array.from({ length: 10 }, (_, i) => `s${String(i)}`) },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).visible?.painted?.["node.color"], 10);
        await session.visibility.set(KIND_A);
        assert.strictEqual(session.styles.counts(layer.id).visible?.painted?.["node.color"], 6);
        assert.deepStrictEqual(session.styles.counts(layer.id), session.styles.counts(layer.id));
        await session.visibility.set(null);
        assert.strictEqual(session.styles.counts(layer.id).visible?.painted?.["node.color"], 10);
        session.dispose();
    });
});

describe("a layout's estimate reads the graph the layout lays out", () => {
    /**
     * A complete graph on five nodes (not planar) beside a path of six nodes.
     * @param mode - The working-graph mode.
     * @returns The session, with a filter hiding the complete graph.
     */
    async function k5BesidePath(mode: "visible" | "documented"): Promise<GraphSession> {
        const session = createGraphSession({ workingGraph: mode });
        const k = Array.from({ length: 5 }, (_, i) => ({ id: `k${String(i)}`, part: "k" }));
        const p = Array.from({ length: 6 }, (_, i) => ({ id: `p${String(i)}`, part: "p" }));
        const edges = [
            ...k.flatMap((a, i) => k.slice(i + 1).map((b) => ({ source: a.id, target: b.id }))),
            ...p.slice(1).map((b, i) => ({ source: p[i].id, target: b.id })),
        ];
        await session.data.import({
            type: "json",
            config: { data: JSON.stringify({ nodes: [...k, ...p], edges }) },
        });
        await session.visibility.set({ kind: "categories", attribute: "data.part", values: ["p"] });
        return session;
    }

    it("lets the planar layout run when the filter hides what made it refuse, and not over the whole graph", async () => {
        const session = await k5BesidePath("visible");
        const planar = session.estimate({ op: "layout.set", id: "planar" });
        assert.isTrue(planar.available, planar.reason);
        assert.include(planar.basis, "n=6");

        await session.execute({ op: "layout.scope", scope: "graph" });
        const whole = session.estimate({ op: "layout.set", id: "planar" });
        assert.isFalse(whole.available);
        assert.strictEqual(whole.refusal?.code, "layout.not-planar");

        const documented = await k5BesidePath("documented");
        assert.strictEqual(documented.estimate({ op: "layout.set", id: "planar" }).refusal?.code, "layout.not-planar");
        session.dispose();
        documented.dispose();
    });

    it("groups by the values the shown nodes carry", async () => {
        const session = await k5BesidePath("visible");
        const estimate = session.estimate({ op: "layout.set", id: "bipartite", options: { groupBy: "data.part" } });
        assert.strictEqual(estimate.refusal?.code, "layout.needs-two-groups");
        assert.strictEqual(estimate.refusal?.params.groups, 1);
        session.dispose();
    });
});

describe("a top-N style rule ranks the whole column, or what is shown by name", () => {
    const colorLayer = (session: GraphSession, node: string): string | undefined =>
        session.styles.explain({ node }).channels.find((each) => each.channel === "node.color")?.layerId;

    /**
     * A layer painting the three nodes of highest `size`, ranked over the whole column or what is shown.
     * @param session - The session.
     * @param within - What the rule ranks, or undefined for the default.
     * @returns The layer's id.
     */
    async function top3(session: GraphSession, within?: "graph" | "visible"): Promise<string> {
        const layer = await session.styles.add({
            name: "Top 3",
            target: "node",
            selector: {
                match: "rule",
                where: { kind: "threshold", path: "data.size", top: 3, ...(within === undefined ? {} : { within }) },
            },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.settled();
        return layer.id;
    }

    it("ranks the whole column by default, so a filter hiding the top paints no shown node", async () => {
        const session = await filtered("visible");
        const id = await top3(session);
        assert.strictEqual(session.styles.counts(id).matched, 3);
        assert.strictEqual(session.styles.counts(id).visible?.matched, 0);
        session.dispose();
    });

    it("ranks what is shown with within visible, and ranks again when the filter moves", async () => {
        const session = await filtered("visible");
        const id = await top3(session, "visible");
        // s0..s5 shown: the top three sizes are s3, s4, s5.
        assert.strictEqual(colorLayer(session, "s5"), id);
        assert.strictEqual(session.styles.counts(id).visible?.matched, 3);
        assert.notStrictEqual(colorLayer(session, "s9"), id);

        await session.visibility.set(null);
        await session.styles.settled();
        assert.strictEqual(colorLayer(session, "s9"), id);
        assert.notStrictEqual(colorLayer(session, "s5"), id);
        session.dispose();
    });

    it("keeps ranking the whole column when a flat top-N becomes a step over what is shown", async () => {
        const session = await filtered("visible");
        const flat = { kind: "threshold", path: "data.size", top: 3 } as const;
        const converted = session.scope.asUnion(flat, { side: "nodes", within: "visible" });
        assert.isNotNull(converted);
        const count = (leaf: Parameters<GraphSession["scope"]["watchSteps"]>[0]): number =>
            session.scope.watchSteps(leaf, () => undefined).current.total.count;
        // The layer the flat rule paints shows on none of s0..s5; the step agrees.
        assert.strictEqual(count(converted ?? flat), 0);
        // A step written over what is shown ranks what is shown: s3, s4, s5.
        assert.strictEqual(
            count({
                kind: "union",
                side: "nodes",
                within: "visible",
                branches: [{ start: "none", steps: [{ op: "add", rule: flat }] }],
            }),
            3,
        );
        session.dispose();
    });

    it("is refused in a filter's own conditions, which compute what is shown", async () => {
        const session = await line({ workingGraph: "visible" });
        let refused: unknown = null;
        try {
            await session.visibility.set({ kind: "threshold", path: "data.size", top: 3, within: "visible" });
        } catch (error) {
            refused = error;
        }
        assert.strictEqual((refused as { details?: { reason?: string } } | null)?.details?.reason, "circular-scope");
        session.dispose();
    });
});

describe("an encoded style reads its automatic domain from the whole column, or what is shown by name", () => {
    /**
     * A ramp over every node's `size` (0..90), its domain read from the whole column or what is shown.
     * @param session - The session.
     * @param domainFrom - Where the domain is read from, or undefined for the default.
     * @returns The legend's domain.
     */
    async function rampDomain(
        session: GraphSession,
        domainFrom?: "graph" | "visible",
    ): Promise<{ readonly id: string; readonly domain: () => unknown }> {
        const layer = await session.styles.add({
            name: "Ramp",
            target: "node",
            selector: { match: "everything" },
            encode: {
                "node.color": {
                    by: "data.size",
                    palette: "viridis",
                    ...(domainFrom === undefined ? {} : { domainFrom }),
                },
            },
        });
        await session.styles.settled();
        const domain = (): unknown => {
            const block = session.styles.legendOf(layer.id)[0];
            return block?.domain === undefined ? null : [block.domain.min, block.domain.max];
        };
        return { id: layer.id, domain };
    }

    it("keeps the whole column by default under a filter", async () => {
        const session = await filtered("visible");
        const { domain } = await rampDomain(session);
        assert.deepStrictEqual(domain(), [0, 90]);
        session.dispose();
    });

    it("reads what is shown with domainFrom visible, and again when the filter moves", async () => {
        const session = await filtered("visible");
        const { domain } = await rampDomain(session, "visible");
        assert.deepStrictEqual(domain(), [0, 50]);
        await session.visibility.set(null);
        await session.styles.settled();
        assert.deepStrictEqual(domain(), [0, 90]);
        session.dispose();
    });

    it("refuses a domainFrom it does not know", async () => {
        const session = await line();
        let code: unknown = null;
        try {
            await session.styles.add({
                name: "Bad",
                target: "node",
                selector: { match: "everything" },
                encode: { "node.color": { by: "data.size", domainFrom: "shown" as "visible" } },
            });
        } catch (error) {
            ({ code } = error as { code?: string });
        }
        assert.strictEqual(code, "E_BAD_LAYER");
        session.dispose();
    });
});
