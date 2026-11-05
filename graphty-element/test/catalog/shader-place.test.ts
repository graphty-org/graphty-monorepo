/**
 * @file The place-based shader descriptor: a default place and the places a use may move it to,
 * `minSize`, parameters bound to a clock, `reads: "light"`, looping read from the body, and
 * definition problems as `{ code, params }` (design/rendering/shader-studio/decisions-v2.md
 * section 6).
 */

import { afterEach, assert, describe, it } from "vitest";

import { clearRegisteredShadersForTesting, shaderDescriptor } from "../../src/catalog/shaderRegistry";
import { type ShaderPlace, shaderPlaceProblem, type ShaderRegistration } from "../../src/catalog/shaders";
import { formatShaderText, parseShaderText } from "../../src/catalog/shaderText";
import { isGraphtyError } from "../../src/errors";
import { defineShader } from "../../src/simple/defineShader";

afterEach(() => {
    clearRegisteredShadersForTesting();
});

const NODE_BODY = "vec4 shade(NodeInput n) { return n.color; }";
const GROUP_BODY = "vec4 shade(GroupInput g) { return vec4(g.field); }";
const EVERY_PLACE: readonly ShaderPlace[] = ["paint", "replace", "over", "around", "behind", "along", "group"];

/**
 * What a definition throws, or fails the test when it throws nothing.
 * @param define - The definition.
 * @returns The error's details.
 */
function refusal(define: () => void): Readonly<Record<string, unknown>> {
    let caught: unknown = "it was registered";
    try {
        define();
    } catch (error) {
        caught = error;
    }

    assert.isTrue(isGraphtyError(caught) && caught.code === "E_BAD_COMMAND", String(caught));
    return isGraphtyError(caught) ? caught.details : {};
}

describe("defineShader", () => {
    it("registers from an id and a body alone, at paint", () => {
        defineShader({ id: "acme/plain", glsl: NODE_BODY });
        const descriptor = shaderDescriptor("acme/plain");
        assert.strictEqual(descriptor?.target, "node");
        assert.strictEqual(descriptor?.place, "paint");
        assert.deepEqual(descriptor?.places, ["paint"]);
    });

    it("registers the canonical example: a ring around the node that fades in on its layer's clock", () => {
        defineShader({
            id: "acme/ring",
            place: "around",
            params: {
                color: "#ffcc00",
                width: { default: 2, min: 0.5, max: 8 },
                fade: { by: "since.matched", domain: [0, 0.3] },
            },
            glsl: `vec4 shade(NodeInput n) {
                float ring = 1.0 - smoothstep(0.0, width / n.pixelSize, abs(length(n.uv) - 1.2));
                return vec4(color, ring * fade);
            }`,
        });
        const descriptor = shaderDescriptor("acme/ring");
        assert.deepEqual(
            descriptor?.params.map((param) => [param.name, param.type, param.default]),
            [
                ["color", "color", "#ffcc00"],
                ["width", "number", 2],
                ["fade", "number", { by: "since.matched", domain: [0, 0.3] }],
            ],
        );
        assert.deepEqual(descriptor?.motion, {}, "a clock-bound parameter is not a loop");
    });
});

describe("places", () => {
    it("lets a square-drawn shader with no places move among all four", () => {
        defineShader({ id: "acme/aura", place: "around", glsl: NODE_BODY });
        assert.deepEqual(shaderDescriptor("acme/aura")?.places, ["replace", "over", "around", "behind"]);
    });

    it("refuses a use at a place the shader's places leave out", () => {
        defineShader({ id: "acme/brackets", place: "around", places: ["around", "behind"], glsl: NODE_BODY });
        const descriptor = shaderDescriptor("acme/brackets");
        assert.isDefined(descriptor);
        if (descriptor === undefined) {
            return;
        }

        assert.deepEqual(shaderPlaceProblem(descriptor, "replace"), {
            code: "shader.place-unsupported",
            params: { shader: "acme/brackets", place: "replace", allowed: ["around", "behind"] },
        });
        assert.isNull(shaderPlaceProblem(descriptor, "behind"));
        assert.isNull(shaderPlaceProblem(descriptor, undefined), "its own place");
    });

    it("keeps a group shader at group, refusing every other place", () => {
        defineShader({ id: "acme/hull", glsl: GROUP_BODY });
        const descriptor = shaderDescriptor("acme/hull");
        assert.strictEqual(descriptor?.place, "group");
        if (descriptor === undefined) {
            return;
        }

        for (const place of EVERY_PLACE) {
            const problem = shaderPlaceProblem(descriptor, place);
            assert.strictEqual(problem === null, place === "group", place);
        }

        const details = refusal(() => defineShader({ id: "acme/hull-around", place: "around", glsl: GROUP_BODY }));
        assert.strictEqual(details.code, "shader.place-unsupported");
        assert.deepEqual(details.params, { shader: "acme/hull-around", place: "around", allowed: ["group"] });
    });

    it("refuses a default place outside the shader's own places", () => {
        const details = refusal(() =>
            defineShader({ id: "acme/odd", place: "over", places: ["around", "behind"], glsl: NODE_BODY }),
        );
        assert.strictEqual(details.code, "shader.place-unsupported");
        assert.strictEqual(details.field, "place");
    });
});

