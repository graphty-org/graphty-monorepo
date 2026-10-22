/**
 * @file The shader guide held against its examples and the code: the page opens with the
 * canonical example exactly as the file has it, shows the edge example, keeps the first example
 * within the adoption budget, imports only published entry points, and states every fact the
 * published page must state (design/rendering/shader-studio/decisions.md section 3.4), each one
 * checked against the constant or function the element uses.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { SHADER_HELPERS } from "../../src/catalog/shaderGlsl";
import { GLSL_STRUCTS } from "../../src/shaders/runtime/glsl";
import { authorLines, DOCS, exampleText, internalTermsIn, tsBlocks } from "./guide-examples";

const page = readFileSync(join(DOCS, "guide", "shaders.md"), "utf8");

/**
 * The fields of one input struct, as the element declares them.
 * @param struct - The struct's name.
 * @returns Its field names.
 */
function fieldsOf(struct: string): string[] {
    const body = new RegExp(`struct ${struct} \\{([^}]*)\\}`).exec(GLSL_STRUCTS)?.[1] ?? "";
    return [...body.matchAll(/\s(\w+);/g)].map((match) => match[1]);
}

describe("the shader guide", () => {
    const heat = exampleText("shaders/heat.ts", "example");
    const flow = exampleText("shaders/flow.ts", "example");

    it("opens with the canonical example, exactly as the file has it, and shows the edge example", () => {
        const blocks = tsBlocks(page);
        assert.strictEqual(blocks[0], heat);
        assert.include(blocks, flow);
    });

    it("keeps the first example within the adoption budget, naming no internal concept", () => {
        assert.isAtMost(authorLines(heat), 20, `the example takes ${String(authorLines(heat))} author lines`);
        assert.deepEqual(internalTermsIn(heat), []);
        assert.deepEqual(internalTermsIn(flow), []);
        for (const example of [heat, flow]) {
            assert.deepEqual(
                [...example.matchAll(/from "([^"]+)"/g)].map((match) => match[1]),
                ["@graphty/graphty-element"],
            );
        }
    });

    it("lists every field of every input struct", () => {
        for (const struct of ["NodeInput", "EdgeInput", "GroupInput", "BackgroundInput"]) {
            const fields = fieldsOf(struct);
            assert.isNotEmpty(fields, struct);
            for (const field of fields) {
                assert.include(page, `\`${field}\``, `${struct}.${field} is documented`);
            }
        }
    });

    it("lists every helper the element gives a body", () => {
        for (const helper of SHADER_HELPERS) {
            assert.include(page, `\`${helper}`, `${helper} is documented`);
        }
    });

    it("states each fact a reader needs", () => {
        for (const fact of [
            "shader.reserved",
            "shader.target-mismatch",
            "E_DUPLICATE_PLUGIN",
            "E_BAD_COMMAND",
            "node.shaders",
            "shader.place-unsupported",
            "off: true",
            "varies",
            "sinceEntered",
            "preview",
            "shadeFar",
            "straight alpha",
            "shaderTemplate",
            "@graphty/graphty-element/extend",
            "strict: true",
        ]) {
            assert.include(page, fact);
        }
    });
});
