import type {
    AiApprovalRequest,
    AiCallRecord,
    AiConversationSnapshot,
    ExecutionResult,
} from "@graphty/graphty-element/ai";
import type { AiResultCode, AiResultParams } from "@graphty/graphty-element/catalog";

import type { ChatMessage } from "./AiMessageBubble";

/** The app's words for an assistant result, keyed by graphty-element's result code. */
const WORDS: Partial<Record<AiResultCode, string>> = {
    AI_NO_RESPONSE: "The assistant did not answer.",
    AI_NOT_ENABLED: "The assistant is not ready yet.",
    AI_DISPOSED: "The assistant was switched off.",
    AI_KEY_MISSING: "Add an API key for this provider in Settings first.",
    AI_KEY_REJECTED: "The provider refused the API key. Check it in Settings.",
    AI_PROVIDER_ERROR: "The provider could not be reached. Try again.",
    AI_CANCELLED: "Stopped. Nothing was changed.",
    AI_UNDONE: "Undone. Nothing was changed.",
    AI_TOOL_THREW: "Something went wrong, so nothing was changed.",
    AI_CONFIRMATION_NEEDED: "This change waits for your approval.",
    AI_APPROVAL_DENIED: "You declined the change, so nothing was changed.",
    AI_APPROVAL_STALE: "That change did not run.",
    AI_TOOL_DENIED_BY_POLICY: "That change is not allowed here, so nothing was changed.",
    AI_TOOL_NOT_RUN: "Not run.",
    AI_HISTORY_UNAVAILABLE: "Saved conversations cannot be used here.",
    AI_HISTORY_NEWER_FORMAT: "A conversation saved by a newer version of Graphty was left as it is.",
    AI_STORAGE_FAILED: "The conversation could not be saved. It is kept until you close this page.",
    AI_QUESTION_ASKED: "The assistant asked you a question.",
    AI_ANSWER_INVALID: "That answer is not one of the choices.",
    AI_CONFIG_INVALID: "The assistant's settings name something it cannot use, so nothing was sent.",
};

/** Words for a code whose `reason` param says more, keyed by code and then reason. */
const REASON_WORDS: Partial<Record<AiResultCode, Readonly<Record<string, string>>>> = {
    AI_APPROVAL_STALE: {
        "graph-changed": "The graph changed after the change was proposed, so it did not run.",
        expired: "That request is no longer open.",
        "resolved-elsewhere": "That request was answered in another window.",
        superseded: "A newer message replaced that request, so the change did not run.",
    },
    AI_HISTORY_UNAVAILABLE: {
        "invalid-record": "A saved conversation could not be read, so it was skipped.",
        "storage-unavailable": "This browser cannot save conversations. This one is kept until you close the page.",
        "unknown-conversation": "That conversation is not saved.",
    },
};

/**
 * The app's words for a code and its params.
 * @param code - The code.
 * @param params - Its params.
 * @returns The words, or undefined for a code the app has none for.
 */
export function aiCodeText(code: AiResultCode, params: AiResultParams | undefined): string | undefined {
    const reason = params?.reason;
    return (typeof reason === "string" ? REASON_WORDS[code]?.[reason] : undefined) ?? WORDS[code];
}

/**
 * What the AI panel says for an assistant result.
 * @param result - The result, and the error when the request itself threw.
 * @returns The reply's text.
 */
export function aiResultText(result: ExecutionResult & { readonly error?: Error }): string {
    if (result.error) {
        return result.error.message;
    }

    // A result with no code (one the app did not get from the element) keeps the general text.
    const words = result.code === undefined ? undefined : aiCodeText(result.code, result.params);
    if (result.success) {
        return words ?? (result.message || result.llmText || "Done.");
    }

    return words ?? "The assistant could not answer.";
}

/**
 * A tool call and its arguments, as text.
 * @param tool - The tool's name.
 * @param args - Its arguments.
 * @returns e.g. `edit_data {"action":"delete_all"}`.
 */
function callText(tool: string, args: Readonly<Record<string, unknown>>): string {
    return `${tool} ${JSON.stringify(args)}`;
}

