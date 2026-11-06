/**
 * @file No shader the element ships declares a name WGSL will not take.
 *
 * Under WebGPU a GLSL shader is translated to WGSL with its names kept, so a local called `pass` is
 * legal GLSL that the device refuses, and a refused shader loses the whole frame (#5847). A body's
 * names are renamed for it ({@link WGSL_NAMES}), but the element's own library helpers and the
 * shaders of its own materials are not, so this holds all of them to the same list: reserved words
 * and built-in names such as `select` alike.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { GLSL_FUNCTIONS, GLSL_RESERVED, tokenize } from "../../src/catalog/shaderGlsl";
import { GLSL_HELPERS } from "../../src/shaders/runtime/glsl";
import { WGSL_NAMES } from "../../src/shaders/runtime/wrap";

const GLSL_TYPE = "float|int|uint|bool|[iub]?vec[234]|mat[234](?:x[234])?|sampler(?:2D|3D|Cube|2DArray)";

/** A GLSL declaration of a reserved name: first, or after other names in the same declaration. */
const DECLARES_RESERVED = new RegExp(
    `\\b(?:${GLSL_TYPE})\\s+(?:\\w+\\s*(?:=[^;,()]*)?,\\s*)*(${[...WGSL_NAMES].join("|")})\\b\\s*[=;,)\\[]`,
    "g",
);

/**
 * The names a GLSL text uses as its own: in {@link WGSL_NAMES}, and neither a GLSL keyword, a call
 * of a built-in nor a field.
 * @param glsl - The text.
 * @returns The names.
 */
function namesWgslRefuses(glsl: string): string[] {
    const { tokens } = tokenize(glsl, { line: 1, column: 1 });
    return tokens
        .filter(({ kind, text }, i) => {
            const keyword = GLSL_RESERVED.has(text) && !GLSL_FUNCTIONS.has(text);
            const used = tokens[i + 1]?.text === "(" || tokens[i - 1]?.text === ".";
            return kind === "id" && WGSL_NAMES.has(text) && !keyword && !used;
        })
        .map(({ text }) => text);
}

describe("the shaders the element ships", () => {
    it("keep every name WGSL will not take out of the library helpers, which are not renamed", () => {
        assert.deepEqual(namesWgslRefuses(GLSL_HELPERS), []);
    });

    it("would catch a helper using one", () => {
        const helper =
            "float f(float abs) { float select = abs(1.0); if (s.step > 0.0) { return select; } return abs; }";
        assert.deepEqual(namesWgslRefuses(helper), ["abs", "select", "select", "abs"]);
    });

    it("declare no name WGSL will not take", () => {
        const src = join(import.meta.dirname, "../../src");
        const found = readdirSync(src, { recursive: true, encoding: "utf8" })
            .filter((file) => /\.(?:ts|fx)$/.test(file))
            .flatMap((file) =>
                [...readFileSync(join(src, file), "utf8").matchAll(DECLARES_RESERVED)].map(
                    (match) => `${file}: ${match[0]}`,
                ),
            );

        assert.deepEqual(found, []);
    });

    it("would be caught declaring one", () => {
        for (const line of [
            "for (int pass = 0;",
            "vec3 p, vec3 fn,",
            "float a, target;",
            "float select = 1.0;",
            "vec2 abs;",
        ]) {
            assert.match(line, new RegExp(DECLARES_RESERVED.source), line);
        }
    });
});
