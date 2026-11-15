/**
 * The file-style store read from untrusted plain values (a project file, a command from anywhere): each
 * malformed load, column, id or value is refused with its own reason before anything is held, and an empty
 * list or an unset value holds nothing. Also the annotations graph value, read defensively.
 */
import { assert, describe, it } from "vitest";

import { GraphtyError } from "../../../src/errors/GraphtyError";
import { drawnAnnotationsOf } from "../../../src/session/styles/fileStyles/annotations";
import { fileStyleColumn, fileStyleStoreOf } from "../../../src/session/styles/fileStyles/store";

/**
 * One load holding the given columns.
 * @param columns - The columns.
 * @returns The load.
 */
function load(columns: unknown): Record<string, unknown> {
    return { importId: "i1", namespace: "gexf", format: "gexf", columns };
}

/**
 * The reason `fileStyleStoreOf` refuses a value with.
 * @param loads - The value.
 * @returns The refusal's code and its details.
 */
function refusal(loads: unknown): { code: string; details: unknown } {
    let caught: unknown = null;
    try {
        fileStyleStoreOf(loads);
    } catch (error) {
        caught = error;
    }
    assert.instanceOf(caught, GraphtyError, `not refused: ${JSON.stringify(loads)}`);
    return { code: caught.code, details: caught.details };
}

describe("a file-style store read from plain values", () => {
    it("refuses each malformed part with its own reason and where it sits", () => {
        const column = (over: Record<string, unknown>): unknown => [
            load([{ kind: "node", key: "k", ids: ["a"], values: [1], ...over }]),
        ];
        const cases: [unknown, Record<string, unknown>][] = [
            ["not a list", { reason: "loads" }],
            [[7], { reason: "load", load: 0 }],
            [[{ ...load([]), importId: "" }], { reason: "load-id", load: 0 }],
            [[{ ...load([]), format: 3 }], { reason: "load-id", load: 0 }],
            [[{ ...load([]), namespace: 5 }], { reason: "load-namespace", load: 0, namespace: 5 }],
            [[load("x")], { reason: "load-columns", load: 0 }],
            [column({ key: "" }), { reason: "column-key", column: 0 }],
            [column({ key: "k".repeat(257) }), { reason: "column-key", column: 0 }],
            [column({ key: 4 }), { reason: "column-key", column: 0 }],
            [column({ ids: "a" }), { reason: "column-values", column: 0 }],
            [column({ ids: [{}] }), { reason: "column-id", column: 0, row: 0 }],
            [column({ values: [{}] }), { reason: "column-value", column: 0, row: 0 }],
            [
                [
                    load([
                        { kind: "node", key: "k", ids: [], values: [] },
                        { kind: "node", key: "k", ids: [], values: [] },
                    ]),
                ],
                { reason: "column-repeated", load: 0, column: 1 },
            ],
            [[load([]), { ...load([]), namespace: "dot" }], { reason: "load-repeated", load: 1 }],
        ];
        for (const [loads, details] of cases) {
            assert.deepEqual(refusal(loads), { code: "E_BAD_COMMAND", details }, JSON.stringify(details));
        }
    });

    it("holds nothing for an empty list, and skips an unset value while keeping the rest of its column", () => {
        assert.deepEqual(fileStyleStoreOf([]).loads, []);

        const store = fileStyleStoreOf([
            load([
                { kind: "node", key: "k", ids: ["a", "b", 3, "d"], values: [1, null, true, undefined] },
                { kind: "edge", key: "k", ids: ["e"], values: ["#ff0000"] },
            ]),
        ]);
        assert.deepEqual(
            [...(fileStyleColumn(store, "gexf", "node", "k") ?? [])],
            [
                ["a", 1],
                [3, true],
            ],
        );
        assert.deepEqual(store.loads[0].values.columns[0].ids, ["a", 3]);
        assert.deepEqual([...(fileStyleColumn(store, "gexf", "edge", "k") ?? [])], [["e", "#ff0000"]]);
        assert.isUndefined(fileStyleColumn(store, "gexf", "edge", "missing"));
    });
});

describe("the annotations graph value", () => {
    it("reads a scale with a list of annotations, and anything else as none", () => {
        const value: unknown = { scale: 2, annotations: [{ kind: "text", text: "x" }] };
        assert.strictEqual(drawnAnnotationsOf(value), value);
        for (const other of [null, undefined, 3, {}, { scale: "2", annotations: [] }, { scale: 2, annotations: {} }]) {
            assert.isNull(drawnAnnotationsOf(other), JSON.stringify(other));
        }
    });
});
