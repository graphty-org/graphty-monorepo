import type { AiApprovalRequest } from "@graphty/graphty-element/ai";
import type { AiEffect } from "@graphty/graphty-element/catalog";
import { assert, describe, it } from "vitest";

import {
    approvalWords,
    audioWords,
    awayWords,
    changeLines,
    chatMenuName,
    chatsCountLabel,
    chipName,
    effectLine,
    emptyWords,
    endWords,
    excludedLine,
    isChange,
    keyHelpWords,
    keyShapeWords,
    moreWords,
    optionsSelectionTip,
    stepsWords,
    workingLine,
} from "../words";

/**
 * A held request with one call to a tool.
 * @param gate - why it was held.
 * @param preview - what was measured.
 * @param tool - the held tool.
 * @returns the request.
 */
const held = (gate: string, preview: AiApprovalRequest["preview"], tool = "style"): AiApprovalRequest => ({
    id: "r",
    gate,
    calls: [{ tool, arguments: {} }],
    preview,
});

/**
 * An effect.
 * @param code - its code.
 * @param params - its facts.
 * @returns the effect.
 */
const effect = (code: string, params: Record<string, string | number>): AiEffect => ({ code, params }) as AiEffect;

describe("approvalWords by gate", () => {
    it("asks to remove what a large change removes, else to change its values", () => {
        assert.deepStrictEqual(approvalWords(held("large", { removeNodes: 12, removeEdges: 1 })), {
            title: "Remove 12 nodes and 1 edge?",
            line: "Undo can bring them back.",
            primary: "Remove",
            decline: "Keep them",
        });
        const change = approvalWords(held("large", { changedValues: 1 }));
        assert.strictEqual(change.title, "Change 1 value?");
        assert.strictEqual(change.primary, "Change");
        assert.strictEqual(approvalWords(held("large", {})).title, "Change 0 values?");
    });

    it("asks to replace the graph, or to remove what a clear removes", () => {
        const replace = approvalWords(held("replaces", { nodes: 30, edges: 0 }));
        assert.strictEqual(replace.title, "Replace this graph's 30 nodes?");
        assert.strictEqual(replace.decline, "Keep this graph");
        assert.isNull(replace.line);
        assert.strictEqual(approvalWords(held("replaces", { removeNodes: 2 })).title, "Remove 2 nodes?");
    });

    it("says Undo cannot reach an irreversible change, removal or not", () => {
        const removal = approvalWords(held("irreversible", { removeEdges: 3 }));
        assert.strictEqual(removal.title, "Remove 3 edges?");
        assert.strictEqual(removal.primary, "Remove");
        assert.strictEqual(removal.line, "Undo cannot bring this back.");
        const run = approvalWords(held("irreversible", {}, "query"));
        assert.strictEqual(run.title, "Run Query data?");
        assert.strictEqual(run.primary, "Run");
    });

    it("says how long a slow run takes, or that it may run long", () => {
        const timed = approvalWords(held("slow", { seconds: 1 }));
        assert.strictEqual(timed.title, "Run Style?");
        assert.strictEqual(timed.line, "About 1 second.");
        assert.strictEqual(timed.decline, "Skip");
        assert.strictEqual(approvalWords(held("slow", { seconds: 40 })).line, "About 40 seconds.");
        assert.strictEqual(approvalWords(held("slow", {})).line, "May run for a long time.");
    });

    it("names the page a network call loads, and falls back without one", () => {
        assert.deepStrictEqual(approvalWords(held("network", { url: "https://example.org/g.json" })), {
            title: "Load https://example.org/g.json?",
            line: "Reads a page outside graphty.",
            primary: "Load",
            decline: "Skip",
        });
        assert.strictEqual(approvalWords(held("network", {})).primary, "Allow");
    });

    it("asks to run each distinct tool once for any other gate, and states no cost it did not measure", () => {
        const request: AiApprovalRequest = {
            id: "r",
            gate: "policy",
            calls: [
                { tool: "style", arguments: {} },
                { tool: "style", arguments: {} },
                { tool: "query", arguments: {} },
            ],
            preview: {},
        };
        assert.deepStrictEqual(approvalWords(request), {
            title: "Run Style, Query data?",
            line: null,
            primary: "Allow",
            decline: "Decline",
        });
        assert.isNull(approvalWords(held("paid", {})).line);
    });
});

describe("awayWords", () => {
    it("turns an approval's title into a waiting notice, and a question into the answer notice", () => {
        assert.strictEqual(awayWords("Remove 12 nodes?"), "Waiting: remove 12 nodes");
        assert.strictEqual(awayWords(null), "Waiting for your answer");
    });
});

