/**
 * @file A read the model was refused and then answered past is not a failed message, and a count
 * over a rule that matches nothing answers 0.
 */

import { assert, describe, it } from "vitest";

import { assistantSession, ScriptedAssistant, SMALL_GRAPH } from "../helpers/assistant";

/** A selector the parser refuses: `!` binds tighter than the dot. */
const REFUSED_READ = { tool: "query", args: { action: "nodes", where: "!data.type" } };

describe("a message whose last read was refused", () => {
    it("stands when the model answers past it", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(SMALL_GRAPH));
        const { result } = await assistant.say("how many servers?", [REFUSED_READ]);
        assert.strictEqual(assistant.lastResults()[0].code, "AI_BAD_SELECTOR");
        assert.isTrue(result.success);
        assert.strictEqual(result.code, "AI_COMPLETED");
    });

    it("still fails when the failed call was a write", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(SMALL_GRAPH));
        const { result } = await assistant.say("paint them", [
            {
                tool: "style",
                args: { action: "add", where: "data.type == 'nobody'", values: { "node.color": "#f00" } },
            },
        ]);
        assert.isFalse(result.success);
        assert.strictEqual(result.code, "AI_TOOL_FAILED");
    });
});

describe("a count over a rule that matches nothing", () => {
    it("answers 0", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(SMALL_GRAPH));
        const { result } = await assistant.say("how many?", [
            { tool: "query", args: { action: "count", where: "data.load > `100`" } },
        ]);
        assert.isTrue(result.success);
        assert.deepEqual(assistant.lastResults()[0].data, { nodes: 0, edges: 0, edgesAmong: 0, exact: true });
    });
});
