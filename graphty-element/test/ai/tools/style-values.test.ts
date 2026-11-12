/**
 * @file The style tool's `values` as a live model is told about it: the common channels listed by
 * name and type, so "make all the nodes red" is filled right the first time (an object with no
 * listed properties was sent as `{}`), and catalog search for the request leads to the color channel.
 */

import { assert, describe, it } from "vitest";

import { CommandRegistry } from "../../../src/ai/commands";
import { installAssistantTools } from "../../../src/ai/tools/install";
import { buildToolset } from "../../../src/ai/tools/toolset";
import { liveTools } from "../../../src/ai/voice/liveTurns";
import { assistantSession, ScriptedAssistant } from "../../helpers/assistant";
import { redNodes } from "../llm-regression/red";

const NODES = ["n1", "n2", "n3"].map((id) => ({ id }));

describe("the style tool's values", () => {
    it("lists the common channels with their types in the schema a live model is sent", async () => {
        const session = await assistantSession({ nodes: NODES, edges: [] });
        const registry = new CommandRegistry();
        installAssistantTools(registry, session);
        const style = liveTools(registry, "standard").find((tool) => tool.name === "style");
        const { values } = (style?.jsonSchema as { properties: Record<string, { properties?: object }> }).properties;
        assert.deepStrictEqual(values.properties, {
            "node.color": { type: ["string", "null"] },
            "node.size": { type: ["number", "null"] },
            "edge.color": { type: ["string", "null"] },
            "edge.width": { type: ["number", "null"] },
        });
    });

    it("paints every node from a well-formed call, in one undo step", async () => {
        const session = await assistantSession({ nodes: NODES, edges: [] });
        const assistant = new ScriptedAssistant(session);
        await assistant.say("make all the nodes red", [
            { tool: "style", args: { action: "add", where: "all", values: { "node.color": "red" } } },
        ]);
        assert.strictEqual(assistant.lastResults()[0].code, "style.add-layer", JSON.stringify(assistant.lastResults()));
        assert.deepStrictEqual(redNodes(session, NODES), ["n1", "n2", "n3"]);
        await session.undo();
        assert.deepStrictEqual(redNodes(session, NODES), []);
    });

    it("still takes a channel it does not list, and refuses an empty one", async () => {
        const session = await assistantSession({ nodes: NODES, edges: [] });
        const assistant = new ScriptedAssistant(session);
        await assistant.say(
            "style",
            [{ tool: "style", args: { action: "add", where: "all", values: { "node.opacity": 0.5 } } }],
            [{ tool: "style", args: { action: "add", where: "all", values: {} } }],
        );
        assert.deepStrictEqual(
            assistant.lastResults().map((read) => read.code),
            ["style.add-layer", "AI_ARG_INVALID"],
        );
    });

    it("is what catalog search finds first for 'make all the nodes red'", async () => {
        const session = await assistantSession({ nodes: NODES, edges: [] });
        const [hit] = buildToolset(session).index.search("make all the nodes red");
        assert.deepInclude(hit, { kind: "channel", name: "node.color", tool: "style", action: "add" });
    });
});
