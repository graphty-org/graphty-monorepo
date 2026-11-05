/**
 * @file The shader text format and its static checker: every lab body a preset comes from passes
 * with its header, and every unsafe construct is refused with its code at its line and column
 * (design/rendering/shader-styles.md sections 4.3 and 8, package E1).
 *
 * The fixtures under `fixtures/lab/` are the shader lab's picked bodies ported mechanically into
 * the text format: the preset's parameters in the header, `main` turned into `shade`, the
 * preprocessor lines removed. They exist to prove the checker accepts real shaders; they are not
 * the presets, and some still call the lab's own helpers.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import type { ShaderProblem, ShaderRegistration } from "../../src/catalog/shaders";
import { formatShaderText, parseShaderText } from "../../src/catalog/shaderText";
import { isGraphtyError } from "../../src/errors";

const FIXTURES = fileURLToPath(new URL("fixtures/lab/", import.meta.url));

/**
 * A node effect's text, with a header and the body given.
 * @param body - The GLSL body.
 * @param header - Extra header keys.
 * @returns The text.
 */
function text(body: string, header: Record<string, unknown> = {}): string {
    const json = JSON.stringify({ id: "test/case", name: "Case", place: "around", params: [], ...header }, null, 4);

    return `/* graphty-shader 1\n${json}\n*/\n${body}`;
}

/** The line the body starts on in {@link text} with no extra header keys. */
const BODY_LINE = 9;

/**
 * Parse text that must fail, and return its first problem.
 * @param source - The text.
 * @returns The first problem.
 */
function firstProblem(source: string): ShaderProblem {
    const result = parseShaderText(source);
    assert.isFalse(result.ok, "the text was accepted");

    return result.ok ? (undefined as never) : result.problems[0];
}

/**
 * Assert a problem's code and place.
 * @param problem - The problem.
 * @param code - The code.
 * @param line - The line.
 * @param column - The column.
 */
function assertAt(problem: ShaderProblem, code: string, line: number, column: number): void {
    assert.strictEqual(problem.code, code, JSON.stringify(problem));
    assert.strictEqual(problem.params.line, line, `line of ${JSON.stringify(problem)}`);
    assert.strictEqual(problem.params.column, column, `column of ${JSON.stringify(problem)}`);
}

describe("the lab bodies the presets come from", () => {
    const files = readdirSync(FIXTURES).filter((file) => file.endsWith(".glsl"));

    it("are all here", () => {
        assert.isAtLeast(files.length, 29);
    });

    for (const file of files) {
        it(`passes the checker: ${file}`, () => {
            const result = parseShaderText(readFileSync(join(FIXTURES, file), "utf8"));
            assert.isTrue(result.ok, result.ok ? "" : JSON.stringify(result.problems));
        });
    }
});

