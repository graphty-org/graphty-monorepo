/**
 * The time index: one read of the column, a radix sort, a time-sliced build above 50,000 rows, and
 * appended rows merged in rather than the column read again.
 *
 * Over the threshold a fake clock makes every deadline check run out, so a build yields at each
 * chunk and a test acts at a place it can name, never after a stretch of real time.
 */

import { mulberry32 } from "@graphty/algorithms";
import { afterEach, assert, beforeAll, beforeEach, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { FormatDescriptor } from "../../../src/catalog/types";
import { type BaseDataSourceConfig, DataSource, type DataSourceChunk } from "../../../src/data/DataSource";
import { setDefaultFeatures } from "../../../src/features/resolve";
import { dispatcherOf } from "../../../src/session/GraphSession";
import { edgeSpaceOf } from "../../../src/session/scope/ScopeApi";
import { readInstant } from "../../../src/session/time/parse";
import type { TimeField } from "../../../src/session/time/TimeApi";
import {
    buildField,
    drain,
    type FieldPlan,
    mergeField,
    radixArgsort,
    SLICED_ROWS,
    timeIndexCounters,
} from "../../../src/session/time/timeIndex";
import { instantOfWall, wallClock } from "../../../src/session/time/zone";
import { makeSession } from "../helpers";

const BIG = SLICED_ROWS + 1000;
const SECONDS: TimeField = { nodes: { start: "t", unit: "s" } };
const T0 = 1_600_000_000;
const NEW_YORK = "America/New_York";

const sessions: GraphSession[] = [];

beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

beforeEach(() => {
    timeIndexCounters.parsed = 0;
});

afterEach(() => {
    vi.restoreAllMocks();
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A session holding some nodes, each a second after the last.
 * @param count - How many nodes.
 * @param row - What each node carries; by default `t`, seconds since {@link T0}.
 * @returns The session.
 */
async function nodesSession(
    count: number,
    row: (at: number) => Record<string, unknown> = (at) => ({ t: T0 + at, u: at }),
): Promise<GraphSession> {
    const session = createGraphSession();
    sessions.push(session);
    await session.data.addNodes(Array.from({ length: count }, (_, at) => ({ id: `n${String(at)}`, ...row(at) })));
    return session;
}

/**
 * Make every deadline check of a build run out, so it yields after each chunk.
 * @returns Settles when a build has yielded for the first time.
 */
function yieldEveryChunk(): Promise<void> {
    let clock = 0;
    let yielded = (): void => undefined;
    const first = new Promise<void>((resolve) => (yielded = resolve));
    vi.spyOn(performance, "now").mockImplementation(() => {
        clock += 100;
        // The first read sets the slice's deadline; the second finds it passed.
        if (clock >= 200) {
            yielded();
        }

        return clock;
    });

    return first;
}

/**
 * Give promises already settling many turns to run: far more than `time.ready` takes with nothing
 * to wait for, so one still pending after this is really waiting.
 */
async function letPromisesRun(): Promise<void> {
    for (let turn = 0; turn < 100; turn++) {
        await Promise.resolve();
    }
}

/**
 * The comparator sort the index used to do.
 * @param rows - The instants.
 * @param ids - The rows to order.
 * @returns The rows, ascending by instant, ties by position.
 */
function comparatorSort(rows: Float64Array, ids: Uint32Array): number[] {
    return [...ids.slice().sort((a, b) => rows[a] - rows[b])];
}

describe("radix argsort", () => {
    it("orders negatives, duplicates, huge years and -0 as a stable comparator sort does", () => {
        const next = mulberry32(7);
        const rows = Float64Array.from({ length: 5000 }, (_, at) => {
            const pick = next();
            if (pick < 0.1) {
                return Number.NaN;
            }

            if (pick < 0.2) {
                return at % 2 === 0 ? -0 : 0;
            }

            if (pick < 0.4) {
                return Math.floor(next() * 20) * 86_400_000;
            }

            if (pick < 0.6) {
                return -Math.floor(next() * 1e13);
            }

            return (next() - 0.5) * 8.64e15;
        });
        const ids = Uint32Array.from(rows.keys()).filter((row) => !Number.isNaN(rows[row]));

        assert.deepEqual([...drain(radixArgsort(rows, ids))], comparatorSort(rows, ids));
    });

    it("sorts nothing, and sorts one", () => {
        assert.deepEqual([...drain(radixArgsort(new Float64Array(0), new Uint32Array(0)))], []);
        assert.deepEqual([...drain(radixArgsort(Float64Array.of(5), Uint32Array.of(0)))], [0]);
    });
});

describe("the exact ISO fast path", () => {
    it("reads what the strict reader reads, and leaves everything else to it", () => {
        const texts = [
            "2026-03-09",
            "2024-02-29",
            "2023-02-29",
            "2026-13-01",
            "2026-00-10",
            "2026-04-31",
            "0050-01-01",
            "0099-12-31T23:59:59.999Z",
            "1969-12-31T23:59:59.999Z",
            "2026-03-09T24:00:00.000Z",
            "2026-03-09T12:60:00.000Z",
            "2026-03-09T12:00:60.000Z",
            "2026-03-09T12:30:45.123Z",
            "2026-03-09T12:30:45.123+",
            "2026-03-09 12:30:45.123Z",
            "20x6-03-09",
            "1.10e-5-001",
        ];
        const next = mulberry32(11);
        for (let at = 0; at < 2000; at++) {
            texts.push(new Date(Math.floor((next() - 0.2) * 4e12)).toISOString());
        }

        for (const text of texts) {
            // With no zone the fast path stays out: the strict reader's own answer.
            const strict = readInstant(text, "ms");
            const fast = readInstant(text, "ms", "UTC");
            assert.strictEqual(fast.how, strict.how === "loose" ? fast.how : strict.how, text);
            if (strict.how === "strict") {
                assert.strictEqual(fast.at, strict.at, text);
            }
        }
    });
});

describe("a zone's wall clock", () => {
    it("reads every hour of a year with two clock changes, asked twice", () => {
        const start = Date.UTC(2026, 0, 1);
        const hours = Array.from({ length: 365 * 24 }, (_, at) => start + at * 3_600_000);
        const first = hours.map((wall) => instantOfWall(wall, NEW_YORK));

        assert.deepEqual(
            hours.map((wall) => instantOfWall(wall, NEW_YORK)),
            first,
        );
        // Only the hour the spring change skipped reads as another hour.
        const skipped = hours.filter((wall, at) => wallClock(first[at], NEW_YORK) !== wall);
        assert.deepEqual(skipped, [Date.UTC(2026, 2, 8, 2)]);
        // The hour the autumn change repeated reads as the first of the two.
        assert.strictEqual(instantOfWall(Date.UTC(2026, 10, 1, 1), NEW_YORK), Date.UTC(2026, 10, 1, 5));
    });
});

/**
 * A plan over a column of values.
 * @param values - The column.
 * @param unit - The unit given, if any.
 * @param zone - The zone text with no offset reads in.
 * @returns The plan.
 */
function planOf(values: readonly unknown[], unit?: "ms" | "s", zone = "UTC"): FieldPlan {
    return {
        key: "k",
        data: "d",
        reading: "t",
        rewrites: "r",
        path: "t",
        node: null,
        edge: { count: values.length, read: (row) => values[row], unit, zone },
    };
}

describe("a build's steps", () => {
    /**
     * The most rows one step of a build parses.
     * @param values - The column.
     * @param zone - The zone text with no offset reads in.
     * @returns The rows.
     */
    function longestStep(values: readonly unknown[], zone: string): number {
        const work = buildField(planOf(values, undefined, zone));
        let longest = 0;
        for (let before = timeIndexCounters.parsed; work.next().done !== true; before = timeIndexCounters.parsed) {
            longest = Math.max(longest, timeIndexCounters.parsed - before);
        }

        return longest;
    }

    it("parses text a few hundred rows at a time, however it reads", () => {
        const column = (text: (day: number) => string): string[] =>
            Array.from({ length: 40_000 }, (_, at) => text((at % 28) + 1));
        const padded = (day: number): string => String(day).padStart(2, "0");

        for (const text of [
            (day: number) => `2026-01-${padded(day)}T12:30:00`,
            (day: number) => `2026-01-${padded(day)} 12:30:00`,
            (day: number) => `2026-01-${padded(day)}`,
            (day: number) => `January ${String(day)}, 2026`,
        ]) {
            assert.isAtMost(longestStep(column(text), NEW_YORK), 256);
        }
    });

    it("parses plain numbers a chunk at a time", () => {
        const values = Array.from({ length: 40_000 }, (_, at) => 1_600_000_000_000 + at);
        assert.strictEqual(longestStep(values, "UTC"), 16_384);
        assert.strictEqual(timeIndexCounters.parsed, 40_000);
    });

    it("reads each value once, however many questions it answers", () => {
        const values = Array.from({ length: 1000 }, (_, at) => T0 + at);
        const plan = planOf(values);
        const read = vi.fn(plan.edge?.read);

        drain(buildField({ ...plan, edge: { ...(plan.edge as NonNullable<FieldPlan["edge"]>), read } }));

        assert.strictEqual(read.mock.calls.length, values.length);
    });
});

describe("merging appended rows", () => {
    /**
     * Whether a merge of `tail` onto `head` equals a fresh build of both.
     * @param head - The rows indexed.
     * @param tail - The rows appended.
     * @param unit - The unit given.
     */
    function assertMergedIsFresh(head: readonly unknown[], tail: readonly unknown[], unit?: "ms" | "s"): void {
        const built = drain(buildField(planOf(head, unit)));
        const all = [...head, ...tail];
        const merged = drain(mergeField(built, planOf(all, unit)));
        const fresh = drain(buildField(planOf(all, unit)));
        assert.isNotNull(merged);
        assert.deepEqual(merged, fresh);
    }

    it("equals a fresh build: ties keep row order, counts, notices and wholeness carry over", () => {
        const next = mulberry32(3);
        const value = (): unknown => {
            const pick = next();
            if (pick < 0.1) {
                return undefined;
            }

            if (pick < 0.2) {
                return "no such date";
            }

            if (pick < 0.3) {
                return "March 9, 2026";
            }

            return new Date(Date.UTC(2020, 0, 1 + Math.floor(next() * 40))).toISOString();
        };

        assertMergedIsFresh(Array.from({ length: 500 }, value), Array.from({ length: 60 }, value));
        assertMergedIsFresh([], [1_600_000_000_000, 1.5e12], "ms");
        assertMergedIsFresh([1_600_000_000], [], "s");
    });

    it("gives way to a fresh build when the new rows change how the column reads", () => {
        // Years until an epoch arrives: the column is no longer read as years.
        const years = drain(buildField(planOf([1995, 2001])));
        assert.strictEqual(years.unit, "year");
        assert.isNull(drain(mergeField(years, planOf([1995, 2001, 1_700_000_000_000]))));

        // A column of date text with a stray number, until numbers outnumber the text.
        const text = drain(buildField(planOf(["2026-01-01", "2026-01-02", "2026-01-03", 5], "ms")));
        assert.strictEqual(text.edge?.counts.unparsed, 1);
        assert.isNull(drain(mergeField(text, planOf(["2026-01-01", "2026-01-02", "2026-01-03", 5, 6, 7], "ms"))));
    });
});

/**
 * Whether a session's index answers as an index built from nothing over the same records does.
 * @param session - The session, with a time field designated over `t`.
 * @param message - What to say on a difference.
 */
async function assertFreshAgrees(session: GraphSession, message: string): Promise<void> {
    const snapshot = session.data.snapshot();
    const { nodes, edges } = dispatcherOf(session).graph.slice;
    const space = edgeSpaceOf(snapshot);
    const fresh = createGraphSession();
    await fresh.data.addNodes(
        Array.from({ length: snapshot.nodeCount }, (_, row) => {
            const id = snapshot.ids.idOf(row);
            return { id, t: nodes.get(id)?.t };
        }),
    );
    await fresh.data.addEdges(
        Array.from({ length: snapshot.edgeCount }, (_, row) => ({
            source: snapshot.ids.idOf(snapshot.edgeSource(row)),
            target: snapshot.ids.idOf(snapshot.edgeTarget(row)),
            t: edges.get(space.idOf(row))?.t,
        })),
    );
    await fresh.time.setField(session.time.field);

    assert.deepEqual(session.time.extent(), fresh.time.extent(), message);
    assert.deepEqual(session.time.bins({ count: 16 }), fresh.time.bins({ count: 16 }), message);
    assert.deepEqual(session.time.notices(), fresh.time.notices(), message);
    fresh.dispose();
}

describe("counted work", () => {
    it("parses a column once: a second window parses nothing", async () => {
        const session = await nodesSession(50);
        await session.time.setField(SECONDS);
        const { parsed } = timeIndexCounters;
        assert.strictEqual(parsed, 50);

        await session.time.window({ from: (T0 + 5) * 1000, to: (T0 + 10) * 1000 });
        await session.time.window({ from: (T0 + 6) * 1000, to: (T0 + 11) * 1000 });
        session.time.extent();

        assert.strictEqual(timeIndexCounters.parsed, parsed);
    });

    it("parses only an append's rows, and the result equals a fresh read of them", async () => {
        const session = await nodesSession(50);
        await session.time.setField(SECONDS);
        const { parsed: before } = timeIndexCounters;

        await session.data.addNodes([
            { id: "x", t: T0 - 10 },
            { id: "y", t: T0 + 7 },
            { id: "z", t: T0 + 500 },
        ]);
        const extent = session.time.extent();

        assert.strictEqual(timeIndexCounters.parsed - before, 3);
        assert.strictEqual(extent?.from, (T0 - 10) * 1000);
        assert.strictEqual(extent?.to, (T0 + 500) * 1000 + 1);
        assert.strictEqual(extent?.nodes.timed, 53);
    });

    it("rebuilds after an attribute write, a removal and an undo", async () => {
        const session = await nodesSession(50);
        await session.time.setField(SECONDS);

        for (const write of [
            () => session.data.updateNodes([{ id: "n0", values: { t: T0 - 1000 } }]),
            () => session.data.removeNodes(["n49"]),
            () => session.undo(),
        ]) {
            const { parsed: before } = timeIndexCounters;
            await write();
            session.time.extent();
            assert.isAtLeast(timeIndexCounters.parsed - before, 49);
        }

        assert.strictEqual(session.time.extent()?.nodes.timed, 49 + 1);
    });

    it("reads the column once for a setField, and adopts that index", async () => {
        const harness = makeSession();
        harness.add(
            [{ id: "a" }, { id: "b" }],
            Array.from({ length: 30 }, (_, at) => ({ src: "a", dst: "b", t: T0 + at })),
        );
        const reads = vi.spyOn(harness.edgeAttributes, "get");

        await harness.session.time.setField({ edges: { start: "t", unit: "s" } });
        harness.session.time.extent();

        assert.strictEqual(reads.mock.calls.length, 30);
        harness.session.dispose();
    });

    it("parses only the new edge however many new end nodes it brings", async () => {
        const session = createGraphSession();
        sessions.push(session);
        const edge = (source: string, target: string, at: number): Record<string, unknown> => ({
            source,
            target,
            t: T0 + at,
        });
        await session.data.addEdges(Array.from({ length: 42 }, (_, at) => edge(`n${String(at)}`, "hub", at)));
        await session.time.setField({ edges: { start: "t", unit: "s" } });

        for (const [at, [source, target]] of [
            ["n1", "n2"],
            ["n1", "new1"],
            ["new2", "new3"],
        ].entries()) {
            const { parsed: before } = timeIndexCounters;
            const mark = dispatcherOf(session).graph.rewrites;
            await session.data.addEdges([edge(source, target, 100 + at)]);

            assert.strictEqual(session.time.extent()?.edges.timed, 43 + at);
            assert.strictEqual(timeIndexCounters.parsed - before, 1);
            assert.strictEqual(dispatcherOf(session).graph.rewrites, mark);
        }
    });

    it("reads only an append's records, and walks the record map only for a whole column", async () => {
        const session = createGraphSession();
        sessions.push(session);
        const edges = (from: number, count: number): Record<string, unknown>[] =>
            Array.from({ length: count }, (_, at) => ({ source: "a", target: "b", t: T0 + from + at }));
        await session.data.addEdges(edges(0, 40));
        await session.time.setField({ edges: { start: "t", unit: "s" } });
        const records = (): ReadonlyMap<unknown, unknown> => dispatcherOf(session).graph.slice.edges;

        await session.data.addEdges(edges(40, 3));
        const walked = vi.spyOn(records(), "entries");
        const looked = vi.spyOn(records(), "get");
        assert.strictEqual(session.time.extent()?.edges.timed, 43);
        assert.strictEqual(walked.mock.calls.length, 0);
        assert.strictEqual(looked.mock.calls.length, 3);
        vi.restoreAllMocks();

        await session.data.updateEdges([{ id: [...records().keys()][0] as string, values: { t: T0 - 1 } }]);
        const rewalked = vi.spyOn(records(), "entries");
        assert.strictEqual(session.time.extent()?.edges.timed, 43);
        assert.strictEqual(rewalked.mock.calls.length, 1);
    });

    it("a merged index equals a fresh one after a seeded mix of writes", async () => {
        const next = mulberry32(21);
        const session = await nodesSession(40);
        const pick = (count: number): number => Math.floor(next() * count);
        await session.data.addEdges(
            Array.from({ length: 40 }, (_, at) => ({ source: `n${String(at)}`, target: "n0", t: T0 + at })),
        );
        await session.time.setField({ nodes: { start: "t", unit: "s" }, edges: { start: "t", unit: "s" } });
        const graph = (): ReturnType<typeof dispatcherOf>["graph"] => dispatcherOf(session).graph;
        let serial = 0;
        const instant = (): number | string | null => {
            const kind = pick(10);
            if (kind === 0) {
                return null;
            }

            return kind === 1 ? "no such date" : T0 + pick(200);
        };
        const anyEdge = (): string => {
            const ids = [...graph().slice.edges.keys()];
            return ids[pick(ids.length)];
        };
        const anyNode = (): string => {
            const ids = [...graph().slice.nodes.keys()] as string[];
            return ids[pick(ids.length)];
        };
        const fresh = (): string => `a${String(serial++)}`;
        /** Each write, with the rows it parses when it only appends. */
        const writes: { readonly write: () => Promise<unknown>; readonly appends?: number }[] = [
            { write: () => session.data.addNodes([{ id: fresh(), t: instant() }]), appends: 1 },
            {
                write: () => session.data.addEdges([{ source: anyNode(), target: anyNode(), t: instant() }]),
                appends: 1,
            },
            // The new end node has no time of its own: it adds a row to each column.
            {
                write: () => session.data.addEdges([{ source: anyNode(), target: fresh(), t: instant() }]),
                appends: 2,
            },
            { write: () => session.data.updateNodes([{ id: anyNode(), values: { t: instant() } }]) },
            { write: () => session.data.updateEdges([{ id: anyEdge(), values: { t: instant() } }]) },
            { write: () => session.data.addNodes([{ id: anyNode(), t: instant() }]) },
            { write: () => session.data.removeNodes([anyNode()]) },
            { write: () => session.data.removeEdges([anyEdge()]) },
            { write: () => session.undo() },
            { write: () => session.redo() },
        ];

        for (let round = 0; round < 120; round++) {
            const { write, appends } = writes[pick(writes.length)];
            session.time.extent();
            const { parsed: before } = timeIndexCounters;
            await write();
            const extent = session.time.extent();
            if (appends !== undefined) {
                assert.strictEqual(timeIndexCounters.parsed - before, appends, `round ${String(round)}`);
            }

            assert.isNotNull(extent);
            await assertFreshAgrees(session, `round ${String(round)}`);
            const from = T0 * 1000 + pick(100) * 1000;
            const to = from + 50_000;
            await session.time.window({ from, to, nodes: "all" });

            const snapshot = session.data.snapshot();
            const { nodes, edges } = graph().slice;
            const inWindow = (record: Record<string, unknown> | undefined): number => {
                const t = record?.t;
                // An element with no time stays in every window.
                return typeof t !== "number" || (t * 1000 >= from && t * 1000 < to) ? 1 : 0;
            };
            assert.deepEqual(
                [...session.visibility.nodeMask()],
                Array.from({ length: snapshot.nodeCount }, (_, row) => inWindow(nodes.get(snapshot.ids.idOf(row)))),
                `nodes in round ${String(round)}`,
            );
            const space = edgeSpaceOf(snapshot);
            const inView = (row: number): number =>
                inWindow(edges.get(space.idOf(row))) &&
                session.visibility.nodeMask()[snapshot.edgeSource(row)] &&
                session.visibility.nodeMask()[snapshot.edgeTarget(row)];
            assert.deepEqual(
                [...session.visibility.edgeMask()],
                Array.from({ length: snapshot.edgeCount }, (_, row) => inView(row)),
                `edges in round ${String(round)}`,
            );
            await session.time.window(null);
        }
    });
});

describe("over the threshold", () => {
    it("answers null until the build is done, then answers, and says so once", async () => {
        const session = await nodesSession(BIG);
        await session.time.setField(SECONDS);
        await session.data.updateNodes([{ id: "n0", values: { t: T0 - 1 } }]);
        void yieldEveryChunk();
        let readies = 0;
        session.on("time:ready", () => {
            readies++;
        });

        assert.isNull(session.time.extent());
        assert.isNull(session.time.bins());
        assert.deepEqual(session.time.field, SECONDS);
        await session.time.ready;
        await Promise.resolve();

        assert.strictEqual(session.time.extent()?.nodes.timed, BIG);
        assert.lengthOf(session.time.bins({ count: 10 }) ?? [], 10);
        assert.strictEqual(readies, 1);
    });

    it("finishes the build at once for a window set while it runs, reading its unit", async () => {
        const session = await nodesSession(BIG);
        await session.time.setField(SECONDS);
        await session.data.updateNodes([
            { id: "n0", values: { t: T0 - 1 } },
            { id: "n1", values: { t: T0 + 2 } },
        ]);
        const paused = yieldEveryChunk();
        const { ready } = session.time;
        await paused;

        await session.time.window({ from: (T0 + 2) * 1000, to: (T0 + 4) * 1000, nodes: "all" });

        const mask = session.visibility.nodeMask();
        assert.strictEqual(
            mask.reduce((sum, shown) => sum + shown, 0),
            3,
        );
        assert.strictEqual(mask[1], 1);
        assert.strictEqual(mask[2], 1);
        assert.strictEqual(mask[3], 1);
        await ready;
    });

    it("drops the old build when the field changes, and a held ready follows the new one", async () => {
        const session = await nodesSession(BIG);
        await session.time.setField(SECONDS);
        await session.data.updateNodes([{ id: "n0", values: { u: 5 } }]);
        const paused = yieldEveryChunk();
        const fields: unknown[] = [];
        session.on("time:ready", ({ field }) => {
            fields.push(field);
        });
        const held = session.time.ready;
        await paused;

        await session.time.setField({ nodes: { start: "u", unit: "ordinal" } });
        await held;
        await Promise.resolve();

        assert.deepEqual(fields, [{ nodes: { start: "u", unit: "ordinal" } }]);
        assert.strictEqual(session.time.extent()?.from, 1);
    });

    it("a held ready resolves when more data lands mid-build, over all of it", async () => {
        const session = await nodesSession(BIG);
        await session.time.setField(SECONDS);
        await session.data.updateNodes([{ id: "n0", values: { t: T0 - 1 } }]);
        const paused = yieldEveryChunk();
        const held = session.time.ready;
        await paused;

        await session.data.addNodes([{ id: "late", t: T0 + BIG + 5 }]);
        await held;

        assert.strictEqual(session.time.extent()?.nodes.timed, BIG + 1);
    });

    it("merges an append: only its rows are parsed", async () => {
        const session = await nodesSession(BIG);
        await session.time.setField(SECONDS);
        const { parsed: before } = timeIndexCounters;

        await session.data.addNodes([{ id: "late", t: T0 - 5 }]);
        assert.isNull(session.time.extent());
        await session.time.ready;

        assert.strictEqual(timeIndexCounters.parsed - before, 1);
        assert.strictEqual(session.time.extent()?.from, (T0 - 5) * 1000);
    });

    it("a window set the turn after a merge finishes runs nothing twice", async () => {
        const session = await nodesSession(BIG);
        await session.time.setField(SECONDS);
        await session.data.addNodes([{ id: "late", t: T0 + BIG + 5 }]);
        let readies = 0;
        session.on("time:ready", () => {
            readies++;
        });

        const held = session.time.ready;
        await Promise.resolve();
        await session.time.window({ from: T0 * 1000, to: (T0 + 2) * 1000 });
        await held;
        await letPromisesRun();

        assert.strictEqual(session.time.extent()?.nodes.timed, BIG + 1);
        assert.strictEqual(readies, 1);
    });

    it("lands setField calls in call order, the last caller's choice standing", async () => {
        const session = await nodesSession(BIG, (at) => ({ t: new Date((T0 + at) * 1000).toISOString(), u: at }));
        const text = session.time.setField({ nodes: { start: "t" } });
        const number = session.time.setField({ nodes: { start: "u", unit: "ordinal" } });
        await Promise.all([text, number]);
        assert.strictEqual(session.time.field?.nodes?.start, "u");

        const designated = session.time.setField({ nodes: { start: "t" } });
        const cleared = session.time.setField(null);
        await Promise.all([designated, cleared]);
        assert.isNull(session.time.field);
    });

    it("a setField that refuses leaves the next call to run", async () => {
        const session = await nodesSession(BIG, (at) => ({ t: T0 + at, v: "no such date" }));
        const refused = session.time.setField({ nodes: { start: "v" } });
        const next = session.time.setField(SECONDS);

        await refused.then(
            () => assert.fail("the column holds no times"),
            (error: unknown) => assert.instanceOf(error, Error),
        );
        await next;
        assert.deepEqual(session.time.field, SECONDS);
    });

    it("a held ready waits for a setField running", async () => {
        const session = await nodesSession(BIG);
        const paused = yieldEveryChunk();
        const set = session.time.setField(SECONDS);
        await paused;

        await session.time.ready;

        assert.strictEqual(session.time.extent()?.nodes.timed, BIG);
        await set;
    });

    it("notices wait for the build and start none of their own work at once", async () => {
        const session = await nodesSession(BIG);
        await session.time.setField(SECONDS);
        await session.data.updateNodes([{ id: "n0", values: { t: "no such date" } }]);
        const { parsed: before } = timeIndexCounters;
        void yieldEveryChunk();

        assert.deepEqual(session.time.notices(), []);
        assert.strictEqual(timeIndexCounters.parsed, before);
        await session.time.ready;

        assert.deepEqual(
            session.time.notices().map(({ code }) => code),
            ["time.unparsed"],
        );
    });

    it("resolves at once with nothing to build, and with nothing designated", async () => {
        const session = await nodesSession(BIG);
        await session.time.ready;
        assert.strictEqual(timeIndexCounters.parsed, 0);

        await session.time.setField(SECONDS);
        const { parsed } = timeIndexCounters;
        await session.time.ready;
        assert.strictEqual(timeIndexCounters.parsed, parsed);
    });
});

/** A load that writes one chunk, then waits for the test to let the second through. */
class HeldChunks extends DataSource {
    static type = "held-time-chunks";
    static descriptor: FormatDescriptor = {
        id: HeldChunks.type,
        plainName: "Held chunks",
        extensions: [".held-time-chunks"],
        mimeTypes: ["application/x-held-time-chunks"],
        canImport: true,
        canExport: false,
        options: [],
    };
    static reached = (): void => undefined;
    static gate: Promise<void> = Promise.resolve();
    static chunks: readonly [DataSourceChunk, DataSourceChunk] = [
        { nodes: [], edges: [] },
        { nodes: [], edges: [] },
    ];

    constructor(private readonly config: BaseDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk> {
        const [first, second] = HeldChunks.chunks;
        yield first;
        HeldChunks.reached();
        await HeldChunks.gate;
        yield second;
    }
}

DataSource.register(HeldChunks);

/**
 * Start a load and hold it between its two chunks.
 * @param session - The session.
 * @param chunks - What the load writes; by default a timed node each.
 * @returns The load, and what lets it finish.
 */
async function heldLoad(
    session: GraphSession,
    chunks: typeof HeldChunks.chunks = [
        { nodes: [{ id: "first", t: T0 + 98 }], edges: [] },
        { nodes: [{ id: "second", t: T0 + 99 }], edges: [] },
    ],
): Promise<{ load: Promise<unknown>; open: () => void }> {
    HeldChunks.chunks = chunks;
    const reached = new Promise<void>((resolve) => (HeldChunks.reached = resolve));
    let open = (): void => undefined;
    HeldChunks.gate = new Promise<void>((resolve) => (open = resolve));
    const load = session.data.import({ type: HeldChunks.type, config: {} }, { mode: "merge" });
    await reached;

    return { load, open };
}

describe("a streaming load", () => {
    it("starts no build until it settles, and a held ready waits for it", async () => {
        const session = await nodesSession(10);
        await session.time.setField(SECONDS);
        const { load, open } = await heldLoad(session);
        const { parsed: before } = timeIndexCounters;

        assert.isNull(session.time.extent());
        let settled = false;
        const held = session.time.ready.then(() => {
            settled = true;
        });
        await letPromisesRun();
        assert.isFalse(settled);
        assert.strictEqual(timeIndexCounters.parsed, before);

        open();
        await load;
        await held;

        assert.strictEqual(session.time.extent()?.nodes.timed, 12);
        assert.strictEqual(timeIndexCounters.parsed - before, 2);
    });

    it("reads the zone without starting a build", async () => {
        const session = await nodesSession(10);
        await session.time.setField(SECONDS);
        const { load, open } = await heldLoad(session);
        const { parsed: before } = timeIndexCounters;

        assert.strictEqual(session.time.timeZone, "UTC");
        assert.strictEqual(timeIndexCounters.parsed, before);

        open();
        await load;
    });

    it("a setField during it waits, and reads the column once", async () => {
        const session = await nodesSession(10);
        const { load, open } = await heldLoad(session);
        const { parsed: before } = timeIndexCounters;

        const set = session.time.setField(SECONDS);
        await letPromisesRun();
        assert.strictEqual(timeIndexCounters.parsed, before);
        assert.isNull(session.time.field);

        open();
        await load;
        const { nodes } = await set;

        assert.strictEqual(nodes?.timed, 12);
        assert.strictEqual(timeIndexCounters.parsed - before, 12);
    });

    it("keeps a node's time when its record lands after an index read its row as untimed", async () => {
        const session = await nodesSession(10);
        await session.time.setField(SECONDS);
        await session.time.window({ from: T0 * 1000, to: (T0 + 5) * 1000 });
        const { load, open } = await heldLoad(session, [
            { nodes: [], edges: [{ source: "n0", target: "x" }] },
            { nodes: [{ id: "x", t: T0 + 50 }], edges: [] },
        ]);

        // The window needs the instants now, so this indexes `x` before its record has arrived.
        session.visibility.nodeMask();
        open();
        await load;
        await session.time.ready;

        assert.strictEqual(session.time.extent()?.nodes.timed, 11);
        await session.time.window(null);
        await assertFreshAgrees(session, "after the load");
    });

    it("notices, parse and spanOf start no build during it", async () => {
        const session = await nodesSession(10);
        await session.time.setField(SECONDS);
        const { load, open } = await heldLoad(session);
        const { parsed: before } = timeIndexCounters;

        assert.deepEqual(session.time.notices(), []);
        // The unit is the designation's: a bare number reads in seconds.
        assert.strictEqual(session.time.parse("5"), 5000);
        assert.isNull(session.time.spanOf({ nodes: ["n1"] }));
        await letPromisesRun();
        assert.strictEqual(timeIndexCounters.parsed, before);

        open();
        await load;
        await session.time.ready;
        assert.deepEqual(session.time.spanOf({ nodes: ["n1"] }), {
            from: (T0 + 1) * 1000,
            to: (T0 + 1) * 1000 + 1,
        });
    });
});

describe("with the timeline off", () => {
    it("counts no writes", async () => {
        const session = createGraphSession({ features: [] });
        sessions.push(session);
        setDefaultFeatures([]);
        const before = dispatcherOf(session).graph.rewrites;
        await session.data.addNodes([{ id: "a", t: 1 }]);
        await session.data.updateNodes([{ id: "a", values: { t: 2 } }]);
        setDefaultFeatures(["timeline"]);

        assert.strictEqual(dispatcherOf(session).graph.rewrites, before);
        assert.strictEqual(timeIndexCounters.parsed, 0);
    });

    /**
     * A session with the timeline off and a designated node column, as a saved project leaves one,
     * with a zone it must not read.
     * @param values - The column.
     * @returns The session.
     */
    async function offSession(values: readonly unknown[]): Promise<GraphSession> {
        const session = createGraphSession({ features: [] });
        sessions.push(session);
        await session.data.addNodes(values.map((t, at) => ({ id: `n${String(at)}`, t })));
        await session.config.set({ data: { knownFields: { nodeTimePath: "t", nodeTimeParseZone: NEW_YORK } } });

        return session;
    }

    /**
     * The node mask under a range leaf read as time: the path that reaches the index with the
     * timeline off, because a saved window's bounds are instants of the parsed column.
     * @param session - The session.
     * @param min - The first instant kept.
     * @param max - The last instant kept.
     * @returns The mask.
     */
    async function keptBetween(session: GraphSession, min: number, max: number): Promise<number[]> {
        const rule = { kind: "range", attribute: "data.t", min, max, as: "time" } as const;
        await session.visibility.setConditions([{ effect: "keep", rule }]);
        return [...session.visibility.nodeMask()];
    }

    it("reads each value as readInstant does with no zone", async () => {
        const min = Date.UTC(2026, 0, 15);
        const max = Date.UTC(2026, 0, 16);
        const cases = [
            {
                values: ["2026-01-15T22:00:00", "Jan 15, 2026 12:00", "2026-01-15", "2027-01-01", "no such date", 7],
                strayNumbers: true,
            },
            { values: [1_768_478_400_000, 1_700_000_000_000, "1768478400002"], strayNumbers: false },
        ];

        for (const { values, strayNumbers } of cases) {
            const session = await offSession(values);
            const expected = values.map((value) => {
                const { at, how } = readInstant(value, "ms");
                const stray = strayNumbers && typeof value === "number";
                return !stray && (how === "strict" || how === "loose") && at >= min && at <= max ? 1 : 0;
            });

            assert.deepEqual(await keptBetween(session, min, max), expected);
        }
    });

    it("rebuilds the whole column after an append: nothing merges or counts writes", async () => {
        const session = await offSession(Array.from({ length: 30 }, (_, at) => T0 * 1000 + at));
        const rewrites = vi.spyOn(dispatcherOf(session).graph, "rewrites", "get");
        await keptBetween(session, T0 * 1000, T0 * 1000 + 10);
        const { parsed: before } = timeIndexCounters;

        await session.data.addNodes([{ id: "late", t: T0 * 1000 + 5 }]);
        await keptBetween(session, T0 * 1000, T0 * 1000 + 11);

        assert.strictEqual(timeIndexCounters.parsed - before, 31);
        assert.strictEqual(rewrites.mock.calls.length, 0);
    });

    it("builds a time range whole and at once over the threshold", async () => {
        const values = Array.from({ length: SLICED_ROWS + 10 }, (_, at) => T0 * 1000 + at);
        const session = await offSession(values);
        const { parsed: before } = timeIndexCounters;

        const mask = await keptBetween(session, T0 * 1000 + 5, T0 * 1000 + 7);

        assert.deepEqual(
            mask.flatMap((kept, row) => (kept === 1 ? [row] : [])),
            [5, 6, 7],
        );
        assert.strictEqual(timeIndexCounters.parsed - before, values.length);
    });

    it("reads parse's text as it does with no zone, whatever zone a project saved", async () => {
        const session = await offSession([T0 * 1000, T0 * 1000 + 1]);

        for (const [text, at] of [
            ["2026-01-15", Date.UTC(2026, 0, 15)],
            ["2026-01-15T12:00:00", Date.UTC(2026, 0, 15, 12)],
            ["2026-01-15T12:30:45.123Z", Date.UTC(2026, 0, 15, 12, 30, 45, 123)],
            ["2026-01-15T12:00:00+02:00", Date.UTC(2026, 0, 15, 10)],
            ["Jan 15, 2026 12:00", Date.UTC(2026, 0, 15, 12)],
            ["no such date", null],
        ] as const) {
            assert.strictEqual(session.time.parse(text), at, text);
            assert.strictEqual(session.time.parse(text, { timeZone: NEW_YORK }), at, text);
        }
    });

    it("lets a load hold back neither parse nor a time range", async () => {
        const session = await offSession([T0 * 1000, T0 * 1000 + 1]);
        const kept = await keptBetween(session, T0 * 1000, T0 * 1000 + 1);
        assert.deepEqual(kept, [1, 1]);
        const { load, open } = await heldLoad(session, [
            { nodes: [{ id: "first", t: T0 * 1000 + 5 }], edges: [] },
            { nodes: [], edges: [] },
        ]);
        const { parsed: before } = timeIndexCounters;

        assert.strictEqual(session.time.parse("2026-01-15"), Date.UTC(2026, 0, 15));
        assert.strictEqual(timeIndexCounters.parsed - before, 3);
        assert.deepEqual([...session.visibility.nodeMask()], [1, 1, 0]);

        open();
        await load;
    });

    it("reads an edge column through the per-row reads", async () => {
        const session = createGraphSession({ features: [] });
        sessions.push(session);
        await session.data.addEdges(
            Array.from({ length: 3 }, (_, at) => ({ source: "a", target: "b", t: T0 * 1000 + at })),
        );
        await session.config.set({ data: { knownFields: { edgeTimePath: "t" } } });
        const walked = vi.spyOn(dispatcherOf(session).graph.slice.edges, "entries");
        const { parsed: before } = timeIndexCounters;

        session.time.parse("2026-01-15");

        assert.strictEqual(timeIndexCounters.parsed - before, 3);
        assert.strictEqual(walked.mock.calls.length, 0);
    });
});