/**
 * One call the assistant made, with what came of it.
 * @param call - The call.
 * @param waiting - Whether its message waits on the reader's approval.
 * @returns e.g. `edit_data {"action":"delete_all"}: Done.`
 */
function callRecordText(call: AiCallRecord, waiting: boolean): string {
    let outcome: string;
    if (waiting) {
        outcome = WORDS.AI_CONFIRMATION_NEEDED ?? "";
    } else if (call.code === "AI_COMPLETED") {
        outcome = "Done.";
    } else {
        outcome = aiCodeText(call.code, call.params) ?? "Failed.";
    }

    return `${callText(call.command, call.arguments)}: ${outcome}`;
}

/**
 * What a held change would do, in the app's words: one line per fact the element measured.
 * @param request - The request.
 * @returns The lines, the calls first.
 */
export function approvalLines(request: AiApprovalRequest): string[] {
    const { preview } = request;
    const lines = request.calls.map((call) => callText(call.tool, call.arguments));
    if (request.gate === "plan") {
        lines.unshift("The assistant wants to hand this work to a helper.");
    }

    if (request.agent !== undefined) {
        lines.unshift(`Asked by the helper ${request.agent}.`);
    }
    const plural = (count: number, one: string): string => `${String(count)} ${one}${count === 1 ? "" : "s"}`;

    if (preview.removeNodes) {
        lines.push(`Removes ${plural(preview.removeNodes, "node")}.`);
    }

    if (preview.removeEdges) {
        lines.push(`Removes ${plural(preview.removeEdges, "edge")}.`);
    }

    if (preview.changedValues) {
        lines.push(`Changes ${plural(preview.changedValues, "value")}.`);
    }

    if (preview.mode === "replace" || (preview.mode === undefined && preview.nodes !== undefined)) {
        lines.push(
            `Discards the graph's ${plural(preview.nodes ?? 0, "node")} and ${plural(preview.edges ?? 0, "edge")}.`,
        );
    }

    if (preview.url !== undefined) {
        lines.push(`Fetches ${preview.url}.`);
    }

    if (preview.seconds !== undefined) {
        lines.push(
            preview.seconds === "unbounded"
                ? "May run for a long time."
                : `Takes about ${plural(Math.ceil(preview.seconds), "second")}.`,
        );
    }

    if (preview.run !== undefined) {
        lines.push(`Stops the run ${preview.run}.`);
    }

    return lines;
}

/** What the transcript is drawn from, as `useAiManager` holds it. */
export interface AiTranscriptSource {
    readonly conversation: AiConversationSnapshot | null;
    readonly historyNotice: { readonly code: AiResultCode; readonly params: AiResultParams } | null;
}

/**
 * The AI panel's transcript: the element's saved conversation (the message being sent included,
 * and how a failed one ended), then what it never saves (a store problem).
 * @param source - The conversation and the store's last notice.
 * @returns The messages, oldest first.
 */
export function aiTranscript(source: AiTranscriptSource): ChatMessage[] {
    const waiting = new Set(source.conversation?.pending.map((request) => request.messageId));
    const messages: ChatMessage[] = (source.conversation?.messages ?? []).flatMap((message): ChatMessage[] => {
        if (message.role === "reader") {
            return [{ id: message.id, role: "user", content: message.text }];
        }

        if (message.role !== "assistant") {
            // A role a newer element added: nothing this release knows how to draw.
            return [];
        }

        const lines = [message.text, ...message.calls.map((call) => callRecordText(call, waiting.has(message.id)))];
        if (message.outcome !== undefined) {
            lines.push(aiResultText({ success: false, message: "", ...message.outcome }));
        }

        return [
            {
                id: message.id,
                role: "assistant",
                content: lines.filter((line) => line !== "").join("\n"),
                ...(message.agent === undefined ? {} : { agent: message.agent }),
                ...(message.outcome === undefined ? {} : { isError: true }),
            },
        ];
    });

    if (source.historyNotice !== null) {
        messages.push({
            id: "history-notice",
            role: "system",
            content: aiCodeText(source.historyNotice.code, source.historyNotice.params) ?? "",
        });
    }

    return messages;
}
