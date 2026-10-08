import { assert, describe, it } from "vitest";

import { lossLines } from "../lossWords";

const unnamed = (): null => null;

describe("lossLines", () => {
    it("words each code from its column and count, never from the element's English", () => {
        assert.deepEqual(
            lossLines(
                [
                    { code: "W_SELF_LOOPS", column: null, count: 1 },
                    { code: "W_COLUMN_DROPPED", column: "tags", count: null },
                ],
                (column) => `the "${column}" column`,
            ),
            ["Edges from a node to itself will not come back.", 'This format has no place for the "tags" column.'],
        );
    });

    it("gives a code it has no words for a plain sentence, and says a repeated sentence once", () => {
        const lines = lossLines(
            [
                { code: "W_SOMETHING_NEW", column: null, count: 4 },
                { code: "W_SOMETHING_NEW", column: "tags", count: 4 },
            ],
            unnamed,
        );
        assert.deepEqual(lines, [
            "Part of this graph will not come back exactly as it is when this file is opened again.",
        ]);
    });
});
