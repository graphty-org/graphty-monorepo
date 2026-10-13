/**
 * @file A page's own approval buttons, clicked for real: with `approvals: "writes"` the assistant
 * holds an addition, the page draws Approve and Deny from `ai-approval-requested`, and the reader's
 * click decides whether the graph changes. The message continues after the click and resolves
 * with its final result.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { ExecutionResult } from "../../../src/ai/AiController";
import type { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { Graph } from "../../../src/Graph";
import { cleanupE2EGraph, createE2EGraph, DEFAULT_TEST_EDGES, DEFAULT_TEST_NODES } from "../../helpers/e2e-graph-setup";

describe("approval buttons a page draws", () => {
    let graph: Graph;
    let panel: HTMLElement;
    /** The answer the last click gave, once a button was clicked. */
    let decided: Promise<ExecutionResult> | undefined;

    beforeEach(async () => {
        ({ graph } = await createE2EGraph({ nodes: DEFAULT_TEST_NODES, edges: DEFAULT_TEST_EDGES, enableAi: false }));
        await graph.enableAiControl({ provider: "mock", approvals: "writes" });
        decided = undefined;
        panel = document.createElement("div");
        document.body.appendChild(panel);
        // The page's approval card: one Approve and one Deny button per request.
        graph.on("ai-approval-requested", ({ request }) => {
            for (const approve of [true, false]) {
                const button = document.createElement("button");
                button.textContent = approve ? "Approve" : "Deny";
                button.addEventListener("click", () => {
                    decided = graph.resolveAiApproval(request.id, { approve });
                    panel.replaceChildren();
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

    /**
     * Ask to add a node, which the policy holds.
     * @returns The message's first result.
     */
    async function askToAddNode(): Promise<ExecutionResult> {
        const provider = graph.getAiManager()?.getProvider() as MockLlmProvider;
        provider.setResponse("add a node", {
            text: "",
            toolCalls: [{ id: "0", name: "edit_data", arguments: { action: "add_nodes", records: [{ id: "F" }] } }],
        });
        return graph.aiCommand("add a node");
    }

    /**
     * The page's button with this text.
     * @param text - Its text.
     * @returns The button.
     */
    function button(text: string): HTMLButtonElement {
        const found = [...panel.querySelectorAll("button")].find((candidate) => candidate.textContent === text);
        assert.exists(found, `the page drew ${text}`);
        return found;
    }

    it("clicking Approve runs the held change", async () => {
        const held = await askToAddNode();
        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(graph.getSession().status.counts.nodes, 5, "nothing ran before the click");

        await userEvent.click(button("Approve"));
        assert.exists(decided, "the click answered the request");
        const result = await decided;

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(graph.getSession().status.counts.nodes, 6);
        assert.exists(graph.getSession().data.node("F"));
        assert.strictEqual(panel.childElementCount, 0);
    });

    it("clicking Deny leaves the graph unchanged", async () => {
        await askToAddNode();

        await userEvent.click(button("Deny"));
        assert.exists(decided, "the click answered the request");
        const result = await decided;

        assert.strictEqual(result.code, "AI_APPROVAL_DENIED", JSON.stringify(result));
        assert.strictEqual(graph.getSession().status.counts.nodes, 5);
        assert.strictEqual(panel.childElementCount, 0);
    });
});
