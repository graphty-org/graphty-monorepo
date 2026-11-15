/**
 * @file `registerShader` and `defineShader`: one validation path, one registry, and the catalog
 * listing what they registered (design/rendering/shader-styles.md section 3.4).
 */

import { afterEach, assert, describe, it } from "vitest";

import { clearRegisteredShadersForTesting, registerShader, shaderDescriptor } from "../../src/catalog/shaderRegistry";
import { shaderCovers } from "../../src/catalog/shaders";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session";
import { defineShader } from "../../src/simple/defineShader";

/**
 * Run a call that must be refused and return the error's code and details.
 * @param call - The call.
 * @returns The code and details.
 */
function refusal(call: () => void): { code: string; details: Record<string, unknown> } {
    let found: { code: string; details: Record<string, unknown> } | undefined;
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        found = isGraphtyError(error) ? { code: error.code, details: error.details } : undefined;
    }

    assert.isDefined(found, "the call was accepted");

    return found;
}

afterEach(() => {
    clearRegisteredShadersForTesting();
});

describe("defineShader", () => {
    it("registers a shader from the short form, filling in what was left out", () => {
        defineShader({
            id: "acme/pulse-ring",
            place: "around",
            reach: 2,
            params: {
                tint: "#FFAA00",
                speed: { type: "number", default: 1, min: 0, max: 4, varies: true },
            },
            motion: "loop",
            glsl: `
                vec4 shade(NodeInput n) {
                    float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time * speed)));
                    return vec4(tint * ring, ring);
                }`,
        });

        const descriptor = shaderDescriptor("acme/pulse-ring");
        assert.isDefined(descriptor);
        assert.strictEqual(descriptor?.plainName, "Pulse ring");
        assert.strictEqual(descriptor?.origin, "registered");
        assert.strictEqual(descriptor?.cost, "light");
        assert.strictEqual(descriptor?.webgpu, "translate");
        assert.deepEqual(descriptor?.motion, { loop: {} });
        assert.deepEqual(
            descriptor?.params.map((param) => [param.name, param.type, param.default, param.varies]),
            [
                ["tint", "color", "#ffaa00", undefined],
                ["speed", "number", 1, true],
            ],
        );
        assert.deepEqual(descriptor?.reads, []);
    });

    it("refuses a bare id, which is reserved for the element's presets", () => {
        const { code, details } = refusal(() =>
            defineShader({ id: "marble", glsl: "vec4 shade(NodeInput n) { return n.color; }" }),
        );
        assert.strictEqual(code, "E_BAD_COMMAND");
        assert.strictEqual(details.field, "id");
    });

    it("refuses a body the checker refuses, naming the member and carrying the problems", () => {
        const { code, details } = refusal(() =>
            defineShader({
                id: "acme/forever",
                glsl: "vec4 shade(NodeInput n) { while (true) {} return n.color; }",
            }),
        );
        assert.strictEqual(code, "E_BAD_COMMAND");
        assert.strictEqual(details.field, "glsl");
        assert.strictEqual((details.problems as { code: string }[])[0].code, "shader.loop-unbounded");
    });
});

describe("registerShader", () => {
    it("infers what a body reads and lets a registrant state the cost", () => {
        registerShader({
            descriptor: { id: "acme/tint", plainName: "Tint", params: [], cost: "heavy" },
            glsl: "vec4 shade(NodeInput n) { return n.color * (1.0 + n.selected) * n.size; }",
        });

        assert.deepEqual(shaderDescriptor("acme/tint")?.reads, ["color", "opacity", "size", "selected"]);
        assert.strictEqual(shaderDescriptor("acme/tint")?.cost, "heavy");
    });

    it("refuses a parameter a body cannot hold, naming it", () => {
        const { details } = refusal(() =>
            registerShader({
                descriptor: {
                    id: "acme/bad",
                    plainName: "Bad",
                    params: [{ name: "gl_x", plainName: "X", type: "number", default: 0 }],
                },
                glsl: "vec4 shade(NodeInput n) { return n.color; }",
            }),
        );
        assert.strictEqual(details.field, "descriptor.params.gl_x.name");
    });

    it("is listed by session.catalog.shaders()", () => {
        defineShader({ id: "acme/flat", glsl: "vec4 shade(NodeInput n) { return n.color; }" });
        const session = createGraphSession();
        assert.include(
            session.catalog.shaders().map((descriptor) => descriptor.id),
            "acme/flat",
        );
        session.dispose();
    });
});

describe("what a shader covers", () => {
    it("follows the target and place, plus color and opacity for paint or replace that do not read them", () => {
        const card = shaderCovers({ target: "node", place: "replace", reads: ["color", "opacity"] });
        assert.include(card, "node.shape");
        assert.notInclude(card, "node.size");
        assert.deepEqual(shaderCovers({ target: "node", place: "around", reads: [] }), []);
        assert.deepEqual(shaderCovers({ target: "group", place: "group", reads: [] }), []);
        assert.deepEqual(shaderCovers({ target: "node", place: "paint", reads: ["color", "opacity"] }), [
            "node.flat",
            "node.unlit",
            "node.wireframe",
        ]);
        assert.includeMembers(
            [...shaderCovers({ target: "node", place: "replace", reads: ["size"] })],
            ["node.color", "node.opacity"],
        );
        assert.include(shaderCovers({ target: "edge", place: "paint", reads: [] }), "edge.color");
        assert.includeMembers([...shaderCovers({ target: "edge", place: "paint", reads: ["color"] })], ["edge.style"]);
    });
});
