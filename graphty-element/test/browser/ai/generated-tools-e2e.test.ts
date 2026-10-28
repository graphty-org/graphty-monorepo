/**
 * @file The assistant's generated tools on a real graph with Babylon.js rendering: the actions only
 * a renderer can answer (the camera, a capture, XR), a real algorithm run, and a held change the
 * host approves. The tool contract itself is tested on a session in Node
 * (`test/ai/tools/actions.contract.test.ts`); this is what it does on the element.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { AiApprovalRequestedEvent, AiExportReadyEvent } from "../../../src/events";
import type { Graph } from "../../../src/Graph";
import { cleanupE2EGraph, createE2EGraph, DEFAULT_TEST_EDGES, DEFAULT_TEST_NODES } from "../../helpers/e2e-graph-setup";

describe("the generated tools on a rendered graph", () => {
    let graph: Graph;

    beforeEach(async () => {
        ({ graph } = await createE2EGraph({ nodes: DEFAULT_TEST_NODES, edges: DEFAULT_TEST_EDGES, enableAi: true }));
    });

    afterEach(() => {
        cleanupE2EGraph();
    });

    /**
     * Send a message whose model makes these calls in one turn, then answers.
     * @param text - The message.
     * @param calls - The calls.
     * @returns The message's result.
     */
    async function say(
        text: string,
        calls: { name: string; arguments: Record<string, unknown> }[],
    ): ReturnType<Graph["aiCommand"]> {
        const provider = graph.getAiManager()?.getProvider() as MockLlmProvider;
        provider.setResponse(text, {
            text: "",
            toolCalls: calls.map((call, index) => ({ id: String(index), ...call })),
        });
        return graph.aiCommand(text);
    }

    it("registers the generated tools, not the hand-written ones", () => {
        const names = graph.getAiManager()?.getRegisteredCommands() ?? [];
        assert.includeMembers(names, ["catalog", "query", "run_algorithm", "style", "view", "undo"]);
        assert.notInclude(names, "queryGraph");
    });

    it("runs a real algorithm, which paints its own result, as one undo step", async () => {
        const session = graph.getSession();
        const steps = session.history.position;
        const result = await say("degree please", [{ name: "run_algorithm", arguments: { name: "degree" } }]);
        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.strictEqual(session.runs.list().at(-1)?.status, "succeeded");
        assert.isTrue(session.styles.list().some((layer) => layer.source.by === "run"));
        assert.strictEqual(session.history.position - steps, 1);
    });

    it("frames nodes, moves to a camera view and saves the camera, through the renderer", async () => {
        const result = await say("look around", [
            { name: "view", arguments: { action: "zoom_to", where: "data.type == 'server'" } },
            { name: "view", arguments: { action: "camera", preset: "topView" } },
            { name: "view", arguments: { action: "save", name: "overview" } },
        ]);
        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.isTrue(graph.getSession().views.has("overview"));
    });

    it("switches to 2D, and one undo takes the message back", async () => {
        await say("flat please", [{ name: "view", arguments: { action: "dimension", dimension: "2d" } }]);
        assert.strictEqual(graph.getSession().layout.dimension, "2d");
        await graph.getSession().undo();
        assert.strictEqual(graph.getSession().layout.dimension, "3d");
    });

    it("hands a screenshot to the page, and only its size to the model", async () => {
        const exported: AiExportReadyEvent[] = [];
        graph.on("ai-export-ready", (event) => exported.push(event));
        const result = await say("picture please", [
            { name: "capture", arguments: { action: "screenshot", width: 320, height: 240 } },
        ]);
        assert.strictEqual(result.code, "AI_COMPLETED", JSON.stringify(result));
        assert.lengthOf(exported, 1);
        assert.instanceOf(exported[0].data, Blob);
    });

    it("holds removing every node until the page approves, then removes them as one step", async () => {
        const requests: AiApprovalRequestedEvent[] = [];
        graph.on("ai-approval-requested", (event) => requests.push(event));
        const session = graph.getSession();
        const held = await say("remove everything", [
            { name: "edit_data", arguments: { action: "remove_nodes", where: "all" } },
        ]);
        assert.strictEqual(held.code, "AI_CONFIRMATION_NEEDED");
        assert.strictEqual(session.status.counts.nodes, 5);
        assert.lengthOf(requests, 1);

        const steps = session.history.position;
        const approved = await graph.resolveAiApproval(requests[0].request.id, { approve: true });
        assert.strictEqual(approved.code, "AI_COMPLETED");
        assert.strictEqual(session.status.counts.nodes, 0);
        assert.strictEqual(session.history.position - steps, 1);
    });

    it("says whether this device can enter VR or AR", async () => {
        const result = await say("vr support", [{ name: "immersive", arguments: { action: "support" } }]);
        assert.strictEqual(result.code, "AI_COMPLETED");
        assert.containsAllKeys(result.data as object, ["vr", "ar"]);
    });
});
