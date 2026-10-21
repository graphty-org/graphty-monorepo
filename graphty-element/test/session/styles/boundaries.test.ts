/**
 * @file Which groups a stack's boundary layers draw (design/rendering/shader-styles.md sections
 * 2.2 and 3.2): a layer's matched nodes grouped by `groupBy`, bottom layer first, nodes without a
 * value in no group, disabled layers drawing nothing, and at most 32 groups across the stack.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import { GraphBackground } from "../../../src/config/GraphStyle";
import { boundariesOf, BOUNDARY_GROUP_CAP } from "../../../src/session/styles/StylesApi";
import { defineShader } from "../../../src/simple/defineShader";
import { makeSession } from "../helpers";

beforeAll(() => {
    defineShader({
        id: "e6/hull",
        kind: "boundary",
        glsl: "vec4 shade(BoundaryInput g) { return vec4(g.color.rgb, 1.0) * step(0.5, g.field); }",
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

describe("boundariesOf", () => {
    it("groups each boundary layer's nodes by groupBy, bottom layer first", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([
            { id: "a", community: 1, sub: "x" },
            { id: "b", community: 1 },
            { id: "c", community: 2, sub: "y" },
            { id: "d" },
        ]);
        assert.deepEqual(boundariesOf(session.styles), [], "no boundary layer, no boundaries");

        const outer = await session.styles.add({
            name: "Communities",
            target: "node",
            selector: { match: "everything" },
            boundary: { shader: "e6/hull", groupBy: "data.community" },
        });
        const inner = await session.styles.add({
            name: "Subgroups",
            target: "node",
            selector: { match: "has", path: "data.sub" },
            boundary: { shader: "e6/hull", groupBy: "data.sub" },
        });
        await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });

        assert.deepEqual(
            boundariesOf(session.styles).map(({ layer, groups, left }) => ({ layer, groups, left })),
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
            boundariesOf(session.styles).map(({ layer }) => layer),
            [outer.id],
            "a disabled layer draws no boundary",
        );
        session.dispose();
    });

    it("draws one boundary around a layer without groupBy", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.styles.add({
            name: "All",
            target: "node",
            selector: { match: "everything" },
            boundary: { shader: "e6/hull" },
        });
        assert.deepEqual(boundariesOf(session.styles)[0]?.groups, [{ key: null, members: ["a", "b"] }]);
        session.dispose();
    });

    it("draws at most 32 groups across the stack, lowest layers first", async () => {
        const { session } = makeSession({ directed: false });
        await session.data.addNodes(Array.from({ length: 40 }, (_, i) => ({ id: `n${String(i)}`, group: i })));
        await session.styles.add({
            name: "Thirty",
            target: "node",
            selector: { match: "everything" },
            boundary: { shader: "e6/hull", groupBy: "data.group" },
        });
        const [layer] = boundariesOf(session.styles);
        assert.lengthOf(layer.groups, BOUNDARY_GROUP_CAP);
        assert.strictEqual(layer.left, 40 - BOUNDARY_GROUP_CAP, "the rest are counted as left out");
        session.dispose();
    });
});

describe("GraphBackground: the shader member", () => {
    it("takes a shader id, its parameters and a color drawn until it draws", () => {
        const parsed = GraphBackground.parse({
            backgroundType: "shader",
            shader: "nebula",
            params: { drift: 0, gasA: "#2a0f4a", stars: true },
            color: "black",
        });
        assert.deepEqual(parsed, {
            backgroundType: "shader",
            shader: "nebula",
            params: { drift: 0, gasA: "#2a0f4a", stars: true },
            color: "#000000",
        });
    });

    it("refuses a parameter name that could reach a prototype, and unknown members", () => {
        assert.isFalse(
            GraphBackground.safeParse({
                backgroundType: "shader",
                shader: "nebula",
                params: Object.fromEntries([["__proto__x", 1]]),
            }).success,
        );
        assert.isFalse(GraphBackground.safeParse({ backgroundType: "shader", shader: "nebula", trust: "run" }).success);
        assert.isFalse(GraphBackground.safeParse({ backgroundType: "shader", shader: "" }).success);
    });
});