describe("minSize", () => {
    it("adds a minSize parameter with its default", () => {
        defineShader({ id: "acme/reticle", place: "around", minSize: 40, glsl: NODE_BODY });
        const descriptor = shaderDescriptor("acme/reticle");
        assert.strictEqual(descriptor?.minSize, 40);
        const param = descriptor?.params.find((each) => each.name === "minSize");
        assert.deepInclude(param, { type: "number", default: 40, min: 0 });
    });

    it("throws shader.min-size-place for a shader that can only paint", () => {
        const details = refusal(() => defineShader({ id: "acme/tiny", minSize: 40, glsl: NODE_BODY }));
        assert.strictEqual(details.code, "shader.min-size-place");
        assert.deepEqual(details.params, { shader: "acme/tiny", places: ["paint"] });
        assert.strictEqual(details.field, "minSize");
    });

    it("throws shader.min-size-place for one narrowed to over", () => {
        const details = refusal(() =>
            defineShader({ id: "acme/inside", place: "over", places: ["over"], minSize: 20, glsl: NODE_BODY }),
        );
        assert.strictEqual(details.code, "shader.min-size-place");
    });
});

describe("what a body reads", () => {
    it("reports the light when the body reads lightDir", () => {
        defineShader({
            id: "acme/lit",
            glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb * max(dot(n.normal, lightDir), 0.0), 1.0); }",
        });
        assert.include(shaderDescriptor("acme/lit")?.reads ?? [], "light");
        defineShader({ id: "acme/unlit", glsl: NODE_BODY });
        assert.notInclude(shaderDescriptor("acme/unlit")?.reads ?? [], "light");
    });

    it("loops only when the body reads the input's time", () => {
        defineShader({ id: "acme/spin", glsl: "vec4 shade(NodeInput n) { return n.color * fract(n.time); }" });
        assert.deepEqual(shaderDescriptor("acme/spin")?.motion, { loop: {} });
        defineShader({
            id: "acme/entering",
            glsl: "vec4 shade(NodeInput n) { return n.color * clamp(n.sinceMatched / 0.3, 0.0, 1.0); }",
        });
        assert.deepEqual(shaderDescriptor("acme/entering")?.motion, {}, "a clock read is not a loop");
        assert.include(shaderDescriptor("acme/entering")?.reads ?? [], "times");
    });
});

describe("parameters bound to a clock", () => {
    const registration: ShaderRegistration = {
        descriptor: {
            id: "acme/fade",
            plainName: "Fade",
            target: "node",
            place: "around",
            params: [
                { name: "fade", plainName: "Fade", type: "number", default: { by: "since.matched", domain: [0, 0.3] } },
                {
                    name: "tint",
                    plainName: "Tint",
                    type: "color",
                    default: { by: "since.hovered", domain: [0, 0.25], range: ["#000000", "#ffcc00"] },
                },
            ],
        },
        glsl: "vec4 shade(NodeInput n) { return vec4(tint, fade); }\n",
    };

    it("round-trips through shader text unchanged", () => {
        const parsed = parseShaderText(formatShaderText(registration));
        assert.isTrue(parsed.ok, JSON.stringify(!parsed.ok && parsed.problems));
        assert.deepEqual(parsed.ok && parsed.registration.descriptor, registration.descriptor);
    });

    it("refuses an unknown clock, a domain that does not increase, a color with no range, and a clock type", () => {
        const header = (param: Record<string, unknown>): string =>
            `/* graphty-shader 1\n${JSON.stringify({ id: "acme/bad", params: [{ name: "p", ...param }] })}\n*/\n${NODE_BODY}`;
        const fieldOf = (param: Record<string, unknown>): unknown => {
            const parsed = parseShaderText(header(param));
            return parsed.ok ? "accepted" : parsed.problems[0].params.field;
        };
        assert.strictEqual(fieldOf({ type: "number", default: { by: "since.nope", domain: [0, 1] } }), "default");
        assert.strictEqual(fieldOf({ type: "number", default: { by: "since.matched", domain: [1, 0] } }), "default");
        assert.strictEqual(fieldOf({ type: "color", default: { by: "since.matched", domain: [0, 1] } }), "default");
        assert.strictEqual(fieldOf({ type: "integer", default: { by: "since.matched", domain: [0, 1] } }), "default");
        assert.strictEqual(fieldOf({ type: "clock", default: 0 }), "type", "there is no clock parameter type");
        assert.strictEqual(
            fieldOf({ type: "number", default: { by: "since.unmatched", domain: [0, 0.25] } }),
            "accepted",
        );
    });
});
