/**
 * @file A higher layer overrides one shader parameter of a use a lower layer gives, by its
 * address, and nothing else of it: the other parameters, and the use itself, stay as the lower
 * layer wrote them. With no use beneath, the override draws nothing.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { parseShaderParamAddress, shaderParamAddress } from "../../../src/session/styles/channels";

/**
 * The parameters node a's use of a shader is drawn with.
 * @param session - The session.
 * @param shader - The shader.
 * @returns Its parameters, or undefined when node a has no use of it.
 */
function paramsOf(session: GraphSession, shader: string): Record<string, unknown> | undefined {
    const use = session.styles.explain({ node: "a" }).merged["node.shaders"]?.find((each) => each.shader === shader);
    return use === undefined ? undefined : { ...use.params };
}

describe("one shader parameter, overridden from above", () => {
    it("changes only that parameter of the use beneath, and goes with it", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const lower = await session.styles.add({
            name: "Glass",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "glass-marble", params: { spin: 0.5, twist: 3 } }] },
        });
        await session.styles.add({
            name: "Faster",
            target: "node",
            selector: { match: "everything" },
            encode: { [shaderParamAddress("node", "glass-marble", "spin")]: { value: 1.5 } },
        });
        await session.styles.settled();
        assert.deepInclude(paramsOf(session, "glass-marble"), { spin: 1.5, twist: 3 });
        // The use draws the project's copy of the catalog shader, and the override reaches it.
        const copy = session.catalog.shaders().find((descriptor) => descriptor.id === "glass-marble");
        assert.strictEqual(copy?.copyOf, "glass-marble");

        await session.styles.remove(lower.id);
        await session.styles.settled();
        assert.isUndefined(paramsOf(session, "glass-marble"), "with no use beneath, the override draws nothing");
        session.dispose();
    });

    it("overrides a parameter that does not vary per element with one value", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.styles.add({
            name: "Glass",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "glass-marble", params: { spin: 0.5, twist: 3 } }] },
        });
        await session.styles.add({
            name: "Twisted",
            target: "node",
            selector: { match: "everything" },
            encode: { [shaderParamAddress("node", "glass-marble", "twist")]: { value: 5 } },
        });
        await session.styles.settled();
        assert.deepInclude(paramsOf(session, "glass-marble"), { spin: 0.5, twist: 5 });
        session.dispose();
    });

    it("round-trips its address", () => {
        const address = shaderParamAddress("edge", "mine/flow", "speed");
        assert.strictEqual(address, "edge.shaders.mine/flow.speed");
        assert.deepStrictEqual(parseShaderParamAddress(address), {
            channel: "edge.shaders",
            shader: "mine/flow",
            param: "speed",
        });
        assert.isNull(parseShaderParamAddress("node.color"));
    });
});
