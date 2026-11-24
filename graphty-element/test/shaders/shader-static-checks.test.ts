/**
 * @file The static checks `session.shaders.check` runs on header-less GLSL bodies with no canvas
 * attached: the tokenizer's refusals, constant expressions in loop bounds and array sizes, the
 * Appendix A loop forms and their trip counts, declarations, prototypes, overloads and recursion,
 * the entry signature, and the cost bound with its classes.
 */

import { assert, describe, it } from "vitest";

import type { ShaderProblem } from "../../src/catalog/shaders";
import { createGraphSession } from "../../src/session";
import { disposedAfterEach } from "../helpers/disposed-after-each";

const owned = disposedAfterEach();

/** What a check found: the problems, or the cost class when it passed. */
type Verdict =
    | { readonly ok: true; readonly cost: string | undefined }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };

/**
 * Check a body the way an editor does before adding it.
 * @param body - A header-less GLSL body.
 * @returns What the checks found.
 */
async function check(body: string): Promise<Verdict> {
    const session = owned(createGraphSession());
    const result = await session.shaders.check(body);
    return result.ok ? { ok: true, cost: result.descriptor.cost } : { ok: false, problems: result.problems };
}

/**
 * The codes a check refused a body with.
 * @param body - A header-less GLSL body.
 * @returns The codes, or an empty list when it passed.
 */
async function codes(body: string): Promise<string[]> {
    const verdict = await check(body);
    return verdict.ok ? [] : verdict.problems.map((problem) => problem.code);
}

/**
 * A node look whose body is one loop that adds to a sum.
 * @param header - The loop's header, between its parentheses.
 * @param before - Declarations before the entry function.
 * @returns The body.
 */
function loop(header: string, before = ""): string {
    return `${before}vec4 shade(NodeInput n) {\n    float s = 0.0;\n    for (${header}) { s += 0.1; }\n    return vec4(s);\n}\n`;
}

describe("the tokenizer", () => {
    it("skips line and closed block comments, and refuses one that never closes where it starts", async () => {
        assert.deepStrictEqual(
            await check("// a note\nvec4 shade(NodeInput n) { /* the color */ return n.color; } // end"),
            { ok: true, cost: "light" },
        );
        const open = await check("vec4 shade(NodeInput n) { return n.color; }\n/* never closed");
        assert.isFalse(open.ok);
        assert.deepInclude((open as { readonly problems: readonly ShaderProblem[] }).problems[0], {
            code: "shader.compile",
            params: { line: 2, column: 1, message: "unterminated comment", reason: "unexpected-token" },
        });
    });

    it("refuses a preprocessor line and a stray character at their places", async () => {
        const hash = await check("#define X 1\nvec4 shade(NodeInput n) { return n.color; }\n");
        assert.deepStrictEqual(hash, {
            ok: false,
            problems: [{ code: "shader.preprocessor", params: { line: 1, column: 1 } }],
        });
        const stray = await check("vec4 shade(NodeInput n) {\n    return n.color @ 1;\n}\n");
        assert.deepStrictEqual(stray, {
            ok: false,
            problems: [
                { code: "shader.compile", params: { line: 2, column: 20, message: "@", reason: "unexpected-token" } },
            ],
        });
    });

    it("refuses a backslash, a character outside ASCII and a body over its size limit before tokenizing", async () => {
        assert.deepStrictEqual(await codes("vec4 shade(NodeInput n) { return n.color; } // \\\n"), [
            "shader.preprocessor",
        ]);
        assert.deepStrictEqual(await codes("vec4 shade(NodeInput n) { return n.color; } // café\n"), [
            "shader.not-ascii",
        ]);
        const filler = `// ${"x".repeat(17_000)}\n`;
        const large = await check(`${filler}vec4 shade(NodeInput n) { return n.color; }\n`);
        assert.isFalse(large.ok);
        assert.strictEqual(
            (large as { readonly problems: readonly ShaderProblem[] }).problems[0].code,
            "shader.too-large",
        );
        assert.include((large as { readonly problems: readonly ShaderProblem[] }).problems[0].params, {
            limit: 16_384,
        });
    });

    it("refuses brackets nested past the limit at the first bracket over it", async () => {
        const deep = `vec4 shade(NodeInput n) { return vec4(${"(".repeat(64)}n.color.r${")".repeat(64)}); }\n`;
        assert.deepStrictEqual(await codes(deep), ["shader.too-deep"]);
        const shallow = `vec4 shade(NodeInput n) { return vec4(${"(".repeat(20)}n.color.r${")".repeat(20)}); }\n`;
        assert.deepStrictEqual(await codes(shallow), []);
    });
});

