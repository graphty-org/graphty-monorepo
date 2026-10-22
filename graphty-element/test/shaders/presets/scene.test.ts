/**
 * @file The scene presets as catalog data (design/rendering/shader-styles.md sections 7.5 and 8,
 * package P6): each descriptor lists the parameters, ranges, defaults, form, motion and cost class
 * of the design's tables; its catalog facts pass the checker a registered shader meets, and its
 * body passes the static checks with a cost class no heavier than it declares; the hull's blob
 * radius is its kernel's radius, and a pasted shader can say the same in its header.
 */

import { assert, describe, it } from "vitest";

import { checkShaderBody, inferShaderReads } from "../../../src/catalog/shaderGlsl";
import { drawingOf, type ShaderDescriptor } from "../../../src/catalog/shaders";
import { formatShaderText, parseShaderText, readShaderDescriptor } from "../../../src/catalog/shaderText";
import { kernelReach } from "../../../src/meshes/GroupOutlinePass";
import { SCENE_PRESETS } from "../../../stories/shaders/scenePresets";

/** One row of the design's parameter table: name, type, default, range, primary. */
type Row = readonly [name: string, type: string, def: number | string, min?: number, max?: number, primary?: boolean];

/** Section 7.5, transcribed. */
const TABLE: Readonly<
    Record<string, { name: string; kind: string; form?: string; speed: string; cost: string; params: Row[] }>
> = {
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
            ["tintBy", "enum", "none"],
        ],
    },
    "soap-bubble": {
        name: "Soap bubble",
        kind: "group",
        form: "sphere",
        speed: "swirl",
        cost: "heavy",
        params: [
            ["thickness", "number", 520, 100, 1200, true],
            ["turbulence", "number", 0.6, 0, 1.5],
            ["swirl", "number", 1, 0, 4],
            ["clarity", "number", 0.75, 0, 1],
            ["shine", "number", 1.2, 0.2, 3],
        ],
    },
    "metaball-hull": {
        name: "Hull",
        kind: "group",
        form: "field",
        speed: "breathe",
        cost: "medium",
        params: [
            ["look", "enum", "goo", undefined, undefined, true],
            ["blobRadius", "number", 7, 2, 25],
            ["threshold", "number", 0.5, 0.05, 1.5],
            ["breathe", "number", 0, 0, 1],
            ["fillOpacity", "number", 0.55, 0, 1],
            ["outline", "number", 2.5, 0, 8],
        ],
    },
};

const ORDER: readonly string[] = ["light", "medium", "heavy"];

const cases = SCENE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const);

describe("the scene presets", () => {
    it("are exactly the three of the design", () => {
        assert.sameMembers(
            SCENE_PRESETS.map((preset) => preset.descriptor.id),
            Object.keys(TABLE),
        );
    });

    it.each(cases)("%s: its descriptor matches section 7.5", (id, { descriptor }: { descriptor: ShaderDescriptor }) => {
        const row = TABLE[id];
        assert.strictEqual(descriptor.plainName, row.name);
        assert.strictEqual(drawingOf(descriptor), row.kind);
        assert.strictEqual(descriptor.form, row.form);
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

    it("give the enums the design's choices", () => {
        const values = (id: string, name: string): unknown[] =>
            (
                SCENE_PRESETS.find((preset) => preset.descriptor.id === id)?.descriptor.params.find(
                    (param) => param.name === name,
                )?.values ?? []
            ).map((entry) => entry.value);
        assert.deepEqual(values("nebula", "tintBy"), ["none", "groups"]);
        assert.deepEqual(values("metaball-hull", "look"), ["goo", "membrane", "outline"]);
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

    it("size the hull's kernel by its blob radius, clamped to its range", () => {
        const hull = SCENE_PRESETS.find((preset) => preset.descriptor.id === "metaball-hull")?.descriptor;
        assert.isDefined(hull);
        assert.strictEqual(kernelReach(hull, undefined), 7, "the default");
        assert.strictEqual(kernelReach(hull, { blobRadius: 12 }), 12);
        assert.strictEqual(kernelReach(hull, { blobRadius: 100 }), 25);
        assert.strictEqual(kernelReach(hull, { blobRadius: 0 }), 2);
        assert.strictEqual(kernelReach({ params: [], reach: 4 }, undefined), 4, "reach, without reachParam");
    });

    it("let a pasted boundary name its kernel's parameter, and refuse one it does not declare", () => {
        const body = "vec4 shade(GroupInput g) { return vec4(g.field); }";
        const header = (extra: Record<string, unknown>): string =>
            `/* graphty-shader 1\n${JSON.stringify({
                id: "user/blob",
                params: [{ name: "spread", type: "number", default: 4, min: 1, max: 10 }],
                ...extra,
            })}\n*/\n${body}`;
        const parsed = parseShaderText(header({ reachParam: "spread" }));
        assert.isTrue(parsed.ok, JSON.stringify(parsed));
        if (parsed.ok) {
            assert.strictEqual(parsed.registration.descriptor.reachParam, "spread");
            const again = parseShaderText(formatShaderText(parsed.registration));
            assert.deepEqual(again, parsed, "it round-trips through the text");
        }

        const missing = parseShaderText(header({ reachParam: "width" }));
        assert.deepEqual(missing.ok ? [] : missing.problems, [
            { code: "shader.header-key", params: { key: "reachParam" } },
        ]);
    });
});
