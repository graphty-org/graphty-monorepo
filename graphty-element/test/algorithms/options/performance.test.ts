/**
 * Option validation at the sizes the element meets in practice: a typical algorithm schema, a
 * 20-option schema, no options at all, and a stream of invalid values.
 *
 * These used to assert per-call wall-clock averages, which measured the runner rather than the
 * code. resolveOptions is one pass over the schema, so what matters is that the pass returns the
 * right values and rejects the wrong ones; a hang is caught by the test timeout.
 */

import { assert, describe, it } from "vitest";

import {
    type OptionsSchema,
    OptionValidationError,
    resolveOptions,
    validateOption,
} from "../../../src/algorithms/types/OptionSchema";

describe("Option Schema at scale", () => {
    // Create a large schema for testing
    const createLargeSchema = (): OptionsSchema => {
        const schema: OptionsSchema = {};

        // Add 20 options of various types (using camelCase names)
        for (let i = 0; i < 5; i++) {
            schema[`numberOpt${i}`] = {
                type: "number",
                default: 0.5,
                label: `Number ${i}`,
                description: `Test number ${i}`,
                min: 0,
                max: 1,
            };
            schema[`integerOpt${i}`] = {
                type: "integer",
                default: 100,
                label: `Integer ${i}`,
                description: `Test integer ${i}`,
                min: 1,
                max: 1000,
            };
            schema[`booleanOpt${i}`] = {
                type: "boolean",
                default: true,
                label: `Boolean ${i}`,
                description: `Test boolean ${i}`,
            };
            schema[`stringOpt${i}`] = {
                type: "string",
                default: "test",
                label: `String ${i}`,
                description: `Test string ${i}`,
            };
        }

        return schema;
    };


    it("validates a single in-range option and rejects an out-of-range one", () => {
        const def = {
            type: "number" as const,
            default: 0.85,
            label: "Test",
            description: "Test description",
            min: 0,
            max: 1,
        };

        assert.doesNotThrow(() => {
            validateOption("test", 0.5, def);
        });
        assert.throws(() => {
            validateOption("test", 1.5, def);
        }, OptionValidationError);
    });

    it("resolves typical PageRank options, provided values over defaults", () => {
        const schema: OptionsSchema = {
            dampingFactor: {
                type: "number",
                default: 0.85,
                label: "Damping Factor",
                description: "Probability of following a link",
                min: 0,
                max: 1,
            },
            maxIterations: {
                type: "integer",
                default: 100,
                label: "Max Iterations",
                description: "Maximum iterations",
                min: 1,
                max: 1000,
            },
            tolerance: {
                type: "number",
                default: 1e-6,
                label: "Tolerance",
                description: "Convergence threshold",
                min: 1e-10,
                max: 0.1,
            },
        };

        assert.deepEqual(resolveOptions(schema, { dampingFactor: 0.9, maxIterations: 200 }), {
            dampingFactor: 0.9,
            maxIterations: 200,
            tolerance: 1e-6,
        });
    });

    it("resolves every option of a 20-option schema", () => {
        const schema = createLargeSchema();
        const resolved = resolveOptions(schema, {
            numberOpt0: 0.7,
            integerOpt0: 50,
            booleanOpt2: false,
            stringOpt3: "custom",
        });

        assert.strictEqual(Object.keys(resolved).length, 20);
        assert.strictEqual(resolved.numberOpt0, 0.7);
        assert.strictEqual(resolved.integerOpt0, 50);
        assert.strictEqual(resolved.booleanOpt2, false);
        assert.strictEqual(resolved.stringOpt3, "custom");
        assert.strictEqual(resolved.numberOpt1, 0.5);
        assert.strictEqual(resolved.integerOpt4, 100);
        assert.strictEqual(resolved.booleanOpt0, true);
        assert.strictEqual(resolved.stringOpt0, "test");
    });

    it("resolves to the defaults when no options are given", () => {
        const schema: OptionsSchema = {
            dampingFactor: {
                type: "number",
                default: 0.85,
                label: "Test",
                description: "Test",
                min: 0,
                max: 1,
            },
        };

        assert.deepEqual(resolveOptions(schema), { dampingFactor: 0.85 });
    });

    it("rejects every one of many invalid values", () => {
        const schema: OptionsSchema = {
            value: {
                type: "number",
                default: 0.5,
                label: "Test",
                description: "Test",
                min: 0,
                max: 1,
            },
        };

        for (let i = 0; i < 1000; i++) {
            assert.throws(() => resolveOptions(schema, { value: 999 + i }), OptionValidationError);
        }
    });
});