describe("constant expressions bound loops and arrays", () => {
    it("reads global constants built from literals, operators, parentheses, signs and constructors", async () => {
        // N = (3 + 1) * 2 - 4 / 2 = 6; M = int(6.9) = 6; K = +N - -2 = 8; F = float(N) is unused.
        const before =
            "const int N = (3 + 1) * 2 - 4 / 2;\nconst int M = int(6.9), K = +N - -2;\nconst float F = float(N);\n";
        assert.deepStrictEqual(await codes(loop("int i = 0; i < N; i++", before)), []);
        assert.deepStrictEqual(await codes(loop("int i = M; i > 0; i -= 1", before)), []);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < K; i += 2", before)), []);
        assert.deepStrictEqual(await codes(loop("int i = 0x0; i < 0x4; i++")), []);
        assert.deepStrictEqual(await codes(loop("float x = 0.0; x <= 1.0; x += 0.25")), []);
    });

    it("holds a loop to the trip limit through its constants", async () => {
        const verdict = await check(loop("int i = 0; i < N * 2; i++", "const int N = 100;\n"));
        assert.deepStrictEqual(verdict, {
            ok: false,
            problems: [{ code: "shader.loop-too-long", params: { line: 4, column: 5, iterations: 200, limit: 128 } }],
        });
    });

    it("refuses a bound that is not a constant: an unknown name, an open parenthesis, a cut-off constructor", async () => {
        assert.deepStrictEqual(await codes(loop("int i = 0; i < N; i++", "const int N = M + 1;\n")), [
            "shader.loop-unbounded",
        ]);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < (4; i++")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < int(4.0 + ; i++")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < 4 * ; i++")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < 4 - ; i++")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < -; i++")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < 1e999; i++")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(loop("int i = 0; i < 4 4; i++")), ["shader.loop-unbounded"]);
    });

    it("ignores a constant with no initializer, and refuses an array longer than the limit", async () => {
        assert.deepStrictEqual(await codes("const int N;\nvec4 shade(NodeInput n) { return n.color; }\n"), []);
        assert.deepStrictEqual(
            await check("const int N = 300;\nfloat big[N];\nvec4 shade(NodeInput n) { return n.color; }\n"),
            {
                ok: false,
                problems: [{ code: "shader.too-deep", params: { line: 2, column: 10, limit: 256 } }],
            },
        );
        assert.deepStrictEqual(await codes("float small[16];\nvec4 shade(NodeInput n) { return n.color; }\n"), []);
    });
});

