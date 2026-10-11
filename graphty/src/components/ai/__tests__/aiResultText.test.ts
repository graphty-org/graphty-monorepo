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

    it("skips a role it does not know", () => {
        const newer = {
            ...conversation,
            messages: [...conversation.messages, { id: "m4", role: "helper" }],
        } as unknown as AiConversationSnapshot;
        expect(aiTranscript({ conversation: newer, historyNotice: null })).toHaveLength(3);
    });
});
