/**
 * @file What a model reads and what the reader is shown after a question: a run that answers a
 * question paints nothing unless asked, the nodes a reply names from a run's ranking are the ones
 * its chip selects, a call kept from running says which call stopped it, and a filter says how
 * much it hid.
 */

import { assert, describe, it } from "vitest";

import type { AiEffect } from "../../src/catalog/ai";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../helpers/assistant";

const DEGREE = { tool: "run_algorithm", args: { action: "run", name: "degree" } };

/**
 * A session and an assistant over it that keeps the conversation.
 * @returns The assistant.
 */
async function assistant(): Promise<ScriptedAssistant> {
    return new ScriptedAssistant(await assistantSession(undefined, ["assistant"]), { history: "memory", gate: false });
}

/**
 * The open conversation's effects that found something.
 * @param scripted - The assistant.
 * @returns The effects.
 */
function found(scripted: ScriptedAssistant): AiEffect[] {
    return (scripted.controller.getConversation()?.messages ?? [])
        .flatMap((message) => (message.role === "assistant" ? (message.effects ?? []) : []))
        .filter((effect) => effect.code === "AI_EFFECT_FOUND");
}

/**
 * Send a message whose model runs degree and then replies.
 * @param scripted - The assistant.
 * @param reply - Builds the reply from the run's ranking.
 */
async function rankThenReply(scripted: ScriptedAssistant, reply: (ranked: string[]) => string): Promise<void> {
    const { session } = scripted;
    // The reply is written when its turn comes, once the run exists, so it can name the ranking's ids.
    scripted.engine.push(callsTurn([DEGREE]), () =>
        textTurn(
            reply(
                session.runs
                    .get("degree")!
                    .result!.ranking("value")
                    .map((entry) => String(entry.id)),
            ),
        ),
    );
    await scripted.controller.execute("which are the most connected?");
}

describe("a question changes nothing on screen", () => {
    it("a run with no style argument adds no layer; style true colors", async () => {
        const scripted = await assistant();
        const before = scripted.session.styles.list().length;
        await scripted.say("which is the most connected?", [DEGREE]);
        assert.strictEqual(scripted.session.styles.list().length, before);
        assert.notProperty(scripted.lastResults().at(-1)?.data as object, "painted");

        const asked = await assistant();
        await asked.say("color by degree", [{ ...DEGREE, args: { ...DEGREE.args, style: true } }]);
        assert.isAbove(asked.session.styles.list().length, before);
    });
});

describe("the nodes a reply names from a run", () => {
    it("widen the run's chip to the first k of its ranking the reply names", async () => {
        const scripted = await assistant();
        await rankThenReply(scripted, (ranked) => `The three most connected are ${ranked.slice(0, 3).join(", ")}.`);
        const chip = found(scripted).at(-1);
        assert.deepEqual(chip?.params, { nodes: 3 });
        assert.strictEqual((await scripted.session.selection.count(chip!.target!)).nodes, 3);
    });

    it("keep the leader alone when the reply names only it", async () => {
        const scripted = await assistant();
        await rankThenReply(scripted, (ranked) => `${ranked[0]} is the most connected.`);
        assert.deepEqual(found(scripted).at(-1)?.params, { nodes: 1 });
    });
});

describe("a call kept from running", () => {
    it("names the call that stopped it, and changes nothing", async () => {
        const scripted = await assistant();
        await scripted.say("delete everything", [
            { tool: "edit_data", args: { action: "delete_all" } },
            { tool: "undo", args: { action: "undo", limit: 1 } },
        ]);
        const [deleted] = scripted.lastResults();
        assert.strictEqual(deleted.code, "AI_TOOL_NOT_RUN");
        assert.strictEqual(deleted.params.stoppedBy, "undo");
        assert.strictEqual(scripted.session.status.counts.nodes, 5);
    });
});

describe("a filter", () => {
    it("says it hid nothing when its rule matched everything", async () => {
        const scripted = await assistant();
        await scripted.say("hide the small ones", [
            { tool: "filter", args: { action: "show_only", where: "data.load >= `0`" } },
        ]);
        const data = scripted.lastResults().at(-1)?.data as Record<string, number>;
        assert.deepEqual(data, { visibleNodes: 5, visibleEdges: 5, hiddenNodes: 0, hiddenEdges: 0 });
    });

    it("counts what it hid", async () => {
        const scripted = await assistant();
        await scripted.say("show the servers", [
            { tool: "filter", args: { action: "show_only", where: "data.type == 'server'" } },
        ]);
        const data = scripted.lastResults().at(-1)?.data as Record<string, number>;
        assert.strictEqual(data.hiddenNodes, 3);
    });
});
