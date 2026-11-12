/**
 * @file The lit-surface presets as catalog data (design/rendering/shader-styles.md sections 7.1
 * and 8, package P1): each descriptor lists the parameters, ranges, defaults, inputs, motion and
 * cost class of the design's table, its catalog facts pass the checker a registered shader meets,
 * and its body passes the static checks with a cost class no heavier than it declares.
 */

import { assert, describe, it } from "vitest";

import { checkShaderBody } from "../../../src/catalog/shaderGlsl";
import { drawingOf, type ShaderDescriptor } from "../../../src/catalog/shaders";
import { readShaderDescriptor } from "../../../src/catalog/shaderText";
import { LIT_SURFACE_PRESETS } from "../../../stories/shaders/litSurfacePresets";

/** One row of the design's parameter table: type, default, range, and the P / V marks. */
type Row = readonly [name: string, type: string, def: number | string, min?: number, max?: number, primary?: boolean];

/** Section 7.1, transcribed: name, reads, motion's speed parameter, cost, parameters. */
const TABLE: Readonly<Record<string, { name: string; reads: string[]; speed?: string; cost: string; params: Row[] }>> =
    {
        "matcap-ink": {
            name: "Ink",
            reads: ["color", "light"],
            cost: "light",
            params: [["tint", "number", 0.8, 0, 1, true]],
        },
        pearl: {
            name: "Pearl",
            reads: ["color", "light"],
            cost: "light",
            params: [["tint", "number", 0.8, 0, 1, true]],
        },
        "cel-shade": {
            name: "Cel shade",
            reads: ["color", "shape"],
            cost: "medium",
            params: [
                ["bands", "integer", 3, 2, 6, true],
                ["inkWidth", "number", 0.16, 0, 0.4],
                ["inkColor", "color", "#1b1720"],
                ["lightAngle", "number", 0.12, 0, 1],
            ],
        },
        halftone: {
            name: "Halftone",
            reads: ["color"],
            cost: "medium",
            params: [
                ["dotScale", "number", 5, 2, 12, true],
                ["inkColor", "color", "#1b1720"],
                ["paper", "color", "#f3ead6"],
                ["lightAngle", "number", 0.12, 0, 1],
            ],
        },
        "frosted-glass": {
            name: "Frosted glass",
            reads: ["color", "light"],
            cost: "medium",
            params: [
                ["frost", "number", 0.6, 0, 1, true],
                ["rim", "number", 0.5, 0, 1],
                ["tint", "number", 0.5, 0, 1],
            ],
        },
        "liquid-metal": {
            name: "Liquid metal",
            reads: ["color"],
            speed: "speed",
            cost: "medium",
            params: [
                ["speed", "number", 0.3, 0, 2],
                ["ripple", "number", 0.5, 0, 1, true],
                ["tint", "number", 0.5, 0, 1],
            ],
        },
        "anodized-steel": {
            name: "Anodized steel",
            reads: ["color", "light"],
            cost: "medium",
            params: [
                ["film", "number", 500, 100, 1200, true],
                ["brush", "number", 0.5, 0, 1],
                ["tint", "number", 0.2, 0, 1],
            ],
        },
    };

const ORDER: readonly string[] = ["light", "medium", "heavy"];

describe("the lit-surface presets", () => {
    it("are exactly the eight of the design, each in its own folder", () => {
        assert.sameMembers(
            LIT_SURFACE_PRESETS.map((preset) => preset.descriptor.id),
            Object.keys(TABLE),
        );
    });

    it.each(LIT_SURFACE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const))(
        "%s: its descriptor matches section 7.1",
        (id, { descriptor }: { descriptor: ShaderDescriptor }) => {
            const row = TABLE[id];
            assert.strictEqual(descriptor.plainName, row.name);
            assert.strictEqual(drawingOf(descriptor), "node-paint");
            assert.strictEqual(descriptor.origin, "element");
            assert.strictEqual(descriptor.cost, row.cost);
            assert.deepEqual([...descriptor.reads], row.reads);
            assert.deepEqual(descriptor.motion, row.speed === undefined ? {} : { loop: { speedParam: row.speed } });
            assert.notStrictEqual(descriptor.webgpu, "native", "a preset has no WGSL body");
            assert.isTrue(Object.isFrozen(descriptor) && Object.isFrozen(descriptor.params));
            assert.deepEqual(
                descriptor.params.map((param) => [
                    param.name,
                    param.type,
                    param.default,
                    param.min,
                    param.max,
                    param.primary,
                ]),
                row.params.map(([name, type, def, min, max, primary]) => [name, type, def, min, max, primary]),
            );
            for (const param of descriptor.params) {
                assert.isString(param.plainName);
                assert.notStrictEqual(param.varies, true, "no lit surface varies per node");
            }
        },
    );

    it.each(LIT_SURFACE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const))(
        "%s: its catalog facts and its body pass the checks a registered shader meets",
        (_id, { descriptor, body }) => {
            const { origin: _o, cost: _c, reads: _r, webgpu: _w, thumbnail, ...facts } = descriptor;
            const read = readShaderDescriptor({ ...facts }, "plainName", false);
            assert.isFalse(Array.isArray(read), JSON.stringify(read));
            assert.isString(thumbnail);

            const checked = checkShaderBody(body, drawingOf(descriptor));
            assert.deepEqual(checked.problems, []);
            assert.isAtMost(
                ORDER.indexOf(checked.costClass),
                ORDER.indexOf(descriptor.cost),
                `the static bound ${String(checked.cost)} is heavier than the declared class`,
            );
            assert.isTrue(/^[\t\n -~]*$/.test(body), "the body is plain ASCII");
        },
    );
});
