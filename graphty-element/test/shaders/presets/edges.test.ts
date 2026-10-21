/**
 * @file The edge presets as catalog data (design/rendering/shader-styles.md sections 7.4 and 8,
 * package P5): each descriptor lists the parameters, ranges, defaults, inputs, motion, cost class
 * and bloom of the design's table; each body passes the static checks for its kind, reads nothing
 * its descriptor does not declare, and the descriptors load no GLSL.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { checkShaderBody, costClassOf, inferShaderReads } from "../../../src/catalog/shaderGlsl";
import type { ShaderDescriptor, ShaderMotion } from "../../../src/catalog/shaders";
import { BODY as COMET_TRACERS_BODY } from "../../../src/shaders/presets/comet-tracers/body";
import { COMET_TRACERS } from "../../../src/shaders/presets/comet-tracers/descriptor";
import { BODY as EDGE_CHANGE_BODY } from "../../../src/shaders/presets/edge-change/body";
import { EDGE_CHANGE } from "../../../src/shaders/presets/edge-change/descriptor";
import { BODY as EDGE_GLOW_BODY } from "../../../src/shaders/presets/edge-glow/body";
import { EDGE_GLOW } from "../../../src/shaders/presets/edge-glow/descriptor";
import { BODY as FIBER_OPTIC_BODY } from "../../../src/shaders/presets/fiber-optic/body";
import { FIBER_OPTIC } from "../../../src/shaders/presets/fiber-optic/descriptor";
import { BODY as FIBER_PACKETS_BODY } from "../../../src/shaders/presets/fiber-packets/body";
import { FIBER_PACKETS } from "../../../src/shaders/presets/fiber-packets/descriptor";

/** One row of the design's parameter table: name, type, default, min, max, primary, varies. */
type Row = readonly [string, string, number | string | boolean, number?, number?, boolean?, boolean?];

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
        kind: "edge-surface",
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
        kind: "edge-effect",
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
        kind: "edge-effect",
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
        descriptor: EDGE_GLOW,
        body: EDGE_GLOW_BODY,
        name: "Edge glow",
        kind: "edge-effect",
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
        kind: "edge-effect",
        reads: ["color", "times"],
        // The design's change and exit, plus the entrance the element plays for an arriving edge.
        motion: { enter: 0.5, change: 0.5, exit: 0.5 },
        cost: "light",
        bloom: false,
        params: [["flashColor", "color", "#e8f4ff", undefined, undefined, true]],
    },
];

describe("the edge presets", () => {
    it.each(TABLE.map((row) => [row.descriptor.id, row] as const))("%s matches the design's table", (_id, row) => {
        const { descriptor } = row;
        assert.strictEqual(descriptor.plainName, row.name);
        assert.strictEqual(descriptor.kind, row.kind);
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
            const checked = checkShaderBody(row.body, row.descriptor.kind);
            assert.deepEqual(checked.problems, []);
            const classes = ["light", "medium", "heavy"];
            assert.isAtMost(classes.indexOf(costClassOf(checked.cost)), classes.indexOf(row.descriptor.cost));
            assert.includeMembers([...row.descriptor.reads], [...inferShaderReads(row.body)]);
        },
    );

    it.each(TABLE.map((row) => [row.descriptor.id, row] as const))("%s ships a thumbnail", (id, row) => {
        const url = row.descriptor.thumbnail ?? "";
        assert.match(url, /thumb\.webp$/);
        const bytes = readFileSync(new URL(`../../../src/shaders/presets/${id}/thumb.webp`, import.meta.url));
        assert.strictEqual(String.fromCharCode(...bytes.subarray(8, 12)), "WEBP");
    });

    it("keeps a removed edge for edge change's 0.5 s exit, within the element's 1 s cap", () => {
        assert.strictEqual(EDGE_CHANGE.motion.exit, 0.5);
    });
});