describe("each unsafe construct is refused with its code, line and column", () => {
    it("refuses while", () => {
        const body =
            "vec4 shade(NodeInput n) {\n    float x = 0.0;\n    while (x < 1.0) { x += 0.1; }\n    return vec4(x);\n}";
        assertAt(firstProblem(text(body)), "shader.loop-unbounded", BODY_LINE + 2, 5);
    });

    it("refuses a loop of 129 steps, naming the count and the limit", () => {
        const body =
            "vec4 shade(NodeInput n) {\n    float x = 0.0;\n    for (int i = 0; i < 129; i++) { x += 0.01; }\n    return vec4(x);\n}";
        const problem = firstProblem(text(body));
        assertAt(problem, "shader.loop-too-long", BODY_LINE + 2, 5);
        assert.strictEqual(problem.params.iterations, 129);
        assert.strictEqual(problem.params.limit, 128);
    });

    it("counts a loop's trip exactly, so 128 steps by twos from -128 pass", () => {
        const body =
            "vec4 shade(NodeInput n) {\n    float x = 0.0;\n    for (int i = -128; i < 128; i += 2) { x += 0.01; }\n    return vec4(x);\n}";
        assert.isTrue(parseShaderText(text(body)).ok);
    });

    it("refuses a loop that writes its index", () => {
        const body =
            "vec4 shade(NodeInput n) {\n    float x = 0.0;\n    for (int i = 0; i < 8; i++) {\n        i = 0;\n    }\n    return vec4(x);\n}";
        assertAt(firstProblem(text(body)), "shader.loop-unbounded", BODY_LINE + 3, 9);
    });

    it("refuses a define written with spaces after the hash", () => {
        const body = "#  define X 1.0\nvec4 shade(NodeInput n) { return vec4(1.0); }";
        assertAt(firstProblem(text(body)), "shader.preprocessor", BODY_LINE, 1);
    });

    it("refuses a hash after a line continuation", () => {
        const body = "float a = 1.0; \\\n#define X 2.0\nvec4 shade(NodeInput n) { return vec4(a); }";
        assertAt(firstProblem(text(body)), "shader.preprocessor", BODY_LINE, 16);
    });

    it("ends the header at a comment end inside a header string, which is a header problem", () => {
        const source =
            '/* graphty-shader 1\n{ "id": "test/case", "name": "a */ b", "place": "around" }\n*/\nvec4 shade(NodeInput n) { return vec4(1.0); }';
        const problem = firstProblem(source);
        assert.strictEqual(problem.code, "shader.header-json");
        assert.strictEqual(problem.params.line, 2);
        assert.isAbove(Number(problem.params.column), 30);
    });

    it("refuses a lone carriage return, which ends a // comment for the driver", () => {
        // The checker would read the rest of the line as the comment; ANGLE reads a loop and a reserved name.
        const body =
            "vec4 shade(NodeInput n) {\n    // x\r while (true) {} float y = gl_FragCoord.x;\n    return vec4(1.0);\n}";
        assertAt(firstProblem(text(body)), "shader.not-ascii", BODY_LINE + 1, 9);
    });

    it("accepts CRLF line ends", () => {
        const body = "vec4 shade(NodeInput n) {\n    // x\n    return vec4(1.0);\n}";
        const result = parseShaderText(text(body).replaceAll("\n", "\r\n"));
        assert.isTrue(result.ok, result.ok ? "" : JSON.stringify(result.problems));
    });

    it("refuses a backslash in a // comment, which joins the next line in the driver", () => {
        // The checker sees one loop and a block comment; the driver, which joins each line after a
        // trailing backslash into the comment, sees three nested loops of 128 steps.
        const loop = "for (int i = 0; i < 128; i++) {";
        const first = `    ${loop} // \\`;
        const body = [
            "vec4 shade(NodeInput n) {",
            "    float x = 0.0;",
            first,
            "    } /*",
            `    ${loop} ${loop} x += 0.1; } } }`,
            "    // \\",
            "    */",
            "    return vec4(x);",
            "}",
        ].join("\n");
        assertAt(firstProblem(text(body)), "shader.preprocessor", BODY_LINE + 2, first.indexOf("\\") + 1);
    });

    it("refuses a byte outside ASCII", () => {
        const body = "vec4 shade(NodeInput n) {\n    return vec4(1.0); // caf\u00E9\n}";
        assertAt(firstProblem(text(body)), "shader.not-ascii", BODY_LINE + 1, 29);
    });

    it("refuses an array of 257 elements", () => {
        const body = "float table[257];\nvec4 shade(NodeInput n) { return vec4(1.0); }";
        const problem = firstProblem(text(body));
        assertAt(problem, "shader.too-deep", BODY_LINE, 12);
        assert.strictEqual(problem.params.limit, 256);
    });

    it("refuses two 128-step loops nested through a helper", () => {
        const body = [
            "float inner(float x) {",
            "    for (int j = 0; j < 128; j++) { x += 0.001; }",
            "    return x;",
            "}",
            "vec4 shade(NodeInput n) {",
            "    float x = 0.0;",
            "    for (int i = 0; i < 128; i++) { x = inner(x); }",
            "    return vec4(x);",
            "}",
        ].join("\n");
        const problem = firstProblem(text(body));
        assertAt(problem, "shader.too-costly", BODY_LINE + 4, 6);
        assert.strictEqual(problem.params.iterations, 128 * 128);
    });

    it("refuses a body of 17 KB at the byte past the limit", () => {
        const filler = "// padding padding padding padding padding padding padding padding\n".repeat(260);
        const body = `${filler}vec4 shade(NodeInput n) { return vec4(1.0); }`;
        assert.isAbove(body.length, 17_000);
        const problem = firstProblem(text(body));
        assert.strictEqual(problem.code, "shader.too-large");
        assert.strictEqual(problem.params.limit, 16_384);
        assert.isAbove(Number(problem.params.line), BODY_LINE + 200);
        assert.isAtLeast(Number(problem.params.column), 1);
    });

    it("refuses recursion, texture sampling, uniforms, main and reserved names", () => {
        const recursion = "float f(float x) { return f(x); }\nvec4 shade(NodeInput n) { return vec4(f(1.0)); }";
        assert.strictEqual(firstProblem(text(recursion)).code, "shader.loop-unbounded");
        const texture = "vec4 shade(NodeInput n) { return texture2D(map, n.uv); }";
        assertAt(firstProblem(text(texture)), "shader.texture-unsupported", BODY_LINE, 34);
        const uniform = "uniform float k;\nvec4 shade(NodeInput n) { return vec4(k); }";
        assertAt(firstProblem(text(uniform)), "shader.reserved", BODY_LINE, 1);
        const main = "void main() {}\nvec4 shade(NodeInput n) { return vec4(1.0); }";
        assertAt(firstProblem(text(main)), "shader.reserved", BODY_LINE, 6);
        const reserved = "vec4 shade(NodeInput n) { return vec4(gl_FragCoord.x); }";
        assertAt(firstProblem(text(reserved)), "shader.reserved", BODY_LINE, 39);
    });

    it("refuses a body without an entry function, or with the wrong signature", () => {
        assert.deepEqual(firstProblem(text("float f() { return 1.0; }")).params, {
            line: BODY_LINE,
            column: 1,
            target: "node",
            expected: "vec4 shade(NodeInput n)",
        });
        assert.strictEqual(
            firstProblem(text("vec4 shade(NodeThing n) { return vec4(1.0); }")).code,
            "shader.entry-signature",
        );
        assert.strictEqual(
            firstProblem(text("vec3 shade(NodeInput n) { return vec3(1.0); }")).code,
            "shader.entry-signature",
        );
    });
});

