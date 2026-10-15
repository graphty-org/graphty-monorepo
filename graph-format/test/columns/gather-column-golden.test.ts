/**
 * Characterization test for gatherColumn(): pins its output, dtype by dtype, across
 * INVALID_INDEX entries, fills, components, nullable and non-nullable sources, nested lists and
 * the error paths, so a restructuring of the function cannot change what it returns.
 */
import { describe, expect, it } from "vitest";

import { columnFromTypedArray, columnFromValues } from "../../src/columns/column.js";
import { gatherColumn } from "../../src/columns/remap.js";
import { INVALID_INDEX } from "../../src/constants.js";
import { GraphFormatError } from "../../src/errors.js";
import { type Column, type ColumnDeclPatch } from "../../src/types/index.js";

const X = INVALID_INDEX;

function u32(...entries: number[]): Uint32Array<ArrayBuffer> {
    return new Uint32Array(entries);
}

function values(name: string, entries: readonly unknown[], decl: ColumnDeclPatch = {}): Column {
    return columnFromValues("node", entries.length, name, entries, decl);
}

/**
 * Everything observable about a column, as plain data.
 * @param column - the column
 * @returns the summary
 */
function summary(column: Column): unknown {
    const rows: unknown[] = [];
    for (let i = 0; i < column.length; i++) {
        rows.push([column.isSet(i), column.value(i) ?? null]);
    }
    const base = {
        dtype: column.dtype,
        length: column.length,
        nullCount: column.nullCount,
        nullable: column.meta.nullable,
        validity: column.validity === null ? null : Array.from(column.validity),
        rows,
    };
    switch (column.dtype) {
        case "dict":
            return { ...base, codes: Array.from(column.codes) };
        case "list":
            return { ...base, offsets: Array.from(column.offsets), child: summary(column.child) };
        case "string":
        case "json":
            return base;
        default:
            return { ...base, data: Array.from(column.data) };
    }
}

function gatherError(column: Column, map: Uint32Array<ArrayBuffer>): unknown {
    try {
        gatherColumn(column, map);
    } catch (err) {
        if (err instanceof GraphFormatError) {
            return { code: err.code, message: err.message };
        }
        throw err;
    }
    return null;
}

const MAPS = {
    permute: u32(3, 1, 0, 2),
    holes: u32(X, 2, X, 0, 3),
    repeat: u32(1, 1, 1),
    empty: u32(),
};

const COLUMNS: Record<string, () => Column> = {
    f64: () => values("f64", [1.5, undefined, 3.5, 4.5], { dtype: "f64", fill: 7 }),
    f32x3: () =>
        values("f32x3", [[1, 2, 3], [4, 5, 6], undefined, [10, 11, 12]], { dtype: "f32", components: 3, fill: -1 }),
    i32: () => columnFromTypedArray("node", 4, "i32", new Int32Array([-1, 2, -3, 4]), {}),
    u32: () => columnFromTypedArray("node", 4, "u32", new Uint32Array([5, 6, 7, 8]), { fill: 9 }),
    u8: () => values("u8", [1, 2, 3, 4], { dtype: "u8" }),
    bool: () => values("bool", [true, false, undefined, true], { dtype: "bool" }),
    boolTrueFill: () => values("boolT", [false, true, false, true], { dtype: "bool", default: true }),
    dict: () => values("dict", ["a", "b", undefined, "a"], { dtype: "dict" }),
    dictFill: () => values("dictF", ["a", "b", "c", "a"], { dtype: "dict", default: "c" }),
    string: () => values("string", ["w", undefined, "y", "z"], { dtype: "string" }),
    stringFill: () => values("stringF", ["w", "x", "y", "z"], { dtype: "string", fill: "-" }),
    listI32: () => values("listI32", [[1], [2, 3], [], [4, 5, 6]], { dtype: "list", itemDtype: "i32" }),
    listU32Null: () => values("listU32", [[1, 2], undefined, [3], []], { dtype: "list", itemDtype: "u32" }),
    listString: () => values("listS", [["a"], ["b", "c"], [], ["d"]], { dtype: "list", itemDtype: "string" }),
    json: () => values("json", [{ a: 1 }, null, undefined, "t"], { dtype: "json" }),
};

describe("gatherColumn golden output", () => {
    for (const [columnName, make] of Object.entries(COLUMNS)) {
        for (const [mapName, map] of Object.entries(MAPS)) {
            it(`${columnName} through ${mapName}`, () => {
                const column = make();
                const gathered = gatherColumn(column, map);
                expect(gathered.meta.name).toBe(column.meta.name);
                expect(gathered.meta === column.meta).toBe(column.meta.nullable || gathered.nullCount === 0);
                expect(summary(gathered)).toMatchSnapshot();
            });
        }
        it(`${columnName} rejects an out-of-range index`, () => {
            expect(gatherError(make(), u32(0, 4))).toMatchSnapshot();
        });
    }
});
