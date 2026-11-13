import { AI_EFFECT_CODES, AI_RESULT_CODES, type AiEffect } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    askedRows,
    changeLines,
    effectLine,
    endWords,
    isLookup,
    resultRows,
    type StepCall,
    stepLine,
    voiceWords,
    workingLine,
} from "../words";

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
    ["AI_NO_PREVIOUS_COMMAND", {}, "There is no message to send again.", NONE],
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
    it("is the model's own words for the step, cut short when long", () => {
        assert.strictEqual(
            stepLine(null, { tool: "style", intent: "Coloring the hubs", code: "AI_COMPLETED" }),
            "Coloring the hubs",
        );
        const long = stepLine(null, { tool: "style", intent: "x".repeat(80) });
        assert.isAtMost(long.length, 60);
        assert.isTrue(long.endsWith("..."));
    });

    it("falls back to what the step came to, then to the tool's name", () => {
        const colored: StepCall = {
            tool: "style",
            code: "AI_COMPLETED",
            effects: [{ code: "AI_EFFECT_STYLE", params: { channel: "node.color", nodes: 12, hidden: 0, layer: "l" } }],
        };
        assert.strictEqual(stepLine(null, colored), "Colored 12 nodes");
        assert.strictEqual(stepLine(null, { tool: "query" }), "Query data");
        assert.strictEqual(stepLine(null, { tool: "something_new" }), "A step");
    });

    it("says what failed whatever the model meant", () => {
        assert.strictEqual(
            stepLine(null, {
                tool: "style",
                intent: "Coloring",
                code: "AI_TOOL_FAILED",
                params: { cause: "E_BAD_LAYER" },
            }),
            "Style failed: the style it made was not valid",
        );
        assert.strictEqual(
            stepLine(null, { tool: "style", code: "AI_APPROVAL_DENIED", params: {} }),
            "Style not run: you declined",
        );
    });
});

describe("askedRows", () => {
    it("words each argument by its kind, labeled by the schema, with no JSON, ids or hex", () => {
        const rows = askedRows(null, {
            tool: "style",
            inputs: [
                {
                    name: "where",
                    plainName: "Which",
                    kind: "rule",
                    value: "value == `0` || value == `1`",
                    rule: { join: "all", terms: [{ column: "value", op: "==", values: [0, 1] }] },
                },
                {
                    name: "values",
                    plainName: "Set",
                    kind: "values",
                    value: { "node.color": "#e41a1c", "node.size": 2 },
                },
                { name: "name", plainName: "Name", kind: "text", value: "East Coast Schools" },
                { name: "layer", plainName: "Layer", kind: "layer", value: "east-coast-schools_1" },
                { name: "limit", plainName: "Limit", kind: "number", value: 5 },
                { name: "sort", plainName: "Sort by", kind: "column", value: "-data.weight" },
                { name: "ids", plainName: "Which", kind: "ids", value: ["1", "2", "3", "4", "5", "6", "7"] },
                { name: "options", plainName: "Options", kind: "other", value: { seed: 1 } },
            ],
        });
        assert.deepEqual(rows, [
            { label: "Which", value: "value 0 or 1" },
            { label: "Set", value: "color red, size 2" },
            { label: "Name", value: "East Coast Schools" },
            { label: "Limit", value: "5" },
            { label: "Sort by", value: "weight, highest first" },
            { label: "Which", value: "1, 2, 3, 4, 5 and 2 more" },
        ]);
    });
});

describe("resultRows", () => {
    it("says each effect once, its rule in words and its layer by name, with no zero counts", () => {
        const style: AiEffect = {
            code: "AI_EFFECT_STYLE",
            params: { channel: "node.color", nodes: 17, hidden: 0, layer: "l1", layerName: "East Coast Schools" },
            rule: { join: "all", terms: [{ column: "value", op: "==", values: [0, 1] }] },
        };
        assert.deepEqual(resultRows(null, { tool: "style", code: "AI_COMPLETED", effects: [style, style] }), [
            "Colored 17 nodes with value 0 or 1, in East Coast Schools",
        ]);
        assert.deepEqual(
            resultRows(null, {
                tool: "query",
                code: "AI_COMPLETED",
                effects: [
                    {
                        code: "AI_EFFECT_FOUND",
                        params: { nodes: 22 },
                        target: { where: "degree >= `3`" },
                        rule: { join: "all", terms: [{ column: "degree", op: ">=", values: [3] }] },
                    },
                ],
            }),
            ["Found 22 nodes with degree at least 3"],
        );
        assert.deepEqual(
            resultRows(null, {
                tool: "style",
                code: "AI_COMPLETED",
                effects: [{ code: "AI_EFFECT_READ", params: { tool: "style", action: "list" } }],
            }),
            ["Used Style"],
        );
    });

    it("has a sentence for every effect code graphty-element lists", () => {
        for (const code of AI_EFFECT_CODES) {
            const [sentence] = resultRows(null, {
                tool: "style",
                code: "AI_COMPLETED",
                effects: [
                    {
                        code,
                        params: {
                            tool: "style",
                            action: "list",
                            channel: "node.color",
                            nodes: 1,
                            layout: "circular",
                            kept: 1,
                            total: 2,
                            algorithm: "degree",
                            run: "r",
                        },
                    },
                ],
            });
            assert.isString(sentence, code);
            assert.notMatch(sentence, /AI_|undefined|NaN/, code);
        }
    });
});

describe("isLookup", () => {
    it("is a step that ran and changed nothing", () => {
        const read: StepCall = {
            tool: "style",
            code: "AI_COMPLETED",
            effects: [{ code: "AI_EFFECT_READ", params: { tool: "style", action: "list" } }],
        };
        assert.isTrue(isLookup(read));
        assert.isFalse(
            isLookup({
                tool: "style",
                code: "AI_COMPLETED",
                effects: [
                    { code: "AI_EFFECT_STYLE", params: { channel: "node.color", nodes: 1, hidden: 0, layer: "l" } },
                ],
            }),
        );
        assert.isFalse(isLookup({ tool: "style", code: "AI_TOOL_FAILED", params: {} }));
        assert.isFalse(isLookup({ tool: "style" }), "a running step is not yet anything");
    });
});