describe("endWords cases", () => {
    it("words each HTTP status a provider answered with", () => {
        const line = (status: number): string | undefined =>
            endWords("AI_PROVIDER_ERROR", { status }, "google", false)?.line;
        assert.strictEqual(line(403), "Could not reach Google: the key was refused.");
        assert.strictEqual(line(503), "Could not reach Google: the service is unavailable.");
        assert.strictEqual(line(418), "Could not reach Google: error 418.");
        // A status answered means the connection worked, so the reader is offered only Send again.
        assert.strictEqual(endWords("AI_PROVIDER_ERROR", { status: 503 }, "google", false)?.action, "again");
    });

    it("tells a rate limit to wait, and a quota without a billing page to add credit with no link", () => {
        assert.strictEqual(
            endWords("AI_PROVIDER_ERROR", { cause: "rate-limit" }, "google", false)?.line,
            "Google is getting too many requests. Wait a moment, then send again.",
        );
        const quota = endWords("AI_PROVIDER_ERROR", { cause: "quota", provider: "webllm" }, "google", false);
        assert.isUndefined(quota?.billing);
        assert.strictEqual(quota?.action, "again-or-provider");
    });

    it("says whether a stopped run took changes back", () => {
        assert.deepStrictEqual(endWords("AI_CANCELLED", { steps: 2 }, "google", false), {
            line: "Stopped. Changes taken back.",
            stopped: "Changes taken back.",
            action: "again",
            failed: false,
        });
        assert.deepStrictEqual(endWords("AI_CANCELLED", {}, "google", false), {
            line: "Stopped.",
            stopped: "",
            action: "again",
            failed: false,
        });
    });

    it("says why a held change was not run", () => {
        const stale = (reason?: string): string | undefined =>
            endWords("AI_APPROVAL_STALE", reason === undefined ? {} : { reason }, "google", false)?.line;
        assert.strictEqual(stale("graph-changed"), "Not run: the graph changed.");
        assert.strictEqual(stale("superseded"), "Not run: you sent a new message.");
        assert.strictEqual(stale("expired"), "Not run: the request expired.");
        assert.strictEqual(stale(), "Not run.");
    });

    it("names a missing package and how many changes could not be taken back", () => {
        assert.strictEqual(
            endWords("E_MISSING_PACKAGE", { package: "@mlc-ai/web-llm" }, "webllm", false)?.line,
            "WebLLM needs the package @mlc-ai/web-llm, which is not installed.",
        );
        assert.strictEqual(
            endWords("AI_ROLLBACK_PARTIAL", { steps: 3 }, "google", false)?.line,
            "Stopped. 3 changes could not be taken back.",
        );
    });
});

describe("workingLine stages", () => {
    const base = { state: "executing", canCancel: true } as const;

    it("names the running tool, else says it is writing, else sending", () => {
        assert.strictEqual(
            workingLine(
                {
                    ...base,
                    toolCalls: [
                        { name: "style", status: "complete" },
                        { name: "query", status: "executing" },
                    ],
                },
                "google",
            ),
            "Running Query data",
        );
        assert.strictEqual(workingLine({ ...base, stage: "executing" }, "google"), "Running A step");
        assert.strictEqual(workingLine({ ...base, stage: "generating" }, "google"), "Writing");
        assert.strictEqual(workingLine({ ...base, stage: "processing" }, "anthropic"), "Sending to Anthropic");
    });
});

describe("the key field's words", () => {
    it("walks through a provider's key page, and says whether it is free or needs credit", () => {
        const google = keyHelpWords("google", "Google");
        assert.strictEqual(google?.name, "How to get a key from Google");
        assert.include(google?.steps[0] ?? "", "Google AI Studio");
        assert.strictEqual(google?.steps[1], "Choose Create API key.");
        assert.strictEqual(google?.note, "Google has a free tier. Heavier use needs billing set up.");
        assert.strictEqual(
            keyHelpWords("openai", "OpenAI")?.note,
            "OpenAI needs credit on the account before a key answers.",
        );
        assert.isNull(keyHelpWords("webllm", "WebLLM"));
    });

    it("says what is wrong with a key's shape, and nothing for a good one", () => {
        assert.isNull(keyShapeWords({ valid: true }, "Google"));
        assert.strictEqual(keyShapeWords({ valid: false, code: "E_KEY_EMPTY", params: {} }, "Google"), "Enter a key.");
        assert.strictEqual(
            keyShapeWords({ valid: false, code: "E_KEY_PREFIX", params: { prefix: "sk-" } }, "OpenAI"),
            "OpenAI keys start with sk-.",
        );
        assert.strictEqual(
            keyShapeWords({ valid: false, code: "E_KEY_TOO_SHORT", params: { minLength: 11 } }, "Google"),
            "This key is too short.",
        );
    });
});

