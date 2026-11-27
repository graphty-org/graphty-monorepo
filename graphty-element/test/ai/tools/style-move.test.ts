/**
 * @file The style tool's `move` asked for the place a layer already holds: the bottom for the
 * lowest layer it may move, the top for the highest, or right above the layer it already sits on.
 * Each succeeds and changes nothing, instead of the stack's refusal to move a layer below itself.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../../session";
import { assistantSession, ScriptedAssistant } from "../../helpers/assistant";

const NODES = ["n1", "n2"].map((id) => ({ id }));

/**
 * The stack's layer ids, bottom first.
 * @param session - The session.
 * @returns The ids.
 */
function stack(session: GraphSession): string[] {
    return session.styles.list().map((layer) => layer.id);
}

/**
 * A session with two assistant layers, "Reds" below "Blues".
 * @returns The session and its assistant.
 */
async function twoLayers(): Promise<{ session: GraphSession; assistant: ScriptedAssistant }> {
    const session = await assistantSession({ nodes: NODES, edges: [] });
    const assistant = new ScriptedAssistant(session);
    await assistant.say(
        "add",
        [{ tool: "style", args: { action: "add", where: "all", name: "Reds", values: { "node.color": "red" } } }],
        [{ tool: "style", args: { action: "add", where: "all", name: "Blues", values: { "node.size": 2 } } }],
    );
    return { session, assistant };
}

describe("the style tool's move to where a layer already is", () => {
    it("moves the lowest layer to the bottom as a no-op", async () => {
        const { session, assistant } = await twoLayers();
        const before = stack(session);
        await assistant.say("move reds to the bottom", [
            { tool: "style", args: { action: "move", layer: "Reds", position: "bottom" } },
        ]);
        const [result] = assistant.lastResults();
        assert.strictEqual(result.code, "AI_OK", JSON.stringify(result));
        assert.deepInclude(result.params, { moved: false });
        assert.deepStrictEqual(stack(session), before);
    });

    it("moves a layer above the one it already sits on as a no-op", async () => {
        const { session, assistant } = await twoLayers();
        const before = stack(session);
        await assistant.say("move blues above reds", [
            { tool: "style", args: { action: "move", layer: "Blues", position: "above", relativeTo: "Reds" } },
        ]);
        const [result] = assistant.lastResults();
        assert.strictEqual(result.code, "AI_OK", JSON.stringify(result));
        assert.deepInclude(result.params, { moved: false });
        assert.deepStrictEqual(stack(session), before);
    });

    it("moves the highest layer to the top without a refusal", async () => {
        const { session, assistant } = await twoLayers();
        const before = stack(session);
        await assistant.say("move blues to the top", [
            { tool: "style", args: { action: "move", layer: "Blues", position: "top" } },
        ]);
        const [result] = assistant.lastResults();
        assert.strictEqual(result.code, "AI_OK", JSON.stringify(result));
        assert.deepStrictEqual(stack(session), before);
    });

    it("still moves a layer that is not at the bottom", async () => {
        const { session, assistant } = await twoLayers();
        const before = stack(session);
        await assistant.say("move blues to the bottom", [
            { tool: "style", args: { action: "move", layer: "Blues", position: "bottom" } },
        ]);
        const [result] = assistant.lastResults();
        assert.strictEqual(result.code, "AI_OK", JSON.stringify(result));
        assert.deepInclude(result.params, { moved: true });
        assert.notDeepEqual(stack(session), before);
    });
});
