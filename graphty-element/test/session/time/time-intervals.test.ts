/**
 * Elements that exist for a span: intervals, open ends, spells and instant lists. Every timed row
 * is one or more spans, and a window `[from, to)` holds a span when `start < to` and `end > from`.
 */
import { assert, beforeAll, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import { setDefaultFeatures } from "../../../src/features/resolve";
import type { TimeField, TimeWindowInput } from "../../../src/session/time/TimeApi";
import { slideCounters } from "../../../src/session/visibility/slide";
import { type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/** One element's time as a test writes it. */
type Timed = Record<string, unknown>;

/** A span as the brute force reads it. */
type Span = readonly [number, number];

/**
 * Nodes on their own, each with the time it is given.
 * @param rows - Each node's time.
 * @returns The harness; its nodes are `n0`, `n1`, and so on.
 */
function nodesOf(rows: readonly Timed[]): Harness {
    const harness = makeSession();
    harness.add(
        rows.map((row, at) => ({ id: `n${String(at)}`, ...row })),
        [],
    );
    return harness;
}

/**
 * The ids a session shows.
 * @param harness - The session.
 * @returns The rows of the node mask that are set.
 */
function shown(harness: Harness): number[] {
    return [...harness.session.visibility.nodeMask()].flatMap((byte, row) => (byte === 1 ? [row] : []));
}

/**
 * Open a window over a designated field and say which rows show.
 * @param harness - The session.
 * @param window - The window.
 * @returns The rows showing.
 */
async function showing(harness: Harness, window: TimeWindowInput): Promise<number[]> {
    await harness.session.time.window(window);
    return shown(harness);
}

describe("overlap at the half-open boundaries", () => {
    it("leaves out an interval ending at `from` and one starting at `to`, and keeps an instant at `from`", async () => {
        const harness = nodesOf([
            { a: 0, b: 10 }, // ends exactly at from
            { a: 20, b: 30 }, // starts exactly at to
            { a: 5, b: 11 }, // overlaps from
            { a: 19, b: 25 }, // overlaps to
            { a: 12, b: 13 }, // inside
            { a: 0, b: 40 }, // around
            { a: 10, b: 10 }, // no length: an instant at from
        ]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });

        assert.deepEqual(await showing(harness, { from: 10, to: 20 }), [2, 3, 4, 5, 6]);
    });

    it("keeps an instant at `from` and leaves one out at `to`, with no end path", async () => {
        const harness = nodesOf([{ a: 9 }, { a: 10 }, { a: 19 }, { a: 20 }]);
        await harness.session.time.setField({ nodes: { start: "a", unit: "ordinal" } });

        assert.deepEqual(await showing(harness, { from: 10, to: 20 }), [1, 2]);
    });

    it("reads an end before its start as an instant at the start", async () => {
        const harness = nodesOf([{ a: 15, b: 3 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });

        assert.deepEqual(await showing(harness, { from: 0, to: 10 }), []);
        assert.deepEqual(await showing(harness, { from: 15, to: 16 }), [0]);
    });
});

describe("open ends", () => {
    it("shows a row with no end in every window after its start", async () => {
        const harness = nodesOf([{ a: 5 }, { a: 1, b: 100 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });

        assert.deepEqual(await showing(harness, { from: 0, to: 5 }), [1]);
        assert.deepEqual(await showing(harness, { from: 5, to: 6 }), [0, 1]);
        assert.deepEqual(await showing(harness, { from: 5000, to: 6000 }), [0]);
    });

    it("shows a row with only an end in every window before it", async () => {
        const harness = nodesOf([{ b: 5 }, { a: 1, b: 100 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });

        assert.deepEqual(await showing(harness, { from: -500, to: -400 }), [0]);
        assert.deepEqual(await showing(harness, { from: 5, to: 6 }), [1]);
    });

    it("gives an extent of finite bounds, just past the last of them", async () => {
        const harness = nodesOf([{ a: 5 }, { b: 2 }, { a: 3, b: 9 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await harness.session.time.ready;

        const extent = harness.session.time.extent();
        assert.strictEqual(extent?.from, 1, "an open start ending at 2 reaches the tick before it");
        assert.strictEqual(extent?.to, 10);
        assert.deepEqual(extent?.nodes, { timed: 3, untimed: 0, unparsed: 0 });
        assert.deepEqual(await showing(harness, { from: extent?.from ?? 0, to: extent?.to ?? 0 }), [0, 1, 2]);
    });

    it("gives an open-start row ending at the first bound a spanOf window that shows it", async () => {
        const harness = nodesOf([{ b: 2 }, { a: 3, b: 9 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await harness.session.time.ready;

        const span = harness.session.time.spanOf({ nodes: ["n0"] });
        assert.deepEqual(span, { from: 1, to: 3 });
        assert.include(await showing(harness, { from: span?.from ?? 0, to: span?.to ?? 0 }), 0);
    });
});

describe("spells", () => {
    it("shows an element leaving and coming back over one gap, and changes() says so", async () => {
        const harness = nodesOf([{ s: [{ start: 0, end: 10 }, [20, 30]] }, { s: [[0, 30]] }]);
        await harness.session.time.setField({ nodes: { start: "a", spells: "s", unit: "ordinal" } });
        const { time } = harness.session;

        assert.deepEqual(await showing(harness, { from: 0, to: 5, step: 5 }), [0, 1]);
        await time.seek(12);
        assert.deepEqual(shown(harness), [1]);
        assert.deepEqual(time.changes().left.nodes, ["n0"]);
        await time.seek(22);
        assert.deepEqual(shown(harness), [0, 1]);
        assert.deepEqual(time.changes().entered.nodes, ["n0"]);
    });

    it("keeps an element inside while a second spell overlaps after the first has gone", async () => {
        const harness = nodesOf([
            {
                s: [
                    [0, 10],
                    [5, 20],
                ],
            },
        ]);
        await harness.session.time.setField({ nodes: { start: "a", spells: "s", unit: "ordinal" } });
        const { time } = harness.session;
        await time.window({ from: 0, to: 5, step: 5 });
        await time.seek(12);

        assert.deepEqual(shown(harness), [0]);
        assert.deepEqual(time.changes().left.nodes, []);
    });

    it("reads an instant list as one instant each", async () => {
        const harness = nodesOf([{ s: [3, 7, 11] }]);
        await harness.session.time.setField({ nodes: { start: "a", spells: "s", unit: "ordinal" } });

        assert.deepEqual(await showing(harness, { from: 3, to: 4 }), [0]);
        assert.deepEqual(await showing(harness, { from: 4, to: 7 }), []);
        assert.deepEqual(await showing(harness, { from: 7, to: 8 }), [0]);
    });

    it("reads spells over start and end, whatever they hold", async () => {
        const harness = nodesOf([{ a: 0, b: 100, s: [[40, 50]] }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", spells: "s", unit: "ordinal" } });

        assert.deepEqual(await showing(harness, { from: 0, to: 10 }), []);
        assert.deepEqual(await showing(harness, { from: 45, to: 46 }), [0]);
    });

    it("times a spells-only row with no start, and reads an empty list as no spells", async () => {
        const harness = nodesOf([{ s: [[1, 2]] }, { a: 1, s: [] }]);
        await harness.session.time.setField({ nodes: { start: "a", spells: "s", unit: "ordinal" } });
        await harness.session.time.ready;

        assert.deepEqual(harness.session.time.extent()?.nodes, { timed: 2, untimed: 0, unparsed: 0 });
        assert.deepEqual(await showing(harness, { from: 1, to: 2 }), [0, 1]);
    });

    it("reads date text in spells, in the field's zone", async () => {
        const harness = nodesOf([{ s: [{ start: "2020-01-01", end: "2020-02-01" }] }]);
        await harness.session.time.setField({ nodes: { start: "a", spells: "s", parseZone: "Asia/Kolkata" } });

        assert.deepEqual(await showing(harness, { from: "2020-01-15", to: "2020-01-16" }), [0]);
        assert.deepEqual(await showing(harness, { from: "2020-02-01", to: "2020-02-02" }), []);
    });

    it("reports values of spells and ends that do not read as time", async () => {
        const harness = nodesOf([
            { a: 1, b: "soon", s: ["nope"] },
            { a: 1, b: "soon" },
        ]);
        const result = await harness.session.time.setField({
            nodes: { start: "a", end: "b", spells: "s", unit: "ordinal" },
        });

        const paths = result.notices.filter(({ code }) => code === "time.unparsed").map(({ params }) => params.path);
        assert.deepEqual(paths, ["b", "s"]);
    });
});

describe("a row with no time", () => {
    it('is hidden under `missing: "outside"`, kept otherwise, and counted as untimed', async () => {
        const harness = nodesOf([{ a: 1, b: 5 }, { x: 1 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await harness.session.time.ready;

        assert.deepEqual(await showing(harness, { from: 0, to: 2 }), [0, 1]);
        assert.deepEqual(await showing(harness, { from: 0, to: 2, missing: "outside" }), [0]);
        assert.deepEqual(harness.session.time.extent()?.nodes, { timed: 1, untimed: 1, unparsed: 0 });
    });
});

describe("spanOf", () => {
    it("covers every span of an element, finite and usable as a window", async () => {
        const harness = nodesOf([
            { a: 4, b: 6 },
            {
                s: [
                    [10, 12],
                    [2, 3],
                ],
            },
            { a: 8 },
            { b: 7 },
            { x: 1 },
        ]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", spells: "s", unit: "ordinal" } });
        const { time } = harness.session;

        assert.deepEqual(time.spanOf({ nodes: ["n0"] }), { from: 4, to: 7 });
        assert.deepEqual(time.spanOf({ nodes: ["n1"] }), { from: 2, to: 13 });
        assert.deepEqual(time.spanOf({ nodes: ["n2"] }), { from: 8, to: 13 }, "an open end clamps to the extent");
        assert.deepEqual(time.spanOf({ nodes: ["n3"] }), { from: 2, to: 8 }, "an open start clamps to the extent");
        assert.isNull(time.spanOf({ nodes: ["n4"] }));
    });

    it("gives an instant inside an interval field the span of that instant", async () => {
        const harness = nodesOf([{ s: [5] }, { s: [1, 9] }]);
        await harness.session.time.setField({ nodes: { start: "a", spells: "s", unit: "ordinal" } });

        assert.deepEqual(harness.session.time.spanOf({ nodes: ["n0"] }), { from: 5, to: 6 });
        assert.deepEqual(harness.session.time.extent()?.to, 10);
    });
});

describe("a field naming several ends", () => {
    for (const [field, nodes, edges] of [
        ["end", { start: "t", end: "a" }, { start: "t", end: "b" }],
        ["spells", { start: "t", spells: "a" }, { start: "t", spells: "b" }],
    ] as const) {
        it(`refuses different \`${field}\` paths on the two kinds, naming it`, async () => {
            const { session } = nodesOf([{ t: 1 }]);
            let refusal: unknown = null;
            await session.time.setField({ nodes, edges }).catch((error: unknown) => {
                refusal = error;
            });

            assert.deepInclude((refusal as { details: unknown }).details, { reason: "time-paths-differ", field });
        });
    }

    it("lets one kind keep instants while the other has intervals", async () => {
        const harness = makeSession();
        harness.add(
            [
                { id: "a", t: 1 },
                { id: "b", t: 50 },
            ],
            [{ src: "a", dst: "b", t: 1, u: 100 }],
        );
        await harness.session.time.setField({
            nodes: { start: "t", unit: "ordinal" },
            edges: { start: "t", end: "u", unit: "ordinal" },
        });
        await harness.session.time.window({ from: 40, to: 60 });

        assert.deepEqual([...harness.session.visibility.nodeMask()], [0, 1]);
        assert.deepEqual([...harness.session.visibility.edgeMask()], [0]);
        await harness.session.time.window({ from: 0, to: 60 });
        assert.deepEqual([...harness.session.visibility.edgeMask()], [1]);
    });

    it("reads its own end on nodes and its own spells on edges, and slides without a full pass", async () => {
        const harness = makeSession();
        harness.add(
            [
                { id: "a", t: 1, b: 100 },
                { id: "b", t: 50 },
            ],
            [
                { src: "a", dst: "b", t: 5 },
                { src: "b", dst: "a", s: [[45, 55]] },
            ],
        );
        const { time, visibility } = harness.session;
        await time.setField({
            nodes: { start: "t", end: "b", unit: "ordinal" },
            edges: { start: "t", spells: "s", unit: "ordinal" },
        });
        await time.window({ from: 40, to: 60, step: 20, nodes: "all" });
        assert.deepEqual([...visibility.nodeMask()], [1, 1]);
        assert.deepEqual([...visibility.edgeMask()], [0, 1], "the edge at 5 is an instant, not open-ended");

        const { full } = slideCounters;
        await time.seek(0);
        assert.deepEqual([...visibility.nodeMask()], [1, 0]);
        assert.deepEqual([...visibility.edgeMask()], [0, 0]);
        assert.strictEqual(slideCounters.full, full, "the index answers the move");
    });

    it("clears the window when only the end changes, and writes the end on a new window", async () => {
        const harness = nodesOf([{ a: 1, b: 5, c: 9 }]);
        const { time, visibility } = harness.session;
        await time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await time.window({ from: 0, to: 2 });
        assert.strictEqual(visibility.window?.end, "data.b");

        await time.setField({ nodes: { start: "a", end: "c", unit: "ordinal" } });
        assert.isNull(visibility.window);
        assert.deepEqual(await showing(harness, { from: 7, to: 8 }), [0]);
    });
});

describe("a window naming its own end", () => {
    it("reads records when nothing is designated", async () => {
        const harness = nodesOf([
            { a: 1, b: 5 },
            { a: 9, b: 12 },
        ]);
        await harness.session.visibility.setWindow({ attribute: "data.a", end: "data.b", from: 3, to: 4 });

        assert.deepEqual(shown(harness), [0]);
    });

    it("reads spells from records", async () => {
        const harness = nodesOf([{ s: [[1, 2], 7] }, { s: [4] }, { x: 1 }]);
        await harness.session.visibility.setWindow({
            attribute: "data.a",
            spells: "data.s",
            from: 7,
            to: 8,
            missing: "outside",
        });

        assert.deepEqual(shown(harness), [0]);
    });

    it("reads instants when it names no end, over a designated column that has one", async () => {
        const harness = nodesOf([{ a: 1, b: 50 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await harness.session.visibility.setWindow({ attribute: "data.a", from: 10, to: 20 });

        assert.deepEqual(shown(harness), [], "the same as with nothing designated");
    });

    it("reads its own end over a designated column that has another", async () => {
        const harness = nodesOf([{ a: 1, b: 5, c: 9 }]);
        await harness.session.time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await harness.session.visibility.setWindow({ attribute: "data.a", end: "data.c", from: 7, to: 8 });

        assert.deepEqual(shown(harness), [0]);
    });
});

/** Where the data's bounds are drawn from. */
const SPAN_DATA = 200;

/** The spans of an element no window says anything about. */
const ALWAYS: readonly Span[] = [[Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]];

/**
 * A seeded pseudo-random number in [0, 1).
 * @param seed - The seed.
 * @returns The generator.
 */
function random(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
        return state / 2_147_483_648;
    };
}

/**
 * One row's time, as an interval, an open end, an open start, an instant, spells, an instant list
 * or nothing.
 * @param next - The generator.
 * @returns The fields, and the spans they read as.
 */
function drawn(next: () => number): { readonly fields: Timed; readonly spans: readonly Span[] | null } {
    const time = (): number => Math.floor(next() * SPAN_DATA);
    const pair = (): Span => {
        const start = time();
        return [start, start + 1 + Math.floor(next() * 40)];
    };
    const kind = Math.floor(next() * 7);
    if (kind === 0) {
        const span = pair();
        return { fields: { a: span[0], b: span[1] }, spans: [span] };
    }

    if (kind === 1) {
        const start = time();
        return { fields: { a: start }, spans: [[start, Number.POSITIVE_INFINITY]] };
    }

    if (kind === 2) {
        const end = time();
        return { fields: { b: end }, spans: [[Number.NEGATIVE_INFINITY, end]] };
    }

    if (kind === 3) {
        const spans = [pair(), pair(), pair()];
        return {
            fields: { a: 1, b: 2, s: [spans[0], { start: spans[1][0], end: spans[1][1] }, [...spans[2]]] },
            spans,
        };
    }

    if (kind === 4) {
        const instants = [time(), time()];
        return { fields: { s: instants }, spans: instants.map((at): Span => [at, at + 1e-9]) };
    }

    if (kind === 5) {
        const at = time();
        return { fields: { a: at, b: at }, spans: [[at, at + 1e-9]] };
    }

    return { fields: { x: 1 }, spans: null };
}

/**
 * Whether a row's spans hold a window, by the rule itself. Windows here sit on whole numbers, so an
 * instant is any span of a very small length.
 * @param spans - The spans; null for none.
 * @param from - The window's start.
 * @param to - The window's end.
 * @param missing - What a row with no spans does.
 * @returns True when it is inside.
 */
function holds(spans: readonly Span[] | null, from: number, to: number, missing: boolean): boolean {
    return spans === null ? missing : spans.some(([start, end]) => start < to && end > from);
}

/** What the brute force expects of a window. */
function expected(
    nodes: readonly (readonly Span[] | null)[],
    edges: readonly { readonly src: number; readonly dst: number; readonly spans: readonly Span[] | null }[],
    from: number,
    to: number,
    options: { readonly missing: boolean; readonly ends: boolean; readonly hidden: (edge: number) => boolean },
): { nodes: number[]; edges: number[] } {
    const { missing, ends, hidden } = options;
    const incident = new Set<number>();
    edges.forEach((edge, at) => {
        if (holds(edge.spans, from, to, missing) && !hidden(at)) {
            incident.add(edge.src);
            incident.add(edge.dst);
        }
    });
    const nodeBytes = nodes.map((spans, at) =>
        holds(spans, from, to, missing) && (!ends || incident.has(at)) ? 1 : 0,
    );
    const edgeBytes = edges.map((edge, at) =>
        holds(edge.spans, from, to, missing) && !hidden(at) && nodeBytes[edge.src] === 1 && nodeBytes[edge.dst] === 1
            ? 1
            : 0,
    );

    return { nodes: nodeBytes, edges: edgeBytes };
}

/** A window's bounds. */
interface Bounds {
    readonly from: number;
    readonly to: number;
}

/**
 * The most rows a small move may visit: each span with a bound it passed, each crossing edge once
 * more to re-test it, and every edge of a node such a span or edge touches.
 * @param nodes - Each node's spans.
 * @param edges - Each edge's ends and spans.
 * @param was - The window before.
 * @param now - The window after.
 * @returns The bound.
 */
function stepWork(
    nodes: readonly (readonly Span[] | null)[],
    edges: readonly { readonly src: number; readonly dst: number; readonly spans: readonly Span[] | null }[],
    was: Bounds,
    now: Bounds,
): number {
    // Inclusive with room above, so an instant's end one float past it still counts.
    const between = (at: number, a: number, b: number): boolean => at >= Math.min(a, b) && at <= Math.max(a, b) + 1e-6;
    const crossing = (spans: readonly Span[] | null): number =>
        (spans ?? []).filter(([start, end]) => between(end, was.from, now.from) || between(start, was.to, now.to))
            .length;
    const degree = new Map<number, number>();
    for (const { src, dst } of edges) {
        degree.set(src, (degree.get(src) ?? 0) + 1);
        degree.set(dst, (degree.get(dst) ?? 0) + 1);
    }

    const touched = new Set<number>();
    let work = 0;
    nodes.forEach((spans, row) => {
        const count = spans === ALWAYS ? 0 : crossing(spans);
        work += count;
        if (count > 0) {
            touched.add(row);
        }
    });
    for (const { src, dst, spans } of edges) {
        const count = crossing(spans);
        work += 2 * count;
        if (count > 0) {
            touched.add(src);
            touched.add(dst);
        }
    }

    for (const row of touched) {
        work += degree.get(row) ?? 0;
    }

    return work;
}

describe("against a brute force over intervals and spells", () => {
    const NODES = 40;
    const EDGES = 120;
    const FIELD: TimeField = {
        nodes: { start: "a", end: "b", spells: "s", unit: "ordinal" },
        edges: { start: "a", end: "b", spells: "s", unit: "ordinal" },
    };

    /**
     * A seeded graph with its truth.
     * @param seed - The seed.
     * @param edgesOnly - Whether only the edges carry time.
     * @returns The harness and each element's spans.
     */
    function made(
        seed: number,
        edgesOnly: boolean,
    ): {
        harness: Harness;
        nodes: (readonly Span[] | null)[];
        edges: { src: number; dst: number; spans: readonly Span[] | null }[];
    } {
        const next = random(seed);
        const rows: NodeRow[] = [];
        const truth: (readonly Span[] | null)[] = [];
        for (let at = 0; at < NODES; at++) {
            const row = drawn(next);
            rows.push({ id: `n${String(at)}`, ...(edgesOnly ? {} : row.fields) });
            truth.push(edgesOnly ? ALWAYS : row.spans);
        }

        const edgeRows: EdgeRow[] = [];
        const edges: { src: number; dst: number; spans: readonly Span[] | null }[] = [];
        for (let at = 0; at < EDGES; at++) {
            const row = drawn(next);
            const src = Math.floor(next() * NODES);
            const dst = Math.floor(next() * NODES);
            edgeRows.push({
                src: `n${String(src)}`,
                dst: `n${String(dst)}`,
                tier: at % 4 === 0 ? "light" : "heavy",
                ...row.fields,
            });
            edges.push({ src, dst, spans: row.spans });
        }

        const harness = makeSession();
        harness.add(rows, edgeRows);

        return { harness, nodes: truth, edges };
    }

    /**
     * The masks as they stand.
     * @param harness - The session.
     * @returns Both, as arrays.
     */
    function masks(harness: Harness): { nodes: number[]; edges: number[] } {
        return {
            nodes: [...harness.session.visibility.nodeMask()],
            edges: [...harness.session.visibility.edgeMask()],
        };
    }

    for (const edgesOnly of [false, true]) {
        for (const missing of ["inside", "outside"] as const) {
            for (const filtered of [false, true]) {
                const name = `${edgesOnly ? "edges timed, nodes follow" : "both timed"}, missing ${missing}${filtered ? ", filtered" : ""}`;
                it(`matches through steps, jumps, cursors, cumulative mode and undo (${name})`, async () => {
                    const { harness, nodes, edges } = made(edgesOnly ? 11 : 12, edgesOnly);
                    const { time, visibility } = harness.session;
                    await time.setField(edgesOnly ? { edges: FIELD.edges } : FIELD);
                    if (filtered) {
                        await visibility.setSteps([
                            {
                                id: "heavy",
                                on: true,
                                rule: { kind: "categories", attribute: "data.tier", values: ["heavy"] },
                            },
                        ]);
                    }

                    const options = {
                        missing: missing === "inside",
                        ends: edgesOnly,
                        hidden: (edge: number) => filtered && edge % 4 === 0,
                    };
                    const check = (from: number, to: number, label: string): void => {
                        assert.deepEqual(masks(harness), expected(nodes, edges, from, to, options), label);
                    };

                    await time.setSettings({ missing });
                    await time.window({ from: 10, to: 30, step: 20 });
                    check(10, 30, "the first window");
                    const { full } = slideCounters;
                    let was = { from: 10, to: 30 };
                    for (let move = 0; move < 8; move++) {
                        const { rows } = slideCounters;
                        const event = await time.stepBy(1);
                        check(event.from, event.to, `step ${String(move)}`);
                        assert.isAtMost(
                            slideCounters.rows - rows,
                            stepWork(nodes, edges, was, event),
                            `step ${String(move)} visits only the spans it crossed and their elements`,
                        );
                        was = event;
                    }

                    assert.strictEqual(slideCounters.full, full, "a step takes no full pass");
                    const next = random(5);
                    for (let move = 0; move < 20; move++) {
                        const at = Math.floor(next() * SPAN_DATA);
                        const event = await time.seek(at, { commit: move % 2 === 0 });
                        check(event.from, event.to, `a jump to ${String(at)}`);
                    }

                    assert.strictEqual(slideCounters.full, full, "a seek takes no full pass");

                    await time.commit();
                    const before = masks(harness);
                    const moved = await time.seek(150);
                    check(moved.from, moved.to, "a seek");
                    await harness.session.undo();
                    assert.deepEqual(masks(harness), before, "undo");

                    await time.setSettings({ mode: "cumulative" });
                    for (let move = 0; move < 5; move++) {
                        const event = await time.stepBy(1);
                        check(event.from, event.to, `a cumulative step ${String(move)}`);
                    }
                });
            }
        }
    }

    it("takes a big move in flat loops, on a graph big enough to have a budget", async () => {
        const harness = nodesOf(
            Array.from({ length: 400 }, (_, at) => (at % 2 === 0 ? { a: at, b: at + 300 } : { a: at, b: at + 1 })),
        );
        const { time } = harness.session;
        await time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await time.window({ from: 0, to: 2, step: 2 });
        const { jumps } = slideCounters;
        const brute = (from: number, to: number): number[] =>
            Array.from({ length: 400 }, (_, at) => at).filter((at) => at < to && at + (at % 2 === 0 ? 300 : 1) > from);

        for (const at of [350, 3, 690, 120, 399]) {
            const event = await time.seek(at);
            assert.deepEqual(shown(harness), brute(event.from, event.to), `a jump to ${String(at)}`);
        }

        assert.isAbove(slideCounters.jumps, jumps);
    });

    it("reads only the spans near either window on a jump, not every span", async () => {
        const COUNT = 2000;
        const spanOf = (at: number): Span => [at * 10, at * 10 + (at % 2 === 0 ? 50 : 5)];
        const harness = nodesOf(Array.from({ length: COUNT }, (_, at) => ({ a: spanOf(at)[0], b: spanOf(at)[1] })));
        const { time } = harness.session;
        await time.setField({ nodes: { start: "a", end: "b", unit: "ordinal" } });
        await time.window({ from: 0, to: 20, step: 20 });
        const brute = (from: number, to: number): number[] =>
            Array.from({ length: COUNT }, (_, at) => at).filter((at) => spanOf(at)[0] < to && spanOf(at)[1] > from);

        for (const at of [15_000, 3000, 18_000, 500]) {
            const { jumps, full, spans } = slideCounters;
            const event = await time.seek(at);
            assert.deepEqual(shown(harness), brute(event.from, event.to), `a jump to ${String(at)}`);
            assert.isAbove(slideCounters.jumps, jumps, "a jump");
            assert.strictEqual(slideCounters.full, full, "no full pass");
            assert.isBelow(slideCounters.spans - spans, COUNT / 20, "the spans near the two windows");
        }
    });

    it("rewrites only the edges a jump crossed", async () => {
        const NODE_COUNT = 200;
        const EDGE_COUNT = 400;
        const spanOfEdge = (at: number): Span => [at % 100, (at % 100) + (at % 3 === 0 ? 60 : 2)];
        const harness = makeSession();
        harness.add(
            Array.from({ length: NODE_COUNT }, (_, at) => ({ id: `n${String(at)}` })),
            Array.from({ length: EDGE_COUNT }, (_, at) => ({
                src: `n${String(at % NODE_COUNT)}`,
                dst: `n${String((at * 7 + 1) % NODE_COUNT)}`,
                a: spanOfEdge(at)[0],
                b: spanOfEdge(at)[1],
            })),
        );
        const { time } = harness.session;
        await time.setField({ edges: { start: "a", end: "b", unit: "ordinal" } });
        await time.window({ from: 0, to: 5, step: 5, nodes: "all" });
        const edgeShows = (row: number, { from, to }: Bounds): boolean => {
            const [start, end] = spanOfEdge(row);
            return start < to && end > from;
        };
        let was: Bounds = { from: 0, to: 5 };
        for (const at of [70, 10, 95, 40]) {
            const { jumps, rewritten, full } = slideCounters;
            const event = await time.seek(at);
            const crossed = Array.from({ length: EDGE_COUNT }, (_, row) => row).filter(
                (row) => edgeShows(row, was) !== edgeShows(row, event),
            );
            assert.isAbove(slideCounters.jumps, jumps, `a jump to ${String(at)}`);
            assert.strictEqual(slideCounters.full, full, "no full pass");
            assert.strictEqual(slideCounters.rewritten - rewritten, crossed.length, "only the crossed edges");
            assert.isBelow(crossed.length, EDGE_COUNT);
            was = event;
        }
    });

    it("counts time.series as the windows it walks show them", async () => {
        const { harness, nodes, edges } = made(21, false);
        const { time } = harness.session;
        await time.setField(FIELD);
        const series = await time.series({ step: 25, from: 0, to: 200 });

        for (const row of series.rows) {
            const truth = expected(nodes, edges, row.from, row.to, {
                missing: true,
                ends: false,
                hidden: () => false,
            });
            assert.strictEqual(
                row.visible.nodes,
                truth.nodes.reduce((sum, byte) => sum + byte, 0),
            );
            assert.strictEqual(
                row.visible.edges,
                truth.edges.reduce((sum, byte) => sum + byte, 0),
            );
        }
    });

    it("counts overlapping spans in each bin", async () => {
        const { harness, nodes, edges } = made(31, false);
        const { time, visibility } = harness.session;
        await time.setField(FIELD);
        await time.ready;
        const countOf = (
            spans: readonly (readonly Span[] | null)[],
            start: number,
            end: number,
            keep: (row: number) => boolean,
        ): number =>
            spans.reduce(
                (sum, each, row) =>
                    sum + (keep(row) ? (each ?? []).filter(([s, e]) => s < end && e > start).length : 0),
                0,
            );
        const edgeSpans = edges.map(({ spans }) => spans);
        const bins = time.bins({ count: 17 });
        assert.isNotNull(bins);
        for (const bin of bins ?? []) {
            assert.strictEqual(
                bin.nodes,
                countOf(nodes, bin.start, bin.end, () => true),
            );
            assert.strictEqual(
                bin.edges,
                countOf(edgeSpans, bin.start, bin.end, () => true),
            );
        }

        await visibility.setSteps([
            { id: "heavy", on: true, rule: { kind: "categories", attribute: "data.tier", values: ["heavy"] } },
        ]);
        for (const bin of time.bins({ count: 17, scope: "visible" }) ?? []) {
            assert.strictEqual(
                bin.edges,
                countOf(edgeSpans, bin.start, bin.end, (row) => row % 4 !== 0),
            );
        }

        for (const bin of time.bins({ count: 9, of: { nodes: ["n3"] } }) ?? []) {
            assert.strictEqual(
                bin.nodes,
                countOf(nodes, bin.start, bin.end, (row) => row === 3),
            );
        }
    });

    it("gives spanOf the bounds of a brute force", async () => {
        const { harness, nodes } = made(41, false);
        const { time } = harness.session;
        await time.setField(FIELD);
        await time.ready;
        const extent = time.extent();
        assert.isNotNull(extent);
        nodes.forEach((spans, row) => {
            const got = time.spanOf({ nodes: [`n${String(row)}`] });
            if (spans === null) {
                assert.isNull(got);
                return;
            }

            const first = Math.max(Math.min(...spans.map(([start]) => start)), extent?.from ?? 0);
            const last = Math.min(Math.max(...spans.map(([, end]) => Math.floor(end))), (extent?.to ?? 0) - 1);
            assert.isTrue(Number.isFinite(got?.from) && Number.isFinite(got?.to), `row ${String(row)}`);
            assert.deepEqual(got, { from: first, to: last + 1 }, `row ${String(row)}`);
            assert.isTrue(holds(spans, got?.from ?? 0, got?.to ?? 0, false), `row ${String(row)}'s window holds it`);
        });
    });
});

describe("with the timeline off", () => {
    const ON = { features: ["timeline"] } as const;
    const OFF = { features: [] } as const;
    const CSV = "source,target,start,stop\nA,B,1000,5000\nB,C,8000,9000\n";

    it("gives a saved window with an end the masks of its start alone, and keeps it saved", async () => {
        const saved = createGraphSession(ON);
        await saved.data.import({ type: "csv", config: { data: CSV } });
        await saved.time.setField({ edges: { start: "start", end: "stop", unit: "ms" } });
        await saved.time.window({ from: 2000, to: 3000, nodes: "all" });
        assert.strictEqual(saved.visibility.summary.visibleEdges, 1);
        const { text } = await saved.project.save();

        const session = createGraphSession(OFF);
        await session.project.open(text);
        assert.strictEqual(session.visibility.window?.end, "data.stop");
        assert.strictEqual(session.config.data.knownFields.edgeTimeEndPath, "stop");
        assert.strictEqual(session.visibility.summary.visibleEdges, 0, "only the start is read");
        const again = await session.project.save();
        assert.include(again.text, '"edgeTimeEndPath"');
    });

    for (const [key, value] of [
        ["end", "data.stop"],
        ["spells", "data.spells"],
    ] as const) {
        it(`gives a saved window naming \`${key}\` over a column that is not designated its start alone`, async () => {
            const csv = 'source,target,start,stop,spells\nA,B,1000,5000,"[[1000,5000]]"\n';
            const saved = createGraphSession(ON);
            await saved.data.import({ type: "csv", config: { data: csv } });
            await saved.visibility.setWindow({ attribute: "data.start", [key]: value, from: 2000, to: 3000 });
            assert.strictEqual(saved.visibility.summary.visibleEdges, 1);
            const { text } = await saved.project.save();

            const session = createGraphSession(OFF);
            await session.project.open(text);
            assert.strictEqual(session.visibility.window?.[key], value);
            assert.strictEqual(session.visibility.summary.visibleEdges, 0, "only the start is read");
        });
    }

    it("refuses a window naming an end", () => {
        const session = createGraphSession(OFF);
        assert.throws(() => {
            void session.visibility.setWindow({ attribute: "data.a", end: "data.b", from: 0, to: 1 });
        }, /timeline/);
    });
});

describe("an instant field", () => {
    it("shares its sorted arrays between starts and ends", async () => {
        const harness = nodesOf([{ a: 3 }, { a: 1 }, { a: 2 }]);
        await harness.session.time.setField({ nodes: { start: "a", unit: "ordinal" } });
        await harness.session.time.ready;

        assert.deepEqual(await showing(harness, { from: 1, to: 3 }), [1, 2]);
        assert.deepEqual(harness.session.time.spanOf({ nodes: ["n0", "n1"] }), { from: 1, to: 4 });
    });
});
