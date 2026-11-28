/**
 * @file Finding the location columns reads a bounded number of values: the first open of a table
 * on a wide graph reads each column only at the rows that decide what it holds, a second open
 * reads nothing, and the location map's option choices read as few (issue #10229: the first open
 * read every value of every column, about 230 ms at 50,000 nodes).
 */

import { assert, describe, it } from "vitest";

import { DETECTION_ROWS } from "../../src/layout/locationMap/sample";
import { createGraphSession } from "../../src/session";

const NODES = 4 * DETECTION_ROWS;
const COLUMNS = 12;
/** The values of one node record: its id, its city and the other columns. */
const FIELDS = COLUMNS + 2;

/**
 * A session over a wide graph whose node records count every value read from them.
 * @returns The session and the count so far.
 */
async function wideSession(): Promise<{
    session: ReturnType<typeof createGraphSession>;
    reads: () => number;
}> {
    const session = createGraphSession();
    await session.data.addNodes(
        Array.from({ length: NODES }, (_, at) => ({
            id: `n${at}`,
            city: at % 2 === 0 ? "Paris" : "Lyon",
            ...Object.fromEntries(Array.from({ length: COLUMNS }, (__, c) => [`c${c}`, `v${at * c}`])),
        })),
    );
    const { data } = session;
    const node = data.node.bind(data);
    let reads = 0;
    data.node = (...args: Parameters<typeof node>) => {
        const record = node(...args);
        return record === undefined
            ? record
            : new Proxy(record, {
                  get(target, key, receiver) {
                      reads++;
                      return Reflect.get(target, key, receiver) as unknown;
                  },
              });
    };
    return { session, reads: () => reads };
}

describe("finding the location columns", () => {
    it("reads a bounded sample of a wide graph, then nothing until the data changes", async () => {
        const { session, reads } = await wideSession();
        const bound = DETECTION_ROWS * FIELDS;

        const first = session.layout.locationColumns();
        const cold = reads();
        assert.strictEqual(first.kinds.city, "city", "the city column is still found");
        assert.isAtMost(cold, bound, "each column read only at its detection rows");
        assert.isBelow(cold, NODES * FIELDS, "fewer values than the whole table");

        assert.strictEqual(session.layout.locationColumns(), first, "the kept answer");
        assert.strictEqual(reads(), cold, "a second open reads no values");
    });

    it("lists the location options' choices from the same bounded sample", async () => {
        const { session, reads } = await wideSession();
        const options = await session.catalog.optionsFor("location-map");
        const location = options.find((option) => option.name === "location");
        assert.isDefined(location?.values, "the location option lists its columns");
        assert.isAtMost(reads(), DETECTION_ROWS * FIELDS, "each column read only at its detection rows");
    });
});
