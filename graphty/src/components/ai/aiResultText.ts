import type {
    AiApprovalRequest,
    AiCallRecord,
    AiConversationSnapshot,
    AiVoiceSupport,
    ExecutionResult,
} from "@graphty/graphty-element/ai";
import type { AiResultCode, AiResultParams, AiVoiceDestination } from "@graphty/graphty-element/catalog";

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
    AI_HOSTED_TOOL_UNSUPPORTED: "This provider cannot use that tool, so the assistant works without it.",
    AI_PROVIDER_PAUSED:
        "The provider kept pausing its web search, so it did not finish. Sending the message again starts the search over.",
    AI_VOICE_UNAVAILABLE: "Speech cannot be used here. Type your message instead.",
};

/** Words for a code whose `reason` (or else `tool`) param says more, keyed by code and then that param. */
const REASON_WORDS: Partial<Record<AiResultCode, Readonly<Record<string, string>>>> = {
    AI_TOOL_DENIED_BY_POLICY: {
        "web-content":
            "The assistant read web content in this conversation, so it may not change the graph on its own. Nothing was changed.",
        "in-page-code": "Code the assistant runs may only read the graph, so nothing was changed.",
    },
    AI_HOSTED_TOOL_UNSUPPORTED: {
        "web-search": "This provider cannot search the web, so the assistant works without web search.",
        "web-fetch": "This provider cannot read web pages, so the assistant works without them.",
        "in-page-code": "Code cannot run in this page, so the assistant works without it.",
    },
    AI_APPROVAL_STALE: {
        "graph-changed": "The graph changed after the change was proposed, so it did not run.",
        expired: "That request is no longer open.",
        "resolved-elsewhere": "That request was answered in another window.",
        superseded: "A newer message replaced that request, so the change did not run.",
    },
    // Keyed by every AI_VOICE_UNAVAILABLE_REASONS entry (a test checks each has words).
    AI_VOICE_UNAVAILABLE: {
        "no-recognition":
            "This browser cannot turn speech into text. Choose a transcription provider in Settings, or type.",
        "no-microphone": "No microphone was found. Type your message instead.",
        "permission-denied": "The microphone is blocked for this page. Allow it in the browser, or type.",
        "insecure-context": "Speech needs a secure (https) page. Type your message instead.",
        "no-provider-transcription":
            "Your provider cannot turn speech into text. Choose a transcription provider in Settings, or type.",
        "no-provider-speech": "Your provider cannot speak answers, so they are shown as text.",
        "no-key": "Add an API key for the provider that handles speech in Settings first.",
        "no-synthesis": "This browser cannot speak answers, so they are shown as text.",
        "playback-failed": "The answer could not be played, so it is shown as text.",
        "unknown-voice": "Your provider has no voice by that name, so answers are shown as text.",
        "recognition-network":
            "Speech could not reach the browser's recognition service. Check the connection, or type.",
    },
    // A spoken "yes" leaves these holds waiting: they are approved on screen.
    AI_CONFIRMATION_NEEDED: {
        "web-content":
            "The assistant read web content in this conversation, so approve this change on screen, not by voice.",
        irreversible: "This change cannot be undone, so approve it on screen, not by voice.",
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
    const reason = params?.reason ?? params?.tool ?? params?.gate;
    return (typeof reason === "string" ? REASON_WORDS[code]?.[reason] : undefined) ?? WORDS[code];
}

/**
 * The words the element speaks for an outcome the model wrote no text for (`voice.say`).
 * @param fact - The outcome.
 * @param fact.code - Its code.
 * @param fact.params - Its params.
 * @returns The app's words, or undefined to say nothing.
 */
export function aiSay(fact: { code: AiResultCode; params: AiResultParams }): string | undefined {
    return aiCodeText(fact.code, fact.params);
}

/**
 * The app's words for the controls the element draws in VR and AR (`xr.ai.labels`): approve,
 * deny, the reader's words as heard, and each result code's text.
 */
export const XR_AI_LABELS: Readonly<Record<string, string>> = {
    ...WORDS,
    AI_COMPLETED: "Assistant",
    XR_APPROVE: "Approve",
    XR_DENY: "Deny",
    XR_TRANSCRIPT: "You said",
    // Why a change was held, keyed by its gate.
    slow: "This may take a while.",
    large: "This changes a lot of the graph.",
    replaces: "This replaces the graph.",
    irreversible: "This cannot be undone.",
    network: "This fetches a URL you did not give.",
    policy: "This change waits for your approval.",
    plan: "The assistant wants to hand this work to a helper.",
    "web-content": "Asked for after the assistant read the web. Approve only what you asked for.",
    // What the held change does, keyed by the preview's fact.
    removeNodes: "Nodes removed",
    removeEdges: "Edges removed",
    changedValues: "Values changed",
    ids: "Nodes",
    algorithm: "Algorithm",
    seconds: "Seconds",
    run: "Stops the run",
    nodes: "Nodes in the graph",
    edges: "Edges in the graph",
    mode: "Import",
    url: "Fetches",
};

/**
 * Where speech goes, in the app's words, from graphty-element's voice support.
 * @param support - The element's report.
 * @returns A sentence for each direction that is on: where the reader's audio, and the answer to
 * speak, are sent.
 */
export function speechDestinationText(support: AiVoiceSupport): string[] {
    const heard: Partial<Record<AiVoiceDestination, string>> = {
        "on-device": "Your speech is turned into text on this device.",
        "browser-vendor": "Your speech is sent to your browser's maker (Google for Chrome) to be turned into text.",
        provider: "Your speech is sent to your AI provider to be turned into text.",
    };
    const spoken: Partial<Record<AiVoiceDestination, string>> = {
        "on-device": "Answers are spoken on this device.",
        "browser-vendor": "Answers are spoken by your browser's online voice.",
        provider: "Answers are sent to your AI provider to be spoken.",
    };
    return [heard[support.input.destination], spoken[support.output.destination]].filter(
        (line): line is string => line !== undefined,
    );
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
        outcome =
            call.params.hostedToolUses === 0
                ? "Done, without searching or reading the web: the answer is from the model's own knowledge."
                : "Done.";
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

    if (request.gate === "web-content") {
        lines.unshift("The assistant read web content in this conversation. Approve only what you asked for.");
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
    /** The tools the element left out, each noticed once. */
    readonly capabilityNotices?: readonly { readonly code: AiResultCode; readonly params: AiResultParams }[];
    /** Why the last utterance could not be heard. */
    readonly voiceNotice?: { readonly code: AiResultCode; readonly params: AiResultParams } | null;
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
            return [
                {
                    id: message.id,
                    role: "user",
                    content: message.text,
                    ...(message.via === "voice" ? { spoken: true } : {}),
                },
            ];
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
                ...(message.sources.length === 0 ? {} : { sources: message.sources }),
            },
        ];
    });

    (source.capabilityNotices ?? []).forEach((notice, index) => {
        messages.push({
            id: `capability-notice-${String(index)}`,
            role: "system",
            content: aiCodeText(notice.code, notice.params) ?? "",
        });
    });

    const voiceNotice = source.voiceNotice ?? null;
    if (voiceNotice !== null) {
        messages.push({
            id: "voice-notice",
            role: "system",
            content: aiCodeText(voiceNotice.code, voiceNotice.params) ?? "",
        });
    }

    if (source.historyNotice !== null) {
        messages.push({
            id: "history-notice",
            role: "system",
            content: aiCodeText(source.historyNotice.code, source.historyNotice.params) ?? "",
        });
    }

    return messages;
}
