/**
 * @file Which groups a stack's group outlines draw (design/rendering/shader-styles.md sections
 * 2.2 and 3.2): a layer's matched nodes grouped by `groupBy`, bottom layer first, nodes without a
 * value in no group, disabled layers drawing nothing, and at most 32 groups across the stack.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { z } from "zod";

import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import { ColorStyle, ImageData } from "../../../src/config/common";
import { GraphBackground } from "../../../src/config/GraphStyle";
import { GROUP_OUTLINE_CAP, groupOutlinesOf } from "../../../src/session/styles/StylesApi";
import { FIELD_TARGETS } from "../../../src/shaders/runtime/scenePrograms";
import { defineShader } from "../../../src/simple/defineShader";
import { makeSession } from "../helpers";

beforeAll(() => {
    defineShader({
        id: "e6/hull",
        glsl: "vec4 shade(GroupInput g) { return vec4(g.color.rgb, 1.0) * step(0.5, g.field); }",
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

describe("groupOutlinesOf", () => {
    it("groups each group outline's nodes by groupBy, bottom layer first", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([
            { id: "a", community: 1, sub: "x" },
            { id: "b", community: 1 },
            { id: "c", community: 2, sub: "y" },
            { id: "d" },
        ]);
        assert.deepEqual(groupOutlinesOf(session.styles), [], "no group outline, no group outlines");

        const outer = await session.styles.add({
            name: "Communities",
            set: { "node.shaders": [{ shader: "e6/hull", groupBy: "data.community" }] },
            target: "node",
            selector: { match: "everything" },
        });
        const inner = await session.styles.add({
            name: "Subgroups",
            set: { "node.shaders": [{ shader: "e6/hull", groupBy: "data.sub" }] },
            target: "node",
            selector: { match: "has", path: "data.sub" },
        });
        await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });

        assert.deepEqual(
            groupOutlinesOf(session.styles).map(({ layer, groups, left }) => ({ layer, groups, left })),
            [
                {
                    layer: outer.id,
                    groups: [
                        { key: 1, members: ["a", "b"] },
                        { key: 2, members: ["c"] },
                    ],
                    left: 0,
                },
                {
                    layer: inner.id,
                    groups: [
                        { key: "x", members: ["a"] },
                        { key: "y", members: ["c"] },
                    ],
                    left: 0,
                },
            ],
            "node d has no community and is in no group",
        );

        await session.styles.update(inner.id, { enabled: false });
        assert.deepEqual(
            groupOutlinesOf(session.styles).map(({ layer }) => layer),
            [outer.id],
            "a disabled layer draws no group outline",
        );
        session.dispose();
    });

    it("draws one group outline around a layer without groupBy", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.styles.add({
            name: "All",
            set: { "node.shaders": [{ shader: "e6/hull" }] },
            target: "node",
            selector: { match: "everything" },
        });
        assert.deepEqual(groupOutlinesOf(session.styles)[0]?.groups, [{ key: null, members: ["a", "b"] }]);
        session.dispose();
    });

    it("draws at most 32 groups across the stack, lowest layers first", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes(Array.from({ length: 40 }, (_, i) => ({ id: `n${String(i)}`, group: i })));
        await session.styles.add({
            name: "Thirty",
            set: { "node.shaders": [{ shader: "e6/hull", groupBy: "data.group" }] },
            target: "node",
            selector: { match: "everything" },
        });
        const [layer] = groupOutlinesOf(session.styles);
        assert.lengthOf(layer.groups, GROUP_OUTLINE_CAP);
        assert.strictEqual(layer.left, 40 - GROUP_OUTLINE_CAP, "the rest are counted as left out");
        session.dispose();
    });

    it("reports a layer's groups past the cap as shader.group outline-cap, and nothing under it", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes(Array.from({ length: 33 }, (_, i) => ({ id: `n${String(i)}`, group: i })));
        const layer = await session.styles.add({
            name: "Thirty-three",
            set: { "node.shaders": [{ shader: "e6/hull", groupBy: "data.group" }] },
            target: "node",
            selector: { match: "everything" },
        });
        assert.deepInclude(session.styles.counts(layer.id).undrawn, {
            code: "shader.group-cap",
            params: { left: 1, limit: GROUP_OUTLINE_CAP },
        });

        await session.data.removeNodes(["n32"]);
        assert.notInclude(
            session.styles.counts(layer.id).undrawn.map(({ code }) => code),
            "shader.group-cap",
            "32 groups all draw",
        );
        session.dispose();
    });

    it("caps groups at what the field targets hold, so no field group is left out by them", () => {
        assert.strictEqual(GROUP_OUTLINE_CAP, FIELD_TARGETS * 4);
    });
});

describe("GraphBackground: a shader over the color or the image", () => {
    // The schema as origin/master released it (3.30.0): a strict union of a color and a skybox.
    const RELEASED_SCHEMA = z.discriminatedUnion("backgroundType", [
        z.strictObject({ backgroundType: z.literal("color"), color: ColorStyle }),
        z.strictObject({ backgroundType: z.literal("skybox"), data: ImageData }),
    ]);
    const RELEASED = [
        { backgroundType: "color", color: "#101014" },
        { backgroundType: "color", color: "black" },
        { backgroundType: "color", color: "whitesmoke" },
        { backgroundType: "color", color: "rgb(10, 20, 30)" },
        { backgroundType: "skybox", data: "https://example.com/sky.jpg" },
        { backgroundType: "skybox", data: "data:image/png;base64,iVBORw0KGgo=" },
    ];

    it("parses every background the released schema took, unchanged", () => {
        for (const background of RELEASED) {
            assert.deepEqual(GraphBackground.parse(background), RELEASED_SCHEMA.parse(background));
        }
    });

    it("takes a shader on the color member, with its parameters", () => {
        const parsed = GraphBackground.parse({
            backgroundType: "color",
            color: "black",
            shader: { id: "nebula", params: { drift: 0, gasA: "#2a0f4a", stars: true } },
        });
        assert.deepEqual(parsed, {
            backgroundType: "color",
            color: "#000000",
            shader: { id: "nebula", params: { drift: 0, gasA: "#2a0f4a", stars: true } },
        });
    });

    it("takes a color and a shader on the skybox member", () => {
        const parsed = GraphBackground.parse({
            backgroundType: "skybox",
            data: "https://example.com/sky.jpg",
            color: "red",
            shader: { id: "nebula" },
        });
        assert.deepEqual(parsed, {
            backgroundType: "skybox",
            data: "https://example.com/sky.jpg",
            color: "#FF0000",
            shader: { id: "nebula" },
        });
    });

    it("leaves the color out when none is set, so the element draws its default", () => {
        const parsed = GraphBackground.parse({ backgroundType: "color", shader: { id: "nebula" } });
        assert.deepEqual(parsed, { backgroundType: "color", shader: { id: "nebula" } });
    });

    it("has no shader member any more", () => {
        assert.isFalse(GraphBackground.safeParse({ backgroundType: "shader", shader: "nebula" }).success);
    });

    it("refuses a parameter name that could reach a prototype, and unknown members", () => {
        assert.isFalse(
            GraphBackground.safeParse({
                backgroundType: "color",
                shader: { id: "nebula", params: Object.fromEntries([["__proto__x", 1]]) },
            }).success,
        );
        assert.isFalse(
            GraphBackground.safeParse({ backgroundType: "color", shader: { id: "nebula", trust: "run" } }).success,
        );
        assert.isFalse(GraphBackground.safeParse({ backgroundType: "color", shader: { id: "" } }).success);
    });
});
