/**
 * @file In-page code on a real model: with `tools.inPageCode` on, asked to compute the average
 * degree with code, the model calls `run_code` at least once, and its answer holds the session's
 * own mean degree (2E/N, to two decimals). The program runs on the real QuickJS sandbox.
 */

import { afterEach, assert, describe, it } from "vitest";

import { assistantSession, SMALL_GRAPH } from "../../helpers/assistant";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

describe.skipIf(skipIfNoApiKey())("in-page code on a real model", () => {
    it("computes the average degree with run_code, and answers the session's own value", async () => {
        // Six nodes and seven edges: a mean degree that is not a whole number.
        const session = await assistantSession({
            nodes: [...SMALL_GRAPH.nodes, { id: "f", label: "Foxtrot" }],
            edges: [...SMALL_GRAPH.edges, { source: "e", target: "f" }, { source: "f", target: "a" }],
        });
        harness = await LlmRegressionTestHarness.create({ session, tools: { inPageCode: true } });

        const result = await harness.testPrompt("use code to compute the average degree of the graph");

        const coded = result.toolCalls.filter((call) => call.name === "run_code");
        assert.isAbove(coded.length, 0, `run_code was called: ${JSON.stringify(result.toolCalls)}`);
        const ran = (result.requests ?? [])
            .flatMap((request) => request.messages.flatMap((message) => message.parts))
            .filter(
                (part) =>
                    part.type === "tool-result" && part.code === "AI_COMPLETED" && part.content.includes('"value"'),
            );
        assert.isAbove(ran.length, 0, "a program ran and returned a value");
        const { nodes, edges } = session.status.counts;
        const oracle = ((2 * edges) / nodes).toFixed(2);
        assert.include(result.llmText ?? "", oracle, `the answer holds ${oracle}`);
    });
});