describe("loop forms", () => {
    it("counts upward, downward, inclusive, not-equal and empty loops", async () => {
        assert.deepStrictEqual(await codes(loop("int i = 10; i >= 0; i--")), []);
        assert.deepStrictEqual(await codes(loop("int i = 0; i != 8; i += 2")), []);
        assert.deepStrictEqual(await codes(loop("int i = 3; i != 3; i++")), []);
        assert.deepStrictEqual(await codes(loop("int i = 8; i < 3; i++")), []);
        assert.deepStrictEqual(await codes(loop("int i = 3; i < 3; ++i")), []);
        assert.deepStrictEqual(await codes(loop("int i = 0; i <= 128; i++")), ["shader.loop-too-long"]);
        assert.deepStrictEqual(await codes(loop("int i = 128; i > 0; i -= 1")), []);
    });

    it("refuses a loop that never ends or is not in the Appendix A form", async () => {
        const refused = [
            "int i = 0; i != 7; i += 2",
            "int i = 0; i != 8; i -= 2",
            "int i = 0; i < 8; i--",
            "int i = 8; i > 0; i++",
            "int i = 0; i == 3; i++",
            "int i = 0; i < 3",
            "i = 0; i < 3; i++",
            "int i = 0; 3 > i; i++",
            "int i = 0; i < 3; i *= 2",
            "int i = 0; i < 3; i += k",
            "int i = 0; i < 3; j++",
        ];
        for (const header of refused) {
            assert.deepStrictEqual(await codes(loop(header)), ["shader.loop-unbounded"], header);
        }

        assert.deepStrictEqual(await codes("vec4 shade(NodeInput n) { for ; return n.color; }\n"), [
            "shader.loop-unbounded",
        ]);
        assert.deepStrictEqual(await codes("vec4 shade(NodeInput n) { while (true) {} return n.color; }\n"), [
            "shader.loop-unbounded",
        ]);
    });

    it("refuses a body that writes its loop's index, and allows one that only reads it or a field of that name", async () => {
        const writes = (statement: string): string =>
            `vec4 shade(NodeInput n) {\n    float s = 0.0;\n    for (int i = 0; i < 3; i++) { ${statement} }\n    return vec4(s);\n}\n`;
        const at = await check(writes("i = 2;"));
        assert.deepStrictEqual(at, {
            ok: false,
            problems: [{ code: "shader.loop-unbounded", params: { line: 3, column: 35 } }],
        });
        assert.deepStrictEqual(await codes(writes("i++;")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(writes("--i;")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(writes("i += 1;")), ["shader.loop-unbounded"]);
        assert.deepStrictEqual(await codes(writes("s += float(i);")), []);
        assert.deepStrictEqual(await codes(writes("vec2 v; v.i = 1.0; s += v.x;")), []);
    });

    it("walks a loop body that is a single if/else statement, nested loops and blocks", async () => {
        const body = `vec4 shade(NodeInput n) {
    float s = 0.0;
    for (int i = 0; i < 4; i++)
        if (s > 1.0) s = 0.0; else s += 0.5;
    for (int i = 0; i < 4; i++)
        for (int j = 0; j < 4; j++) { { s += 0.01; } }
    return vec4(s);
}
`;
        assert.deepStrictEqual(await check(body), { ok: true, cost: "light" });
    });
});

describe("declarations and functions", () => {
    it("refuses a storage qualifier on a global or a function, and a function named main", async () => {
        assert.deepStrictEqual(await check("uniform float u;\nvec4 shade(NodeInput n) { return n.color; }\n"), {
            ok: false,
            problems: [{ code: "shader.reserved", params: { line: 1, column: 1, name: "uniform" } }],
        });
        assert.deepStrictEqual(
            await codes("uniform float g() { return 1.0; }\nvec4 shade(NodeInput n) { return n.color; }\n"),
            ["shader.reserved"],
        );
        assert.deepStrictEqual(await check("void main();\nvec4 shade(NodeInput n) { return n.color; }\n"), {
            ok: false,
            problems: [{ code: "shader.reserved", params: { line: 1, column: 6, name: "main" } }],
        });
        assert.deepStrictEqual(await codes("void main() {}\nvec4 shade(NodeInput n) { return n.color; }\n"), [
            "shader.reserved",
        ]);
        // A parameter qualifier is allowed in a parameter list only.
        assert.deepStrictEqual(await check("in float x;\nvec4 shade(NodeInput n) { return n.color; }\n"), {
            ok: false,
            problems: [{ code: "shader.reserved", params: { line: 1, column: 1, name: "in" } }],
        });
        assert.deepStrictEqual(
            await codes("out float g() { return 1.0; }\nvec4 shade(NodeInput n) { return n.color; }\n"),
            ["shader.reserved"],
        );
    });

    it("refuses a function definition with no name before its parameters", async () => {
        assert.deepStrictEqual(
            await check("float[2] (float x) { return x; }\nvec4 shade(NodeInput n) { return n.color; }\n"),
            {
                ok: false,
                problems: [
                    {
                        code: "shader.compile",
                        params: { line: 1, column: 1, message: "function without a name", reason: "unexpected-token" },
                    },
                ],
            },
        );
    });

    it("takes a prototype before its definition, and overloads of one name", async () => {
        const prototype =
            "float helper(float x);\nvec4 shade(NodeInput n) { return vec4(helper(n.color.r)); }\nfloat helper(float x) { return x * 2.0; }\n";
        assert.deepStrictEqual(await check(prototype), { ok: true, cost: "light" });
        const overloads =
            "float h(float x) { return x; }\nfloat h(vec2 x) { return x.x; }\nvec4 shade(NodeInput n) { return vec4(h(1.0) + h(vec2(1.0))); }\n";
        assert.deepStrictEqual(await check(overloads), { ok: true, cost: "light" });
    });

    it("refuses recursion, direct or through another function, at the function that closes the cycle", async () => {
        assert.deepStrictEqual(
            await check("float h(float x) { return h(x - 1.0); }\nvec4 shade(NodeInput n) { return vec4(h(1.0)); }\n"),
            {
                ok: false,
                problems: [{ code: "shader.loop-unbounded", params: { line: 1, column: 7, reason: "recursion" } }],
            },
        );
        const mutual =
            "float b(float x);\nfloat a(float x) { return b(x); }\nfloat b(float x) { return a(x); }\nvec4 shade(NodeInput n) { return vec4(a(1.0)); }\n";
        assert.deepStrictEqual(await codes(mutual), ["shader.loop-unbounded"]);
    });

    it("refuses a body with no entry function, or one with the wrong signature for its target", async () => {
        assert.deepStrictEqual(await check("vec4 paint(NodeInput n) { return n.color; }\n"), {
            ok: false,
            problems: [
                {
                    code: "shader.entry-missing",
                    params: { line: 1, column: 1, target: "node", expected: "vec4 shade(NodeInput n)" },
                },
            ],
        });
        assert.deepStrictEqual(await check("float shade(NodeInput n) { return 1.0; }\n"), {
            ok: false,
            problems: [
                {
                    code: "shader.entry-signature",
                    params: { line: 1, column: 7, target: "node", expected: "vec4 shade(NodeInput n)" },
                },
            ],
        });
        assert.deepStrictEqual(await codes("vec4 shade(in NodeInput n) { return n.color; }\n"), []);
        assert.deepStrictEqual(await codes("vec4 shade(NodeInput n, float x) { return n.color; }\n"), [
            "shader.entry-signature",
        ]);
    });
});

describe("the cost bound", () => {
    /**
     * A node look with two nested loops of `outer` and `inner` trips around `work`.
     * @param outer - The outer trip count.
     * @param inner - The inner trip count.
     * @param work - The statement inside.
     * @param input - The entry's input struct.
     * @returns The body.
     */
    const nested = (outer: number, inner: number, work: string, input = "NodeInput"): string =>
        `vec4 shade(${input} n) {\n    float s = 0.0;\n    for (int i = 0; i < ${String(outer)}; i++) {\n        for (int j = 0; j < ${String(inner)}; j++) { ${work} }\n    }\n    return vec4(s);\n}\n`;

    /**
     * A look whose entry runs a helper `outer` times, the helper looping `inner` times.
     * @param outer - The entry's trip count.
     * @param inner - The helper's trip count.
     * @param input - The entry's input struct.
     * @returns The body.
     */
    const called = (outer: number, inner: number, input = "NodeInput"): string =>
        `float wave(float x) {\n    float s = 0.0;\n    for (int j = 0; j < ${String(inner)}; j++) { s += sin(x + float(j)) * cos(x - float(j)) * 0.01; }\n    return s;\n}\nvec4 shade(${input} n) {\n    float s = 0.0;\n    for (int i = 0; i < ${String(outer)}; i++) { s += wave(float(i)); }\n    return vec4(s);\n}\n`;

    it("classes a body light, medium or heavy by its bound", async () => {
        assert.deepStrictEqual(await check(nested(4, 4, "s += 0.01;")), { ok: true, cost: "light" });
        assert.deepStrictEqual(await check(nested(16, 16, "s += 0.01;")), { ok: true, cost: "medium" });
        assert.deepStrictEqual(await check(nested(32, 32, "s += sin(float(i)) * 0.01;")), { ok: true, cost: "heavy" });
    });

    it("refuses loops nested past the iteration limit, naming the iterations, and a function over the unroll budget", async () => {
        const verdict = await check(nested(100, 100, "s += 0.01;"));
        assert.isFalse(verdict.ok);
        const { problems } = verdict as { readonly problems: readonly ShaderProblem[] };
        assert.deepStrictEqual(
            problems.map((problem) => problem.code),
            ["shader.too-costly", "shader.too-costly"],
        );
        assert.include(problems[0].params, { line: 1, column: 6, limit: 65_536 });
        assert.deepStrictEqual(problems[1].params, { line: 1, column: 6, iterations: 10_000, limit: 4096 });
    });

    it("counts iterations through calls: a helper's loop run inside the entry's loop", async () => {
        assert.deepStrictEqual(await check(called(50, 100)), {
            ok: false,
            problems: [{ code: "shader.too-costly", params: { line: 6, column: 6, iterations: 5000, limit: 4096 } }],
        });
    });

    it("holds an edge look to the edge budget, which a node look of the same body is under", async () => {
        assert.deepStrictEqual(await check(called(64, 64)), { ok: true, cost: "heavy" });
        const edge = await check(called(64, 64, "EdgeInput"));
        assert.isFalse(edge.ok);
        const problem = (edge as { readonly problems: readonly ShaderProblem[] }).problems[0];
        assert.strictEqual(problem.code, "shader.too-costly");
        assert.include(problem.params, { line: 6, column: 6, limit: 60_000 });
    });
});
