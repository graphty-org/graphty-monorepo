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

const BIG = SLICED_ROWS + 1000;
const SECONDS: TimeField = { nodes: { start: "t", unit: "s" } };
const T0 = 1_600_000_000;

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

/**
 * A plan over a column of values.
 * @param values - The column.
 * @param unit - The unit given, if any.
 * @returns The plan.
 */
function planOf(values: readonly unknown[], unit?: "ms" | "s"): FieldPlan {
    return {
        key: "k",
        data: "d",
        reading: "t",
        rewrites: "r",
        path: "t",
        node: null,
        edge: { count: values.length, read: (row) => values[row], unit, zone: "UTC" },
    };
}

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

    it("a merged index equals a fresh one after a seeded mix of writes", async () => {
        const next = mulberry32(21);
        const session = await nodesSession(40);
        await session.time.setField(SECONDS);
        let serial = 0;
        for (let round = 0; round < 60; round++) {
            const pick = next();
            const at = T0 + Math.floor(next() * 200);
            if (pick < 0.6) {
                await session.data.addNodes([{ id: `a${String(serial++)}`, t: at }]);
            } else if (pick < 0.8) {
                await session.data.updateNodes([{ id: "n3", values: { t: at } }]);
            } else if (pick < 0.9) {
                await session.data.addNodes([{ id: "n5", t: at }]);
            } else {
                await session.undo();
            }

            const records = dispatcherOf(session).graph.slice.nodes;
            const sorted = [...records.values()].map((record) => (record.t as number) * 1000).sort((a, b) => a - b);
            const extent = session.time.extent();

            assert.strictEqual(extent?.from, sorted[0]);
            assert.strictEqual(extent?.to, sorted[sorted.length - 1] + 1);
            for (const probe of [sorted[0], sorted[sorted.length >> 1]]) {
                assert.strictEqual(
                    session.time.bins({ count: 1, from: sorted[0], to: probe + 1 })?.[0].nodes,
                    sorted.filter((one) => one <= probe).length,
                );
            }
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

    constructor(private readonly config: BaseDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    async *sourceFetchData(): AsyncGenerator<DataSourceChunk> {
        yield { nodes: [{ id: "first", t: T0 + 98 }], edges: [] };
        HeldChunks.reached();
        await HeldChunks.gate;
        yield { nodes: [{ id: "second", t: T0 + 99 }], edges: [] };
    }
}

DataSource.register(HeldChunks);

describe("a streaming load", () => {
    it("starts no build until it settles, and a held ready waits for it", async () => {
        const session = await nodesSession(10);
        await session.time.setField(SECONDS);
        const reached = new Promise<void>((resolve) => (HeldChunks.reached = resolve));
        let open = (): void => undefined;
        HeldChunks.gate = new Promise<void>((resolve) => (open = resolve));
        const load = session.data.import({ type: HeldChunks.type, config: {} }, { mode: "merge" });
        await reached;
        const { parsed: before } = timeIndexCounters;

        assert.isNull(session.time.extent());
        let settled = false;
        const held = session.time.ready.then(() => {
            settled = true;
        });
        await Promise.resolve();
        await Promise.resolve();
        assert.isFalse(settled);
        assert.strictEqual(timeIndexCounters.parsed, before);

        open();
        await load;
        await held;

        assert.strictEqual(session.time.extent()?.nodes.timed, 12);
        assert.strictEqual(timeIndexCounters.parsed - before, 2);
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
});
