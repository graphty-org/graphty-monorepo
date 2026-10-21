/**
 * @file The shader model: four targets and one role, the text format that carries every fact a
 * preset needs, the templates for each place, loaders for bodies, and the presets registered
 * through the same checks as everyone else (design/rendering/shader-studio/decisions.md sections
 * 2 and 3).
 */

import { afterEach, assert, describe, it } from "vitest";

import { checkShaderBody } from "../../src/catalog/shaderGlsl";
import {
    clearRegisteredShadersForTesting,
    loadShaderSource,
    registerShader,
    shaderDescriptor,
    shaderDescriptors,
} from "../../src/catalog/shaderRegistry";
import { drawingOf, drawnShaderParams, type ShaderPlace, type ShaderRegistration } from "../../src/catalog/shaders";
import { shaderTemplate } from "../../src/catalog/shaderTemplate";
import { formatShaderText, parseShaderText } from "../../src/catalog/shaderText";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session";
import { SHADER_PRESETS } from "../../src/shaders/presets";
import { SHADER_PRESET_BODIES, SHADER_PRESET_LOW_DETAIL } from "../../src/shaders/presets/bodies";
import { defineShader } from "../../src/simple/defineShader";

afterEach(() => {
    clearRegisteredShadersForTesting();
});

/**
 * Text with a header and a body.
 * @param header - The header's keys past the id.
 * @param body - The body.
 * @returns The text.
 */
function text(header: Record<string, unknown>, body: string): string {
    return `/* graphty-shader 1\n${JSON.stringify({ id: "test/case", ...header })}\n*/\n${body}`;
}

const NODE_BODY = "vec4 shade(NodeInput n) { return n.color; }\n";
const EDGE_BODY = "vec4 shade(EdgeInput e) { return e.color; }\n";
const EFFECT_PLACE: ShaderPlace = { target: "node", role: "effect" };