describe("effectLine", () => {
    it("words each kind of change", () => {
        assert.strictEqual(
            effectLine(null, effect("AI_EFFECT_STYLE", { channel: "edge.size", edges: 1, source: "weight" })),
            "Sized 1 edge by weight",
        );
        assert.strictEqual(
            effectLine(null, effect("AI_EFFECT_FILTER", { kept: 5, total: 9 })),
            "Filtered to 5 of 9 nodes",
        );
        assert.strictEqual(effectLine(null, effect("AI_EFFECT_VIEW", {})), "Moved the view");
        assert.strictEqual(effectLine(null, effect("AI_EFFECT_SOMETHING_NEW", {})), "Changed the graph");
        assert.strictEqual(
            effectLine(null, effect("AI_EFFECT_SELECTION", { nodes: 2, edges: 1 })),
            "Selected 2 nodes and 1 edge",
        );
    });

    it("names an unknown layout or algorithm by what it was called", () => {
        assert.strictEqual(
            effectLine(null, effect("AI_EFFECT_LAYOUT", { layout: "my-layout" })),
            "Arranged as my-layout",
        );
        assert.strictEqual(
            effectLine(null, effect("AI_EFFECT_LAYOUT", { layout: "my-layout", nodes: 4 })),
            "Arranged 4 nodes as my-layout",
        );
        assert.strictEqual(
            effectLine(null, effect("AI_EFFECT_RUN", { algorithm: "mine", groups: 3, largest: 10 })),
            "Computed mine: 3 groups, largest 10 nodes",
        );
        assert.strictEqual(
            effectLine(null, effect("AI_EFFECT_RUN", { algorithm: "mine", nodes: 7 })),
            "Computed mine for 7 nodes",
        );
        assert.strictEqual(effectLine(null, effect("AI_EFFECT_RUN_REMOVED", { algorithm: "mine" })), "Removed mine");
    });

    it("lists what a data change added, removed and changed, leaving out the zeros", () => {
        assert.strictEqual(
            effectLine(
                null,
                effect("AI_EFFECT_DATA", { addedNodes: 2, addedEdges: 0, removedEdges: 1, changedValues: 4 }),
            ),
            "Added 2 nodes, Removed 1 edge, Changed 4 values",
        );
    });

    it("keeps only a turn's last selection", () => {
        assert.deepStrictEqual(
            changeLines(null, [
                effect("AI_EFFECT_SELECTION", { nodes: 1 }),
                effect("AI_EFFECT_VIEW", {}),
                effect("AI_EFFECT_SELECTION", { nodes: 3 }),
            ]),
            ["Moved the view", "Selected 3 nodes"],
        );
    });
});

describe("what counts as a change", () => {
    it("is not a read, a result or an empty selection", () => {
        assert.isFalse(isChange(effect("AI_EFFECT_READ", {})));
        assert.isFalse(isChange(effect("AI_EFFECT_FOUND", {})));
        assert.isFalse(isChange(effect("AI_EFFECT_EMPTY", {})));
        assert.isFalse(isChange(effect("AI_EFFECT_SELECTION", { nodes: 0, edges: 0 })));
        assert.isTrue(isChange(effect("AI_EFFECT_SELECTION", { edges: 1 })));
        assert.isTrue(isChange(effect("AI_EFFECT_VIEW", {})));
    });
});

describe("excludedLine", () => {
    it("says the most hidden nodes any style left out, and whether it was coloring", () => {
        assert.isNull(excludedLine([effect("AI_EFFECT_STYLE", { channel: "node.color", hidden: 0 })]));
        assert.strictEqual(
            excludedLine([
                effect("AI_EFFECT_STYLE", { channel: "node.color", hidden: 1 }),
                effect("AI_EFFECT_VIEW", {}),
            ]),
            "1 hidden node not colored",
        );
        assert.strictEqual(
            excludedLine([
                effect("AI_EFFECT_STYLE", { channel: "node.color", hidden: 2 }),
                effect("AI_EFFECT_STYLE", { channel: "node.size", hidden: 5 }),
            ]),
            "5 hidden nodes not changed",
        );
    });
});

describe("small labels", () => {
    it("counts steps, or the look-ups when nothing changed", () => {
        assert.strictEqual(stepsWords(1, 4), "1 step");
        assert.strictEqual(stepsWords(3, 0), "3 steps");
        assert.strictEqual(stepsWords(0, 1), "Looked something up");
        assert.strictEqual(stepsWords(0, 2), "Looked up 2 things");
    });

    it("says where speech goes, and nothing when it stays on the device", () => {
        assert.strictEqual(audioWords("browser-vendor", "Google"), "Speech goes to your browser's maker.");
        assert.strictEqual(audioWords("provider", "Google"), "Speech goes to Google.");
        assert.isNull(audioWords("device", "Google"));
    });

    it("names an empty result by what was searched", () => {
        assert.strictEqual(emptyWords("hub"), "No matches for hub.");
        assert.strictEqual(emptyWords(""), "No matches.");
        assert.strictEqual(emptyWords(undefined), "No matches.");
    });

    it("names chips, menus, counts and the selection tip", () => {
        assert.strictEqual(chatsCountLabel(3), "Chats, 3");
        assert.strictEqual(chatMenuName("Hubs"), "Hubs menu");
        assert.strictEqual(chipName("edge", 1), "1 edge, select");
        assert.strictEqual(moreWords(4), "and 4 more");
        assert.strictEqual(optionsSelectionTip(5, 0), "Options: selection, 5 nodes");
    });
});
