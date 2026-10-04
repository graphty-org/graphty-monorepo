import { describe, expect, it } from "vitest";

import { assertSupported, validate } from "../lib/schema.mjs";

/** The githerd_claim schema of design section 7.1. */
const CLAIM = {
    type: "object",
    required: ["target", "purpose"],
    properties: {
        target: {
            type: "string",
            pattern:
                "^(pr:[0-9]+|issue:[0-9]+|master|branch:[A-Za-z0-9._/-]+|path:[A-Za-z0-9._/-]+|task:[a-z0-9-]{3,60})$",
        },
        purpose: { type: "string", maxLength: 200 },
        ttlMinutes: { type: "integer", minimum: 5, maximum: 480, default: 120 },
        holderName: { type: "string", maxLength: 80, description: "Your ListAgents name." },
    },
    additionalProperties: false,
};

/**
 * Reads the messages of a failed validation.
 * @param {unknown} result what validate returned
 * @returns {string[]} the messages
 */
function errorsOf(result) {
    return /** @type {{errors: string[]}} */ (result).errors;
}

describe("validate", () => {
    it("accepts valid arguments and fills defaults without touching the input", () => {
        const input = { target: "pr:519", purpose: "resolve conflict" };
        expect(validate(CLAIM, input)).toEqual({ ok: true, value: { ...input, ttlMinutes: 120 } });
        expect(input).not.toHaveProperty("ttlMinutes");
    });

    it("keeps a value that was given over the default", () => {
        expect(validate(CLAIM, { target: "master", purpose: "x", ttlMinutes: 5 })).toMatchObject({
            ok: true,
            value: { ttlMinutes: 5 },
        });
    });

    it("rejects a missing required property", () => {
        expect(errorsOf(validate(CLAIM, { target: "master" }))).toEqual(["arguments.purpose: required"]);
    });

    it("rejects an unknown property when additionalProperties is false", () => {
        expect(errorsOf(validate(CLAIM, { target: "master", purpose: "x", fixPr: 3 }))).toEqual([
            "arguments.fixPr: unknown property",
        ]);
    });

    it("allows unknown properties when additionalProperties is not false", () => {
        expect(validate({ type: "object" }, { anything: 1 })).toEqual({ ok: true, value: { anything: 1 } });
    });

    it("rejects a pattern mismatch", () => {
        expect(errorsOf(validate(CLAIM, { target: "pr:abc", purpose: "x" }))[0]).toMatch(
            /^arguments\.target: does not match/,
        );
    });

    it("checks integer, minimum and maximum", () => {
        expect(errorsOf(validate(CLAIM, { target: "master", purpose: "x", ttlMinutes: 4 }))).toEqual([
            "arguments.ttlMinutes: less than 5",
        ]);
        expect(errorsOf(validate(CLAIM, { target: "master", purpose: "x", ttlMinutes: 481 }))).toEqual([
            "arguments.ttlMinutes: greater than 480",
        ]);
        expect(errorsOf(validate(CLAIM, { target: "master", purpose: "x", ttlMinutes: 7.5 }))).toEqual([
            "arguments.ttlMinutes: expected integer, got number",
        ]);
    });

    it("accepts an integer where a number is wanted, and rejects a string", () => {
        expect(validate({ type: "number" }, 3).ok).toBe(true);
        expect(errorsOf(validate({ type: "number" }, "3"))).toEqual(["arguments: expected number, got string"]);
    });

    it("names null, arrays and booleans in type errors", () => {
        expect(errorsOf(validate({ type: "object" }, null))).toEqual(["arguments: expected object, got null"]);
        expect(errorsOf(validate({ type: "object" }, []))).toEqual(["arguments: expected object, got array"]);
        expect(errorsOf(validate({ type: "string" }, true))).toEqual(["arguments: expected string, got boolean"]);
        expect(validate({ type: "null" }, null).ok).toBe(true);
    });

    it("checks minLength and maxLength", () => {
        expect(errorsOf(validate(CLAIM, { target: "master", purpose: "x".repeat(201) }))).toEqual([
            "arguments.purpose: longer than 200 characters",
        ]);
        expect(errorsOf(validate({ type: "string", minLength: 20 }, "short"))).toEqual([
            "arguments: shorter than 20 characters",
        ]);
    });

    it("checks enum", () => {
        const schema = { type: "string", enum: ["text", "json"] };
        expect(validate(schema, "json").ok).toBe(true);
        expect(errorsOf(validate(schema, "xml"))).toEqual(['arguments: must be one of "text", "json"']);
    });

    it("checks array items, minItems and maxItems with item paths", () => {
        const schema = { type: "array", minItems: 1, maxItems: 2, items: { type: "string", maxLength: 3 } };
        expect(validate(schema, ["a", "bb"])).toEqual({ ok: true, value: ["a", "bb"] });
        expect(errorsOf(validate(schema, []))).toEqual(["arguments: fewer than 1 items"]);
        expect(errorsOf(validate(schema, ["a", "b", "c"]))).toEqual(["arguments: more than 2 items"]);
        expect(errorsOf(validate(schema, ["toolong"]))).toEqual(["arguments[0]: longer than 3 characters"]);
    });

    it("fills defaults inside array items", () => {
        const schema = {
            type: "array",
            items: { type: "object", properties: { pr: { type: "integer" }, tag: { type: "string", default: "x" } } },
        };
        expect(validate(schema, [{ pr: 1 }])).toEqual({ ok: true, value: [{ pr: 1, tag: "x" }] });
    });

    it("reports every violation at once", () => {
        expect(errorsOf(validate(CLAIM, { target: 3, extra: true }))).toHaveLength(3);
    });

    it("does not share a default object between calls", () => {
        const schema = { type: "object", properties: { kinds: { type: "array", default: [] } } };
        const first = /** @type {{value: {kinds: unknown[]}}} */ (validate(schema, {}));
        first.value.kinds.push("mutated");
        expect(validate(schema, {})).toEqual({ ok: true, value: { kinds: [] } });
    });

    it("throws on a keyword it does not implement, even in a nested schema not exercised", () => {
        expect(() => validate({ type: "string", format: "email" }, "a")).toThrow(/unsupported keyword "format"/);
        const nested = { type: "object", properties: { a: { type: "array", items: { oneOf: [] } } } };
        expect(() => validate(nested, {})).toThrow(/properties\.a\.items uses unsupported keyword "oneOf"/);
        expect(() => assertSupported(CLAIM)).not.toThrow();
    });
});
