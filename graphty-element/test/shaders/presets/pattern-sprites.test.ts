/**
 * @file The pattern, state and sprite presets as catalog data (design/rendering/shader-styles.md
 * sections 7.1, 7.2 and 8, package P3): each descriptor lists the parameters, ranges, defaults,
 * inputs, motion and cost class of the design's tables, its catalog facts pass the checker a
 * registered shader meets, its body passes the static checks with a cost class no heavier than it
 * declares, and a pattern or icon bound with the `"index"` scale keeps each node's pattern when new
 * groups arrive.
 */

import { afterAll, assert, describe, it } from "vitest";

import { checkShaderBody } from "../../../src/catalog/shaderGlsl";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import {
    drawingOf,
    type ShaderClockBinding,
    type ShaderDescriptor,
    type ShaderMotion,
} from "../../../src/catalog/shaders";
import { readShaderDescriptor } from "../../../src/catalog/shaderText";
import { createGraphSession } from "../../../src/session";
import { PATTERN_SPRITE_PRESETS, patternPresetId } from "../../../stories/shaders/patternSpritePresets";

afterAll(clearRegisteredShadersForTesting);

/** One row of the design's parameter table: name, type, default, range, and the V and P marks. */
type Row = readonly [
    name: string,
    type: string,
    def: number | string | boolean | ShaderClockBinding,
    min?: number,
    max?: number,
    varies?: boolean,
    primary?: boolean,
];

/** Sections 7.1 and 7.2, transcribed. */
const TABLE: Readonly<
    Record<
        string,
        { name: string; kind: string; reads: string[]; motion: ShaderMotion; cost: string; params: readonly Row[] }
    >
> = {
    "colorblind-patterns": {
        name: "Patterns",
        kind: "node-paint",
        reads: ["color", "light"],
        motion: {},
        cost: "light",
        params: [
            ["pattern", "integer", 0, 0, 7, true],
            ["density", "number", 5, 2, 8, undefined, true],
            ["contrast", "number", 0.7, 0, 1],
            ["rotate", "number", 0, 0, 3.14],
        ],
    },
    "foil-shimmer": {
        name: "Foil shimmer",
        kind: "node-paint",
        reads: ["color", "light"],
        motion: { loop: { speedParam: "sweepSpeed" } },
        cost: "light",
        params: [
            ["foil", "number", 0.9, 0, 1, undefined, true],
            ["sweepSpeed", "number", 0.35, 0, 2],
            ["bandWidth", "number", 0.18, 0.02, 1],
            ["sparkle", "number", 1.2, 0, 3],
        ],
    },
    hologram: {
        name: "Hologram",
        kind: "node-paint",
        reads: ["color", "times"],
        motion: { loop: { speedParam: "flicker" } },
        cost: "light",
        params: [
            ["holoColor", "color", "#38e8ff", undefined, undefined, undefined, true],
            ["scanDensity", "number", 9, 1, 30],
            ["flicker", "number", 0.6, 0, 1],
            ["glitch", "number", 0.04, 0, 0.3],
            ["gridLines", "integer", 8, 2, 16],
            ["printTime", "number", { by: "since.matched", domain: [0, 0.9], range: [0, 0.9] }],
            ["fadeTime", "number", { by: "since.unmatched", domain: [0, 0.6], range: [0, 0.6] }],
        ],
    },
    frost: {
        name: "Frost",
        kind: "node-paint",
        reads: ["color", "times", "light"],
        motion: {},
        cost: "medium",
        params: [
            ["frostColor", "color", "#d8f2ff", undefined, undefined, undefined, true],
            ["crystalScale", "number", 5, 3, 24],
            ["sparkle", "number", 0.8, 0, 1],
            ["growTime", "number", { by: "since.matched", domain: [0, 2], range: [0, 2] }],
            ["thawTime", "number", { by: "since.unmatched", domain: [0, 1], range: [0, 1] }],
        ],
    },
    "icon-sticker": {
        name: "Sticker",
        kind: "node-replace",
        reads: ["color", "light"],
        motion: {},
        cost: "light",
        params: [
            ["icon", "integer", 0, 0, 5, true],
            ["outline", "boolean", false],
            ["finish", "enum", "holographic", undefined, undefined, undefined, true],
            ["foil", "number", 0.85, 0, 1],
            ["borderColor", "color", "#fbfaf6"],
        ],
    },
    mandala: {
        name: "Mandala",
        kind: "node-replace",
        reads: ["size"],
        motion: { loop: { speedParam: "spin" } },
        cost: "medium",
        params: [
            ["folds", "integer", 0, 0, 12, true],
            ["hueShift", "number", 0, 0, 1, true],
            ["detail", "number", 5, 1, 12, undefined, true],
            ["spin", "number", 0.25, -2, 2],
            ["flow", "number", 0.3, 0, 2],
            ["rim", "number", 1, 0, 1],
        ],
    },
};

const ORDER: readonly string[] = ["light", "medium", "heavy"];

