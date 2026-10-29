/**
 * @file The wrapper the element writes around a shader body: every top-level name prefixed, a
 * field and a struct member left alone, lines kept so a driver's line maps back, parameters
 * clamped to their ranges, and the NaN guard on the exponent bits (design section 4.2).
 *
 * The browser tests compile what this writes; these read it as text.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import type { ShaderParamDescriptor } from "../../src/catalog/shaders";
import { parseShaderText } from "../../src/catalog/shaderText";
import {
    clockAssignments,
    compileProblem,
    EDGE_CLOCK_FIELDS,
    prefixBody,
    renameIdentifiers,
    sampleProgram,
    uniformValueOf,
    unprefix,
    wrappedLibrary,
    WRAPPER_LINE,
} from "../../src/shaders/runtime/wrap";

/** A body with a helper, a struct, a global and a parameter, and names Babylon declares. */
const BODY = `// world is a name Babylon declares
struct Ray { vec3 world; float speed; };
const float scale = 2.0, bias = 0.1;
float world(vec2 p) { return noise(p * scale) + bias; }
vec4 shade(NodeInput n) {
    Ray r;
    r.world = n.normal;
    r.speed = speed;
    return vec4(n.color.rgb * world(n.uv), n.color.a);
}
`;

const SPEED: ShaderParamDescriptor = {
    name: "speed",
    plainName: "Speed",
    type: "number",
    default: 1,
    min: 0,
    max: 4,
};

describe("the shader wrapper", () => {
    it("prefixes the body's own names and its references to the helpers", () => {
        const out = prefixBody(BODY, [SPEED]);
        assert.include(out, "struct graphty_u_Ray { vec3 world; float speed; };");
        assert.include(out, "const float graphty_u_scale = 2.0, graphty_u_bias = 0.1;");
        assert.include(
            out,
            "float graphty_u_world(vec2 p) { return graphty_noise(p * graphty_u_scale) + graphty_u_bias; }",
        );
        assert.include(out, "vec4 graphty_u_shade(graphty_NodeInput n) {");
        // A field after "." keeps its name; the parameter is a prefixed global.
        assert.include(out, "r.world = n.normal;");
        assert.include(out, "r.speed = graphty_u_speed;");
        // A comment is left as it was.
        assert.include(out, "// world is a name Babylon declares");
    });

    it("keeps every line where it was", () => {
        const out = prefixBody(BODY, [SPEED]);
        assert.strictEqual(out.split("\n").length, BODY.split("\n").length);
    });

    it("renames only identifiers it is given", () => {
        assert.strictEqual(renameIdentifiers("float a = b.a + a;", new Map([["a", "x"]])), "float x = b.a + x;");
    });

    it("prefixes every name of the library", () => {
        const library = wrappedLibrary();
        for (const name of ["noise", "fbm", "voronoi", "iconSdf", "fillAA", "Q", "NodeInput", "lightDir", "sdHeart"]) {
            assert.notMatch(library, new RegExp(`(?<![\\w.])${name}\\s*\\(`), name);
        }

        assert.include(library, "struct graphty_NodeInput {");
        assert.include(library, "float graphty_fbm(vec2 p)");
    });

    it("writes a program that numbers the body from line 1 and guards NaN on the exponent bits", () => {
        const program = sampleProgram({ target: "node", place: "paint", params: [SPEED] }, BODY);
        const lines = program.fragment.split("\n");
        const start = lines.indexOf("#line 1");
        assert.isAbove(start, 0);
        assert.strictEqual(lines[start + 1], "// world is a name Babylon declares");
        assert.include(program.fragment, `#line ${String(WRAPPER_LINE)}`);
        assert.include(program.fragment, "floatBitsToUint(c) & uvec4(0x7f800000u)");
        assert.include(program.fragment, "graphty_u_speed = clamp(graphty_p_speed, 0.0, 4.0);");
        assert.include(program.fragment, "uniform float graphty_p_speed;");
        assert.includeMembers([...program.uniforms], ["graphty_p_speed", "graphty_sampleColor"]);
        assert.deepEqual([...program.uniformBuffers], ["graphtyScene"]);
        assert.notInclude(program.fragment, "#version");
    });

    it("maps a driver's line back to the line of the text, and its names back to the reader's", () => {
        const problem = compileProblem("ERROR: 0:3: 'graphty_u_foo' : undeclared identifier\n", 9);
        assert.deepEqual(problem, {
            code: "shader.compile",
            params: { line: 11, column: 1, message: "'foo' : undeclared identifier", reason: "undeclared-name" },
        });
        const wrapper = compileProblem(`ERROR: 0:${String(WRAPPER_LINE + 2)}: 'x' : syntax error`, 9);
        assert.strictEqual(wrapper.params.line, 0);
        assert.strictEqual(unprefix("graphty_noise(graphty_u_p)"), "noise(p)");
    });

    it("turns parameter values into uniform values", () => {
        assert.deepEqual(uniformValueOf({ ...SPEED, type: "color", default: "#ff8000" }, undefined), [1, 128 / 255, 0]);
        assert.deepEqual(uniformValueOf(SPEED, 3), [3]);
        assert.deepEqual(
            uniformValueOf(
                {
                    ...SPEED,
                    type: "enum",
                    default: "b",
                    values: [
                        { value: "a", label: "a" },
                        { value: "b", label: "b" },
                    ],
                },
                undefined,
            ),
            [1],
        );
        assert.deepEqual(uniformValueOf({ ...SPEED, type: "boolean", default: false }, true), [1]);
    });

    it("wraps every lab body the presets come from", () => {
        const folder = join(import.meta.dirname, "fixtures", "lab");
        for (const file of readdirSync(folder)) {
            const parsed = parseShaderText(readFileSync(join(folder, file), "utf8"));
            assert.isTrue(parsed.ok, file);
            if (parsed.ok) {
                const program = sampleProgram(parsed.registration.descriptor, parsed.registration.glsl);
                assert.include(program.fragment, "graphty_u_shade(graphty_in)", file);
            }
        }
    });
});

describe("a parameter bound to a clock", () => {
    const fade: ShaderParamDescriptor = {
        name: "fade",
        plainName: "Fade",
        type: "number",
        default: { by: "since.matched", domain: [0, 0.3] },
    };
    const leave: ShaderParamDescriptor = {
        name: "leave",
        plainName: "Leave",
        type: "number",
        default: { by: "since.deselected", domain: [0, 0.5], range: [1, 0] },
    };

    it("holds the unset mark until a use gives a value of its own", () => {
        assert.isBelow(uniformValueOf(fade, undefined)[0], -1e29);
        assert.deepEqual(uniformValueOf(fade, 0.4), [0.4]);
    });

    it("reads its clock from the input, mapped from the domain onto the range and clamped", () => {
        const glsl = clockAssignments([fade], EDGE_CLOCK_FIELDS);
        assert.include(glsl, "if (graphty_p_fade < -1e29)");
        assert.include(glsl, "graphty_u_fade = mix(0.0, 1.0, clamp((graphty_in.sinceEntered - 0.0) / 0.3, 0.0, 1.0));");
    });

    it("reads a clock the input does not carry as at rest", () => {
        const glsl = clockAssignments([leave], EDGE_CLOCK_FIELDS);
        assert.include(glsl, "mix(1.0, 0.0, clamp((-1.0 - 0.0) / 0.5, 0.0, 1.0))");
        assert.strictEqual(clockAssignments([{ ...fade, default: 0.5 }], EDGE_CLOCK_FIELDS), "");
    });
});