describe("the header", () => {
    const body = "vec4 shade(NodeInput n) { return vec4(tint, 1.0); }";

    it("refuses unknown keys, a bare id, an unknown place, the removed role and bad parameters", () => {
        assert.deepEqual(firstProblem(text(body, { colour: 1 })), {
            code: "shader.header-key",
            params: { key: "colour" },
        });
        assert.strictEqual(firstProblem(text(body, { id: "marble" })).code, "shader.id-invalid");
        assert.deepEqual(firstProblem(text(body, { place: "glow" })), {
            code: "shader.header-key",
            params: { key: "place" },
        });
        for (const removed of [{ role: "effect" }, { geometry: "card" }, { minPixels: 24 }]) {
            assert.deepEqual(firstProblem(text(body, removed)), {
                code: "shader.header-key",
                params: { key: Object.keys(removed)[0] },
            });
        }
        assert.deepEqual(firstProblem(text(body, { kind: "node-square" })), {
            code: "shader.header-key",
            params: { key: "kind" },
        });
        const protoParam = { params: [{ name: "__proto__", type: "number", default: 1 }] };
        assert.deepEqual(firstProblem(text(body, protoParam)).params, { param: "__proto__", field: "name" });
        const outside = { params: [{ name: "speed", type: "number", default: 5, min: 0, max: 4 }] };
        assert.deepEqual(firstProblem(text(body, outside)).params, { param: "speed", field: "default" });
        const helper = { params: [{ name: "noise", type: "number", default: 1 }] };
        assert.deepEqual(firstProblem(text(body, helper)), {
            code: "shader.reserved",
            params: { name: "noise", param: "noise" },
        });
        const many = {
            params: Array.from({ length: 17 }, (_, at) => ({ name: `p${String(at)}`, type: "number", default: 0 })),
        };
        assert.deepEqual(firstProblem(text(body, many)), {
            code: "shader.too-many-params",
            params: { count: 17, limit: 16 },
        });
    });

    it("keeps an integer parameter's named values and pictures, and refuses them on any other type", () => {
        const choices = [
            { value: 0, plainName: "Dots", glyph: { path: "M4 4h4v4h-4Z" } },
            { value: 1, plainName: "Rings", glyph: { path: "M3 12a9 9 0 1 0 18 0", outline: true } },
        ];
        const header = { params: [{ name: "pattern", type: "integer", default: 0, min: 0, max: 1, choices }] };
        const result = parseShaderText(text(body.replace("tint", "vec3(float(pattern))"), header));
        assert.isTrue(result.ok);
        assert.deepEqual(result.ok && result.registration.descriptor.params[0].choices, choices);
        const again = result.ok ? parseShaderText(formatShaderText(result.registration)) : result;
        assert.deepEqual(again.ok && again.registration.descriptor.params[0].choices, choices);

        const onNumber = { params: [{ name: "tint", type: "number", default: 0, choices }] };
        assert.deepEqual(firstProblem(text(body, onNumber)).params, { param: "tint", field: "choices" });
        const noPicture = { params: [{ ...header.params[0], choices: [{ value: 0, plainName: "Dots" }] }] };
        assert.deepEqual(firstProblem(text(body, noPicture)).params, { param: "pattern", field: "choices" });
    });

    it("strips control and bidirectional characters from names", () => {
        // JSON.stringify writes U+202E as the character itself; the header carries it escaped.
        const header = { name: "Ring\u202E\u0007", params: [{ name: "tint", type: "color", default: "#FFAA00" }] };
        const result = parseShaderText(text(body, header).replace("\u202E", "\\u202e"));
        assert.isTrue(result.ok);
        assert.strictEqual(result.ok && result.registration.descriptor.plainName, "Ring");
    });

    it("takes a body with no header: the entry says its target, the options its place", () => {
        const result = parseShaderText("vec4 shade(BackgroundInput b) { return vec4(b.uv, 0.0, 1.0); }");
        assert.isTrue(result.ok);
        assert.strictEqual(result.ok && result.registration.descriptor.target, "background");
        assert.isUndefined(result.ok ? result.registration.descriptor.place : "refused", "the background has none");
        const paint = parseShaderText("vec4 shade(NodeInput n) { return vec4(1.0); }");
        assert.strictEqual(paint.ok && paint.registration.descriptor.place, "paint");
        const over = parseShaderText("vec4 shade(NodeInput n) { return vec4(1.0); }", { place: "over" });
        assert.strictEqual(over.ok && over.registration.descriptor.place, "over");
    });
});

