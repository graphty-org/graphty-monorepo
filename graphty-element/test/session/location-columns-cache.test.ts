/**
 * @file `session.layout.locationColumns()` is read on every render of a table header and a Fields
 * list, and reads every node column's values: one answer is kept per graph, so a second read with
 * nothing changed is the same answer, and a data change reads afresh (ws-polish 2: 760 ms per edit
 * on 50,000 nodes).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

describe("layout.locationColumns", () => {
    it("is read once per graph: the same answer until the data changes", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", city: "Paris" },
            { id: "b", city: "Lyon" },
        ]);
        const first = session.layout.locationColumns();
        assert.strictEqual(session.layout.locationColumns(), first, "nothing changed: the kept answer");
        await session.data.addNodes([{ id: "c", city: "Nice" }]);
        assert.notStrictEqual(session.layout.locationColumns(), first, "new data: read again");
        assert.deepEqual(session.layout.locationColumns().kinds, first.kinds);
    });
});
