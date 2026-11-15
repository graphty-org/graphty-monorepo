/**
 * @file Arithmetic in the expression language: `+ - * /` and unary minus over numbers, with
 * precedence tighter than the comparators, null for anything that is not a number and for
 * division by zero, and the same engine for selectors and computed values.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { compileExpressionPredicate, compileExpressionValue } from "../../../src/session/styles/predicate";

/** One element's values, keyed by path. */
type Row = Readonly<Record<Path, unknown>>;

/**
 * Columns over plain rows.
 * @param rows - The rows.
 * @returns The columns.
 */
function columns(rows: readonly Row[]): Parameters<typeof compileExpressionValue>[1] {
    return {
        value: (index, path) => rows[index]?.[path],
        has: (index, path) => rows[index]?.[path] !== undefined && rows[index]?.[path] !== null,
        idOf: null,
        indexOf: null,
    };
}

/**
 * What an expression reads for each row.
 * @param where - The expression.
 * @param rows - The rows.
 * @returns One value per row.
 */
function values(where: string, rows: readonly Row[]): unknown[] {
    const { value } = compileExpressionValue(where, columns(rows));
    return rows.map((_, index) => value(index));
}

/**
 * The refusal reason of an expression.
 * @param where - The expression.
 * @returns `details.reason` and `details.position`.
 */
function refusal(where: string): { reason: unknown; position: unknown; construct?: unknown } {
    try {
        compileExpressionValue(where, columns([{}]));
    } catch (error) {
        assert.isTrue(isGraphtyError(error));
        const { details } = error as { details: Record<string, unknown> };
        return { reason: details.reason, position: details.position, construct: details.construct };
    }
    throw new Error(`${where} was accepted`);
}

describe("arithmetic in the expression language", () => {
    const row = { "data.a": 6, "data.b": 3, "data.c": 2 };

    it("adds, subtracts, multiplies and divides numbers", () => {
        assert.deepStrictEqual(values("data.a + data.b", [row]), [9]);
        assert.deepStrictEqual(values("data.a - data.b", [row]), [3]);
        assert.deepStrictEqual(values("data.a * `2`", [row]), [12]);
        assert.deepStrictEqual(values("data.a / data.b", [row]), [2]);
        assert.deepStrictEqual(values("-data.a", [row]), [-6]);
        assert.deepStrictEqual(values("data.a - -data.b", [row]), [9]);
    });

    it("binds * and / tighter than + and -, each left to right, and parentheses group", () => {
        assert.deepStrictEqual(values("data.a + data.b * data.c", [row]), [12]);
        assert.deepStrictEqual(values("(data.a + data.b) * data.c", [row]), [18]);
        assert.deepStrictEqual(values("data.a - data.b - data.c", [row]), [1]);
        assert.deepStrictEqual(values("data.a / data.b / data.c", [row]), [1]);
    });

    it("binds arithmetic tighter than the comparators and the logic operators", () => {
        assert.deepStrictEqual(values("data.a - data.b > data.c", [row]), [true]);
        assert.deepStrictEqual(values("data.a / data.b == `2` && data.c * `2` > `3`", [row]), [true]);
    });

    it("answers null for division by zero and for anything that is not a number", () => {
        const rows = [
            { "data.a": 1, "data.b": 0 },
            { "data.a": "3", "data.b": 1 },
            { "data.a": true, "data.b": 1 },
            { "data.b": 1 },
            { "data.a": [1], "data.b": 1 },
        ];
        assert.deepStrictEqual(values("data.a / data.b", rows), [null, null, null, null, null]);
        assert.deepStrictEqual(values("-data.a", [{ "data.a": "3" }, {}]), [null, null]);
        assert.deepStrictEqual(values("`0` / data.b", [{ "data.b": 0 }]), [null], "0 / 0 is not a number");
    });

    it("matches the same elements as a selector", () => {
        const rows = [
            { "data.in": 4, "data.out": 2 },
            { "data.in": 1, "data.out": 2 },
            { "data.in": 1, "data.out": 0 },
        ];
        const { test, paths } = compileExpressionPredicate("data.in / data.out >= `2`", columns(rows));
        assert.deepStrictEqual([...paths], ["data.in", "data.out"]);
        assert.deepStrictEqual(
            rows.map((_, index) => test(index)),
            [true, false, false],
        );
    });

    it("keeps hyphenated names and wildcards refused, with a code", () => {
        assert.deepStrictEqual(refusal("results.min-cut.x"), {
            reason: "minus-needs-spaces",
            position: 11,
            construct: undefined,
        });
        assert.strictEqual(refusal("data.*").construct, "wildcards");
        assert.strictEqual(refusal("*").construct, "wildcards");
        assert.strictEqual(refusal("data.a * `2` +").reason, "missing-operand");
        assert.strictEqual(refusal("data.a + 2").reason, "number-needs-backticks");
        assert.strictEqual(refusal("`1` + `2`").reason, "reads-no-attribute");
    });

    it("gives a computed column its arithmetic", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", weight: 3, in: 4, out: 2 },
            { id: "b", weight: 5, in: 1, out: 0 },
        ]);
        await session.data.derive("double", "data.weight * `2`");
        await session.data.derive("ratio", "data.in / data.out");

        assert.strictEqual(session.data.node("a")?.double, 6);
        assert.strictEqual(session.data.node("b")?.double, 10);
        assert.strictEqual(session.data.node("a")?.ratio, 2);
        assert.isNull(session.data.node("b")?.ratio ?? null, "division by zero leaves no value");
        session.dispose();
    });
});
