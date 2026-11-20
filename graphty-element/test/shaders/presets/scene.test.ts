/**
 * @file The scene presets as catalog data (design/rendering/shader-styles.md sections 7.5 and 8,
 * package P6): each descriptor lists the parameters, ranges, defaults, motion and cost class of the
 * design's tables; its catalog facts pass the checker a registered shader meets, and its body
 * passes the static checks with a cost class no heavier than it declares.
 */

import { assert, describe, it } from "vitest";

import { checkShaderBody, inferShaderReads } from "../../../src/catalog/shaderGlsl";
import { drawingOf, type ShaderDescriptor } from "../../../src/catalog/shaders";
import { readShaderDescriptor } from "../../../src/catalog/shaderText";
import { SCENE_PRESETS } from "../../../stories/shaders/scenePresets";

/** One row of the design's parameter table: name, type, default, range, primary. */
type Row = readonly [name: string, type: string, def: number | string, min?: number, max?: number, primary?: boolean];

/** Section 7.5, transcribed. */
const TABLE: Readonly<Record<string, { name: string; kind: string; speed: string; cost: string; params: Row[] }>> = {
    nebula: {
        name: "Nebula",
        kind: "background",
        speed: "drift",
        cost: "heavy",
        params: [
            ["gasA", "color", "#2a0f4a"],
            ["gasB", "color", "#d0407a", undefined, undefined, true],
            ["gasC", "color", "#1f6fa8"],
            ["density", "number", 0.8, 0, 2],
            ["warp", "number", 1, 0, 2],
            ["drift", "number", 1, 0, 5],
            ["stars", "number", 0.6, 0, 1],
            ["twinkle", "number", 0.6, 0, 1],
            ["sky", "number", 1, 0, 1],
        ],
    },
};

const ORDER: readonly string[] = ["light", "medium", "heavy"];

const cases = SCENE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const);

describe("the scene presets", () => {
    it("are exactly the design's", () => {
        assert.sameMembers(
            SCENE_PRESETS.map((preset) => preset.descriptor.id),
            Object.keys(TABLE),
        );
    });

    it.each(cases)("%s: its descriptor matches section 7.5", (id, { descriptor }: { descriptor: ShaderDescriptor }) => {
        const row = TABLE[id];
        assert.strictEqual(descriptor.plainName, row.name);
        assert.strictEqual(drawingOf(descriptor), row.kind);
        assert.strictEqual(descriptor.origin, "element");
        assert.strictEqual(descriptor.cost, row.cost);
        assert.deepEqual(descriptor.motion, { loop: { speedParam: row.speed } });
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
            assert.notStrictEqual(param.varies, true, "a scene shader has no per-element values");
        }
    });

    it.each(cases)("%s: its catalog facts and its body pass the checks a registered shader meets", (_id, preset) => {
        const { descriptor, body } = preset;
        const { origin: _o, cost: _c, reads, webgpu: _w, thumbnail, ...facts } = descriptor;
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
        assert.deepEqual([...reads], [...inferShaderReads(body)], "it declares what its body reads");
        assert.isTrue(/^[\t\n -~]*$/.test(body), "the body is plain ASCII");
    });
});
