/**
 * @file A selector over a run that is gone refuses instead of matching nothing: after the reader's
 * Undo took a run back, a model that still names it gets `AI_UNKNOWN_RUN`, and nothing is hidden.
 */

import { assert, describe, it } from "vitest";

import { assistantSession, ScriptedAssistant } from "../helpers/assistant";

describe("a selector over a run an Undo took back", () => {
    it("refuses with AI_UNKNOWN_RUN and hides nothing", async () => {
        const session = await assistantSession(undefined, ["assistant"]);
        const scripted = new ScriptedAssistant(session, { history: "memory", gate: false });
        await scripted.say("rank them", [{ tool: "run_algorithm", args: { action: "run", name: "degree" } }]);
        await session.undo();
        assert.deepEqual(session.runs.list(), []);

        await scripted.say("hide the weak ones", [
            { tool: "filter", args: { action: "show_only", on: "node", where: "results.degree.value >= `2`" } },
        ]);

        assert.strictEqual(scripted.lastResults().at(-1)?.code, "AI_UNKNOWN_RUN");
        assert.strictEqual(session.status.counts.visibleNodes, session.status.counts.nodes);
    });
});
