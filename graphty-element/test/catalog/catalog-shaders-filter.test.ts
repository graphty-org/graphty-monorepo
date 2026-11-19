/**
 * @file `catalog.shaders(filter)` lists shaders by what each declares, never by id: a custom
 * shader that declares place "replace" is listed with the replace shaders exactly as a built-in
 * one would be, whether a page registered it or a reader pasted it into the project.
 */

import { afterEach, assert, describe, it } from "vitest";

import { clearRegisteredShadersForTesting, registerShader } from "../../src/catalog/shaderRegistry";
import type { ShaderDescriptor } from "../../src/catalog/shaders";
import { createGraphSession, type GraphSession } from "../../src/session";

const BODY = "vec4 shade(NodeInput n) { return n.color; }";

/**
 * The ids a filter lists.
 * @param shaders - What the catalog listed.
 * @returns Their ids.
 */
function ids(shaders: readonly ShaderDescriptor[]): string[] {
    return shaders.map((descriptor) => descriptor.id);
}

/**
 * A shader's text.
 * @param header - Its header.
 * @returns The text.
 */
function text(header: Record<string, unknown>): string {
    return `/* graphty-shader 1\n${JSON.stringify({ params: [], ...header })}\n*/\n${BODY}\n`;
}

const sessions: GraphSession[] = [];

afterEach(() => {
    clearRegisteredShadersForTesting();
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * Check the filters against two shaders, one replacing a node and one over and around it.
 * @param session - The session whose catalog lists them.
 * @param replace - The replace shader's id.
 * @param overAround - The other's id.
 */
function assertListedByDeclaration(session: GraphSession, replace: string, overAround: string): void {
    const replacing = ids(session.catalog.shaders({ place: "replace" }));
    assert.include(replacing, replace);
    assert.notInclude(replacing, overAround);
    for (const descriptor of session.catalog.shaders({ place: "replace" })) {
        assert.strictEqual(descriptor.place, "replace", `${descriptor.id} declares replace`);
    }

    const around = ids(session.catalog.shaders({ allows: "around" }));
    assert.include(around, overAround);
    assert.include(around, replace, "a square place allows the other square places");
    assert.notInclude(ids(session.catalog.shaders({ allows: "paint" })), overAround);
    assert.include(ids(session.catalog.shaders({ target: "node", allows: "over" })), overAround);
    assert.notInclude(ids(session.catalog.shaders({ target: "edge" })), overAround);
    const views = session.catalog.shaders().find((descriptor) => descriptor.id === overAround)?.views;
    assert.deepStrictEqual(views, ["2d"]);
}

describe("catalog.shaders(filter)", () => {
    it("lists a registered custom shader by its declared place and places", () => {
        registerShader({
            descriptor: { id: "mine/swap", plainName: "Swap", place: "replace", params: [] },
            glsl: BODY,
        });
        registerShader({
            descriptor: {
                id: "mine/ring",
                plainName: "Ring",
                place: "over",
                places: ["over", "around"],
                views: ["2d"],
                params: [],
            },
            glsl: BODY,
        });
        const session = createGraphSession();
        sessions.push(session);
        assertListedByDeclaration(session, "mine/swap", "mine/ring");
    });

    it("lists a pasted project shader the same way", async () => {
        const session = createGraphSession();
        sessions.push(session);
        assert.isTrue((await session.shaders.add(text({ id: "user/swap", name: "Swap", place: "replace" }))).ok);
        const added = await session.shaders.add(
            text({ id: "user/ring", name: "Ring", place: "over", places: ["over", "around"], views: ["2d"] }),
        );
        assert.isTrue(added.ok, JSON.stringify(added));
        assertListedByDeclaration(session, "user/swap", "user/ring");
    });

    it("lists every shader with no filter", () => {
        const session = createGraphSession();
        sessions.push(session);
        assert.deepStrictEqual(ids(session.catalog.shaders({})), ids(session.catalog.shaders()));
    });
});
