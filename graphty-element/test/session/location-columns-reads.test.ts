/**
 * @file `session.layout.locationColumns()` looks over every node column for the location, on the
 * first open of a table. It reads each node's record once for all the columns, not once per
 * column: a full copy of the record per column was about 230 ms of a cold table open at 50,000
 * nodes (issue #10229).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

/**
 * How many node records one cold `locationColumns()` reads, over a graph of so many columns.
 * @param columns - The node columns besides the city.
 * @returns The answer's kinds and the records read.
 */
async function recordsRead(columns: number): Promise<{ kinds: unknown; reads: number }> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: 40 }, (_, at) => ({
            id: `n${at}`,
            city: at % 2 === 0 ? "Paris" : "Lyon",
            ...Object.fromEntries(Array.from({ length: columns }, (__, c) => [`c${c}`, at * c])),
        })),
    );
    const { data } = session;
    const node = data.node.bind(data);
    let reads = 0;
    data.node = (...args: Parameters<typeof node>) => {
        reads++;
        return node(...args);
    };
    const { kinds } = session.layout.locationColumns();
    return { kinds, reads };
}

describe("layout.locationColumns", () => {
    it("reads each node's record once, however many columns it looks over", async () => {
        const few = await recordsRead(1);
        const many = await recordsRead(12);
        assert.deepEqual(many.kinds, few.kinds, "the same location found");
        assert.isAtMost(few.reads, 40 * 2, "a record read once, plus the found column's own read");
        assert.strictEqual(many.reads, few.reads, "eleven more columns read no more records");
    });
});
