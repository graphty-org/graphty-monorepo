import type { AiConversationSnapshot } from "@graphty/graphty-element/ai";
import { assert, describe, it } from "vitest";

import { chatText } from "../transcript";

const HEADING = {
    title: "Color hubs",
    graph: "Karate club",
    nodes: 34,
    edges: 78,
    provider: "Google",
    model: "Gemini 2.5 Flash",
    effort: "Low",
    scope: "Whole graph",
    at: new Date(2026, 10, 7, 16, 5),
};

const CHAT: AiConversationSnapshot = {
    id: "c1",
    key: "k",
    formatVersion: 1,
    name: "Color hubs",
    firstWords: null,
    pending: [],
    messages: [
        { id: "m1", role: "reader", text: "Color the nodes with degree above 10 red.", via: "text", provenance: "m1" },
        {
            id: "m2",
            role: "assistant",
            text: "Colored the 3 nodes with degree above 10.",
            sources: [],
            calls: [
                {
                    command: "style",
                    arguments: { action: "add", values: { "node.color": "red" }, where: "degree > `10`" },
                    code: "AI_COMPLETED",
                    params: {},
                    durationMs: 91,
                    intent: "Coloring the hubs",
                    inputs: [
                        { name: "values", plainName: "Set", kind: "values", value: { "node.color": "red" } },
                        { name: "where", plainName: "Which", kind: "rule", value: "degree > `10`" },
                    ],
                    effects: [
                        {
                            code: "AI_EFFECT_STYLE",
                            params: { channel: "node.color", nodes: 3, hidden: 0, layer: "l1" },
                            target: { layer: "l1" },
                            rule: { join: "all", terms: [{ column: "degree", op: ">", values: [10] }] },
                        },
                    ],
                },
                {
                    command: "query",
                    arguments: { action: "count" },
                    code: "AI_TOOL_FAILED",
                    params: { tool: "query", cause: "AI_BAD_SELECTOR" },
                },
            ],
            effects: [
                {
                    code: "AI_EFFECT_STYLE",
                    params: { channel: "node.color", nodes: 3, hidden: 0, layer: "l1" },
                    target: { layer: "l1" },
                },
            ],
            outcome: { code: "AI_COMPLETED", params: {} },
        },
        { id: "m3", role: "reader", text: "Top connected nodes", via: "voice" },
    ],
};

describe("chatText", () => {
    it("copies the heading, every message, each step as the panel says it, the calls as they ran, and what waits", async () => {
        const text = await chatText(null, CHAT, HEADING, {
            approvals: [],
            questions: [{ id: "q", question: "Which nodes?", choices: ["Hubs", "All"], multiple: false }],
        });
        assert.strictEqual(
            text,
            [
                "# Color hubs",
                "Graph: Karate club -- 34 nodes, 78 edges",
                "Assistant: Google, Gemini 2.5 Flash, effort Low, asking about: Whole graph",
                "Copied: 2026-11-07 16:05",
                "",
                "## You",
                "Color the nodes with degree above 10 red.",
                "",
                "## Assistant",
                "Colored the 3 nodes with degree above 10.",
                "Steps:",
                "1. Coloring the hubs",
                "   - Asked for: Set: color red; Which: degree > 10",
                "   - Result: Colored 3 nodes with degree above 10",
                "2. Query data failed: its rule could not be read",
                "   - Result: Query data failed: its rule could not be read",
                "Changes:",
                "- Colored 3 nodes",
                "For support:",
                '1. style {"action":"add","values":{"node.color":"red"},"where":"degree > `10`"}',
                '   -> AI_COMPLETED {} [{"code":"AI_EFFECT_STYLE","params":{"channel":"node.color","nodes":3,"hidden":0,"layer":"l1"},"target":{"layer":"l1"},"rule":{"join":"all","terms":[{"column":"degree","op":">","values":[10]}]}}]',
                '2. query {"action":"count"}',
                '   -> AI_TOOL_FAILED {"tool":"query","cause":"AI_BAD_SELECTOR"}',
                "Ended: AI_COMPLETED",
                "",
                "## You (answer, spoken)",
                "Top connected nodes",
                "",
                "Waiting for your answer: Which nodes?",
                "Choices: Hubs | All",
                "",
            ].join("\n"),
        );
        // Everything a developer is handed is plain ASCII.
        assert.match(text, /^[\n -~]*$/);
    });
});
