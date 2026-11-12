/**
 * @file The node-effect presets as catalog data (design/rendering/shader-styles.md sections 7.3
 * and 8, package P4): each descriptor lists the parameters, ranges, defaults, motion and blend of
 * the design's table, its catalog facts pass the checker a registered shader meets, its body
 * passes the static checks with a cost class no heavier than it declares and reads exactly what it
 * says it reads, every timed motion ends by the time its frame claim does, and its thumbnail is a
 * real image.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterAll, assert, describe, it } from "vitest";

import { checkShaderBody, inferShaderReads } from "../../../src/catalog/shaderGlsl";
import { clearRegisteredShadersForTesting, shaderDescriptor } from "../../../src/catalog/shaderRegistry";
import { drawingOf, type ShaderClockBinding, timingOf } from "../../../src/catalog/shaders";
import { readShaderDescriptor } from "../../../src/catalog/shaderText";
import { NODE_EFFECT_PRESETS, presetId } from "../../../stories/shaders/nodeEffectPresets";

afterAll(clearRegisteredShadersForTesting);

/** One row of the design's parameter table: type, default, range, and the P / V marks. */
type Row = readonly [
    name: string,
    type: string,
    def: number | string | ShaderClockBinding,
    min?: number,
    max?: number,
    marks?: { primary?: boolean; varies?: boolean },
];

/** What section 7.3 says of each preset, transcribed. */
interface Expected {
    readonly name: string;
    readonly motion: Record<string, unknown>;
    readonly cost: string;
    readonly params: readonly Row[];
}

const P = { primary: true } as const;
const V = { varies: true } as const;
const PV = { primary: true, varies: true } as const;

const TABLE: Readonly<Record<string, Expected>> = {
    "uncertainty-aura": {
        name: "Aura",
        motion: { loop: { speedParam: "churn" } },
        cost: "medium",
        params: [
            ["intensity", "number", 1.3, 0, 2, PV],
            ["spread", "number", 1.4, 0.2, 2.5],
            ["turbulence", "number", 1.2, 0, 3],
            ["churn", "number", 0.8, 0, 3],
            ["auraColor", "color", "#9fb8ff"],
            ["tint", "number", 0.55, 0, 1],
        ],
    },
    "lock-on-reticle": {
        name: "Reticle",
        motion: { loop: { speedParam: "spin" } },
        cost: "light",
        params: [
            ["hudColor", "color", "#5cffb0", undefined, undefined, P],
            ["spin", "number", 0.6, -3, 3],
            ["ticks", "integer", 48, 8, 120],
            ["lineWidth", "number", 1.8, 0.5, 5],
            ["lockTime", "number", { by: "since.matched", domain: [0, 0.55], range: [0, 0.55] }],
            ["leaveTime", "number", { by: "since.unmatched", domain: [0, 0.3], range: [0, 0.3] }],
        ],
    },
    "orbiting-satellites": {
        name: "Satellites",
        motion: { loop: { speedParam: "speed" } },
        cost: "medium",
        params: [
            ["moons", "integer", 3, 1, 12, V],
            ["speed", "number", 1.5, 0, 6],
            ["orbit", "number", 2.1, 1.3, 3.2],
            ["tilt", "number", 1.05, 0, 1.5],
            ["moonSize", "number", 0.2, 0.05, 0.5],
            ["moonColor", "color", "#cfe8ff", undefined, undefined, P],
            ["ringOpacity", "number", 0.35, 0, 1],
        ],
    },
    shockwave: {
        name: "Shockwave",
        motion: {},
        cost: "medium",
        params: [
            ["ringColor", "color", "#9fd8ff", undefined, undefined, P],
            ["ringGlow", "number", 0.9, 0, 1.5],
            ["chroma", "number", 1, 0, 4],
            ["ringAge", "number", { by: "since.matched", domain: [0, 0.7], range: [0, 0.7] }],
        ],
    },
    "change-flash": {
        name: "Change flash",
        motion: {},
        cost: "light",
        params: [
            ["flashColor", "color", "#e8f4ff", undefined, undefined, P],
            ["glint", "number", 1, 0, 3],
            ["flashTime", "number", { by: "since.changed", domain: [0, 1.5], range: [0, 1.5] }],
        ],
    },
};

const COST_ORDER = ["light", "medium", "heavy"];

