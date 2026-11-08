import { AI_RESULT_CODES, type AiEffect } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { changeLines, effectLine, endWords, type StepCall, stepLine, voiceWords, workingLine } from "../words";

const AGAIN = { action: "again", failed: true } as const;
const PROVIDER = { action: "provider", failed: true } as const;
const NONE = { action: null, failed: false } as const;

// Design 6.4, row by row. The params are what the element sends with each code.
const ROWS: readonly (readonly [string, Record<string, string | number>, string | null, object?])[] = [
    ["AI_COMPLETED", {}, null],
    ["AI_CONFIRMATION_NEEDED", {}, null],
    ["AI_QUESTION_ASKED", {}, null],
    ["AI_NO_RESPONSE", {}, "No answer came back.", AGAIN],
    ["AI_NOT_ENABLED", {}, "The assistant is not connected.", PROVIDER],
    ["AI_DISPOSED", {}, "The assistant is not connected.", PROVIDER],
    ["AI_KEY_MISSING", { provider: "google" }, "Add a key for Google.", PROVIDER],
    ["AI_KEY_REJECTED", { provider: "google" }, "Google refused the key.", PROVIDER],
    ["AI_CONFIG_INVALID", {}, "The AI provider settings cannot be used.", PROVIDER],
    [
        "AI_HOSTED_TOOL_UNSUPPORTED",
        { provider: "google" },
        "Google cannot use this tool, so the assistant worked without it.",
        NONE,
    ],
    ["AI_PROVIDER_ERROR", { status: 401 }, "Could not reach Google: the key was refused.", AGAIN],
    [
        "AI_PROVIDER_ERROR",
        {},
        "Could not reach Google: the connection failed or the key was refused.",
        { action: "again-or-provider", failed: true },
    ],
    ["AI_PROVIDER_ERROR", { provider: "webllm" }, "Could not reach WebLLM: the connection failed.", AGAIN],
    [
        "AI_PROVIDER_ERROR",
        { status: 429 },
        "Could not reach Google: too many requests or the spend limit was reached.",
        AGAIN,
    ],
    [
        "AI_PROVIDER_ERROR",
        { status: 429, cause: "quota" },
        "Google has no credit left on this key. Add credit with Google, or choose another provider.",
        { action: "again-or-provider", failed: true, billing: "https://aistudio.google.com/billing" },
    ],
    [
        "AI_PROVIDER_ERROR",
        { cause: "rate-limit" },
        "Google is getting too many requests. Wait a moment, then send again.",
        AGAIN,
    ],
    ["AI_PROVIDER_ERROR", { status: 503 }, "Could not reach Google: the service is unavailable.", AGAIN],
    ["AI_PROVIDER_ERROR", { status: 418 }, "Could not reach Google: error 418.", AGAIN],
    ["AI_PROVIDER_PAUSED", {}, "Google paused and did not finish.", AGAIN],
    ["AI_FAILED", {}, "The assistant could not finish this step.", AGAIN],
    ["AI_TOOL_THREW", {}, "The assistant could not finish this step.", AGAIN],
    ["AI_TOOL_UNKNOWN", {}, "The assistant could not finish this step.", AGAIN],
    ["AI_TOOL_INVALID_ARGUMENTS", {}, "The assistant could not finish this step.", AGAIN],
    ["AI_CANCELLED", {}, "Stopped.", { action: "again", failed: false, stopped: "" }],
    ["AI_CANCELLED", { steps: 0 }, "Stopped.", { action: "again", failed: false, stopped: "" }],
    [
        "AI_CANCELLED",
        { steps: 2 },
        "Stopped. Changes taken back.",
        { action: "again", failed: false, stopped: "Changes taken back." },
    ],
    ["AI_UNDONE", {}, "Undone while running. Changes taken back.", NONE],
    ["AI_ROLLBACK_PARTIAL", { steps: 3 }, "Stopped. 3 changes could not be taken back.", NONE],
    ["AI_APPROVAL_DENIED", {}, "Declined. Nothing changed.", NONE],
    ["AI_APPROVAL_STALE", { reason: "graph-changed" }, "Not run: the graph changed.", NONE],
    ["AI_APPROVAL_STALE", { reason: "superseded" }, "Not run: you sent a new message.", NONE],
    ["AI_APPROVAL_STALE", { reason: "expired" }, "Not run: the request expired.", NONE],
    ["AI_TOOL_DENIED_BY_POLICY", {}, "Not allowed here. Nothing changed.", NONE],
    ["AI_TOOL_NOT_RUN", {}, "Not run.", NONE],
    ["AI_ANSWER_INVALID", {}, "That is not one of the choices.", NONE],
    ["AI_HISTORY_UNAVAILABLE", {}, "This chat is not being saved.", NONE],
    ["AI_STORAGE_FAILED", {}, "This chat is not being saved.", NONE],
    ["AI_HISTORY_NEWER_FORMAT", {}, "Saved by a newer version of graphty, so it was left as it is.", NONE],
];

