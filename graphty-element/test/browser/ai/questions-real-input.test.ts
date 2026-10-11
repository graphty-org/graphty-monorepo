/**
 * @file A page's own question buttons, clicked for real: with `questions: true` the model asks
 * which node to add, the page draws one button per choice from `ai-question-asked`, and the
 * reader's click answers it; the message continues and changes the graph as scripted.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { ExecutionResult } from "../../../src/ai/AiController";
import type { Graph } from "../../../src/Graph";
import { cleanupE2EGraph, createE2EGraph, DEFAULT_TEST_EDGES, DEFAULT_TEST_NODES } from "../../helpers/e2e-graph-setup";
import { QueuedProvider } from "../../helpers/queued-provider";

describe("question buttons a page draws", () => {
    let graph: Graph;
    let panel: HTMLElement;
    let provider: QueuedProvider;
    /** The answer the last click gave, once a button was clicked. */
    let answered: Promise<ExecutionResult> | undefined;

    beforeEach(async () => {
        ({ graph } = await createE2EGraph({ nodes: DEFAULT_TEST_NODES, edges: DEFAULT_TEST_EDGES, enableAi: false }));
        provider = new QueuedProvider();
        await graph.enableAiControl({ provider: "mock", providerInstance: provider, questions: true });
        answered = undefined;
        panel = document.createElement("div");
        document.body.appendChild(panel);
        // The page's question card: one button per choice, answering by the choice's value.
        graph.on("ai-question-asked", ({ request }) => {
            for (const choice of request.choices) {
                const button = document.createElement("button");
                button.textContent = choice;
                button.addEventListener("click", () => {
                    answered = graph.answerAiQuestion(request.id, choice);
                });
                panel.appendChild(button);
            }
        });
        graph.on("ai-pending-resolved", () => {
            panel.replaceChildren();
        });
    });

    afterEach(() => {
        panel.remove();
        cleanupE2EGraph();
    });

    it("draws one button per choice, and clicking one continues the message", async () => {
        provider.queue.push(
            {
                text: "",
                toolCalls: [
                    {
                        id: "q",
                        name: "ask_reader",
                        arguments: { question: "Add which node?", choices: ["F", "G", "H"] },
                    },
                ],
            },
            {
                text: "",
                toolCalls: [
                    { id: "add", name: "edit_data", arguments: { action: "add_nodes", records: [{ id: "G" }] } },
                ],
            },
            { text: "Added G.", toolCalls: [] },
        );
        const asked = await graph.aiCommand("add a node");
        assert.strictEqual(asked.code, "AI_QUESTION_ASKED", JSON.stringify(asked));
        assert.deepStrictEqual(
            [...panel.querySelectorAll("button")].map((button) => button.textContent),
            ["F", "G", "H"],
        );
        assert.strictEqual(graph.getSession().status.counts.nodes, 5, "nothing ran before the click");

        const choice = [...panel.querySelectorAll("button")].find((button) => button.textContent === "G");
        assert.exists(choice);
        await userEvent.click(choice);
        assert.exists(answered, "the click answered the question");
        const result = await answered;

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.exists(graph.getSession().data.node("G"));
        assert.strictEqual(graph.getSession().status.counts.nodes, 6);
        assert.strictEqual(panel.childElementCount, 0, "the card is gone once answered");
    });
});
