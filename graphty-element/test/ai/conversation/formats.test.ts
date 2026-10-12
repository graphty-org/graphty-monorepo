/**
 * @file Saved data stays in graphty's own versioned format (rule 2 of the mechanisms that keep a
 * framework switch cheap, design/ai/tanstack-ai-harness-design.md section 7).
 *
 * Per version: a fixture covers every part and pending kind; the schema generated from the zod
 * definition (sorted keys, no `$schema`) equals the committed JSON Schema file; a committed file
 * never changes once it is on the merge base; the real writer reproduces the golden fixture byte
 * for byte. A newer record is left untouched, an invalid one is reported, and no configured key
 * reaches the written JSON. Each check is a function with a self-test that plants one violation.
 *
 * A new version adds its schema file with `GRAPHTY_WRITE_FORMAT_SCHEMA=1` set, once.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";
import { z } from "zod";

import { AI_CONVERSATION_FORMAT, AI_CONVERSATION_FORMAT_VERSION } from "../../../catalog";
import {
    type ConversationRecord,
    KEY_PLACEHOLDER,
    readConversation,
    writeConversation,
} from "../../../src/ai/conversation/formats";
import { conversationSchema, partSchema, pendingSchema } from "../../../src/ai/conversation/formats/v1";

const HERE = dirname(fileURLToPath(import.meta.url));
const FORMATS_DIR = join(HERE, "../../../src/ai/conversation/formats");
const SCHEMA_FILE = join(FORMATS_DIR, "graphty-ai-conversation.v1.schema.json");
const GOLDEN = readFileSync(join(HERE, "fixtures/v1-every-kind.json"), "utf8");

/**
 * A copy of a JSON value with every object's keys sorted.
 * @param value - The value.
 * @returns The copy.
 */
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }

    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([key, item]) => [key, sortKeys(item)]),
        );
    }

    return value;
}

/**
 * The JSON Schema of the current version, canonical: keys sorted, no `$schema`.
 * @returns Its text.
 */
function generatedSchema(): string {
    const { $schema: _dropped, ...schema } = z.toJSONSchema(conversationSchema);
    return `${JSON.stringify(sortKeys(schema), null, 4)}\n`;
}

/**
 * Every part of a list of messages, a helper's included.
 * @param messages - The messages.
 * @returns Their parts, each helper's after the part that holds it.
 */
function allParts(messages: ConversationRecord["messages"]): ConversationRecord["messages"][number]["parts"][number][] {
    return messages.flatMap((message) =>
        message.parts.flatMap((part) => (part.type === "agent-ref" ? [part, ...allParts(part.messages)] : [part])),
    );
}

/**
 * The part kinds, the origins of each part kind and the pending kinds the format defines that a
 * record does not use, a helper's messages included.
 * @param record - The record.
 * @returns One line per kind or origin missing.
 */
function uncoveredKinds(record: ConversationRecord): string[] {
    const parts = allParts(record.messages);
    const used = new Set(parts.map((part) => `${part.type}/${part.origin}`));
    const pending = new Set(record.pending.map((entry) => entry.kind));
    return [
        ...partSchema.options.flatMap((option) => {
            const kind = option.shape.type.value;
            const { origin } = option.shape;
            const origins: readonly string[] = "options" in origin ? origin.options : [origin.value];
            if (!parts.some((part) => part.type === kind)) {
                return [`the fixture has no ${kind}`];
            }

            return origins
                .filter((from) => !used.has(`${kind}/${from}`))
                .map((from) => `the fixture has no ${kind} from ${from}`);
        }),
        ...pendingSchema.options
            .map((option) => option.shape.kind.value)
            .filter((kind) => !pending.has(kind))
            .map((kind) => `the fixture has no ${kind}`),
    ];
}

/**
 * Whether the committed schema file is what the zod definition generates.
 * @param generated - The generated text.
 * @param committed - The committed text.
 * @returns The problem, if any.
 */
function schemaDrift(generated: string, committed: string): string[] {
    return generated === committed
        ? []
        : ["the format's JSON Schema differs from its zod definition: a released version never changes"];
}

/**
 * Whether a schema file changed since the merge base.
 * @param current - Its text now.
 * @param base - Its text on the merge base, or undefined when it is new.
 * @returns The problem, if any.
 */
function changedFromBase(current: string, base: string | undefined): string[] {
    return base === undefined || base === current
        ? []
        : ["a format version on the merge base changed: add a new version with an upgrade instead"];
}

/**
 * Whether the writer's output is the golden text, byte for byte.
 * @param written - The writer's output.
 * @param golden - The golden text.
 * @returns The first difference, if any.
 */