describe("every preset round-trips through shader text", () => {
    // Pasted text may not take a bare id, so each preset is written under a namespaced copy of its
    // id, as "Duplicate" writes it; every other fact must come back unchanged.
    it.each(SHADER_PRESETS.map((preset) => [preset.id, preset] as const))("%s", async (id, preset) => {
        const { origin: _origin, ...facts } = preset;
        const descriptor = { ...facts, id: `element/${id}` };
        const low = Object.hasOwn(SHADER_PRESET_LOW_DETAIL, id) ? await SHADER_PRESET_LOW_DETAIL[id]() : undefined;
        const registration: ShaderRegistration = {
            descriptor,
            glsl: await SHADER_PRESET_BODIES[id](),
            ...(low === undefined ? {} : { lowDetail: low }),
        };

        const parsed = parseShaderText(formatShaderText(registration));
        assert.isTrue(parsed.ok, JSON.stringify(!parsed.ok && parsed.problems));
        if (!parsed.ok) {
            return;
        }

        assert.deepEqual(parsed.registration.descriptor, descriptor);
        assert.strictEqual(parsed.registration.lowDetail === undefined, low === undefined, "the far body survives");
        if (parsed.registration.lowDetail !== undefined) {
            assert.deepEqual(checkShaderBody(parsed.registration.lowDetail, drawingOf(preset)).problems, []);
        }
    });

    it("carries every new descriptor fact: shadeFar, motion, minPixels, categories, preview, thumbnail", () => {
        const registration: ShaderRegistration = {
            descriptor: {
                id: "acme/halo",
                plainName: "Halo",
                target: "node",
                role: "effect",
                reach: 3,
                minPixels: 24,
                categories: ["Attention"],
                preview: { params: { tint: "#00ff00" }, time: 1.5 },
                thumbnail: "https://example.com/halo.webp",
                motion: { enter: 0.4 },
                cost: "medium",
                params: [{ name: "tint", plainName: "Tint", type: "color", default: "#ff0000" }],
            },
            glsl: "float ring(vec2 p) { return length(p); }\nvec4 shade(NodeInput n) { return vec4(tint * ring(n.uv), 1.0); }\n",
            lowDetail:
                "float ring(vec2 p) { return length(p); }\nvec4 shade(NodeInput n) { return vec4(tint, 1.0); }\n",
        };
        const written = formatShaderText(registration);
        assert.include(written, "vec4 shadeFar(NodeInput n)");
        assert.strictEqual(written.match(/float ring\(/g)?.length, 1, "a shared helper is written once");
        const parsed = parseShaderText(written);
        assert.isTrue(parsed.ok);
        if (parsed.ok) {
            assert.deepEqual(parsed.registration.descriptor, registration.descriptor);
            assert.include(parsed.registration.lowDetail ?? "", "return vec4(tint, 1.0)");
            assert.notInclude(parsed.registration.glsl, "shadeFar");
        }
    });
});

describe("target and role", () => {
    it("reads the target from the entry's input", () => {
        const parsed = parseShaderText(text({}, EDGE_BODY));
        assert.isTrue(parsed.ok);
        assert.strictEqual(parsed.ok && parsed.registration.descriptor.target, "edge");
        const group = parseShaderText("vec4 shade(GroupInput g) { return vec4(g.field); }");
        assert.strictEqual(group.ok && group.registration.descriptor.target, "group");
    });

    it("takes the role from the place when the text names none", () => {
        const parsed = parseShaderText(text({}, NODE_BODY), { place: EFFECT_PLACE });
        assert.strictEqual(parsed.ok && parsed.registration.descriptor.role, "effect");
        const alone = parseShaderText(text({}, NODE_BODY));
        assert.strictEqual(alone.ok && alone.registration.descriptor.role, "look", "with no place, a look");
    });

    it("makes text with a reach and no role an effect", () => {
        const parsed = parseShaderText(text({ reach: 2 }, NODE_BODY));
        assert.strictEqual(parsed.ok && parsed.registration.descriptor.role, "effect");
    });

    it("refuses a declared role the place does not take", () => {
        const parsed = parseShaderText(text({ role: "look" }, NODE_BODY), { place: EFFECT_PLACE });
        assert.deepEqual(parsed, {
            ok: false,
            problems: [{ code: "shader.target-mismatch", params: { expected: "effect", found: "look" } }],
        });
    });

    it("refuses an entry for another target than the place's", () => {
        const parsed = parseShaderText(text({}, EDGE_BODY), { place: { target: "node", role: "look" } });
        assert.deepEqual(parsed, {
            ok: false,
            problems: [{ code: "shader.target-mismatch", params: { expected: "node", found: "edge" } }],
        });
    });

    it("refuses an effect on a group, and a card on anything but a node look", () => {
        const group = parseShaderText(text({ role: "effect" }, "vec4 shade(GroupInput g) { return vec4(0.0); }"));
        assert.deepEqual(!group.ok && group.problems, [{ code: "shader.header-key", params: { key: "role" } }]);
        const card = parseShaderText(text({ geometry: "card" }, EDGE_BODY));
        assert.deepEqual(!card.ok && card.problems, [{ code: "shader.header-key", params: { key: "geometry" } }]);
    });
});

describe("motion is inferred from the input's time field", () => {
    it("reports a body that reads n.time as a loop", () => {
        const parsed = parseShaderText(text({}, "vec4 shade(NodeInput n) { return n.color * fract(n.time); }"));
        assert.deepEqual(parsed.ok && parsed.registration.descriptor.motion, { loop: {} });
    });

    it("lets a declared motion win", () => {
        const parsed = parseShaderText(
            text({ motion: "still" }, "vec4 shade(NodeInput n) { return n.color * fract(n.time); }"),
        );
        assert.deepEqual(parsed.ok && parsed.registration.descriptor.motion, {});
    });

    it("never counts a parameter named time", () => {
        const parsed = parseShaderText(
            text(
                { params: [{ name: "time", type: "number", default: 1 }] },
                "vec4 shade(NodeInput n) { return n.color * time; }",
            ),
        );
        // A parameter may not take a struct field's name; whatever the verdict, it never loops.
        assert.isFalse(parsed.ok && JSON.stringify(parsed.registration.descriptor.motion).includes("loop"));
        const named = parseShaderText(
            text(
                { params: [{ name: "speed", type: "number", default: 1 }] },
                "vec4 shade(NodeInput n) { float time = speed; return n.color * time; }",
            ),
        );
        assert.isTrue(named.ok);
        assert.isUndefined(named.ok ? named.registration.descriptor.motion : "refused");
    });
});

describe("shaderTemplate", () => {
    const places = [
        { target: "node", role: "look" },
        { target: "node", role: "look", geometry: "card" },
        { target: "node", role: "effect" },
        { target: "edge", role: "look" },
        { target: "edge", role: "effect" },
        { target: "group", role: "look" },
        { target: "background", role: "look" },
    ] as const;

    it.each(places.map((place) => [JSON.stringify(place), place] as const))("%s parses and checks", (_name, place) => {
        const parsed = parseShaderText(shaderTemplate(place), { place: { target: place.target, role: place.role } });
        assert.isTrue(parsed.ok, JSON.stringify(!parsed.ok && parsed.problems));
        if (parsed.ok) {
            const { descriptor } = parsed.registration;
            assert.strictEqual(descriptor.target, place.target);
            assert.strictEqual(descriptor.role, place.role);
            assert.strictEqual(descriptor.geometry, "geometry" in place ? place.geometry : undefined);
            assert.deepEqual(
                descriptor.params.map((param) => [param.name, param.type]),
                [["tint", "color"]],
            );
            assert.deepEqual(checkShaderBody(parsed.registration.glsl, drawingOf(descriptor)).problems, []);
            assert.isAtMost(shaderTemplate(place).split("\n").length, 20, "about 15 lines");
        }
    });
});

describe("registering", () => {
    it("lists a shader whose body is a loader before the body loads, then fills in what it read", async () => {
        let loads = 0;
        defineShader({
            id: "acme/lazy",
            target: "node",
            glsl: () => {
                loads++;
                return Promise.resolve("vec4 shade(NodeInput n) { return n.color * fract(n.time); }");
            },
        });
        assert.strictEqual(loads, 0);
        const listed = shaderDescriptor("acme/lazy");
        assert.strictEqual(listed?.target, "node");
        assert.strictEqual(listed?.role, "look");
        assert.include(
            shaderDescriptors().map((descriptor) => descriptor.id),
            "acme/lazy",
        );

        const source = await loadShaderSource("acme/lazy");
        assert.strictEqual(loads, 1);
        assert.include(source?.glsl ?? "", "fract(n.time)");
        assert.deepEqual(shaderDescriptor("acme/lazy")?.motion, { loop: {} });
        assert.include(shaderDescriptor("acme/lazy")?.reads ?? [], "color");
    });

    it("refuses a loader with no target, and a loaded body that fails the checks", async () => {
        try {
            defineShader({ id: "acme/nowhere", glsl: () => Promise.resolve(NODE_BODY) });
            assert.fail("it was registered");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        }

        defineShader({ id: "acme/broken", target: "node", glsl: () => Promise.resolve("vec4 paint() {}") });
        try {
            await loadShaderSource("acme/broken");
            assert.fail("it loaded");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        }
        const session = createGraphSession();
        assert.deepEqual(session.shaders.status("acme/broken").state, "failed");
        assert.strictEqual(session.shaders.status("acme/broken").problem?.code, "shader.entry-missing");
        session.dispose();
    });

    it("names a shader from its id's last segment when no name is given", () => {
        defineShader({ id: "acme/heat-map", glsl: NODE_BODY });
        assert.strictEqual(shaderDescriptor("acme/heat-map")?.plainName, "Heat map");
    });

    it("refuses to register over an id the element ships", () => {
        for (const id of ["pearl", "glass-marble"]) {
            try {
                registerShader({ descriptor: { id, plainName: "Mine", params: [] }, glsl: NODE_BODY });
                assert.fail("it was registered");
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.code === "E_DUPLICATE_PLUGIN", String(error));
            }
        }
    });

    it("registers the presets through the same checks, with their pictures and lazy bodies", async () => {
        for (const preset of SHADER_PRESETS) {
            const listed = shaderDescriptor(preset.id);
            assert.strictEqual(listed?.origin, "element");
            assert.strictEqual(listed?.thumbnail, preset.thumbnail);
        }

        const pearl = await loadShaderSource("pearl");
        assert.strictEqual(pearl?.glsl, await SHADER_PRESET_BODIES.pearl());
        const marble = await loadShaderSource("glass-marble");
        assert.strictEqual(marble?.lowDetail, await SHADER_PRESET_LOW_DETAIL["glass-marble"]());
    });
});

