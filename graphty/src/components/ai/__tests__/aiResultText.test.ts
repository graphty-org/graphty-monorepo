import type { AiConversationSnapshot } from "@graphty/graphty-element/ai";
import { describe, expect, it } from "vitest";

import { aiResultText, aiTranscript } from "../aiResultText";

describe("aiResultText", () => {
    it("shows the answer of a completed command", () => {
        expect(aiResultText({ success: true, message: "Laid out.", code: "AI_COMPLETED", params: {} })).toBe(
            "Laid out.",
        );
    });

    it("says what went wrong in the app's words, keyed by code", () => {
        const missing = { success: false, message: "Error: API key", code: "AI_KEY_MISSING" as const, params: {} };
        expect(aiResultText(missing)).toBe("Add an API key for this provider in Settings first.");
        expect(aiResultText({ success: false, message: "x", code: "AI_TOOL_FAILED", params: { tool: "t" } })).toBe(
            "The assistant could not answer.",
        );
    });

    it("has words for questions and the assistant's settings", () => {
        expect(aiResultText({ success: false, message: "", code: "AI_ANSWER_INVALID", params: {} })).toBe(
            "That answer is not one of the choices.",
        );
        expect(
            aiResultText({
                success: false,
                message: "",
                code: "AI_CONFIG_INVALID",
                params: { agent: "x", field: "router", reason: "unknown-agent" },
            }),
        ).toBe("The assistant's settings name something it cannot use, so nothing was sent.");
    });

    it("falls back to the general text for a result with no code", () => {
        expect(aiResultText({ success: false, message: "x" })).toBe("The assistant could not answer.");
        expect(aiResultText({ success: true, message: "Laid out." })).toBe("Laid out.");
    });

    it("shows the error when the request itself threw", () => {
        const error = new Error("AI Manager not initialized");
        expect(aiResultText({ success: false, message: "", code: "AI_NOT_ENABLED", params: {}, error })).toBe(
            "AI Manager not initialized",
        );
    });
});

describe("aiTranscript", () => {
    const conversation: AiConversationSnapshot = {
        id: "c1",
        key: "k",
        formatVersion: 1,
        messages: [
            { id: "m1", role: "reader", text: "count the nodes", via: "text" },
            {
                id: "m2",
                role: "assistant",
                text: "",
                calls: [],
                outcome: { code: "AI_KEY_MISSING", params: { provider: "openai" } },
            },
            { id: "m3", role: "reader", text: "try again", via: "voice" },
        ],
        pending: [],
    };

    it("draws the element's conversation, a failed message as an error in the app's words", () => {
        expect(aiTranscript({ conversation, historyNotice: null })).toEqual([
            { id: "m1", role: "user", content: "count the nodes" },
            {
                id: "m2",
                role: "assistant",
                content: "Add an API key for this provider in Settings first.",
                isError: true,
            },
            { id: "m3", role: "user", content: "try again" },
        ]);
    });

    it("labels a helper's message with its name and words a question and its answer", () => {
        const asked: AiConversationSnapshot = {
            ...conversation,
            messages: [
                { id: "m1", role: "assistant", text: "3 nodes", calls: [], agent: "counter" },
                {
                    id: "m2",
                    role: "assistant",
                    text: "",
                    calls: [
                        {
                            command: "ask_reader",
                            arguments: { question: "Which?" },
                            code: "AI_QUESTION_ASKED",
                            params: { request: "q-1" },
                        },
                    ],
                },
            ],
        };
        expect(aiTranscript({ conversation: asked, historyNotice: null })).toEqual([
            { id: "m1", role: "assistant", content: "3 nodes", agent: "counter" },
            {
                id: "m2",
                role: "assistant",
                content: 'ask_reader {"question":"Which?"}: The assistant asked you a question.',
            },
        ]);
    });

    it("skips a role it does not know", () => {
        const newer = {
            ...conversation,
            messages: [...conversation.messages, { id: "m4", role: "helper" }],
        } as unknown as AiConversationSnapshot;
        expect(aiTranscript({ conversation: newer, historyNotice: null })).toHaveLength(3);
    });
});
