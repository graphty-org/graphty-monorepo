/**
 * @file `styles.proposeEncoding` and `shaderParamChannel` for a shader parameter declared `varies`,
 * named by its encode address: what an editor's vary picker asks before it binds a parameter.
 */

import { assert, describe, it } from "vitest";

import { shaderParamChannel } from "../../../catalog";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession } from "../../../src/session";

describe("proposing a binding for a shader parameter", () => {
    it("proposes a column binding mapped onto the parameter's declared range, and it draws", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", uncertainty: 0 },
            { id: "b", uncertainty: 0.5 },
            { id: "c", uncertainty: 1 },
        ]);
        const proposal = session.styles.proposeEncoding({
            column: { kind: "node", name: "uncertainty" },
            channel: "node.effects.uncertainty-aura.intensity",
        });
        assert.isTrue(proposal.ok);
        if (!proposal.ok) {
            return;
        }
        assert.strictEqual(proposal.binding.by, "data.uncertainty");
        await session.styles.add({
            name: "Aura",
            target: "node",
            selector: { match: "everything" },
            set: { "node.effects": { "uncertainty-aura": true } },
            encode: { "node.effects.uncertainty-aura.intensity": proposal.binding },
        });
        const low = session.styles.explain({ node: "a" }).merged["node.effects"]?.["uncertainty-aura"];
        const high = session.styles.explain({ node: "c" }).merged["node.effects"]?.["uncertainty-aura"];
        assert.deepInclude(low, { intensity: 0 });
        assert.deepInclude(high, { intensity: 2 });
    });

    it("describes the parameter as a number on its map channel, and refuses what is not an address", () => {
        const descriptor = shaderParamChannel("node.shaderParams.glass-marble.spin");
        assert.strictEqual(descriptor.channel, "node.shaderParams");
        assert.strictEqual(descriptor.accepts, "number");
        assert.strictEqual(descriptor.min, 0);
        assert.strictEqual(descriptor.max, 2);
        try {
            shaderParamChannel("node.shaderParams.glass-marble.twist");
            assert.fail("a parameter that does not vary is refused");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_UNKNOWN_SHADER_PARAM");
        }
    });
});
