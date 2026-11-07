/**
 * @file A message about the whole graph after one about a selection tells the model its earlier
 * answers were narrowed, since only the newest facts are sent.
 */

import { assert, describe, it } from "vitest";

import { assistantSession, ScriptedAssistant, textTurn } from "../helpers/assistant";

const LINE = "Earlier messages in this conversation were about a selection.";

/**
 * Send messages in turn with `a` and `b` selected, and read the facts each one went with.
 * @param scopes - Each message's scope.
 * @returns The newest facts of each request.
 */
async function factsOf(...scopes: ("selection" | "graph")[]): Promise<string[]> {
    const session = await assistantSession(undefined, ["assistant"]);
    await session.selection.apply({ ids: ["a", "b"] });
    const assistant = new ScriptedAssistant(session, { gate: false, history: "memory" });
    const facts: string[] = [];
    for (const scope of scopes) {
        assistant.engine.push(textTurn("done"));
        await assistant.controller.execute("how many?", { scope });
        const part = assistant.engine.requests.at(-1)?.messages.at(-1)?.parts[0];
        assert.strictEqual(part?.type, "text");
        facts.push(part?.type === "text" ? part.text : "");
    }

    return facts;
}

describe("the scope line of a whole-graph message", () => {
    it("says earlier answers were narrowed after a message about a selection", async () => {
        const [selection, whole, again] = await factsOf("selection", "graph", "graph");

        assert.notInclude(selection, LINE);
        assert.include(whole, LINE);
        // A fact, never an order: a model quotes an order it reads inside <graph-data> to the reader.
        assert.notMatch(whole, /read again|add no condition/);
        assert.include(again, LINE);
    });

    it("stays as it was for a first message and after whole-graph messages", async () => {
        const [first, second] = await factsOf("graph", "graph");

        assert.include(first, "This message is about the whole graph");
        assert.notInclude(first, LINE);
        assert.notInclude(second, LINE);
    });

    it("leaves a message about a selection alone after one", async () => {
        const [, second] = await factsOf("selection", "selection");

        assert.notInclude(second, LINE);
    });
});
