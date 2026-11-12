/**
 * @file What a carried shader text may call is part of the `graphty-shader 1` format: the helpers
 * the element puts in front of every body (their names and signatures), the six icons `iconSdf`
 * draws, and the fields of each input struct (`NodeInput` and the others). A saved file carries a
 * shader's text but not this library, so removing or changing any of it breaks every file that
 * used it. This test fails on such a removal or change: that needs a `graphty-shader 2` format,
 * with format 1 still readable (design/architecture/self-contained-save-files.md, section 1.10).
 * Adding a helper, an icon or a field is free; record it in `shader-library.json`.
 */

import { assert, describe, it } from "vitest";

import { SHADER_HELPERS } from "../../src/catalog/shaderGlsl";
import { GLSL_HELPERS, GLSL_STRUCTS } from "../../src/shaders/runtime/glsl";
import snapshot from "./shader-library.json";

/** The library as the format promises it. */
interface ShaderLibrary {
    /** Every helper name a body may call. */
    readonly names: readonly string[];
    /** Every helper function's signature and every global the library declares, as `type name(args)`. */
    readonly signatures: readonly string[];
    /** Each input struct's fields, as `type name`. */
    readonly structs: Readonly<Record<string, readonly string[]>>;
    /** The source of `iconSdf`, which draws the six icons, line by line. */
    readonly icons: readonly string[];
}

/**
 * The library this build puts in front of every body.
 * @returns What it holds.
 */
function shaderLibrary(): ShaderLibrary {
    const signatures: string[] = [];
    for (const line of GLSL_HELPERS.split("\n")) {
        const fn = /^(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/.exec(line);
        const global = /^(\w+)\s+(\w+)\s*;/.exec(line);
        if (fn !== null) {
            signatures.push(`${fn[1]} ${fn[2]}(${fn[3].replace(/\s+/g, " ").trim()})`);
        } else if (global !== null) {
            signatures.push(`${global[1]} ${global[2]}`);
        }
    }

    const structs: Record<string, string[]> = {};
    for (const match of GLSL_STRUCTS.matchAll(/struct\s+(\w+)\s*\{([^}]*)\}/g)) {
        structs[match[1]] = match[2]
            .split(";")
            .map((field) => field.replace(/\s+/g, " ").trim())
            .filter((field) => field !== "");
    }

    const start = GLSL_HELPERS.indexOf("float iconSdf(");
    const end = GLSL_HELPERS.indexOf("\n}\n", start);
    const icons = GLSL_HELPERS.slice(start, end + 2)
        .split("\n")
        .map((line) => line.trim());

    return { names: [...SHADER_HELPERS], signatures, structs, icons };
}

describe("the graphty-shader 1 library", () => {
    const now = shaderLibrary();

    it("still has every helper a carried text may call", () => {
        const missing = snapshot.names.filter((name) => !now.names.includes(name));
        assert.deepEqual(missing, [], "removed helpers: a carried text calling one no longer compiles");
    });

    it("keeps every helper's signature", () => {
        const changed = snapshot.signatures.filter((signature) => !now.signatures.includes(signature));
        assert.deepEqual(changed, [], "removed or changed signatures");
    });

    it("keeps every field of every input struct", () => {
        for (const [struct, fields] of Object.entries(snapshot.structs)) {
            const missing = fields.filter((field) => !(now.structs[struct] ?? []).includes(field));
            assert.deepEqual(missing, [], `${struct} lost or changed fields`);
        }
    });

    it("draws the six icons exactly as before", () => {
        assert.deepEqual(now.icons, snapshot.icons);
    });
});
