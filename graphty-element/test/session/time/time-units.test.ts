/**
 * Every way a time column can be written gives a window that moves along the data's real range
 * with sensible steps: calendar years, epoch seconds, epoch milliseconds, ISO dates, and plain
 * numbers (a process's steps), which stay numbers with no calendar anywhere.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { inferUnit } from "../../../src/session/time/parse";

/**
 * A session over a node-link document whose nodes and edges carry the given values.
 * @param values - One value per node; edge i joins node i to node i + 1 and carries node i + 1's.
 * @returns The session.
 */
async function chain(values: readonly unknown[]): Promise<GraphSession> {
    const session = createGraphSession();
    const nodes = values.map((value, i) => ({ id: `n${String(i)}`, t: value }));
    const edges = values
        .slice(1)
        .map((value, i) => ({ source: `n${String(i)}`, target: `n${String(i + 1)}`, t: value }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });

    return session;
}

/**
 * Step forward until the window reaches the end, and say where it went.
 * @param session - The session.
 * @returns Every window start, in order.
 */
async function walk(session: GraphSession): Promise<number[]> {
    const starts: number[] = [];
    for (let i = 0; i < 100; i++) {
        const moved = await session.time.stepBy(1);
        starts.push(moved.from);
        if (moved.atEnd) {
            break;
        }
    }

    return starts;
}

const YEARS = [1995, 1998, 2001, 2004, 2007, 2010, 2013, 2016, 2019, 2024];

describe("time units", () => {
    it("infers the unit from the values, never the name", () => {
        assert.strictEqual(inferUnit([1995, "2001", 2024]), "year");
        assert.strictEqual(inferUnit([1_700_000_000, 1_700_086_400]), "s");
        assert.strictEqual(inferUnit([1_700_000_000_000, 1_700_086_400_000]), "ms");
        assert.strictEqual(inferUnit([0, 1, 2, 20]), "ordinal");
        assert.strictEqual(inferUnit([0.5, 1.5]), "ordinal");
        assert.isUndefined(inferUnit(["2026-01-01", 5]));
        assert.isUndefined(inferUnit([]));
    });

    it("reads a column of years as calendar years, and the window moves year by year", async () => {
        const session = await chain(YEARS);
        const result = await session.time.setField({ nodes: { start: "t" } });
        assert.deepStrictEqual(result.field, { nodes: { start: "t", unit: "year" } });
        assert.strictEqual(session.time.extent()?.from, Date.UTC(1995, 0, 1));

        const starts = await walk(session);
        assert.strictEqual(session.time.current?.step, "year");
        assert.isAbove(starts.length, 20);
        assert.strictEqual(new Date(starts[0]).getUTCFullYear(), 1995);
        assert.strictEqual(new Date(starts.at(-1) ?? 0).getUTCFullYear(), 2024);
        // Strictly forward, a year at a time.
        for (let i = 1; i < starts.length; i++) {
            assert.strictEqual(new Date(starts[i]).getUTCFullYear(), new Date(starts[i - 1]).getUTCFullYear() + 1);
        }
        session.dispose();
    });

    it("reads epoch seconds as seconds and epoch milliseconds as milliseconds", async () => {
        const day = 86_400;
        const seconds = Array.from({ length: 10 }, (_, i) => 1_767_225_600 + i * 3 * day);
        for (const [values, unit] of [
            [seconds, "s"],
            [seconds.map((each) => each * 1000), "ms"],
            [seconds.map((each) => new Date(each * 1000).toISOString().slice(0, 10)), undefined],
        ] as const) {
            const session = await chain(values);
            const result = await session.time.setField({ nodes: { start: "t" } });
            assert.strictEqual(result.field?.nodes?.unit, unit);
            assert.strictEqual(session.time.extent()?.from, Date.UTC(2026, 0, 1));
            const starts = await walk(session);
            assert.isAbove(starts.length, 5, String(unit));
            assert.isAbove(starts.at(-1) ?? 0, Date.UTC(2026, 0, 20));
            session.dispose();
        }
    });

    it("moves a window over years read as milliseconds too, by a small number step", async () => {
        const session = await chain(YEARS);
        await session.time.setField({ nodes: { start: "t", unit: "ms" } });
        const starts = await walk(session);
        assert.isAbove(starts.length, 5);
        assert.strictEqual(typeof session.time.current?.step, "number");
        session.dispose();
    });

    it("reads a process's steps as plain numbers: whole-number steps, no calendar", async () => {
        const steps = Array.from({ length: 21 }, (_, i) => i);
        const session = await chain(steps);
        const result = await session.time.setField({ nodes: { start: "t" }, edges: { start: "t" } });
        assert.deepStrictEqual(result.field, {
            nodes: { start: "t", unit: "ordinal" },
            edges: { start: "t", unit: "ordinal" },
        });
        assert.deepInclude(session.time.extent(), { from: 0, to: 21 });

        const starts = await walk(session);
        const { current } = session.time;
        assert.strictEqual(current?.step, 1);
        assert.deepStrictEqual(starts.slice(0, 3), [0, 1, 2]);
        assert.strictEqual(starts.at(-1), 20);
        assert.isTrue(starts.every((each) => Number.isInteger(each)));
        // One step's window holds that step's node and the edge into it.
        await session.time.window({ from: 12, to: 13 });
        assert.deepStrictEqual([...session.visibility.nodes].sort(), ["n12"]);

        const bins = session.time.bins({ maxCount: 5 }) ?? [];
        assert.isTrue(bins.every((bin) => Number.isInteger(bin.start) && Number.isInteger(bin.end)));
        assert.throws(() => session.time.bins({ step: "month" }), /calendar step/);
        assert.strictEqual(session.time.parse("12"), 12);
        session.dispose();
    });

    it("reads the same years as plain numbers when the reader picks Number", async () => {
        const session = await chain(YEARS);
        await session.time.setField({ nodes: { start: "t", unit: "ordinal" } });
        assert.deepInclude(session.time.extent(), { from: 1995, to: 2025 });
        const starts = await walk(session);
        assert.isTrue(starts.every((each) => Number.isInteger(each) && each > 1990 && each <= 2024));
        assert.isAbove(starts.length, 5);
        session.dispose();
    });
});
