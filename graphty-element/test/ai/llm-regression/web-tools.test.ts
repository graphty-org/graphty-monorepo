/**
 * @file Web tools on a real model: with `webSearch: true` the main model hands the question to the
 * built-in research helper, whose search at the provider returns https sources and the answer;
 * with `webFetch: true` on Google, whose URL context does not hand its results back, web fetch is
 * left out of every request and reported once.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { AiEvent, AiHostedToolResultEvent } from "../../../src/events";
import { getLlmRegressionProvider, skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

describe.skipIf(skipIfNoApiKey())("web tools on a real model", () => {
    it("searches the web through the research helper, with https sources, and answers 1889", async () => {
        const events: AiEvent[] = [];
        harness = await LlmRegressionTestHarness.create({
            tools: { webSearch: true },
            onEvent: (event) => events.push(event),
        });

        const result = await harness.testPrompt("Search the web for the year the Eiffel Tower opened and tell me");

        const searched = events.filter(
            (event): event is AiHostedToolResultEvent => event.type === "ai-hosted-tool-result",
        );
        assert.isTrue(
            searched.some(
                (event) => event.status === "done" && event.sources.some((source) => source.url.startsWith("https://")),
            ),
            `a search returned an https source: ${JSON.stringify(searched)}`,
        );
        assert.include(result.llmText ?? "", "1889");
    });

    it.skipIf(getLlmRegressionProvider() !== "google")(
        "leaves web fetch out of every request on Google and reports it once",
        async () => {
            const events: AiEvent[] = [];
            harness = await LlmRegressionTestHarness.create({
                tools: { webFetch: true },
                onEvent: (event) => events.push(event),
            });

            const result = await harness.testPrompt(
                "Read https://en.wikipedia.org/wiki/Eiffel_Tower and say when it opened",
            );

            for (const request of result.requests ?? []) {
                assert.isFalse(
                    (request.hostedTools ?? []).some((tool) => tool.tool === "web-fetch"),
                    "no request carries web fetch (url_context)",
                );
            }

            const unavailable = events.filter((event) => event.type === "ai-capability-unavailable");
            assert.deepStrictEqual(
                unavailable.map((event) => event.type === "ai-capability-unavailable" && event.tool),
                ["web-fetch"],
            );
        },
    );
});
