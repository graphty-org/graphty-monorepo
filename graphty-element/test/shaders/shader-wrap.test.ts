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

import { GLSL_RESERVED } from "../../src/catalog/shaderGlsl";
import type { ShaderParamDescriptor } from "../../src/catalog/shaders";
import { parseShaderText } from "../../src/catalog/shaderText";
import { GLSL_STRUCTS } from "../../src/shaders/runtime/glsl";
import {
    clockAssignments,
    compileProblem,
    EDGE_CLOCK_FIELDS,
    fragmentPrelude,
    prefixBody,
    renameIdentifiers,
    sampleProgram,
    uniformValueOf,
    unprefix,
    VULKAN_GLSL_NAMES,
    WGSL_NAMES,
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

    it("prefixes every use of a name WGSL will not take, local, parameter and field alike", () => {
        const body =
            "struct S { float fn; };\n" +
            "float g(float target) { return target; }\n" +
            "vec4 shade(NodeInput n) { S s; s.fn = 1.0; float pass = g(s.fn); float select = 0.5;\n" +
            "    for (int i = 0; i < 2; i++) { pass += select * length(n.uv); }\n" +
            "    return vec4(n.color.rgb, pass); }\n";
        const out = prefixBody(body, []);
        assert.include(out, "struct graphty_u_S { float graphty_u_fn; };");
        assert.include(out, "float graphty_u_g(float graphty_u_target) { return graphty_u_target; }");
        assert.include(out, "s.graphty_u_fn = 1.0; float graphty_u_pass = graphty_u_g(s.graphty_u_fn);");
        assert.include(out, "float graphty_u_select = 0.5;");
        // The GLSL keywords and built-ins WGSL also names keep theirs.
        assert.include(out, "for (int i = 0; i < 2; i++) { graphty_u_pass += graphty_u_select * length(n.uv); }");
        assert.include(out, "return vec4(n.color.rgb, graphty_u_pass); }");
        for (const name of ["pass", "target", "fn", "select"]) {
            assert.notMatch(out, new RegExp(`(?<!graphty_u_)\\b${name}\\b`), name);
        }
    });

    it("renames a local named after a built-in both languages have, and leaves its calls", () => {
        const body =
            "struct S { float abs; };\n" +
            "float g(float max) { return max; }\n" +
            "vec4 shade(NodeInput n) { S s; float mod = mod(n.size, 2.0); s.abs = abs(mod);\n" +
            "    { float abs = 1.0; mod *= abs; } return vec4(max(mod, g(s.abs))); }\n";
        const out = prefixBody(body, []);
        assert.include(out, "struct graphty_u_S { float abs; };");
        assert.include(out, "float graphty_u_g(float graphty_u_max) { return graphty_u_max; }");
        assert.include(out, "float graphty_u_mod = mod(n.size, 2.0); s.abs = abs(graphty_u_mod);");
        assert.include(out, "{ float graphty_u_abs = 1.0; graphty_u_mod *= graphty_u_abs; }");
        assert.include(out, "return vec4(max(graphty_u_mod, graphty_u_g(s.abs)));");
    });

    it("keeps a name a body declares as a function or struct renamed at its calls too", () => {
        assert.include(
            prefixBody("vec4 shade(NodeInput n) { struct max { float a; }; max m = max(1.0); return vec4(m.a); }", []),
            "struct graphty_u_max { float a; }; graphty_u_max m = graphty_u_max(1.0);",
        );
    });

    it("sends a body's modf to the library, the built-in having no WGSL translation", () => {
        assert.include(prefixBody("float f(float x, out float w) { return modf(x, w); }", []), "graphty_modf(");
        assert.include(wrappedLibrary(), "vec4 graphty_modf(vec4 x, out vec4 whole)");
    });

    it("sends isnan, isinf and the inverse hyperbolics to helpers WebGPU alone compiles", () => {
        assert.include(prefixBody("float f(vec2 x) { return isnan(x).x ? acosh(x.y) : 0.0; }", []), "graphty_isnan(x)");
        const library = wrappedLibrary();
        for (const name of ["isnan", "isinf", "acosh", "asinh", "atanh"]) {
            assert.include(library, `#define graphty_${name} ${name}\n`.trimEnd());
            assert.include(library, ` graphty_${name}(vec4 x)`);
        }

        assert.isBelow(library.indexOf("#ifdef WEBGPU"), library.indexOf("graphty_acosh(float x)"));
        assert.isBelow(library.indexOf("graphty_acosh(float x)"), library.indexOf("#ifndef WEBGPU"));
    });

    it("leaves isnan and isinf the built-in wherever GLSL takes only a constant expression", () => {
        const out = prefixBody(
            "struct S { float a; float b[isnan(1.5) ? 2 : 3]; }; const bool K = isnan(S(1.0).a) || isinf(1.5);\n" +
                "float g[isinf(1.5) ? 2 : 3];\n" +
                "float f(const float x) { const bool L = isnan(S(1.0).a), M = isinf(1.5); float s[isnan(1.5) ? 2 : 3]; " +
                "float u[2], v[isinf(1.5) ? 2 : 3]; float[isnan(1.5) ? 1 : 2] w; " +
                "switch (1) { case isnan(1.5) ? 1 : 2: break; } return 0.0; }",
            [],
        );
        assert.notInclude(out, "graphty_isnan");
        assert.notInclude(out, "graphty_isinf");
    });

    it("sends every other isnan and isinf in a function to the helper", () => {
        const out = prefixBody(
            "float f(float x, float a[2]) { bool b = isnan(x) || isinf(1.5); a[isnan(x) ? 0 : 1] = 1.0; " +
                "switch (int(x)) { case 1: b = isinf(x) ? b : !b; break; } " +
                "return isnan(a[0]) ? a[isinf(x) ? 0 : 1] : 1.0; }",
            [],
        );
        assert.notMatch(out, /[^_](?:isnan|isinf)\(/);
    });

    it("renames a Vulkan GLSL keyword as a local and a field and leaves its calls alone", () => {
        assert.strictEqual(
            prefixBody("float image2D = s.atomic_uint + texture1D(1.0);", []),
            "float graphty_u_image2D = s.graphty_u_atomic_uint + texture1D(1.0);",
        );
        assert.include(
            prefixBody(
                "vec4 shade(NodeInput n) { struct sample { float a; }; sample m = sample(1.0); return vec4(m.a); }",
                [],
            ),
            "struct graphty_u_sample { float a; }; graphty_u_sample m = graphty_u_sample(1.0);",
        );
    });

    it("asks WebGPU to let a derivative run in a branch, as GLSL does", () => {
        assert.include(fragmentPrelude(), "#define DISABLE_UNIFORMITY_ANALYSIS\n");
    });

    it("gives no input field a name it would rename, since a body's use of it would then miss", () => {
        const fields = [...GLSL_STRUCTS.matchAll(/^\s+\w+ (\w+);$/gm)].map((match) => match[1]);
        assert.isAbove(fields.length, 30);
        assert.deepEqual(
            fields.filter((name) => VULKAN_GLSL_NAMES.has(name) || (WGSL_NAMES.has(name) && !GLSL_RESERVED.has(name))),
            [],
        );
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
