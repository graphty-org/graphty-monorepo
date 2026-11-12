import { assert, describe, it } from "vitest";

import { type InferredSchema, inferSchema } from "../../../src/ai/schema/inferSchema";

function fold(values: unknown[]): InferredSchema {
    return values.reduce<InferredSchema>((schema, value) => inferSchema(schema, value), { type: "unknown" });
}

describe("inferSchema", () => {
    it("widens int to float and keeps the observed range", () => {
        assert.deepEqual(fold([3, 1.5, 7]), { type: "float", range: { min: 1.5, max: 7 } });
        assert.deepEqual(fold([3, 9]), { type: "int", range: { min: 3, max: 9 } });
    });

    it("keeps a string format only while every value has it", () => {
        const emails = fold(["a@b.com", "c@d.org"]);

        assert.strictEqual(emails.type, "string");
        assert.strictEqual(emails.type === "string" ? emails.format?.name : undefined, "email");
        assert.deepEqual(fold(["a@b.com", "plain", "c@d.org"]), { type: "string" });
    });

    it("moves a key missing from a later object to optional", () => {
        const schema = fold([
            { a: 1, b: "x" },
            { a: 2, c: true },
        ]);

        assert.strictEqual(schema.type, "object");
        if (schema.type !== "object") {
            return;
        }

        assert.deepEqual(Object.keys(schema.properties.required), ["a"]);
        assert.deepEqual(Object.keys(schema.properties.optional).sort(), ["b", "c"]);
    });

    it("wraps a schema that has seen null as nullable, and mixed types as any", () => {
        assert.deepEqual(fold([true, null]), { type: "nullable", schema: { type: "boolean" } });
        assert.strictEqual(fold([true, "x"]).type, "any");
    });

    it("folds array items across arrays", () => {
        assert.deepEqual(fold([[1], [2, 5]]), { type: "array", items: { type: "int", range: { min: 1, max: 5 } } });
    });

    it("records a __proto__ key as a property, never as a prototype", () => {
        const schema = fold([JSON.parse('{"__proto__": {"polluted": 1}, "a": 1}'), JSON.parse('{"__proto__": 2}')]);

        assert.strictEqual(schema.type, "object");
        if (schema.type !== "object") {
            return;
        }

        const { required, optional } = schema.properties;

        assert.strictEqual(Object.getPrototypeOf(required), Object.prototype);
        assert.strictEqual(Object.getPrototypeOf(optional), Object.prototype);
        assert.deepEqual(Object.keys(required), ["__proto__"]);
        assert.deepEqual(Object.keys(optional), ["a"]);
        assert.strictEqual(Object.getOwnPropertyDescriptor(required, "__proto__")?.value.type, "any");
    });
});
