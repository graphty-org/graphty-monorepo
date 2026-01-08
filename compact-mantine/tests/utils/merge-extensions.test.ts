import { describe, expect, it } from "vitest";

import {
    mergeExtensions,
    mergeExtensions3,
    mergeExtensions4,
} from "../../src/utils/merge-extensions";

describe("mergeExtensions", () => {
    it("merges two objects with no overlapping keys", () => {
        const a = { foo: 1, bar: 2 };
        const b = { baz: 3, qux: 4 };

        const result = mergeExtensions(a, b);

        expect(result).toEqual({ foo: 1, bar: 2, baz: 3, qux: 4 });
    });

    it("preserves object reference values", () => {
        const objA = { value: "a" };
        const objB = { value: "b" };
        const a = { first: objA };
        const b = { second: objB };

        const result = mergeExtensions(a, b);

        expect(result.first).toBe(objA);
        expect(result.second).toBe(objB);
    });
});

describe("mergeExtensions3", () => {
    it("merges three objects with no overlapping keys", () => {
        const a = { one: 1 };
        const b = { two: 2 };
        const c = { three: 3 };

        const result = mergeExtensions3(a, b, c);

        expect(result).toEqual({ one: 1, two: 2, three: 3 });
    });
});

describe("mergeExtensions4", () => {
    it("merges four objects with no overlapping keys", () => {
        const a = { one: 1 };
        const b = { two: 2 };
        const c = { three: 3 };
        const d = { four: 4 };

        const result = mergeExtensions4(a, b, c, d);

        expect(result).toEqual({ one: 1, two: 2, three: 3, four: 4 });
    });

    it("works with complex nested objects", () => {
        const inputs = {
            TextInput: { extend: () => ({ vars: {} }) },
            NumberInput: { extend: () => ({ vars: {} }) },
        };
        const buttons = {
            Button: { extend: () => ({ vars: {} }) },
        };
        const controls = {
            Checkbox: { extend: () => ({ vars: {} }) },
        };
        const display = {
            Badge: { extend: () => ({ vars: {} }) },
        };

        const result = mergeExtensions4(inputs, buttons, controls, display);

        expect(Object.keys(result)).toEqual([
            "TextInput",
            "NumberInput",
            "Button",
            "Checkbox",
            "Badge",
        ]);
    });

    it("is used by compactTheme without type errors", async () => {
        // This test verifies that the actual theme composition works
        // If there were duplicate keys, this would fail to compile
        const { compactTheme } = await import("../../src/theme");

        expect(compactTheme).toBeDefined();
        expect(compactTheme.components).toBeDefined();
    });
});