describe.each(NODE_EFFECT_PRESETS.map((preset) => [preset.descriptor.id, preset] as const))(
    "the %s preset",
    (id, { descriptor, body }) => {
        const expected = TABLE[id];

        it("is one of the design's node effects, frozen, from the element", () => {
            assert.isDefined(expected, `${id} is in section 7.3`);
            assert.strictEqual(drawingOf(descriptor), "node-square");
            assert.strictEqual(descriptor.origin, "element");
            assert.strictEqual(descriptor.plainName, expected.name);
            assert.isTrue(Object.isFrozen(descriptor));
            assert.deepEqual(descriptor.motion, expected.motion);
            assert.strictEqual(descriptor.cost, expected.cost);
        });

        it("lists every parameter with the design's type, default, range and marks", () => {
            assert.deepEqual(
                descriptor.params.map((param) => param.name),
                expected.params.map(([name]) => name),
            );
            for (const [name, type, def, min, max, marks] of expected.params) {
                const param = descriptor.params.find((each) => each.name === name);
                assert.isDefined(param);
                assert.strictEqual(param.type, type, `${name} type`);
                assert.deepEqual(param.default, def, `${name} default`);
                assert.strictEqual(param.min, min, `${name} min`);
                assert.strictEqual(param.max, max, `${name} max`);
                assert.strictEqual(param.primary === true, marks?.primary === true, `${name} primary`);
                assert.strictEqual(param.varies === true, marks?.varies === true, `${name} varies`);
                assert.isAbove(param.plainName.length, 0, `${name} has a plain name`);
            }
        });

        it("has catalog facts the shader checker accepts", () => {
            const {
                origin: _origin,
                cost: _cost,
                reads: _reads,
                webgpu: _webgpu,
                thumbnail: _thumb,
                ...facts
            } = descriptor;
            const read = readShaderDescriptor({ ...facts }, "plainName", false);
            assert.isFalse(Array.isArray(read), JSON.stringify(read));
        });

        it("has a body that passes the static checks, no heavier than it declares, reading what it says", () => {
            const checked = checkShaderBody(body, drawingOf(descriptor));
            assert.deepEqual(checked.problems, []);
            assert.isAtMost(
                COST_ORDER.indexOf(checked.costClass),
                COST_ORDER.indexOf(descriptor.cost),
                `the checker classes it ${checked.costClass}`,
            );
            assert.deepEqual([...descriptor.reads], [...inferShaderReads(body)]);
        });

        it("ends every timed motion by the seconds its motion claims", () => {
            // A timed motion holds frames only for its seconds; whatever it draws at that moment is
            // the picture that stays. So each body's timed part must name its own end.
            const { enter, change } = timingOf(descriptor);
            if (enter !== undefined && !descriptor.motion.loop) {
                assert.include(body, `age > ${String(enter)}`, "the entrance draws nothing after it ends");
            }

            if (change !== undefined) {
                assert.include(body, `s > ${String(change)}`, "the change draws nothing after it ends");
            }
        });

        it("draws at least a few pixels past the node and stays inside its square", () => {
            assert.isAtLeast(descriptor.reach ?? 1, 2);
            assert.isAtMost(descriptor.reach ?? 1, 6);
            assert.strictEqual(descriptor.blend, "over");
        });

        it("ships a webp thumbnail", () => {
            const url = descriptor.thumbnail ?? "";
            assert.isTrue(url.startsWith("file:"), url);
            const bytes = readFileSync(fileURLToPath(url));
            assert.strictEqual(bytes.subarray(8, 12).toString("ascii"), "WEBP");
        });

        it("registers under a namespace exactly as a consumer's shader would", () => {
            const drawnId = presetId(id);
            const registered = shaderDescriptor(drawnId);
            assert.isDefined(registered);
            // A declared minimum size adds its `minSize` parameter, as it does for any registrant.
            assert.deepEqual(
                registered.params.filter((param) => param.name !== "minSize"),
                descriptor.params.filter((param) => param.name !== "minSize"),
            );
            assert.strictEqual(
                registered.params.find((param) => param.name === "minSize")?.default,
                descriptor.minSize,
            );
            assert.deepEqual(registered.reads, descriptor.reads);
            assert.strictEqual(registered.reach, descriptor.reach);
        });
    },
);
