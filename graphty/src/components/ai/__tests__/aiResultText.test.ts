import type { AiApprovalRequest, AiConversationSnapshot } from "@graphty/graphty-element/ai";
import type { AiResultCode, AiResultParams } from "@graphty/graphty-element/catalog";
import { describe, expect, it } from "vitest";

import { aiResultText, aiTranscript, approvalLines } from "../aiResultText";

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

    it("has words for web tools, a paused provider and the two new refusals", () => {
        const failed = (code: AiResultCode, params: AiResultParams): string =>
            aiResultText({ success: false, message: "", code, params });
        expect(failed("AI_PROVIDER_PAUSED", { provider: "anthropic" })).toBe(
            "The provider kept pausing its web search, so it did not finish. Sending the message again starts the search over.",
        );
        expect(failed("AI_HOSTED_TOOL_UNSUPPORTED", { provider: "mock", model: "m", tool: "web-search" })).toBe(
            "This provider cannot search the web, so the assistant works without web search.",
        );
        expect(failed("AI_HOSTED_TOOL_UNSUPPORTED", { provider: "mock", model: "m", tool: "web-fetch" })).toBe(
            "This provider cannot read web pages, so the assistant works without them.",
        );
        expect(failed("AI_HOSTED_TOOL_UNSUPPORTED", { provider: "mock", model: "m", tool: "in-page-code" })).toBe(
            "Code cannot run in this page, so the assistant works without it.",
        );
        expect(failed("AI_TOOL_DENIED_BY_POLICY", { tool: "edit_data", reason: "web-content" })).toBe(
            "The assistant read web content in this conversation, so it may not change the graph on its own. Nothing was changed.",
        );
        expect(failed("AI_TOOL_DENIED_BY_POLICY", { tool: "edit_data", reason: "in-page-code" })).toBe(
            "Code the assistant runs may only read the graph, so nothing was changed.",
        );
        expect(failed("AI_TOOL_DENIED_BY_POLICY", { tool: "edit_data" })).toBe(
            "That change is not allowed here, so nothing was changed.",
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
                sources: [],
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
                { id: "m1", role: "assistant", text: "3 nodes", calls: [], sources: [], agent: "counter" },
                {
                    id: "m2",
                    role: "assistant",
                    text: "",
                    sources: [],
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

    it("says when a research hand-off answered without searching the web", () => {
        const delegate = (hostedToolUses: number): AiConversationSnapshot => ({
            ...conversation,
            messages: [
                {
                    id: "m1",
                    role: "assistant",
                    text: "",
                    sources: [],
                    calls: [
                        {
                            command: "delegate",
                            arguments: { agent: "research" },
                            code: "AI_COMPLETED",
                            params: { agent: "research", toolCalls: 0, hostedToolUses },
                        },
                    ],
                },
            ],
        });
        expect(aiTranscript({ conversation: delegate(0), historyNotice: null })[0].content).toBe(
            'delegate {"agent":"research"}: Done, without searching or reading the web: the answer is from the model\'s own knowledge.',
        );
        expect(aiTranscript({ conversation: delegate(2), historyNotice: null })[0].content).toBe(
            'delegate {"agent":"research"}: Done.',
        );
    });

    it("skips a role it does not know", () => {
        const newer = {
            ...conversation,
            messages: [...conversation.messages, { id: "m4", role: "helper" }],
        } as unknown as AiConversationSnapshot;
        expect(aiTranscript({ conversation: newer, historyNotice: null })).toHaveLength(3);
    });

    it("lists an answer's sources under it, and words each tool the element left out once", () => {
        const searched: AiConversationSnapshot = {
            ...conversation,
            messages: [
                {
                    id: "m1",
                    role: "assistant",
                    text: "Paris",
                    calls: [],
                    sources: [{ tool: "web-search", url: "https://example.org/fr", title: "France" }],
                },
            ],
        };
        expect(
            aiTranscript({
                conversation: searched,
                historyNotice: null,
                capabilityNotices: [
                    {
                        code: "AI_HOSTED_TOOL_UNSUPPORTED",
                        params: { provider: "mock", model: "m", tool: "web-search" },
                    },
                ],
            }),
        ).toEqual([
            {
                id: "m1",
                role: "assistant",
                content: "Paris",
                sources: [{ tool: "web-search", url: "https://example.org/fr", title: "France" }],
            },
            {
                id: "capability-notice-0",
                role: "system",
                content: "This provider cannot search the web, so the assistant works without web search.",
            },
        ]);
    });
});

describe("approvalLines", () => {
    it("says a change held after the assistant read the web is one to check", () => {
        const request = {
            id: "a1",
            messageId: "m1",
            gate: "web-content",
            calls: [{ tool: "edit_data", arguments: { action: "remove_nodes", ids: ["e"] } }],
            preview: { removeNodes: 1 },
        } as unknown as AiApprovalRequest;
        expect(approvalLines(request)).toEqual([
            "The assistant read web content in this conversation. Approve only what you asked for.",
            'edit_data {"action":"remove_nodes","ids":["e"]}',
            "Removes 1 node.",
        ]);
    });
});