function goldenMismatch(written: string, golden: string): string[] {
    if (written === golden) {
        return [];
    }

    const at = Array.from({ length: golden.length }, (_, index) => index).findIndex(
        (index) => written[index] !== golden[index],
    );
    return [`the writer differs from the golden fixture at character ${at === -1 ? golden.length : at}`];
}

/**
 * The configured keys that appear in written JSON.
 * @param json - The JSON.
 * @param secrets - The keys.
 * @returns One line per key found.
 */
function leakedSecrets(json: string, secrets: readonly string[]): string[] {
    return secrets
        .filter((secret) => json.includes(secret))
        .map((secret) => `a key of ${secret.length} characters was written`);
}

/**
 * Whether reading changed the record it was given.
 * @param before - Its JSON before.
 * @param record - The record after.
 * @returns The problem, if any.
 */
function rewritten(before: string, record: unknown): string[] {
    return JSON.stringify(record) === before ? [] : ["reading rewrote the record"];
}

/**
 * The text of a file on the merge base with origin/master, or undefined when it is not there.
 * @param file - The file.
 * @returns Its text there.
 */
function onMergeBase(file: string): string | undefined {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: HERE, encoding: "utf8" }).trim();
    const git = (...args: string[]): string => execFileSync("git", args, { cwd: top, encoding: "utf8" });
    const base = git("merge-base", "HEAD", process.env.FORMAT_BASE ?? "origin/master").trim();
    const path = relative(top, file);
    return git("ls-tree", base, "--", path).trim() === "" ? undefined : git("show", `${base}:${path}`);
}

/**
 * The golden record, parsed.
 * @returns It.
 */
function golden(): ConversationRecord {
    const read = readConversation(GOLDEN);
    assert.isTrue(read.ok, "the golden fixture reads");
    if (!read.ok) {
        throw new Error("unreachable");
    }

    return read.record;
}

/**
 * The golden record as a plain object to edit.
 * @returns A fresh copy.
 */
function goldenObject(): Record<string, unknown> {
    return JSON.parse(GOLDEN) as Record<string, unknown>;
}