describe("the pattern, state and sprite presets", () => {
    it("are exactly the six of the design, each in its own folder", () => {
        assert.sameMembers(
            PATTERN_SPRITE_PRESETS.map((preset) => preset.descriptor.id),
            Object.keys(TABLE),
        );
    });

    it.each(PATTERN_SPRITE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const))(
        "%s: its descriptor matches the design's table",
        (id, { descriptor }: { descriptor: ShaderDescriptor }) => {
            const row = TABLE[id];
            assert.strictEqual(descriptor.plainName, row.name);
            assert.strictEqual(drawingOf(descriptor), row.kind);
            assert.strictEqual(descriptor.origin, "element");
            assert.strictEqual(descriptor.cost, row.cost);
            assert.deepEqual([...descriptor.reads], row.reads);
            assert.deepEqual(JSON.parse(JSON.stringify(descriptor.motion)), row.motion);
            assert.notStrictEqual(descriptor.webgpu, "native", "a preset has no WGSL body");
            assert.isTrue(Object.isFrozen(descriptor) && Object.isFrozen(descriptor.params));
            assert.deepEqual(
                descriptor.params.map((param) => [
                    param.name,
                    param.type,
                    param.default,
                    param.min,
                    param.max,
                    param.varies,
                    param.primary,
                ]),
                row.params.map(([name, type, def, min, max, varies, primary]) => [
                    name,
                    type,
                    def,
                    min,
                    max,
                    varies,
                    primary,
                ]),
            );
            for (const param of descriptor.params) {
                assert.isString(param.plainName);
            }
        },
    );

    it("draws the sticker's finish from the light, with no time and no sparkles", () => {
        const body = PATTERN_SPRITE_PRESETS.find((preset) => preset.descriptor.id === "icon-sticker")?.body ?? "";
        assert.include(body, "lightDir", "the finish follows the scene's light");
        assert.notMatch(body, /\bn\.time\b/, "nothing in the sticker moves with time");
        assert.notInclude(body, "hash12", "no sparkle cells");
    });

    it("offers the sticker's three foils, holographic first chosen", () => {
        const finish = PATTERN_SPRITE_PRESETS.find(
            (preset) => preset.descriptor.id === "icon-sticker",
        )?.descriptor.params.find((param) => param.name === "finish");
        assert.deepEqual(
            finish?.values?.map((choice) => choice.value),
            ["none", "shiny", "holographic"],
        );
        // The kind is what a reader calls the foil; the number beside it is its strength.
        assert.strictEqual(finish?.plainName, "Foil");
        assert.strictEqual(finish?.default, "holographic");
    });

    it.each([
        ["colorblind-patterns", "pattern"],
        ["icon-sticker", "icon"],
    ])("%s names every value of %s with a picture, keeping the number", (id, name) => {
        const param = PATTERN_SPRITE_PRESETS.find((preset) => preset.descriptor.id === id)?.descriptor.params.find(
            (each) => each.name === name,
        );
        assert.isDefined(param);
        assert.strictEqual(param.type, "integer");
        const values = Array.from({ length: (param.max as number) - (param.min as number) + 1 }, (_, i) => i);
        assert.deepEqual(
            param.choices?.map((choice) => choice.value),
            values,
        );
        for (const choice of param.choices ?? []) {
            assert.match(choice.glyph.path, /^M[\d.]/, choice.plainName);
            assert.isAbove(choice.plainName.length, 0);
        }

        assert.strictEqual(new Set(param.choices?.map((choice) => choice.plainName)).size, values.length);
    });

    it.each(PATTERN_SPRITE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const))(
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
            assert.isTrue(
                Array.from({ length: body.length }, (_, at) => body.charCodeAt(at)).every(
                    (code) => code === 9 || code === 10 || (code >= 32 && code <= 126),
                ),
                "the body is plain ASCII",
            );
        },
    );

    it("the mandala, which reads no color, covers the fill beneath it; the sticker does not", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const fill = await session.styles.add({
            name: "Fill",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#3366cc", "node.shape": "box" },
        });
        const mandalas = await session.styles.add({
            name: "Mandalas",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: patternPresetId("mandala") }] },
        });
        const covers = (): Readonly<Record<string, unknown>> => session.styles.counts(fill.id).covers;
        const byMandalas = { layers: [{ layerId: mandalas.id, count: 2 }], more: 0 };
        assert.deepEqual(covers()["node.color"], byMandalas);
        assert.deepEqual(covers()["node.shape"], byMandalas);

        await session.styles.remove(mandalas.id);
        const stickers = await session.styles.add({
            name: "Stickers",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: patternPresetId("icon-sticker") }] },
        });
        assert.deepEqual(covers()["node.shape"], { layers: [{ layerId: stickers.id, count: 2 }], more: 0 });
        assert.isUndefined(covers()["node.color"], "the sticker rides on the fill color");
        session.dispose();
    });
});

describe('a pattern or an icon bound with the "index" scale', () => {
    it.each([
        ["colorblind-patterns", "pattern"],
        ["icon-sticker", "icon"],
    ])("%s keeps each node's %s when new groups arrive", async (preset, param) => {
        const id = patternPresetId(preset);
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", team: "red" },
            { id: "b", team: "blue" },
            { id: "c", team: "red" },
        ]);
        const layer = await session.styles.add({
            name: "By team",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: id }] },
            encode: { [`node.shaders.${id}.${param}`]: { by: "data.team", scale: "index" } },
        });
        await session.styles.settled();
        const valueOf = (node: string): unknown =>
            session.styles.explain({ node }).merged["node.shaders"]?.find((use) => use.shader === id)?.params?.[param];
        assert.deepEqual(["a", "b", "c"].map(valueOf), [0, 1, 0]);

        // New groups, one of them sorting before every old one, arrive ahead of the old nodes.
        await session.data.addNodes([
            { id: "d", team: "amber" },
            { id: "e", team: "green" },
            { id: "f", team: "blue" },
        ]);
        await session.styles.update(layer.id, { name: "By team again" });
        await session.styles.settled();
        assert.deepEqual(["a", "b", "c", "d", "e", "f"].map(valueOf), [0, 1, 0, 2, 3, 1]);
        session.dispose();
    });
});