describe("a layer's plain shader parameters", () => {
    it("apply to whichever shader is drawn, merged over the defaults, the higher layer winning", async () => {
        defineShader({ id: "acme/heat", params: { hot: "#ff5500", cold: "#2255ff" }, glsl: NODE_BODY });
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.styles.add({
            name: "Heat",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shader": "acme/heat", "node.shaderParams": { "acme/heat": { cold: "#000000" } } },
        });
        await session.styles.add({
            name: "Hotter",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaderParams": { hot: "#ff0000" } },
        });
        const merged = session.styles.explain({ node: "a" }).merged["node.shaderParams"];
        assert.deepEqual(drawnShaderParams(merged, "acme/heat"), { hot: "#ff0000", cold: "#000000" });
        assert.deepEqual(session.styles.counts(session.styles.list()[1].id).undrawn, [], "a plain value is used");
        session.dispose();
    });
});

describe("a card and a shape: the topmost layer's is drawn", () => {
    it("names the lower layer's shape covered only while the card's layer is higher", async () => {
        defineShader({ id: "acme/card", geometry: "card", glsl: NODE_BODY });
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const card = (name: string) =>
            ({ name, target: "node", selector: { match: "everything" }, set: { "node.shader": "acme/card" } }) as const;
        const box = (name: string) =>
            ({ name, target: "node", selector: { match: "everything" }, set: { "node.shape": "box" } }) as const;

        const lowShape = await session.styles.add(box("Shape"));
        const highCard = await session.styles.add(card("Card"));
        const shape = session.styles.explain({ node: "a" }).channels.find((each) => each.channel === "node.shape");
        assert.strictEqual(shape?.coveredBy, highCard.id, "a card above covers the shape");
        assert.strictEqual(shape?.layerId, lowShape.id);

        session.dispose();
        const swapped = createGraphSession();
        await swapped.data.addNodes([{ id: "a" }]);
        await swapped.styles.add(card("Card"));
        await swapped.styles.add(box("Shape"));
        const drawn = swapped.styles.explain({ node: "a" }).channels.find((each) => each.channel === "node.shape");
        assert.isUndefined(drawn?.coveredBy, "a shape above a card is drawn");
        swapped.dispose();
    });
});

describe("text added for a place keeps its role when the project is saved", () => {
    it("writes the role the place supplied into the stored text", async () => {
        const session = createGraphSession();
        const body = text({}, "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 0.5); }");
        const added = await session.shaders.add(body, { place: EFFECT_PLACE });
        assert.isTrue(added.ok, JSON.stringify(added));
        const stored = session.shaders.list()[0];
        assert.strictEqual(stored.role, "effect");
        const reread = parseShaderText(await session.shaders.source(stored.id));
        assert.strictEqual(reread.ok && reread.registration.descriptor.role, "effect");
        session.dispose();
    });
});