describe("endWords", () => {
    for (const [code, params, line, row] of ROWS) {
        it(`words ${code} ${JSON.stringify(params)} as design 6.4 does`, () => {
            const words = endWords(code, params, "google", false);
            assert.strictEqual(words?.line ?? null, line);
            if (row) {
                assert.deepInclude(words, row);
            }
        });
    }

    it("words a failed tool by its plain name, never its id or arguments", () => {
        const line = endWords("AI_TOOL_FAILED", { tool: "style.encode" }, "google", false)?.line ?? "";
        assert.match(line, / failed\.$/);
        assert.notInclude(line, "{");
    });

    it("gives a failed step its reason, in words with no code", () => {
        const line = endWords("AI_TOOL_FAILED", { tool: "style", cause: "AI_EMPTY_MATCH" }, "google", false)?.line;
        assert.strictEqual(line, "Style failed: nothing matched.");
        const named = endWords("AI_TOOL_FAILED", { tool: "style", cause: "AI_UNKNOWN_ENTRY" }, "google", false)?.line;
        assert.strictEqual(named, "Style failed: the assistant named something that does not exist.");
    });

    it("keeps the plain line for a cause it has no words for", () => {
        const plain = endWords("AI_TOOL_FAILED", { tool: "style" }, "google", false);
        const unknown = endWords("AI_TOOL_FAILED", { tool: "style", cause: "E_FROM_THE_FUTURE" }, "google", false);
        assert.strictEqual(unknown?.line, "Style failed.");
        assert.deepStrictEqual(unknown, plain);
    });

    it("gives every result code the element lists its own words, not the unknown code's", () => {
        for (const code of AI_RESULT_CODES) {
            // speech's reason is worded on its own line under the composer
            if (code === "AI_VOICE_UNAVAILABLE") {
                continue;
            }
            const words = endWords(code, { tool: "style.encode", steps: 1 }, "google", false);
            assert.notStrictEqual(words?.line, "Failed.", code);
            assert.notInclude(words?.line ?? "", "AI_", code);
        }
    });

    it("words an unknown code by success, as Finished or Failed", () => {
        assert.deepInclude(endWords("AI_FROM_THE_FUTURE", {}, "google", true), { line: "Finished.", ...NONE });
        assert.deepInclude(endWords("AI_FROM_THE_FUTURE", {}, "google", false), { line: "Failed.", ...AGAIN });
    });

    it("words speech by its reason", () => {
        assert.strictEqual(voiceWords("no-microphone"), "No microphone found.");
        assert.strictEqual(voiceWords("something-new"), "Speech is not available.");
    });

    it("a run that painted says so on its own line, and one that did not stays as it was", () => {
        const run = { run: "closeness", algorithm: "closeness", nodes: 24 };
        const line = (params: object): string =>
            effectLine(null, { code: "AI_EFFECT_RUN", params: { ...run, ...params } });
        assert.match(line({ painted: 1 }), /^Computed .+ for 24 nodes, colored by it$/);
        assert.match(line({}), /^Computed .+ for 24 nodes$/);
    });

    it("names a style sourced from a run's result by the algorithm, never the result path", () => {
        // Only what the line reads: the run's algorithm, and the columns for any other source.
        const session = {
            runs: { get: (id: string) => (id === "degree-1" ? { algorithm: "degree" } : undefined) },
            data: { attributes: () => [] },
        } as unknown as GraphSession;
        const line = effectLine(session, {
            code: "AI_EFFECT_STYLE",
            params: { channel: "node.size", nodes: 3, source: "results.degree-1.value" },
        });
        assert.notInclude(line, "results.");
        assert.match(line, /^Sized 3 nodes by \S/);
    });

    it("of a turn's painting runs, only the last says it colored the graph", () => {
        const run = (algorithm: string, painted?: number): AiEffect => ({
            code: "AI_EFFECT_RUN",
            params: { run: algorithm, algorithm, ...(painted === undefined ? {} : { painted }) },
        });
        const lines = changeLines(null, [run("first", 1), run("second", 1), run("third")]);
        assert.deepEqual(lines, ["Computed first", "Computed second, colored by it", "Computed third"]);
    });
});

