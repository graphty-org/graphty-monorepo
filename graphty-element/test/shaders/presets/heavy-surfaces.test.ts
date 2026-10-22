/**
 * @file The heavy and glowing surface presets as catalog data (design/rendering/shader-styles.md
 * sections 7.1 and 8, package P2): each descriptor lists the parameters, ranges, defaults, inputs,
 * motion, cost class and bloom of the design's table; the full body and the small-size body pass
 * the static checks; and the lazy body lists hand the renderer both.
 */

import { assert, describe, it } from "vitest";

import { checkShaderBody } from "../../../src/catalog/shaderGlsl";
import { drawingOf, type ShaderDescriptor } from "../../../src/catalog/shaders";
import { SHADER_PRESETS } from "../../../src/shaders/presets";
import { SHADER_PRESET_BODIES, SHADER_PRESET_LOW_DETAIL } from "../../../src/shaders/presets/bodies";
import { DISCO_BALL } from "../../../src/shaders/presets/disco-ball/descriptor";
import { GEMSTONE } from "../../../src/shaders/presets/gemstone/descriptor";
import { GLASS } from "../../../src/shaders/presets/glass/descriptor";
import { GLASS_MARBLE } from "../../../src/shaders/presets/glass-marble/descriptor";
import { LANTERN } from "../../../src/shaders/presets/lantern/descriptor";

/** One row of the design's parameter table: name, type, default, min, max, primary, varies. */
type Row = readonly [string, string, number | string, number?, number?, boolean?, boolean?];

/** Section 7.1, transcribed. */
const TABLE: readonly {
    descriptor: ShaderDescriptor;
    name: string;
    speed?: string;
    cost: string;
    bloom: boolean;
    params: Row[];
}[] = [
    {
        descriptor: GLASS_MARBLE,
        name: "Glass marble",
        speed: "spin",
        cost: "heavy",
        bloom: false,
        params: [
            ["twist", "number", 2.2, 0, 8, true],
            ["vanes", "integer", 4, 2, 10],
            ["ior", "number", 1.5, 1, 2.4],
            ["thickness", "number", 0.12, 0.02, 0.4],
            ["spin", "number", 0.25, 0, 2, false, true],
            ["reflection", "number", 1, 0, 2],
            ["glassTint", "color", "#cfe6ff"],
            ["secondColor", "color", "#f2efe6"],
        ],
    },
    {
        descriptor: GEMSTONE,
        name: "Gemstone",
        speed: "turn",
        cost: "heavy",
        bloom: false,
        params: [
            ["facets", "integer", 22, 6, 64, true],
            ["ior", "number", 2, 1.2, 2.6],
            ["dispersion", "number", 0.06, 0, 0.25],
            ["sparkle", "number", 1, 0, 3, false, true],
            ["turn", "number", 0.15, 0, 2],
        ],
    },
    {
        descriptor: DISCO_BALL,
        name: "Disco ball",
        speed: "turn",
        cost: "heavy",
        bloom: false,
        params: [
            ["facets", "integer", 22, 6, 64, true],
            ["sparkle", "number", 1, 0, 3, false, true],
            ["turn", "number", 0.15, 0, 2],
        ],
    },
    {
        descriptor: LANTERN,
        name: "Lantern",
        speed: "flicker",
        cost: "heavy",
        bloom: true,
        params: [
            ["intensity", "number", 1.1, 0, 4, true, true],
            ["falloff", "number", 2.2, 0, 8],
            ["ribs", "integer", 9, 0, 20],
            ["flicker", "number", 0.3, 0, 1],
            ["bloom", "number", 0.7, 0, 3],
        ],
    },
    {
        descriptor: GLASS,
        name: "Glass",
        cost: "medium",
        bloom: true,
        params: [
            ["sparkle", "number", 1.6, 0, 3, true],
            ["tint", "number", 0.75, 0, 1],
            ["bloom", "number", 0.9, 0, 2],
        ],
    },
];

describe("the heavy and glowing surface presets", () => {
    it.each(TABLE.map((row) => [row.descriptor.id, row] as const))("%s matches the design's table", (_id, row) => {
        const { descriptor } = row;
        assert.strictEqual(descriptor.plainName, row.name);
        assert.strictEqual(drawingOf(descriptor), "node-paint");
        assert.strictEqual(descriptor.origin, "element");
        // Every one is lit by the scene, so a gallery can say it reacts to the light.
        assert.deepEqual([...descriptor.reads], ["color", "light"]);
        assert.strictEqual(descriptor.cost, row.cost);
        assert.strictEqual(descriptor.bloom === true, row.bloom);
        assert.deepEqual(descriptor.motion, row.speed === undefined ? {} : { loop: { speedParam: row.speed } });
        assert.deepEqual(
            descriptor.params.map((param) => [
                param.name,
                param.type,
                param.default,
                param.min,
                param.max,
                param.primary === true,
                param.varies === true,
            ]),
            row.params.map(([name, type, def, min, max, primary, varies]) => [
                name,
                type,
                def,
                min,
                max,
                primary === true,
                varies === true,
            ]),
        );
    });

    it.each(TABLE.map((row) => [row.descriptor.id] as const))(
        "%s is listed, and its bodies pass the static checks",
        async (id) => {
            assert.include(
                SHADER_PRESETS.map((preset) => preset.id),
                id,
            );
            const body = await SHADER_PRESET_BODIES[id]();
            assert.deepEqual(checkShaderBody(body, "node-paint").problems, []);
            if (Object.hasOwn(SHADER_PRESET_LOW_DETAIL, id)) {
                const low = await SHADER_PRESET_LOW_DETAIL[id]();
                const cheap = checkShaderBody(low, "node-paint");
                assert.deepEqual(cheap.problems, []);
                assert.isBelow(
                    cheap.cost,
                    checkShaderBody(body, "node-paint").cost,
                    "the small-size program is cheaper",
                );
            }
        },
    );

    it("gives every heavy one a small-size program", () => {
        for (const { descriptor } of TABLE) {
            assert.strictEqual(
                Object.hasOwn(SHADER_PRESET_LOW_DETAIL, descriptor.id),
                descriptor.cost === "heavy",
                descriptor.id,
            );
        }
    });
});
