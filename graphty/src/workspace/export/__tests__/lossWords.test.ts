import type { ExportLoss } from "@graphty/graphty-element";
import { assert, describe, it } from "vitest";

import { lossWords } from "../lossWords";

/**
 * A loss as the element reports one.
 * @param code - its code.
 * @param columns - the columns it is about.
 * @param count - how many are affected.
 * @returns the loss.
 */
function loss(code: string, columns: string[] = [], count: number | null = null): ExportLoss {
    return { code, params: { columns, count } };
}

describe("lossWords", () => {
    it("words each code from its columns and count, never from the element's English", () => {
        assert.strictEqual(
            lossWords(loss("W_GRAPH_ATTRIBUTES_DROPPED", ["title", "year"], 2)),
            'Graph attributes "title" and "year" are not kept',
        );
        assert.strictEqual(
            lossWords(loss("W_CSV_NODE_TABLE", ["tags", "meta", "score"], 3)),
            'Node columns "tags", "meta" and "score" are in the node table, not this one',
        );
        assert.strictEqual(lossWords(loss("W_SELF_LOOPS", [], 1)), "1 self-loop cannot be kept");
        assert.strictEqual(lossWords(loss("W_GRAPHTY_NOTES", [], 3)), "3 notes are not exported as notes");
    });

    it("gives a code it has no words for a plain sentence from its columns", () => {
        assert.strictEqual(lossWords(loss("W_SOMETHING_NEW", ["tags"], 4)), 'Part of "tags" is not kept');
        assert.strictEqual(lossWords(loss("W_SOMETHING_NEW")), "Part of the graph is not kept");
    });
});
