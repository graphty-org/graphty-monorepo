/**
 * @file No shader the element ships declares a name WGSL reserves.
 *
 * Under WebGPU a GLSL shader is translated to WGSL with its names kept, so a local called `pass` is
 * legal GLSL that the device refuses, and a refused shader loses the whole frame (#5847). The list is
 * the WGSL specification's keywords and reserved words, less the GLSL words that cannot be declared.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

const WGSL_RESERVED =
    "NULL Self abstract active alias alignas alignof as async auto await become binding_array catch co_await " +
    "co_return co_yield coherent column_major common compile compile_fragment concept const_assert const_cast " +
    "consteval constexpr constinit continuing crate debugger decltype delete demote demote_to_helper diagnostic " +
    "dynamic_cast enable explicit export extends fallthrough filter final finally fn friend from fxgroup get " +
    "groupshared impl implements import instanceof let loop macro macro_rules match meta module move mut mutable " +
    "new nil noexcept nointerpolation non_coherent noncoherent noperspective null nullptr of operator override " +
    "package packoffset partition pass patch pixelfragment precise premerge priv protected pub ref regardless " +
    "register reinterpret_cast require requires resource restrict self set sizeof snorm static_assert static_cast " +
    "std subroutine super target thread_local throw trait try type typeid typename typeof unless unorm unsafe " +
    "unsized use var virtual wgsl where with writeonly yield";

const GLSL_TYPE = "float|int|uint|bool|[iub]?vec[234]|mat[234](?:x[234])?|sampler(?:2D|3D|Cube|2DArray)";

/** A GLSL declaration of a reserved name: first, or after other names in the same declaration. */
const DECLARES_RESERVED = new RegExp(
    `\\b(?:${GLSL_TYPE})\\s+(?:\\w+\\s*(?:=[^;,()]*)?,\\s*)*(${WGSL_RESERVED.replaceAll(" ", "|")})\\b\\s*[=;,)\\[]`,
    "g",
);

describe("the shaders the element ships", () => {
    it("declare no name WGSL reserves", () => {
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
        for (const line of ["for (int pass = 0;", "vec3 p, vec3 fn,", "float a, target;"]) {
            assert.match(line, new RegExp(DECLARES_RESERVED.source), line);
        }
    });
});
