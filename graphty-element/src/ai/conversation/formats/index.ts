/**
 * @file Reading and writing a saved conversation (design/ai/tanstack-ai-harness-design.md,
 * section 5.1). Pure functions, no DOM.
 *
 * A record is read from any version this release knows, upgraded to the newest on the way in (a
 * version 2 adds `upgradeV1ToV2` here), and rewritten only when next saved. A record of a newer
 * version is left untouched; an invalid one is reported, never thrown.
 */

import { AI_CONVERSATION_FORMAT, AI_CONVERSATION_FORMAT_VERSION } from "../../../catalog/ai";
import { type ConversationRecordV1, conversationSchema, type SavedMessage, TOOL_RESULT_MAX_CHARS } from "./v1";

export type { ConversationRecordV1 as ConversationRecord } from "./v1";

/** What a configured API key becomes in written JSON. */
export const KEY_PLACEHOLDER = "[api-key]";

/** What reading a saved conversation gives. */
export type ReadConversationResult =
    | { readonly ok: true; readonly record: ConversationRecordV1 }
    | { readonly ok: false; readonly code: "AI_HISTORY_NEWER_FORMAT"; readonly params: { readonly version: number } }
    | {
          readonly ok: false;
          readonly code: "AI_HISTORY_UNAVAILABLE";
          readonly params: { readonly reason: "invalid-record" };
      };

const INVALID = { ok: false, code: "AI_HISTORY_UNAVAILABLE", params: { reason: "invalid-record" } } as const;

/**
 * Read a saved conversation. Never throws, and never changes what it is given.
 * @param input - The record: its JSON text, or the object a store holds.
 * @returns The record at the newest version, `AI_HISTORY_NEWER_FORMAT` for a record a newer
 * release wrote, or `AI_HISTORY_UNAVAILABLE` (`invalid-record`).
 */
export function readConversation(input: unknown): ReadConversationResult {
    let value = input;
    if (typeof input === "string") {
        try {
            value = JSON.parse(input);
        } catch {
            return INVALID;
        }
    }

    if (typeof value !== "object" || value === null || !("format" in value) || !("version" in value)) {
        return INVALID;
    }

    const { format, version } = value;
    if (format !== AI_CONVERSATION_FORMAT || typeof version !== "number" || !Number.isInteger(version)) {
        return INVALID;
    }

    if (version > AI_CONVERSATION_FORMAT_VERSION) {
        return { ok: false, code: "AI_HISTORY_NEWER_FORMAT", params: { version } };
    }

    const parsed = conversationSchema.safeParse(value);
    return parsed.success ? { ok: true, record: parsed.data } : INVALID;
}

/** How a record is written. */
export interface WriteConversationOptions {
    /** Configured API keys: any text holding one has it replaced with a placeholder. */
    readonly secrets?: readonly string[];
}

/**
 * Write a saved conversation as canonical JSON: keys sorted, four-space indent, a final newline.
 * Configured keys are replaced with {@link KEY_PLACEHOLDER} everywhere, and a tool result's text
 * is cut to the format's cap.
 * @param record - The record.
 * @param options - The keys to keep out.
 * @returns The JSON text.
 * @throws {Error} When the record is not a valid record of the newest version (a bug in the caller).
 */
export function writeConversation(record: ConversationRecordV1, options: WriteConversationOptions = {}): string {
    const secrets = (options.secrets ?? []).filter((secret) => secret.length > 0);
    const redact = (text: string): string =>
        secrets.reduce((out, secret) => out.replaceAll(secret, KEY_PLACEHOLDER), text);
    const cap = (messages: readonly SavedMessage[]): unknown[] =>
        messages.map((message) => ({
            ...message,
            parts: message.parts.map((part) => {
                if (part.type === "tool-result") {
                    return { ...part, content: redact(part.content).slice(0, TOOL_RESULT_MAX_CHARS) };
                }

                // A helper's messages hold no agent-ref, so this recursion is one level deep.
                return part.type === "agent-ref" ? { ...part, messages: cap(part.messages) } : part;
            }),
        }));
    const capped = { ...record, messages: cap(record.messages) };
    const valid = conversationSchema.parse(canonical(capped, redact));
    return `${JSON.stringify(
        canonical(valid, (text) => text),
        null,
        4,
    )}\n`;
}

/**
 * A JSON value with every object's keys sorted and every string (keys included) passed through `map`.
 * @param value - The value.
 * @param map - What to do to each string.
 * @returns The copy.
 */
function canonical(value: unknown, map: (text: string) => string): unknown {
    if (typeof value === "string") {
        return map(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => canonical(item, map));
    }

    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .map(([key, item]) => [map(key), canonical(item, map)] as const)
                // Code-unit order, the same in every locale; keys are unique.
                .sort(([a], [b]) => (a < b ? -1 : 1)),
        );
    }

    return value;
}
