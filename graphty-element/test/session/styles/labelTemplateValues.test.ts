/**
 * A template's `{=key}` values: each its own format and missing-value rule, and the parts an editor
 * reads and writes back.
 */

import { assert, describe, it } from "vitest";

import type { Binding, Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { prepareBinding } from "../../../src/session/styles/encoding";
import { parseLabelTemplate, writeLabelTemplate } from "../../../src/session/styles/labelTemplate";
import { createScaleRegistry } from "../../../src/session/styles/scales";

/**
 * Paint one element with a template binding.
 * @param binding - The binding.
 * @param row - The element's values, by path.
 * @returns What it is painted.
 */
function paint(binding: Extract<Binding, { template: readonly string[] }>, row: Record<Path, unknown>): unknown {
    const prepared = prepareBinding({ channel: "node.label", binding, scales: createScaleRegistry() });
    return prepared.paint((path: Path) => row[path]);
}

describe("a template's values", () => {
    const binding = {
        template: ["{data.name}{=v1}", "opened {=v2}"],
        values: {
            v1: {
                path: "data.degree",
                format: { prefix: " (", suffix: ")", maximumFractionDigits: 1 },
                missing: "skip",
            },
            v2: { path: "data.opened", missing: { text: "new" } },
        },
    } as const;

    it("writes each value in its own format", () => {
        assert.strictEqual(
            paint(binding, { "data.name": "TP53", "data.degree": 3.14, "data.opened": "may" }),
            "TP53 (3.1)\nopened may",
        );
    });

    it("skips a value, or writes its missing text, instead of leaving the line out", () => {
        assert.strictEqual(paint(binding, { "data.name": "TP53" }), "TP53\nopened new");
    });

    it("leaves the line out by default, and escapes what it writes", () => {
        const plain = { template: ["a {=v1}", "b"], values: { v1: { path: "data.x" } } };
        assert.strictEqual(paint(plain, {}), "b");
        assert.strictEqual(
            paint({ ...plain, values: { v1: { path: "data.x", missing: { text: "<i>" } } } }, {}),
            "a <lt>i>\nb",
        );
    });

    it("reads a key it does not hold as a path, and writes fixed words as they are", () => {
        assert.strictEqual(paint({ template: ["{=x}"] }, { "=x": "kept" }), "kept");
        assert.strictEqual(paint({ template: ["a{=v1}b"], values: { v1: { text: "{" } } }, {}), "a{b");
    });

    it("refuses a value that is neither a path nor words", () => {
        try {
            paint({ template: ["{=v1}"], values: { v1: {} as never } }, {});
            assert.fail("did not throw");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_LAYER");
        }
    });
});

describe("parseLabelTemplate and writeLabelTemplate", () => {
    it("read a template as parts and write the same template back", () => {
        const shapes = [
            { template: ["{data.name}"] },
            {
                template: ["<bold>{data.gene}</bold>", "log2FC {=v1}"],
                values: { v1: { path: "data.fc", format: { signDisplay: "always" as const } } },
            },
            { template: ["{data.group|rank} of {data.group|count}"] },
            // Words beside fixed words are one part, so they are written as one value.
            { template: ["{=v1}"], values: { v1: { text: "a {x} b" } } },
            { template: ["<i>words</i> {data.a}{=v1}"], values: { v1: { path: "data.b", missing: "skip" as const } } },
        ];
        for (const shape of shapes) {
            assert.deepEqual(writeLabelTemplate(parseLabelTemplate(shape)), shape, JSON.stringify(shape));
        }
    });

    it("reads bold lines, values and words in order", () => {
        assert.deepEqual(
            parseLabelTemplate({
                template: ["<bold>{data.gene}</bold>", "n {=v1}!"],
                values: { v1: { path: "data.n", missing: { text: "-" } } },
            }),
            [
                { bold: true, parts: [{ path: "data.gene" }] },
                { bold: false, parts: [{ text: "n " }, { path: "data.n", missing: { text: "-" } }, { text: "!" }] },
            ],
        );
    });

    it("writes a value with its own format under a key, and a plain one as a path", () => {
        assert.deepEqual(
            writeLabelTemplate([
                {
                    bold: false,
                    parts: [{ path: "data.a" }, { text: " " }, { path: "data.b", format: { notation: "compact" } }],
                },
            ]),
            { template: ["{data.a} {=v1}"], values: { v1: { path: "data.b", format: { notation: "compact" } } } },
        );
    });
});
