import type { AiConversationSnapshot } from "@graphty/graphty-element/ai";
import { assert, describe, it } from "vitest";

import { chatText, stepDetail } from "../transcript";

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
                    effects: [
                        {
                            code: "AI_EFFECT_STYLE",
                            params: { channel: "node.color", nodes: 3, hidden: 0, layer: "l1" },
                            target: { layer: "l1" },
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

describe("stepDetail", () => {
    it("lists the tool and what the model passed, what it did, and how it ended when it failed", () => {
        assert.deepEqual(
            stepDetail(null, {
                tool: "style",
                arguments: { where: "degree > `10`", values: { "node.color": "red" }, ids: ["1", "2"] },
                code: "AI_TOOL_FAILED",
                params: { cause: "E_BAD_LAYER" },
                effects: [{ code: "AI_EFFECT_EMPTY", params: { tool: "style", searched: "degree > `10`" } }],
            }),
            [
                'Tool style: where degree > `10`; values {"node.color":"red"}; ids 1, 2',
                "Matched nothing: tool style, searched degree > `10`",
                "Ended AI_TOOL_FAILED, cause E_BAD_LAYER",
            ],
        );
    });
});

describe("chatText", () => {
    it("copies the heading, every message, each step with its details, changes, ending and what waits", async () => {
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
                "1. Colored 3 nodes with degree > 10 (91 ms)",
                '   - Tool style: action add; values {"node.color":"red"}; where degree > `10`',
                "   - Style: channel node.color, nodes 3, hidden 0, layer l1",
                "2. Query data failed: its rule could not be read",
                "   - Tool query: action count",
                "   - Ended AI_TOOL_FAILED, cause AI_BAD_SELECTOR",
                "Changes:",
                "- Colored 3 nodes",
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
