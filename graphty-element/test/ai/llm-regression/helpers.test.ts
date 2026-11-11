/**
 * @file Helpers on a real model: with a read-only `counter` (query) and a `stylist` (style), "find
 * the nodes with degree 3 or more, then color them red" is handed to at least one helper and ends
 * with exactly those nodes red and an answer in text.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { AiEvent } from "../../../src/events";
import { assistantSession } from "../../helpers/assistant";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";
import { redNodes } from "./red";

/** Degrees: a 4, b 3, c 2, e 2, d 1, f 1, g 1. */
const GRAPH = {
    nodes: ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id, label: id })),
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

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

describe.skipIf(skipIfNoApiKey())("helpers on a real model", () => {
    it("a counter and a stylist color exactly the nodes of degree 3 or more red", async () => {
        const session = await assistantSession(GRAPH);
        const events: AiEvent[] = [];
        harness = await LlmRegressionTestHarness.create({
            session,
            agents: [
                {
                    name: "counter",
                    purpose: "Reads and counts nodes and edges; never changes anything.",
                    commands: ["query"],
                },
                { name: "stylist", purpose: "Colors and sizes nodes.", commands: ["style"] },
            ],
            onEvent: (event) => events.push(event),
        });

        const result = await harness.testPrompt("find the nodes with degree 3 or more, then color them red");

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result.toolCalls));
        assert.isNotEmpty(result.llmText ?? "", "the model answers in text");
        assert.isAtLeast(
            events.filter((event) => event.type === "ai-agent-start").length,
            1,
            "a helper was handed a task",
        );
        assert.deepStrictEqual(redNodes(session, GRAPH.nodes), ["a", "b"]);
    });
});
