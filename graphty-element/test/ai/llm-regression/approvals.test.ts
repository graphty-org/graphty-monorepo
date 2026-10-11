/**
 * @file Approvals on a real model: with `approvals: "writes"` every change waits for the reader.
 * Approved, the message continues, the change lands and the model answers in text; denied, the
 * graph stays as it was and the model does not try the same change again in that message.
 */

import { afterEach, assert, describe, it } from "vitest";

import type { ExecutionResult } from "../../../src/ai/AiController";
import { assistantSession } from "../../helpers/assistant";
import { skipIfNoApiKey } from "../../helpers/llm-regression-env";
import { type CapturedToolCall, LlmRegressionTestHarness } from "../../helpers/llm-regression-harness";

/** A ring of six connected nodes and three nodes with no edges. */
const RING = ["r1", "r2", "r3", "r4", "r5", "r6"];
const LONERS = ["x1", "x2", "x3"];
const GRAPH = {
    nodes: [...RING, ...LONERS].map((id) => ({ id, label: id })),
    edges: RING.map((id, index) => ({ source: id, target: RING[(index + 1) % RING.length] })),
};

/** How many held batches one message may ask about before the test stops approving. */
const MOST_HOLDS = 4;

let harness: LlmRegressionTestHarness | undefined;

afterEach(() => {
    harness?.dispose();
    harness = undefined;
});

/**
 * A call's identity: its tool and the action or catalog entry it names, whatever order the model
 * wrote its arguments in.
 * @param call - The call.
 * @returns A key two calls making the same change share.
 */
function keyOf(call: CapturedToolCall): string {
    const { action, name } = call.arguments;
    return JSON.stringify([call.name, action ?? name ?? null]);
}

describe.skipIf(skipIfNoApiKey())("approvals on a real model", () => {
    it("approved: the nodes with no edges are removed and the model answers in text", async () => {
        const session = await assistantSession(GRAPH);
        harness = await LlmRegressionTestHarness.create({ session, approvals: "writes" });

        const first = await harness.testPrompt("remove every node with degree 0");
        assert.strictEqual(first.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(first.toolCalls));
        assert.strictEqual(session.status.counts.nodes, 9, "nothing ran before the approval");

        // Every write waits, so a model that runs an algorithm before removing asks more than once.
        let result: { code?: string; params?: ExecutionResult["params"]; llmText?: string | null } = first;
        for (let hold = 0; hold < MOST_HOLDS && result.code === "AI_CONFIRMATION_NEEDED"; hold++) {
            ({ result } = await harness.resolveApproval(String(result.params?.request), { approve: true }));
        }

        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.isNotEmpty(result.llmText ?? "", "the model answers in text");
        for (const loner of LONERS) {
            assert.notExists(session.data.node(loner), `${loner} is removed`);
        }

        for (const node of RING) {
            assert.exists(session.data.node(node), `${node} stays`);
        }
    });

    it("denied: the nodes stay and the model does not call the same write again", async () => {
        const session = await assistantSession(GRAPH);
        harness = await LlmRegressionTestHarness.create({ session, approvals: "writes" });

        const first = await harness.testPrompt("remove every node with degree 0");
        assert.strictEqual(first.code, "AI_CONFIRMATION_NEEDED", JSON.stringify(first.toolCalls));
        const held = first.toolCalls.at(-1);
        assert.exists(held);

        // The model may look again or ask about a different change, which waits too; it does not
        // make the one the reader declined.
        const { toolCalls } = await harness.resolveApproval(String(first.params?.request), { approve: false });

        assert.strictEqual(session.status.counts.nodes, 9, "every node stays");
        assert.notInclude(toolCalls.map(keyOf), keyOf(held), JSON.stringify(toolCalls));
    });
});
