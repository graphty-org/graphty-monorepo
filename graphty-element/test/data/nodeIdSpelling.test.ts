/**
 * @file The one id-spelling rule: only a canonical safe integer has a second spelling, and the
 * exact id always wins. Each place that used to read ids more loosely has a case here.
 */
import { GraphBuilder, INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { edgeCounterOf } from "../../src/data/edgeIdentity";
import { otherIdSpelling, rowOfEitherSpelling } from "../../src/data/nodeIdSpelling";
import { nodeRowOf } from "../../src/session/notes/status";

/** Text that reads as a number but is not its canonical printing, or is past the safe range. */
const NOT_CANONICAL = ["034", "-0", " 34", "34 ", "+34", "1e0", "0x1", "34.0", "", "9007199254740993"];

/**
 * A snapshot holding the given node ids.
 * @param ids - The node ids.
 * @returns The snapshot.
 */
function graphOf(ids: readonly (string | number)[]): ReturnType<GraphBuilder["freeze"]> {
    const builder = new GraphBuilder({ directed: false });
    for (const id of ids) {
        builder.addNode(id);
    }

    return builder.freeze();
}

describe("otherIdSpelling", () => {
    it("maps a canonical safe integer between its two spellings", () => {
        assert.strictEqual(otherIdSpelling("34"), 34);
        assert.strictEqual(otherIdSpelling("-34"), -34);
        assert.strictEqual(otherIdSpelling("0"), 0);
        assert.strictEqual(otherIdSpelling(34), "34");
        assert.strictEqual(otherIdSpelling(Number.MAX_SAFE_INTEGER), String(Number.MAX_SAFE_INTEGER));
    });

    it("gives no other spelling for non-canonical text, decimals or unsafe integers", () => {
        for (const text of NOT_CANONICAL) {
            assert.isUndefined(otherIdSpelling(text), JSON.stringify(text));
        }

        assert.isUndefined(otherIdSpelling(3.5));
        assert.isUndefined(otherIdSpelling(2 ** 53));
    });

    it("rowOfEitherSpelling: the exact id wins, and an unsafe integer finds no different node", () => {
        const graph = graphOf([34, "34", 9007199254740992, 0]);
        assert.strictEqual(graph.ids.idOf(rowOfEitherSpelling(graph.ids, "34")), "34");
        assert.strictEqual(graph.ids.idOf(rowOfEitherSpelling(graph.ids, 34)), 34);
        assert.strictEqual(rowOfEitherSpelling(graph.ids, "9007199254740993"), INVALID_INDEX);
        assert.strictEqual(rowOfEitherSpelling(graph.ids, "-0"), INVALID_INDEX);
        assert.strictEqual(rowOfEitherSpelling(graph.ids, "034"), INVALID_INDEX);
    });
});

describe("edgeCounterOf", () => {
    it("reads only the canonical printing of a counter", () => {
        assert.strictEqual(edgeCounterOf("17"), 17);
        assert.strictEqual(edgeCounterOf("0"), 0);
        for (const text of ["017", "00", "-0", "+17", "1e1", "17.0"]) {
            assert.strictEqual(edgeCounterOf(text), INVALID_INDEX, JSON.stringify(text));
        }
    });
});

describe("a note's node target", () => {
    it("finds the other spelling of a canonical integer and nothing looser", () => {
        const graph = graphOf([11, 3.5, "x"]);
        assert.strictEqual(graph.ids.idOf(nodeRowOf(graph, "11")), 11);
        assert.strictEqual(nodeRowOf(graph, "011"), -1);
        assert.strictEqual(nodeRowOf(graph, "3.5"), -1, "a decimal has one spelling");
        assert.strictEqual(graph.ids.idOf(nodeRowOf(graph, 3.5)), 3.5);
    });
});