describe("formatShaderText", () => {
    it("is the inverse of parseShaderText on every fixture", () => {
        for (const file of readdirSync(FIXTURES).filter((name) => name.endsWith(".glsl"))) {
            const parsed = parseShaderText(readFileSync(join(FIXTURES, file), "utf8"));
            assert.isTrue(parsed.ok, file);
            if (!parsed.ok) {
                continue;
            }

            const written = formatShaderText(parsed.registration);
            const again = parseShaderText(written);
            assert.isTrue(again.ok, file);
            assert.deepEqual(again.ok && again.registration, parsed.registration, file);
            assert.strictEqual(formatShaderText(again.ok ? again.registration : parsed.registration), written, file);
        }
    });

    it("keeps motion, reach, blend and a parameter's own plain name", () => {
        const registration: ShaderRegistration = {
            descriptor: {
                id: "acme/ring",
                plainName: "Ring",
                target: "node",
                place: "around",
                reach: 2,
                blend: "add",
                motion: { loop: { speedParam: "speed" } },
                params: [
                    { name: "speed", plainName: "Pace", type: "number", default: 1, min: 0, max: 4, varies: true },
                ],
            },
            glsl: "vec4 shade(NodeInput n) { return vec4(speed); }\n",
        };
        const parsed = parseShaderText(formatShaderText(registration));
        assert.isTrue(parsed.ok);
        assert.deepEqual(parsed.ok && parsed.registration, registration);
    });

    it("refuses a registration with a WGSL body, which text cannot carry", () => {
        try {
            formatShaderText({
                descriptor: { id: "acme/x", plainName: "X", params: [] },
                glsl: "",
                wgsl: "fn main() {}",
            });
            assert.fail("it was written");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        }
    });
});
