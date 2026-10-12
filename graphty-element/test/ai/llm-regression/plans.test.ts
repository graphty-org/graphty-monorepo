/**
 * @file The classifier router on a real model, with a read-only `counter` (query) and a `stylist`
 * (style): a counting question is handed to the counter alone and answered with the right count in
 * text; a find-then-color request is handed to both and ends with exactly the right nodes red.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { AiAgentsSetting } from "../../../src/ai/agents";
import type { AiEvent } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { redNodes } from "./red";

/** Degrees: a 4, b 3, c 2, e 2, d 1, f 1, g 1, and h and i 0. */
const GRAPH = {
    nodes: ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((id) => ({ id, label: id })),
    edges: [
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "a", target: "d" },
        { source: "a", target: "e" },
        { source: "b", target: "c" },
        { source: "b", target: "f" },
        { source: "e", target: "g" },
    ],
};

const AGENTS: AiAgentsSetting = {
    roles: [
        { name: "counter", purpose: "Reads and counts nodes and edges; never changes anything.", commands: ["query"] },
        { name: "stylist", purpose: "Colors and sizes nodes.", commands: ["style"] },
    ],
    router: "classifier",
};

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

/**
 * The helpers a message handed tasks to.
 * @param events - The events it emitted.
 * @returns Their names, each once, sorted.
 */
function helpersStarted(events: readonly AiEvent[]): string[] {
    return [...new Set(events.flatMap((event) => (event.type === "ai-agent-start" ? [event.agent] : [])))].sort();
}

describe.skipIf(skipIfNoApiKey())("the classifier router on a real model", () => {
    it("hands a counting question to the counter alone, and answers with the count", async () => {
        const session = await assistantSession(GRAPH);
        const events: AiEvent[] = [];
        harness = await LlmRegressionTestHarness.create({
            session,
            agents: AGENTS,
            onEvent: (event) => events.push(event),
        });

        const result = await harness.testPrompt("how many nodes have degree 0?");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result.toolCalls));
        assert.deepStrictEqual(helpersStarted(events), ["counter"]);
        assert.match(result.llmText ?? "", /\b(2|two)\b/i, "the answer names the count");
    });

    it("hands a find-then-color request to both, and colors exactly the right nodes", async () => {
        const session = await assistantSession(GRAPH);
        const events: AiEvent[] = [];
        harness = await LlmRegressionTestHarness.create({
            session,
            agents: AGENTS,
            onEvent: (event) => events.push(event),
        });

        const result = await harness.testPrompt("find the nodes with degree 3 or more, then color them red");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result.toolCalls));
        assert.isNotEmpty(result.llmText ?? "", "the model answers in text");
        assert.deepStrictEqual(helpersStarted(events), ["counter", "stylist"]);
        assert.deepStrictEqual(redNodes(session, GRAPH.nodes), ["a", "b"]);
    });
});