describe("workingLine", () => {
    const sending = { state: "submitted", canCancel: true } as const;

    it("says the run waits on the reader while an approval or a question waits, not Sending", () => {
        assert.strictEqual(workingLine(sending, "google"), "Sending to Google");
        assert.strictEqual(
            workingLine({ ...sending, pending: { approvals: 1, questions: 0 } }, "google"),
            "Waiting for your approval",
        );
        assert.strictEqual(
            workingLine({ ...sending, pending: { approvals: 0, questions: 1 } }, "google"),
            "Waiting for your answer",
        );
    });
});

describe("stepLine", () => {
    const found = (params: AiEffect["params"], target?: AiEffect["target"]): readonly AiEffect[] => [
        { code: "AI_EFFECT_FOUND", params, ...(target === undefined ? {} : { target }) },
    ];
    // Every tool family: what it did when it says, else what the model asked for, else its name.
    const ROWS: readonly (readonly [StepCall, string])[] = [
        [
            {
                tool: "query",
                arguments: { action: "count", where: "degree >= `3`" },
                effects: found({ nodes: 22 }, { where: "degree >= `3`" }),
            },
            "Counted 22 nodes with degree >= 3",
        ],
        [{ tool: "query", arguments: { action: "count", where: "degree >= `3`" } }, "Counted nodes with degree >= 3"],
        [{ tool: "query", arguments: { action: "nodes", sort: "-degree", limit: 5 } }, "Read top 5 nodes by degree"],
        [{ tool: "query", arguments: { action: "nodes", sort: "degree", limit: 5 } }, "Read bottom 5 nodes by degree"],
        [{ tool: "query", arguments: { action: "edges" } }, "Read edges"],
        [
            {
                tool: "query",
                arguments: { action: "nodes" },
                effects: found({ nodes: 5 }, { top: { run: "degree-1", n: 5 } }),
            },
            "Found top 5 nodes by degree-1",
        ],
        [{ tool: "query", arguments: { action: "overview" } }, "Read the graph summary"],
        [{ tool: "query", arguments: { action: "statistics" } }, "Read graph statistics"],
        [{ tool: "query", arguments: { action: "attributes" } }, "Read the columns"],
        [{ tool: "query", arguments: { action: "histogram", column: "weight" } }, "Read values of weight"],
        [{ tool: "query", arguments: { action: "node", ids: ["Valjean"] } }, "Read Valjean"],
        [{ tool: "query", arguments: { action: "neighbors", ids: ["Valjean"] } }, "Read neighbors of Valjean"],
        [
            {
                tool: "query",
                arguments: { action: "find", text: "Val" },
                effects: found({ nodes: 2 }, { text: "Val" }),
            },
            "Found 2 nodes matching Val",
        ],
        [
            {
                tool: "query",
                arguments: { action: "count", where: "x == `1`" },
                effects: [{ code: "AI_EFFECT_EMPTY", params: { tool: "query", searched: "x == `1`" } }],
            },
            "No matches for x == 1",
        ],
        [
            {
                tool: "style",
                arguments: { action: "add" },
                effects: [
                    { code: "AI_EFFECT_STYLE", params: { channel: "node.color", nodes: 12, hidden: 0, layer: "l" } },
                ],
            },
            "Colored 12 nodes",
        ],
        [
            {
                tool: "layout",
                arguments: { action: "set" },
                effects: [{ code: "AI_EFFECT_LAYOUT", params: { layout: "circular" } }],
            },
            "Arranged as Ring",
        ],
        [
            {
                tool: "filter",
                arguments: { action: "hide" },
                effects: [{ code: "AI_EFFECT_FILTER", params: { kept: 4, total: 10 } }],
            },
            "Filtered to 4 of 10 nodes",
        ],
        [{ tool: "filter", arguments: { action: "clear" } }, "Cleared the filter"],
        [{ tool: "select", arguments: { action: "clear" } }, "Cleared the selection"],
        [{ tool: "run_algorithm", arguments: { name: "louvain" } }, "Ran Communities"],
        [
            {
                tool: "edit_data",
                arguments: { action: "add_nodes" },
                effects: [{ code: "AI_EFFECT_DATA", params: { addedNodes: 3 } }],
            },
            "Added 3 nodes",
        ],
        [{ tool: "export_graph", arguments: { action: "export", format: "graphml" } }, "Exported as graphml"],
        [{ tool: "catalog", arguments: { action: "search", text: "export" } }, "Searched tools for export"],
        [{ tool: "catalog", arguments: { action: "describe", name: "louvain" } }, "Looked up louvain"],
        [{ tool: "undo", arguments: { action: "undo" } }, "Undid the last change"],
        [{ tool: "undo", arguments: { action: "redo" } }, "Redid the last change"],
        [{ tool: "ask_reader", arguments: { question: "Which?" } }, "Asked you"],
        [{ tool: "view", arguments: { action: "zoom" } }, "View"],
        [{ tool: "something_new" }, "A step"],
        [
            {
                tool: "query",
                arguments: { action: "count" },
                code: "AI_TOOL_FAILED",
                params: { cause: "AI_BAD_SELECTOR" },
            },
            "Query data failed: its rule could not be read",
        ],
        [
            {
                tool: "query",
                arguments: { action: "statistics" },
                effects: found({ nodes: 34, edges: 78 }, { scope: "graph" }),
            },
            "Read graph statistics: 34 nodes, 78 edges",
        ],
        [
            {
                tool: "query",
                arguments: { action: "overview" },
                effects: found({ nodes: 34, edges: 78 }, { scope: "graph" }),
            },
            "Read the graph summary: 34 nodes, 78 edges",
        ],
        [
            {
                tool: "query",
                arguments: { action: "count", result: { op: "largest", run: "louvain", field: "group" } },
                effects: found({ nodes: 12 }, { where: "results.louvain.group == `0`" }),
            },
            "Counted 12 nodes in the largest group of Communities",
        ],
        [
            {
                tool: "style",
                arguments: { action: "add", values: { "node.color": "red" }, where: "degree > `10`" },
                effects: [
                    { code: "AI_EFFECT_STYLE", params: { channel: "node.color", nodes: 3, hidden: 0, layer: "l" } },
                ],
            },
            "Colored 3 nodes with degree > 10",
        ],
        [
            {
                tool: "run_algorithm",
                arguments: { name: "louvain", style: true },
                effects: [
                    {
                        code: "AI_EFFECT_RUN",
                        params: { run: "louvain", algorithm: "louvain", nodes: 34, painted: 1, groups: 4, largest: 12 },
                    },
                ],
            },
            "Computed Communities: 4 groups, largest 12 nodes, colored by it",
        ],
        [
            {
                tool: "layout",
                arguments: { action: "set", name: "circular" },
                effects: [{ code: "AI_EFFECT_LAYOUT", params: { layout: "circular", nodes: 34 } }],
            },
            "Arranged 34 nodes as Ring",
        ],
        [
            {
                tool: "filter",
                arguments: { action: "show_only", where: "degree >= `3`" },
                effects: [{ code: "AI_EFFECT_FILTER", params: { kept: 22, total: 34 } }],
            },
            "Filtered to nodes with degree >= 3: 22 of 34 nodes shown",
        ],
        [
            {
                tool: "filter",
                arguments: { action: "clear" },
                effects: [{ code: "AI_EFFECT_FILTER", params: { kept: 33, total: 33 } }],
            },
            "Cleared the filter: 33 nodes shown",
        ],
        [
            {
                tool: "edit_data",
                arguments: { action: "remove_nodes", where: "degree <= `2`" },
                effects: [{ code: "AI_EFFECT_DATA", params: { removedNodes: 12, removedEdges: 23 } }],
            },
            "Removed 12 nodes and 23 edges, nodes with degree <= 2",
        ],
        [
            {
                tool: "select",
                arguments: { action: "set", ids: ["1"] },
                effects: [{ code: "AI_EFFECT_SELECTION", params: { nodes: 1, edges: 0 } }],
            },
            "Selected 1 node: 1",
        ],
        [
            {
                tool: "select",
                arguments: { action: "neighborhood", hops: 1 },
                effects: [{ code: "AI_EFFECT_SELECTION", params: { nodes: 17, edges: 0 } }],
            },
            "Selected 17 nodes within 1 hop",
        ],
        [
            {
                tool: "select",
                arguments: { action: "remove", ids: ["1"] },
                effects: [{ code: "AI_EFFECT_SELECTION", params: { nodes: 16, edges: 0 } }],
            },
            "Deselected 1: 16 nodes left",
        ],
        [
            {
                tool: "view",
                arguments: { action: "fit" },
                effects: [{ code: "AI_EFFECT_VIEW", params: {} }],
            },
            "Fit the graph in view",
        ],
        [
            {
                tool: "undo",
                arguments: { action: "undo" },
                effects: [{ code: "AI_EFFECT_OTHER", params: { tool: "undo", action: "undo" } }],
            },
            "Undid the last change",
        ],
        [
            { tool: "export_graph", arguments: { format: "graphml", whole: true } },
            "Exported the whole graph as graphml",
        ],
        [
            { tool: "style", code: "AI_TOOL_FAILED", params: { cause: "E_BAD_LAYER" } },
            "Style failed: the style it made was not valid",
        ],
        [{ tool: "style", code: "AI_TOOL_FAILED", params: { cause: "E_SOMETHING_NEW" } }, "Style failed"],
        [
            { tool: "style", code: "AI_TOOL_INVALID_ARGUMENTS", params: { cause: "AI_ARG_INVALID" } },
            "Style failed: the assistant passed values it does not take",
        ],
        [{ tool: "style", code: "AI_APPROVAL_DENIED", params: {} }, "Style not run: you declined"],
    ];

    for (const [call, line] of ROWS) {
        it(`words ${call.tool} as "${line}"`, () => {
            assert.strictEqual(stepLine(null, call), line);
        });
    }

    it("cuts the model's own long words short", () => {
        const line = stepLine(null, { tool: "catalog", arguments: { action: "search", text: "x".repeat(80) } });
        assert.isAtMost(line.length, "Searched tools for ".length + 32);
        assert.isTrue(line.endsWith("..."));
    });
});
