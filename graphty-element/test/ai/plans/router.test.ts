/**
 * @file The `"classifier"` router: one turn before the message, offering only `route`, picks the
 * helpers; the controller runs its pick as hand-offs of graphty's own, then the main model answers.
 * No pick leaves the message to the main model alone. Every case runs on the scripted engine and on
 * `LlmProviderEngine` over a `MockLlmProvider`.
 */

import { assert, describe, it } from "vitest";

import type { TurnRequest } from "../../../src/ai/engine/types";
import { turnTools } from "../../../src/ai/runConversation";
import { assistantSession } from "../../helpers/assistant";
import { answersOf, COUNT, COUNTER, fakeDriver, Harness, lastResults, mockDriver, STYLE_RED, STYLIST } from "./driver";

/**
 * The text of a helper's task: the last part of its first message.
 * @param request - The helper's first request.
 * @returns The task.
 */
function taskOf(request: TurnRequest): string {
    const part = request.messages[0].parts.at(-1);
    return part?.type === "text" ? part.text : "";
}

describe.each([
    ["the scripted engine", fakeDriver],
    ["LlmProviderEngine over MockLlmProvider", mockDriver],
])("the classifier router on %s", (_name, driver) => {
    it("offers only route, and runs the helpers it picks before the main model", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: { roles: [COUNTER, STYLIST], router: "classifier" },
        });
        harness.driver.push(
            { calls: [{ tool: "route", args: { agents: ["counter"] } }] },
            { calls: [COUNT] },
            { text: "There are 2 servers." },
            { text: "Two servers." },
        );

        const result = await harness.controller.execute("how many servers?");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(result.llmText, "Two servers.");
        const [classifier, helper, , main] = harness.driver.requests;
        assert.deepStrictEqual(
            classifier.tools.map((tool) => tool.name),
            ["route"],
        );
        assert.deepInclude(classifier.messages[0].parts[0], {
            type: "text",
            origin: "reader",
            text: "how many servers?",
        });
        assert.include(helper.system, COUNTER.purpose);
        assert.include(taskOf(helper), "how many servers?");
        assert.deepStrictEqual(harness.agentEvents(), ["ai-agent-start:counter", "ai-agent-end:counter"]);
        // The hand-off is graphty's own, and the main model reads the helper's answer as its result.
        const handOff = main.messages.at(-2)?.parts[0];
        assert.deepInclude(handOff, { type: "tool-call", origin: "graphty", command: "delegate" });
        assert.strictEqual(lastResults(main)[0].content.data?.answer, "There are 2 servers.");
    });

    it("a sequence pick runs its helpers one after another, the later told what the earlier found", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: { roles: [COUNTER, STYLIST], router: "classifier" },
        });
        const layers = session.styles.list().length;
        harness.driver.push(
            { calls: [{ tool: "route", args: { agents: ["counter", "stylist"], order: "sequence" } }] },
            { text: "The red team is a and b." },
            { calls: [STYLE_RED] },
            { text: "Colored a and b red." },
            { text: "Done." },
        );

        const result = await harness.controller.execute("find the red team and color it red");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.deepStrictEqual(harness.agentEvents(), [
            "ai-agent-start:counter",
            "ai-agent-end:counter",
            "ai-agent-start:stylist",
            "ai-agent-end:stylist",
        ]);
        const stylist = harness.driver.requests[2];
        assert.include(answersOf(stylist), "The red team is a and b.");
        assert.strictEqual(taskOf(stylist), "find the red team and color it red");
        // One helper at a time may write.
        assert.strictEqual(session.styles.list().length, layers + 1);
    });

    it("counts the classifier's turn in the message's tokens", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), { agents: { roles: [COUNTER], router: "classifier" } });
        harness.driver.push(
            { calls: [{ tool: "route", args: { agents: ["counter"] } }], usage: { input: 30, output: 3 } },
            { text: "2.", usage: { input: 20, output: 2 } },
            { text: "Two.", usage: { input: 100, output: 1 } },
        );

        const result = await harness.controller.execute("count");

        assert.deepStrictEqual(result.usage, { inputTokens: 150, outputTokens: 6 });
    });

    it("no pick leaves the message to the main model alone", async () => {
        const session = await assistantSession();
        const harness = new Harness(session, driver(), {
            agents: { roles: [COUNTER, STYLIST], router: "classifier" },
        });
        harness.driver.push({ text: "none" }, { text: "Hello." });

        const result = await harness.controller.execute("hi");

        assert.strictEqual(result.llmText, "Hello.");
        assert.lengthOf(harness.driver.requests, 2);
        assert.deepStrictEqual(harness.agentEvents(), []);
        const main = harness.driver.requests[1];
        assert.deepStrictEqual(
            main.tools.map((tool) => tool.name),
            [...turnTools(harness.registry, "standard", []).map((command) => command.name), "delegate"],
        );
        assert.lengthOf(main.messages, 1, "only the reader's message");
    });
});
