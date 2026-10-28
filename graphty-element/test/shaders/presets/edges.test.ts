/**
 * @file The edge presets as catalog data (design/rendering/shader-styles.md sections 7.4 and 8,
 * package P5): each descriptor lists the parameters, ranges, defaults, inputs, motion, cost class
 * and bloom of the design's table; each body passes the static checks for its kind, reads nothing
 * its descriptor does not declare, and the descriptors load no GLSL.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { checkShaderBody, costClassOf, inferShaderReads } from "../../../src/catalog/shaderGlsl";
import {
    drawingOf,
    type ShaderClockBinding,
    type ShaderDescriptor,
    type ShaderMotion,
    timingOf,
} from "../../../src/catalog/shaders";
import { BODY as COMET_TRACERS_BODY } from "../../../src/shaders/presets/comet-tracers/body";
import { COMET_TRACERS } from "../../../src/shaders/presets/comet-tracers/descriptor";
import { BODY as EDGE_CHANGE_BODY } from "../../../src/shaders/presets/edge-change/body";
import { EDGE_CHANGE } from "../../../src/shaders/presets/edge-change/descriptor";
import { BODY as FIBER_OPTIC_BODY } from "../../../src/shaders/presets/fiber-optic/body";
import { FIBER_OPTIC } from "../../../src/shaders/presets/fiber-optic/descriptor";
import { BODY as FIBER_PACKETS_BODY } from "../../../src/shaders/presets/fiber-packets/body";
import { FIBER_PACKETS } from "../../../src/shaders/presets/fiber-packets/descriptor";
import { BODY as NEON_LINE_BODY } from "../../../src/shaders/presets/neon-line/body";
import { NEON_LINE } from "../../../src/shaders/presets/neon-line/descriptor";

/** One row of the design's parameter table: name, type, default, min, max, primary, varies. */
type Row = readonly [
    string,
    string,
    number | string | boolean | ShaderClockBinding,
    number?,
    number?,
    boolean?,
    boolean?,
];

/** Section 7.4, transcribed. */
const TABLE: readonly {
    descriptor: ShaderDescriptor;
    body: string;
    name: string;
    kind: string;
    reads: string[];
    motion: ShaderMotion;
    cost: string;
    bloom: boolean;
    params: Row[];
}[] = [
    {
        descriptor: FIBER_OPTIC,
        body: FIBER_OPTIC_BODY,
        name: "Fiber",
        kind: "edge-paint",
        reads: ["color", "width"],
        motion: {},
        cost: "medium",
        bloom: false,
        params: [
            ["glass", "number", 1, 0, 3, true],
            ["hueSpread", "number", 0.6, 0, 1],
        ],
    },
    {
        descriptor: FIBER_PACKETS,
        body: FIBER_PACKETS_BODY,
        name: "Light packets",
        kind: "edge-along",
        reads: ["color"],
        motion: { loop: { speedParam: "speed" } },
        cost: "medium",
        bloom: true,
        params: [
            ["packets", "integer", 3, 1, 6, true],
            ["speed", "number", 1.2, 0, 4, false, true],
            ["tail", "number", 14, 2, 150],
            ["glint", "number", 0.8, 0, 4],
            ["bloom", "number", 0.8, 0, 3],
        ],
    },
    {
        descriptor: COMET_TRACERS,
        body: COMET_TRACERS_BODY,
        name: "Comets",
        kind: "edge-along",
        reads: ["color"],
        motion: { loop: { speedParam: "speed" } },
        cost: "medium",
        bloom: true,
        params: [
            ["speed", "number", 1, -3, 3, false, true],
            ["spacing", "number", 180, 30, 800],
            ["tail", "number", 55, 4, 200],
            ["headColor", "color", "#fff6e0", undefined, undefined, true],
            ["tailColor", "color", "#ff7a2a"],
            ["useEdgeColor", "boolean", false],
            ["intensity", "number", 1.2, 0, 3],
            ["bloom", "number", 1, 0, 3],
        ],
    },
    {
        descriptor: NEON_LINE,
        body: NEON_LINE_BODY,
        name: "Neon line",
        kind: "edge-along",
        reads: ["color", "width"],
        motion: { loop: { speedParam: "glintSpeed" } },
        cost: "medium",
        bloom: true,
        params: [
            ["glow", "number", 0.4, 0, 2, true],
            ["glowWidth", "number", 3, 0.5, 10],
            ["glintSpeed", "number", 0.35, 0, 2],
            ["bloom", "number", 0.6, 0, 2],
        ],
    },
    {
        descriptor: EDGE_CHANGE,
        body: EDGE_CHANGE_BODY,
        name: "Edge change",
        kind: "edge-along",
        reads: ["color", "times"],
        // Its plays come from clock-bound parameters, not from motion.
        motion: {},
        cost: "light",
        bloom: false,
        params: [
            ["flashColor", "color", "#e8f4ff", undefined, undefined, true],
            ["arriveTime", "number", { by: "since.matched", domain: [0, 0.5], range: [0, 0.5] }],
            ["changeTime", "number", { by: "since.changed", domain: [0, 0.5], range: [0, 0.5] }],
            ["leaveTime", "number", { by: "since.unmatched", domain: [0, 0.5], range: [0, 0.5] }],
        ],
    },
];

describe("the edge presets", () => {
    it.each(TABLE.map((row) => [row.descriptor.id, row] as const))("%s matches the design's table", (_id, row) => {
        const { descriptor } = row;
        assert.strictEqual(descriptor.plainName, row.name);
        assert.strictEqual(drawingOf(descriptor), row.kind);
        assert.strictEqual(descriptor.origin, "element");
        assert.strictEqual(descriptor.webgpu, "translate");
        assert.includeMembers([...descriptor.reads], row.reads);
        assert.strictEqual(descriptor.cost, row.cost);
        assert.strictEqual(descriptor.bloom === true, row.bloom);
        assert.deepEqual(descriptor.motion, row.motion);
        assert.isTrue(Object.isFrozen(descriptor));
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

    it.each(TABLE.map((row) => [row.descriptor.id, row] as const))(
        "%s passes the static checks, no costlier than its class, reading only what it declares",
        (_id, row) => {
            const checked = checkShaderBody(row.body, drawingOf(row.descriptor));
            assert.deepEqual(checked.problems, []);
            const classes = ["light", "medium", "heavy"];
            assert.isAtMost(classes.indexOf(costClassOf(checked.cost)), classes.indexOf(row.descriptor.cost));
            assert.includeMembers([...row.descriptor.reads], [...inferShaderReads(row.body)]);
        },
    );

    it.each(TABLE.map((row) => [row.descriptor.id, row] as const))("%s ships a thumbnail", (id, row) => {
        const url = row.descriptor.thumbnail ?? "";
        assert.match(new URL(url).pathname, /thumb\.webp$/);
        const bytes = readFileSync(new URL(`../../../src/shaders/presets/${id}/thumb.webp`, import.meta.url));
        assert.strictEqual(String.fromCharCode(...bytes.subarray(8, 12)), "WEBP");
    });

    it("takes how long a removed edge keeps drawing from a parameter bound to since.unmatched", () => {
        const fading = {
            params: [
                {
                    name: "fade",
                    plainName: "Fade",
                    type: "number" as const,
                    default: { by: "since.unmatched", domain: [0, 0.5] },
                },
            ],
        };
        assert.strictEqual(timingOf(fading).exit, 0.5);
        assert.strictEqual(timingOf(EDGE_CHANGE).exit, 0.5, "edge change times its exit by its leaveTime binding");
    });
});
