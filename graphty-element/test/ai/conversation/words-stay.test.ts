/**
 * @file A turn keeps the words the reader read: a reply beside a request that waits, a reply beside
 * a failure, and a question once it no longer waits. What the model is sent stays valid.
 */

import { assert, describe, it } from "vitest";

import { type AiConversationMessage, conversationSnapshot } from "../../../src/ai/conversation/snapshot";
import type { TurnEvent, TurnRequest } from "../../../src/ai/engine/types";
import { assistantSession, callsTurn, ScriptedAssistant, textTurn } from "../../helpers/assistant";

const ADD_F = { tool: "edit_data", args: { action: "add_nodes", records: [{ id: "f" }] } };
const PAINT_NOBODY = {
    tool: "style",
    args: { action: "add", where: "data.type == 'nobody'", values: { "node.color": "#f00" } },
};
const QUESTION = { tool: "ask_reader", args: { question: "Which team?", choices: ["red", "blue"] } };

/**
 * What the assistant said in a conversation, reply by reply, leaving out replies with no words.
 * @param messages - The conversation's messages.
 * @returns The words.
 */
function said(messages: readonly AiConversationMessage[] | undefined): string[] {
    return (messages ?? []).flatMap((message) =>
        message.role === "assistant" && message.text !== "" ? [message.text] : [],
    );
}

/**
 * The model's own words a request sent.
 * @param request - The request.
 * @returns The words.
 */
function modelWords(request: TurnRequest | undefined): string[] {
    return (request?.messages ?? []).flatMap((message) =>
        message.parts.flatMap((part) => (part.type === "text" && part.origin === "model" ? [part.text] : [])),
    );
}

/**
 * Fails unless every call of a request is followed at once by its results.
 * @param request - The request.
 */
function assertPaired(request: TurnRequest | undefined): void {
    const messages = request?.messages ?? [];
    messages.forEach((message, index) => {
        const calls = message.parts.flatMap((part) => (part.type === "tool-call" ? [part.callId] : []));
        if (calls.length > 0) {
            const results = messages[index + 1]?.parts.flatMap((part) =>
                part.type === "tool-result" ? [part.callId] : [],
            );
            assert.deepStrictEqual(results, calls);
        }
    });
}

describe("a reply beside a request that waits", () => {
    it("stays in the snapshot, in order, while it waits and after the decision", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), {
            history: "memory",
            approvals: "writes",
        });
        const { controller, engine } = assistant;
        engine.push(
            [{ type: "text", delta: "Looking at it." }, ...callsTurn([ADD_F])],
            textTurn("Adding f needs your approval."),
            textTurn("Added f."),
        );
        const result = await controller.execute("add f");
        assert.strictEqual(result.code, "AI_CONFIRMATION_NEEDED");
        const words = ["Looking at it.", "Adding f needs your approval."];
        assert.deepStrictEqual(said(controller.getConversation()?.messages), words);

        await controller.resolveAiApproval(String(result.params?.request), { approve: true });

        assert.deepStrictEqual(said(controller.getConversation()?.messages), [...words, "Added f."]);
        assertPaired(engine.requests.at(-1));
        assert.deepStrictEqual(modelWords(engine.requests.at(-1)), words);
    });

    it("keeps the model's history valid for a message that ends the request", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), {
            history: "memory",
            approvals: "writes",
        });
        const { controller, engine } = assistant;
        engine.push(callsTurn([ADD_F]), textTurn("Adding f needs your approval."), textTurn("Left as it was."));
        await controller.execute("add f");
        await controller.execute("never mind");

        assertPaired(engine.requests.at(-1));
        assert.deepStrictEqual(said(controller.getConversation()?.messages), [
            "Adding f needs your approval.",
            "Left as it was.",
        ]);
    });
});

describe("a reply beside a failure", () => {
    it("stays above the failure, and the next message's model does not read it as standing", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        const { controller, engine } = assistant;
        engine.push(
            [{ type: "text", delta: "Adding f." }, ...callsTurn([ADD_F])],
            [{ type: "text", delta: "Painting nobody." }, ...callsTurn([PAINT_NOBODY], 1)],
            textTurn("All done."),
            textTurn("Next answer."),
        );
        const result = await controller.execute("add f and paint nobody");
        assert.isFalse(result.success);

        const failed = controller.getConversation()?.messages.at(-1);
        assert.strictEqual(failed?.role, "assistant");
        assert.strictEqual(failed?.role === "assistant" ? failed.text : "", "Adding f.\nPainting nobody.\nAll done.");
        assert.strictEqual(failed?.role === "assistant" ? failed.outcome?.code : "", "AI_TOOL_FAILED");

        await controller.execute("what now?");
        const request = engine.requests.at(-1);
        assert.deepStrictEqual(modelWords(request), []);
        assert.isTrue(
            request?.messages.some((message) =>
                message.parts.some(
                    (part) => part.type === "text" && part.text.startsWith("This request ended without an answer"),
                ),
            ),
        );
    });

    it("keeps what a turn had streamed when the turn fails", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory" });
        const { controller, engine } = assistant;
        const failing: TurnEvent[] = [
            { type: "text", delta: "The first half" },
            { type: "error", code: "AI_PROVIDER_ERROR", params: {}, cause: new Error("gone") },
        ];
        engine.push(failing);
        await controller.execute("tell me");

        assert.deepStrictEqual(said(controller.getConversation()?.messages), ["The first half"]);
    });
});

describe("a question", () => {
    it("is the waiting entry's while it waits and the reply's words once answered", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory", questions: true });
        const { controller, engine } = assistant;
        engine.push(
            [{ type: "text", delta: "There are two teams." }, ...callsTurn([QUESTION])],
            textTurn("Red it is."),
        );
        const asked = await controller.execute("color my team");
        assert.deepStrictEqual(said(controller.getConversation()?.messages), ["There are two teams."]);

        await controller.answerQuestion(String(asked.params?.request), "red");

        assert.deepStrictEqual(said(controller.getConversation()?.messages), [
            "There are two teams.\nWhich team?",
            "Red it is.",
        ]);
    });

    it("stays when the reader moves on without answering", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory", questions: true });
        const { controller, engine } = assistant;
        engine.push(callsTurn([QUESTION]), textTurn("Fine."));
        await controller.execute("color my team");
        await controller.execute("something else");

        assert.deepStrictEqual(said(controller.getConversation()?.messages), ["Which team?", "Fine."]);
    });

    it("is not said when its batch failed and it was never asked", async () => {
        const assistant = new ScriptedAssistant(await assistantSession(), { history: "memory", questions: true });
        const { controller, engine } = assistant;
        engine.push(callsTurn([PAINT_NOBODY, QUESTION]), textTurn("That failed."));
        await controller.execute("paint nobody");

        assert.notInclude(said(controller.getConversation()?.messages).join(" "), "Which team?");
    });

    it("stays while its answer runs: no result yet and its entry gone", () => {
        const record = {
            id: "c",
            key: "k",
            version: 1,
            messages: [
                {
                    id: "m1",
                    role: "assistant",
                    parts: [
                        {
                            type: "tool-call",
                            origin: "model",
                            callId: "q",
                            command: "ask_reader",
                            arguments: { question: "Which team?" },
                        },
                    ],
                },
            ],
            pending: [],
        };
        const { messages } = conversationSnapshot(record as never);
        assert.deepStrictEqual(said(messages), ["Which team?"]);
    });
});
