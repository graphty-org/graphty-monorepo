/**
 * @file The programs that draw node shaders on a graph, read as text (design section 5): which
 * parameter comes from which input, and what the mesh path leaves out of the material's program.
 * The browser tests (test/browser/shaders/node-drawing.test.ts) compile and draw them.
 */

import { assert, describe, it } from "vitest";

import type { ShaderParamDescriptor } from "../../src/catalog/shaders";
import { uniformValueOf, varyingSlots } from "../../src/shaders/runtime/nodeLayout";
import { batchProgram, meshInjection } from "../../src/shaders/runtime/nodePrograms";

const PARAMS: readonly ShaderParamDescriptor[] = [
    { name: "tint", plainName: "tint", type: "color", default: "#ff8000", varies: true },
    { name: "twist", plainName: "twist", type: "number", default: 2, min: 0, max: 8 },
    { name: "spin", plainName: "spin", type: "number", default: 0.25, min: 0, max: 2, varies: true },
    { name: "a", plainName: "a", type: "number", default: 0, min: 0, max: 1, varies: true },
    { name: "b", plainName: "b", type: "number", default: 0, min: 0, max: 1, varies: true },
    { name: "c", plainName: "c", type: "number", default: 0, min: 0, max: 1, varies: true },
];

const BODY = "vec4 shade(NodeInput n) { return vec4(tint * twist, n.color.a); }";

describe("varying slots", () => {
    it("are the varying parameters in order, colors left out, at most four", () => {
        assert.deepEqual(
            [...varyingSlots(PARAMS)],
            [
                ["spin", 0],
                ["a", 1],
                ["b", 2],
                ["c", 3],
            ],
        );
    });

    it("a parameter's value is what its uniform would hold", () => {
        assert.deepEqual(uniformValueOf(PARAMS[1], undefined), [2]);
        assert.deepEqual(uniformValueOf(PARAMS[0], undefined), [1, 128 / 255, 0]);
    });
});

describe("the batch program", () => {
    it("reads a varying parameter from the node's vec4 and a fixed one from its parameter-set row", () => {
        const { fragment } = batchProgram("impostor", { params: PARAMS }, BODY);
        assert.include(fragment, "float graphty_p_spin = vParams[0];");
        assert.include(
            fragment,
            "float graphty_p_twist = texelFetch(graphty_paramTex, ivec2(1, int(vMeta.y + 0.5)), 0).r;",
        );
        assert.include(
            fragment,
            "vec3 graphty_p_tint = texelFetch(graphty_paramTex, ivec2(0, int(vMeta.y + 0.5)), 0).rgb;",
        );
        assert.include(fragment, "graphty_u_shade(graphty_in)");
    });

    it("a stacking square reads its own entered and exited times, the square in place of the node the node's", () => {
        assert.include(batchProgram("around", { params: [] }, BODY).fragment, "vec2 graphty_times = vDeco0.xy;");
        assert.include(
            batchProgram("replace", { params: [] }, BODY).fragment,
            "vec2 graphty_times = vec2(graphty_s0.w, graphty_s1.x);",
        );
    });

    it("a billboard draws its halo, ring and glow; a stacking square does not", () => {
        assert.include(batchProgram("impostor", { params: [] }, BODY).fragment, "graphty_decoration(");
        assert.notInclude(batchProgram("over", { params: [] }, BODY).fragment, "graphty_decoration(");
    });

    it("masks over inside the node's outline and around outside it; behind sits at the node's back", () => {
        assert.include(batchProgram("over", { params: [] }, BODY).fragment, "if (graphty_r > vInner) { discard; }");
        assert.include(batchProgram("around", { params: [] }, BODY).fragment, "if (graphty_r < vInner) { discard; }");
        assert.notInclude(batchProgram("behind", { params: [] }, BODY).fragment, "discard; }\n    vec2 graphty_uv");
        assert.include(batchProgram("behind", { params: [] }, BODY).vertex, "center.z + graphty_real");
        assert.include(batchProgram("over", { params: [] }, BODY).vertex, "center.z - graphty_real");
    });

    it("premultiplies a stacking square's straight alpha before it blends", () => {
        assert.include(
            batchProgram("around", { params: [] }, BODY).fragment,
            "gl_FragColor = vec4(graphty_out.rgb * graphty_out.a, graphty_out.a);",
        );
    });
});

describe("the mesh path's injected code", () => {
    it("declares no precision and no scene block of its own", () => {
        const { fragmentDefinitions } = meshInjection({ params: PARAMS }, BODY);
        assert.notMatch(fragmentDefinitions, /^precision /m, "Babylon writes precision only when the text holds none");
        assert.notInclude(fragmentDefinitions, "uniform graphtyScene", "the members are in the material's block");
    });

    it("replaces the material's output, falling back to the color beneath", () => {
        const { fragmentBeforeFragColor } = meshInjection({ params: PARAMS }, BODY);
        assert.include(fragmentBeforeFragColor, "color = graphty_bad(graphty_out) ? graphty_in.color : graphty_out;");
        assert.include(fragmentBeforeFragColor, "float graphty_p_spin = graphty_vA[0];");
    });
});
