import { assert, describe, it, vi } from "vitest";

import { makeSession } from "./helpers";

/*
 * `session.data.preparePage`: a page's order computed a slice at a time, so a table sorting a large
 * graph keeps the page responsive and can stop the sort, and the page read afterwards returns at
 * once with the order the read alone would have computed.
 */

/**
 * The ids a reference sort gives: values ascending (or descending), absent values last, graph
 * order among equals.
 * @param values - each node's value, in graph order
 * @param descending - largest first
 * @returns the ids in order
 */
function expected(values: readonly (number | undefined)[], descending: boolean): string[] {
    const positions = values.map((_value, position) => position);
    positions.sort((x, y) => {
        const a = values[x];
        const b = values[y];
        if ((a === undefined) !== (b === undefined)) {
            return a === undefined ? 1 : -1;
        }
        if (a === undefined || b === undefined) {
            return x - y;
        }
        return (descending ? b - a : a - b) || x - y;
    });
    return positions.map((position) => `n${String(position)}`);
}

describe("preparing a page's order", () => {
    it("orders rows exactly as the reference sort, at every size around a sorted run", () => {
        for (const count of [0, 1, 31, 32, 33, 100, 5000]) {
            for (const descending of [false, true]) {
                const harness = makeSession();
                const values = Array.from({ length: count }, (_unused, index) =>
                    index % 11 === 0 ? undefined : (index * 7919) % 37,
                );
                harness.add(values.map((rank, index) => ({ id: `n${String(index)}`, rank })));
                const page = harness.session.data.nodePage({ limit: Infinity, sort: { key: "rank", descending } });
                assert.deepStrictEqual(
                    page.records.map((record) => String(record.id)),
                    expected(values, descending),
                    `${String(count)} rows, ${descending ? "descending" : "ascending"}`,
                );
                harness.session.dispose();
            }
        }
    });

    it("hands the thread back while it sorts, reports its progress, and leaves the order cached", async () => {
        const harness = makeSession();
        const count = 200_000;
        harness.add(
            Array.from({ length: count }, (_unused, index) => ({
                id: `n${String(index)}`,
                name: `item ${String((index * 7919) % count)}`,
            })),
        );
        const { session } = harness;
        const fractions: number[] = [];
        await session.data.preparePage(
            "node",
            { sort: { key: "name" } },
            { onProgress: (fraction) => fractions.push(fraction) },
        );

        // Every fraction before the last was reported as the sort handed the thread back.
        assert.isAbove(fractions.length, 1, "the sort handed the thread back at least once");
        assert.strictEqual(fractions.at(-1), 1);
        assert.deepStrictEqual(
            fractions,
            [...fractions].sort((a, b) => a - b),
            "progress only moves forward",
        );

        const reads = vi.spyOn(harness.nodeAttributes, "get");
        const page = session.data.nodePage({ limit: 3, sort: { key: "name" } });
        assert.deepStrictEqual(
            page.records.map((record) => record.name),
            ["item 0", "item 1", "item 2"],
        );
        assert.strictEqual(reads.mock.calls.length, 3, "the page read only its own records");
        session.dispose();
    });

    it("stops when its signal aborts, keeping no order", async () => {
        const harness = makeSession();
        harness.add(Array.from({ length: 100_000 }, (_unused, index) => ({ id: `n${String(index)}`, rank: -index })));
        const { session } = harness;
        const stop = new AbortController();
        const prepared = session.data.preparePage(
            "node",
            { sort: { key: "rank" } },
            {
                signal: stop.signal,
                onProgress: () => {
                    stop.abort(new Error("stopped"));
                },
            },
        );
        const error = await prepared.then(
            () => null,
            (reason: unknown) => reason,
        );
        assert.instanceOf(error, Error);
        assert.strictEqual(error.message, "stopped");

        const reads = vi.spyOn(harness.nodeAttributes, "get");
        const page = session.data.nodePage({ limit: 1, sort: { key: "rank" } });
        assert.strictEqual(page.records[0]?.id, "n99999");
        assert.isAbove(reads.mock.calls.length, 1, "the page read computed the order itself");
        session.dispose();
    });

    it("starts again when the graph changes while it works", async () => {
        const harness = makeSession();
        harness.add(Array.from({ length: 100_000 }, (_unused, index) => ({ id: `n${String(index)}`, rank: index })));
        const { session } = harness;
        let edited = false;
        await session.data.preparePage(
            "node",
            { sort: { key: "rank", descending: true } },
            {
                onProgress: () => {
                    if (!edited) {
                        edited = true;
                        harness.add([{ id: "top", rank: 1e9 }]);
                    }
                },
            },
        );
        assert.isTrue(edited);
        const reads = vi.spyOn(harness.nodeAttributes, "get");
        const page = session.data.nodePage({ limit: 1, sort: { key: "rank", descending: true } });
        assert.strictEqual(page.records[0]?.id, "top");
        assert.strictEqual(reads.mock.calls.length, 1, "the order prepared was the new graph's");
        session.dispose();
    });

    it("settles at once for a page in graph order", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }]);
        const fractions: number[] = [];
        await harness.session.data.preparePage("edge", {}, { onProgress: (fraction) => fractions.push(fraction) });
        assert.deepStrictEqual(fractions, [1]);
        harness.session.dispose();
    });
});
