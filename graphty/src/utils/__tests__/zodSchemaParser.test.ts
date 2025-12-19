import {describe, expect, it} from "vitest";
import {z} from "zod";

import {camelToTitle, getDefaultValues, parseZodSchema} from "../zodSchemaParser";

describe("zodSchemaParser", () => {
    describe("parseZodSchema", () => {
        it("should extract field type from z.number()", () => {
            const schema = z.object({x: z.number()});
            const result = parseZodSchema(schema);
            expect(result.x.type).toBe("number");
        });

        it("should extract field type from z.boolean()", () => {
            const schema = z.object({enabled: z.boolean()});
            const result = parseZodSchema(schema);
            expect(result.enabled.type).toBe("boolean");
        });

        it("should extract field type from z.string()", () => {
            const schema = z.object({name: z.string()});
            const result = parseZodSchema(schema);
            expect(result.name.type).toBe("string");
        });

        it("should extract field type from z.enum()", () => {
            const schema = z.object({align: z.enum(["vertical", "horizontal"])});
            const result = parseZodSchema(schema);
            expect(result.align.type).toBe("enum");
            expect(result.align.enumValues).toEqual(["vertical", "horizontal"]);
        });

        it("should extract default value from z.number().default()", () => {
            const schema = z.object({x: z.number().default(10)});
            const result = parseZodSchema(schema);
            expect(result.x.default).toBe(10);
        });

        it("should extract default value from z.boolean().default()", () => {
            const schema = z.object({enabled: z.boolean().default(true)});
            const result = parseZodSchema(schema);
            expect(result.enabled.default).toBe(true);
        });

        it("should extract default value from z.enum().default()", () => {
            const schema = z.object({align: z.enum(["vertical", "horizontal"]).default("vertical")});
            const result = parseZodSchema(schema);
            expect(result.align.default).toBe("vertical");
        });

        it("should extract min constraint from z.number().min()", () => {
            const schema = z.object({x: z.number().min(0)});
            const result = parseZodSchema(schema);
            expect(result.x.min).toBe(0);
        });

        it("should extract max constraint from z.number().max()", () => {
            const schema = z.object({x: z.number().max(100)});
            const result = parseZodSchema(schema);
            expect(result.x.max).toBe(100);
        });

        it("should extract both min and max constraints", () => {
            const schema = z.object({x: z.number().min(0).max(100)});
            const result = parseZodSchema(schema);
            expect(result.x.min).toBe(0);
            expect(result.x.max).toBe(100);
        });

        it("should handle z.number().positive()", () => {
            const schema = z.object({x: z.number().positive()});
            const result = parseZodSchema(schema);
            expect(result.x.min).toBe(0);
        });

        it("should detect optional fields from z.optional()", () => {
            const schema = z.object({x: z.number().optional()});
            const result = parseZodSchema(schema);
            expect(result.x.isOptional).toBe(true);
        });

        it("should detect nullable fields from z.nullable() or .or(z.null())", () => {
            const schema = z.object({
                x: z.number().nullable(),
                y: z.number().or(z.null()),
            });
            const result = parseZodSchema(schema);
            expect(result.x.isNullable).toBe(true);
            expect(result.y.isNullable).toBe(true);
        });

        it("should handle complex types like arrays", () => {
            const schema = z.object({center: z.array(z.number()).min(2).max(3)});
            const result = parseZodSchema(schema);
            expect(result.center.type).toBe("complex");
        });

        it("should handle record types", () => {
            const schema = z.object({pos: z.record(z.number(), z.array(z.number()))});
            const result = parseZodSchema(schema);
            expect(result.pos.type).toBe("complex");
        });

        it("should handle union types with null as nullable", () => {
            const schema = z.object({seed: z.number().or(z.null()).default(null)});
            const result = parseZodSchema(schema);
            expect(result.seed.isNullable).toBe(true);
            expect(result.seed.type).toBe("number");
        });

        it("should handle chained defaults with other modifiers", () => {
            const schema = z.object({
                iterations: z.number().positive().default(50),
            });
            const result = parseZodSchema(schema);
            expect(result.iterations.type).toBe("number");
            expect(result.iterations.default).toBe(50);
            expect(result.iterations.min).toBe(0);
        });
    });

    describe("getDefaultValues", () => {
        it("should extract all default values from a schema", () => {
            const schema = z.object({
                iterations: z.number().default(50),
                enabled: z.boolean().default(true),
                align: z.enum(["vertical", "horizontal"]).default("vertical"),
            });
            const defaults = getDefaultValues(schema);
            expect(defaults).toEqual({
                iterations: 50,
                enabled: true,
                align: "vertical",
            });
        });

        it("should handle nullable defaults", () => {
            const schema = z.object({
                seed: z.number().or(z.null()).default(null),
            });
            const defaults = getDefaultValues(schema);
            expect(defaults).toEqual({seed: null});
        });

        it("should handle schemas with no defaults", () => {
            const schema = z.object({
                x: z.number(),
                y: z.string(),
            });
            const defaults = getDefaultValues(schema);
            expect(defaults).toEqual({});
        });
    });

    describe("camelToTitle", () => {
        it("should convert camelCase to Title Case", () => {
            expect(camelToTitle("alphaMin")).toBe("Alpha Min");
            expect(camelToTitle("velocityDecay")).toBe("Velocity Decay");
            expect(camelToTitle("strongGravity")).toBe("Strong Gravity");
        });

        it("should handle single word", () => {
            expect(camelToTitle("gravity")).toBe("Gravity");
        });

        it("should handle all caps abbreviations", () => {
            expect(camelToTitle("maxIter")).toBe("Max Iter");
        });

        it("should handle consecutive capitals", () => {
            expect(camelToTitle("enableBFS")).toBe("Enable BFS");
        });
    });
});