describe("the saved conversation format", () => {
    it("is version 1 of graphty-ai-conversation", () => {
        assert.strictEqual(AI_CONVERSATION_FORMAT, "graphty-ai-conversation");
        assert.strictEqual(AI_CONVERSATION_FORMAT_VERSION, 1);
    });

    describe("rule 2: saved data in graphty's versioned format", () => {
        it("a fixture covering every part and pending kind validates", () => {
            assert.deepEqual(uncoveredKinds(golden()), []);
        });

        it("the generated schema equals the committed file", () => {
            if (process.env.GRAPHTY_WRITE_FORMAT_SCHEMA === "1") {
                writeFileSync(SCHEMA_FILE, generatedSchema());
            }

            assert.deepEqual(schemaDrift(generatedSchema(), readFileSync(SCHEMA_FILE, "utf8")), []);
        });

        it("the committed schema file is unchanged from the merge base", () => {
            assert.deepEqual(changedFromBase(readFileSync(SCHEMA_FILE, "utf8"), onMergeBase(SCHEMA_FILE)), []);
        });

        it("the real writer reproduces the golden fixture byte for byte", () => {
            assert.deepEqual(goldenMismatch(writeConversation(golden()), GOLDEN), []);
        });

        it("a newer record reads as AI_HISTORY_NEWER_FORMAT and is not rewritten", () => {
            const newer = { ...goldenObject(), version: 2, somethingNew: { a: 1 } };
            const before = JSON.stringify(newer);
            const read = readConversation(newer);
            assert.deepEqual(read, { ok: false, code: "AI_HISTORY_NEWER_FORMAT", params: { version: 2 } });
            assert.deepEqual(rewritten(before, newer), []);
        });

        it("no configured key reaches the written JSON", () => {
            const key = "AIzaSyTestKey-0123456789abcdef";
            const record = golden();
            const withKey: ConversationRecord = {
                ...record,
                messages: [
                    ...record.messages,
                    {
                        id: "m6",
                        role: "user",
                        parts: [{ type: "text", origin: "reader", text: `my key is ${key}, use it` }],
                    },
                    {
                        id: "m7",
                        role: "assistant",
                        parts: [
                            { type: "text", origin: "model", text: `Using ${key}.` },
                            { type: "tool-call", origin: "model", callId: "k1", command: "x", arguments: { key } },
                        ],
                    },
                    {
                        id: "m8",
                        role: "tool",
                        parts: [
                            {
                                type: "tool-result",
                                origin: "graph-data",
                                callId: "k1",
                                code: "AI_COMPLETED",
                                params: { echo: key },
                                content: key,
                            },
                        ],
                    },
                ],
            };
            const json = writeConversation(withKey, { secrets: [key, ""] });
            assert.deepEqual(leakedSecrets(json, [key]), []);
            assert.include(json, `my key is ${KEY_PLACEHOLDER}, use it`);
        });

        describe("self-tests: each check fails on one planted violation", () => {
            it("a fixture missing a kind", () => {
                const record = golden();
                const without = {
                    ...record,
                    messages: record.messages.map((message) => ({
                        ...message,
                        parts: message.parts.filter((part) => part.type !== "outcome"),
                    })),
                };
                assert.deepEqual(uncoveredKinds(without), ["the fixture has no outcome"]);
            });

            it("a fixture missing an origin of a kind, a helper's messages included", () => {
                const object = goldenObject();
                type Part = { type: string; origin: string; messages?: { parts: Part[] }[] };
                const messages = object.messages as { id: string; parts: Part[] }[];
                for (const helper of messages.find((message) => message.id === "m10")?.parts[0].messages ?? []) {
                    helper.parts = helper.parts.filter((part) => !(part.type === "text" && part.origin === "web"));
                }

                const read = readConversation(object);
                assert.isTrue(read.ok);
                assert.deepEqual(read.ok ? uncoveredKinds(read.record) : [], ["the fixture has no text from web"]);
            });

            it("a schema file that differs from the definition", () => {
                assert.lengthOf(
                    schemaDrift(generatedSchema(), generatedSchema().replace('"minLength": 1', '"minLength": 2')),
                    1,
                );
            });

            it("a released schema file that changed", () => {
                assert.lengthOf(changedFromBase("{}\n", '{ "a": 1 }\n'), 1);
                assert.deepEqual(changedFromBase("{}\n", undefined), []);
            });

            it("a writer one byte off", () => {
                assert.deepEqual(goldenMismatch(`${GOLDEN} `, GOLDEN), [
                    `the writer differs from the golden fixture at character ${GOLDEN.length}`,
                ]);
                assert.lengthOf(goldenMismatch(GOLDEN.replace("c-every-kind", "c-every-kinD"), GOLDEN), 1);
            });

            it("a key left in the JSON", () => {
                assert.lengthOf(leakedSecrets(JSON.stringify({ text: "sk-secret-123" }), ["sk-secret-123"]), 1);
            });

            it("a reader that rewrites", () => {
                const record = goldenObject();
                const before = JSON.stringify(record);
                record.version = 1;
                record.revision = 8;
                assert.lengthOf(rewritten(before, record), 1);
            });
        });
    });

    describe("reading", () => {
        it("reads the JSON text and the stored object alike", () => {
            const fromText = readConversation(GOLDEN);
            const fromObject = readConversation(goldenObject());
            assert.isTrue(fromText.ok);
            assert.deepEqual(fromObject, fromText);
        });

        it("an unknown part kind is an invalid record", () => {
            const record = goldenObject();
            const messages = record.messages as { parts: unknown[] }[];
            messages[0].parts.push({ type: "audio", origin: "reader", data: "..." });
            assert.deepEqual(readConversation(record), {
                ok: false,
                code: "AI_HISTORY_UNAVAILABLE",
                params: { reason: "invalid-record" },
            });
        });

        it("anything else that is not a valid record is an invalid record, never a throw", () => {
            const invalid = {
                ok: false,
                code: "AI_HISTORY_UNAVAILABLE",
                params: { reason: "invalid-record" },
            } as const;
            const cases: unknown[] = [
                "{ not json",
                null,
                42,
                [],
                { ...goldenObject(), format: "something-else" },
                { ...goldenObject(), version: 0 },
                { ...goldenObject(), version: "1" },
                { ...goldenObject(), extra: true },
                {
                    ...goldenObject(),
                    messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "no origin" }] }],
                },
                {
                    ...goldenObject(),
                    messages: [
                        {
                            id: "m1",
                            role: "assistant",
                            parts: [{ type: "outcome", origin: "graphty", code: "failed", params: {} }],
                        },
                    ],
                },
            ];
            for (const input of cases) {
                assert.deepEqual(readConversation(input), invalid, JSON.stringify(input)?.slice(0, 80));
            }
        });
        it("a helper's conversation holding another helper's is an invalid record", () => {
            const record = goldenObject();
            const messages = record.messages as { id: string; parts: { type: string; messages?: unknown[] }[] }[];
            const ref = messages
                .find((message) => message.id === "m8")
                ?.parts.find((part) => part.type === "agent-ref");
            assert.isDefined(ref);
            ref?.messages?.push({
                id: "h4",
                role: "assistant",
                parts: [{ type: "agent-ref", origin: "graphty", agent: "counter", callId: "d2", messages: [] }],
            });
            assert.deepEqual(readConversation(record), {
                ok: false,
                code: "AI_HISTORY_UNAVAILABLE",
                params: { reason: "invalid-record" },
            });
        });

        it("a hosted-tool source that is not an http or https URL is an invalid record", () => {
            for (const url of ["javascript:alert(1)", "ftp://example.org/x", "data:text/html,hi", "not a url"]) {
                const record = goldenObject();
                const messages = record.messages as { id: string; parts: Record<string, unknown>[] }[];
                const ref = messages.find((message) => message.id === "m10")?.parts[0] as {
                    messages: { parts: { type: string; sources?: { url: string }[] }[] }[];
                };
                const hosted = ref.messages
                    .flatMap((message) => message.parts)
                    .find((part) => part.type === "hosted-tool");
                assert.isDefined(hosted?.sources?.[0]);
                if (hosted?.sources?.[0]) {
                    hosted.sources[0].url = url;
                }

                assert.deepEqual(
                    readConversation(record),
                    { ok: false, code: "AI_HISTORY_UNAVAILABLE", params: { reason: "invalid-record" } },
                    url,
                );
            }
        });

        it("a hosted-tool part outside a helper's conversation reads, and one of an unknown tool too", () => {
            const record = goldenObject();
            const messages = record.messages as { id: string; parts: unknown[] }[];
            messages
                .find((message) => message.id === "m9")
                ?.parts.push({ type: "hosted-tool", origin: "web", tool: "web-map", status: "done", sources: [] });
            assert.isTrue(readConversation(record).ok);
        });

        it("a question with fewer than two choices, or more than ten, is an invalid record", () => {
            for (const choices of [["yes"], Array.from({ length: 11 }, (_, index) => String(index))]) {
                const record = goldenObject();
                const pending = record.pending as { kind: string; choices?: string[] }[];
                const question = pending.find((entry) => entry.kind === "question");
                assert.isDefined(question);
                if (question) {
                    question.choices = choices;
                }

                assert.deepEqual(readConversation(record), {
                    ok: false,
                    code: "AI_HISTORY_UNAVAILABLE",
                    params: { reason: "invalid-record" },
                });
            }
        });
    });

    describe("writing", () => {
        it("cuts a tool result's text inside a helper's conversation too", () => {
            const record = golden();
            const long: ConversationRecord = {
                ...record,
                messages: [
                    {
                        id: "m1",
                        role: "assistant",
                        parts: [
                            {
                                type: "agent-ref",
                                origin: "graphty",
                                agent: "counter",
                                callId: "d1",
                                messages: [
                                    {
                                        id: "h1",
                                        role: "tool",
                                        parts: [
                                            {
                                                type: "tool-result",
                                                origin: "graph-data",
                                                callId: "t1",
                                                code: "AI_COMPLETED",
                                                params: {},
                                                content: "x".repeat(9000),
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };
            const read = readConversation(writeConversation(long));
            const ref = read.ok ? read.record.messages[0].parts[0] : undefined;
            const part = ref?.type === "agent-ref" ? ref.messages[0].parts[0] : undefined;
            assert.strictEqual(part?.type === "tool-result" ? part.content.length : -1, 8000);
        });

        it("cuts a tool result's text to 8,000 characters", () => {
            const record = golden();
            const long: ConversationRecord = {
                ...record,
                messages: [
                    {
                        id: "m1",
                        role: "tool",
                        parts: [
                            {
                                type: "tool-result",
                                origin: "graph-data",
                                callId: "t1",
                                code: "AI_COMPLETED",
                                params: {},
                                content: "x".repeat(9000),
                            },
                        ],
                    },
                ],
            };
            const read = readConversation(writeConversation(long));
            assert.isTrue(read.ok);
            const part = read.ok ? read.record.messages[0].parts[0] : undefined;
            assert.strictEqual(part?.type === "tool-result" ? part.content.length : -1, 8000);
        });

        it("writes the keys of every object in sorted order", () => {
            const json = writeConversation(golden());
            assert.strictEqual(json, `${JSON.stringify(sortKeys(JSON.parse(json)), null, 4)}\n`);
        });
    });
});
