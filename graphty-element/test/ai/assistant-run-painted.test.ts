/**
 * A run that paints says so: `painted` on `AI_EFFECT_RUN` and on the run's summary, how many of its
 * suggestions were added, omitted at 0. A reader who cannot see the drawing and a model that has to
 * report the change read it there.
 * @module test/ai/assistant-run-painted.test
 */

import { assert, describe, it } from "vitest";

import type { AiEffect } from "../../src/catalog/ai";
import { assistantSession, ScriptedAssistant } from "../helpers/assistant";

/** A hand-written layer that colors every node, which a run's color suggestion gives way to. */
const EVERYTHING_BLUE = {
    name: "Everything blue",
    selector: { match: "everything" },
    set: { "node.color": "#0000ff" },
} as const;

const DEGREE = { tool: "run_algorithm", args: { action: "run", name: "degree", style: true } };
const UNSTYLED = { tool: "run_algorithm", args: { action: "run", name: "degree", style: false } };
const APPLY = { tool: "style", args: { action: "apply_suggestion", run: "degree" } };

/**
 * A session and an assistant over it that records effects.
 * @returns The assistant.
 */
async function assistant(): Promise<ScriptedAssistant> {
    return new ScriptedAssistant(await assistantSession(undefined, ["assistant"]), { history: "memory", gate: false });
}

/**
 * Every run effect of the open conversation, in order.
 * @param scripted - The assistant.
 * @returns The effects.
 */
function runEffects(scripted: ScriptedAssistant): AiEffect[] {
    return (scripted.controller.getConversation()?.messages ?? [])
        .flatMap((message) => (message.role === "assistant" ? (message.effects ?? []) : []))
        .filter((effect) => effect.code === "AI_EFFECT_RUN");
}

/**
 * The data of the last call the model read.
 * @param scripted - The assistant.
 * @returns The data.
 */
function lastData(scripted: ScriptedAssistant): Record<string, unknown> {
    return scripted.lastResults().at(-1)?.data as Record<string, unknown>;
}

describe("a run says it painted", () => {
    it("a default run reports what it added, to the reader and to the model", async () => {
        const scripted = await assistant();
        await scripted.say("rank them", [DEGREE]);

        assert.strictEqual(runEffects(scripted)[0]?.params.painted, 1);
        assert.strictEqual(lastData(scripted).painted, 1);
    });

    it("a run that is not the batch's last call has its decision when it settles", async () => {
        const scripted = await assistant();
        await scripted.say("rank them and clear", [DEGREE, { tool: "select", args: { action: "clear" } }]);

        assert.strictEqual(runEffects(scripted)[0]?.params.painted, 1);
    });

    it("a styled run tells the model how many nodes its color reaches, so a reply cannot say fewer", async () => {
        const scripted = await assistant();
        await scripted.say("rank them", [DEGREE]);

        const params = scripted.lastResults().at(-1)?.params ?? {};
        assert.strictEqual(params.matched, scripted.session.status.counts.nodes);
    });

    it("style: false reports no painting", async () => {
        const scripted = await assistant();
        await scripted.say("rank them", [UNSTYLED]);

        assert.notProperty(runEffects(scripted)[0]?.params ?? {}, "painted");
        assert.notProperty(lastData(scripted), "painted");
        assert.notProperty(scripted.lastResults().at(-1)?.params ?? {}, "matched");
    });

    it("a suggestion a hand-written layer suppressed reports no painting", async () => {
        const scripted = await assistant();
        await scripted.session.styles.add(EVERYTHING_BLUE);
        await scripted.say("rank them", [DEGREE]);

        assert.notProperty(runEffects(scripted)[0]?.params ?? {}, "painted");
    });

    it("asking again after the reader removed the layer reports no painting", async () => {
        const scripted = await assistant();
        await scripted.say("rank them", [DEGREE]);
        const [layer] = scripted.session.runs.bindings("degree");
        assert.isDefined(layer);
        await scripted.session.styles.remove(layer);
        await scripted.say("rank them again", [DEGREE]);

        assert.notProperty(runEffects(scripted)[1]?.params ?? {}, "painted");
    });

    it("apply_suggestion reads as the run it painted, even when the run itself opted out", async () => {
        const scripted = await assistant();
        await scripted.say("rank them", [UNSTYLED]);
        await scripted.say("now color by it", [APPLY]);

        // Each also names the ranking's leader as found.
        const effects = (scripted.controller.getConversation()?.messages ?? [])
            .flatMap((message) => (message.role === "assistant" ? (message.effects ?? []) : []))
            .filter((effect) => effect.code !== "AI_EFFECT_FOUND");
        assert.deepEqual(
            effects.map((effect) => effect.code),
            ["AI_EFFECT_RUN", "AI_EFFECT_RUN"],
        );
        assert.strictEqual(effects[1]?.params.painted, 1);
        assert.strictEqual(lastData(scripted).painted, 1);
        assert.isAbove(scripted.session.runs.bindings("degree").length, 0);
    });
});
