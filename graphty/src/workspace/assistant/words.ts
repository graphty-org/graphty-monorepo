/**
 * Every word the Assistant's panel and its Settings section show, keyed as `design/ui/framework/
 * message-catalog.md` keys them. The element returns codes and parameters; these are the app's words
 * for them. The English the element writes for a log (a stage's message, an error's text, a result's
 * message) is never read here.
 */

import {
    AI_PROVIDER_DESCRIPTORS,
    type AiKeyShapeCheck,
    algorithmByKey,
    ASSISTANT_TOOLS,
} from "@graphty/graphty-element/catalog";

export const WORDS = {
    "assistant.name": "Assistant",
    "assistant.title.new": "New conversation",
    "assistant.title.tooltip": "Conversations",
    "assistant.new": "New conversation",
    "assistant.close": "Close",
    "assistant.intro": "Ask about this graph or change it. It can be wrong.",
    "assistant.setup.line": "Needs a key from an AI provider. Nothing is sent until you add one.",
    "assistant.setup.button": "AI provider...",
    "assistant.starter.matter": "Which nodes matter most?",
    "assistant.starter.groups": "What groups does this graph have?",
    "assistant.starter.stands-out": "What stands out in this graph?",
    "assistant.composer.placeholder": "Ask about this graph",
    "assistant.composer.name": "Message the assistant",
    "assistant.send": "Send",
    "assistant.send.tooltip": "Enter sends, Shift+Enter makes a new line",
    "assistant.stop": "Stop Esc",
    "assistant.model.tooltip": "Change provider or model",
    "assistant.log.name": "Conversation",
    "assistant.jump": "Jump to newest",
    "assistant.turn.you": "You",
    "assistant.turn.you-spoken": "You (spoken)",
    "assistant.turn.assistant": "Assistant",
    "assistant.step.unnamed": "A step",
    "assistant.again": "Send again",
    "assistant.nothing-changed": "Nothing changed.",
    "assistant.list.name": "Conversations",
    "assistant.list.open": "Open",
    "assistant.list.delete": "Delete",
    "assistant.list.confirm": "Delete this conversation?",
    "assistant.list.keep": "Keep it",
    "assistant.list.untitled": "New conversation",
    "assistant.working.writing": "Writing",
    "assistant.status.working": "Working",
    "assistant.status.ready": "Answer ready",
    "assistant.provider.provider": "Provider",
    "assistant.provider.model": "Model",
    "assistant.provider.key": "API key",
    "assistant.provider.key-saved": "********************",
    "assistant.provider.remember": "Remember on this device",
    "assistant.provider.remember-note": "Stored in this browser, not encrypted.",
    "assistant.provider.history-note": "Conversations stay in this browser, not encrypted.",
    "assistant.provider.save": "Save",
    "assistant.provider.forget": "Forget key",
    "assistant.provider.delete-all": "Delete all conversations",
    "assistant.provider.delete-all-confirm": "Delete all conversations?",
    "assistant.provider.delete-all-yes": "Delete all",
    "assistant.provider.delete-all-no": "Keep them",
} as const;

/** The pages a reader makes a key on, by provider id; the app's, not catalog data. */
export const KEY_PAGES: Readonly<Record<string, string>> = {
    google: "https://aistudio.google.com/apikey",
    openai: "https://platform.openai.com/api-keys",
    anthropic: "https://console.anthropic.com/settings/keys",
};

/**
 * What a run's model is told, written by the app for the model and never shown (design 5.4).
 */
export const MODEL_INSTRUCTIONS =
    "Keep answers short. Write plain text with no markdown. Never name a color or a position in an " +
    "answer. Ask the reader when a wrong guess would cost them.";

/** A result's params: the facts behind its code. */
type Params = Readonly<Record<string, string | number>>;

/** One ended turn in words. */
export interface EndWords {
    /** The turn's line. */
    readonly line: string;
    /** The one button it offers. */
    readonly action: "again" | "provider" | null;
    /** Whether the row is a failure, spoken at once. */
    readonly failed: boolean;
}

/**
 * A provider's own name.
 * @param id - its id, or what a result's params say it is.
 * @returns its name.
 */
export function providerName(id: unknown): string {
    return AI_PROVIDER_DESCRIPTORS.find((entry) => entry.id === id)?.plainName ?? String(id);
}

/**
 * A tool's plain name, or for an algorithm the algorithm's.
 * @param tool - the tool's name.
 * @param args - what the model called it with, read only to name an algorithm.
 * @returns the name.
 */
export function stepName(tool: string, args?: Readonly<Record<string, unknown>>): string {
    const algorithm =
        typeof args?.name === "string" && tool === "run_algorithm" ? algorithmByKey(args.name) : undefined;
    return (
        algorithm?.plainName ??
        ASSISTANT_TOOLS.find((entry) => entry.name === tool)?.plainName ??
        WORDS["assistant.step.unnamed"]
    );
}

/**
 * Why a provider could not be reached.
 * @param status - the HTTP status, when it answered with one.
 * @returns the cause.
 */
function causeWords(status: string | number | undefined): string {
    const code = Number(status);
    if (status === undefined || Number.isNaN(code)) {
        return "the connection failed";
    }
    if (code === 401 || code === 403) {
        return "the key was refused";
    }
    if (code === 429) {
        return "too many requests or the spend limit was reached";
    }
    return code >= 500 ? "the service is unavailable" : `error ${code}`;
}

/**
 * Why a held change was not run.
 * @param reason - the result's reason.
 * @returns the line.
 */
function staleWords(reason: string | number | undefined): string {
    switch (reason) {
        case "graph-changed":
            return "Not run: the graph changed.";
        case "superseded":
            return "Not run: you sent a new message.";
        case "expired":
            return "Not run: the request expired.";
        default:
            return "Not run.";
    }
}

/**
 * Worded by code, a failure offering Send again.
 * @param line - the words.
 * @returns the row.
 */
const retry = (line: string): EndWords => ({ line, action: "again", failed: true });

/**
 * Worded by code, a failure sending the reader to setup.
 * @param line - the words.
 * @returns the row.
 */
const setup = (line: string): EndWords => ({ line, action: "provider", failed: true });

/**
 * Worded by code, a line that needs no button.
 * @param line - the words.
 * @returns the row.
 */
const note = (line: string): EndWords => ({ line, action: null, failed: false });

/**
 * The words for how a message ended (design 6.4).
 * @param code - the result's code, open: an unknown one falls back on `success`.
 * @param params - its facts.
 * @param provider - the provider's id, for a code that does not name it.
 * @param success - whether the message succeeded, for an unknown code.
 * @returns the row, or null for a message that ended in the reply itself.
 */
export function endWords(code: string, params: Params, provider: string, success: boolean): EndWords | null {
    const name = providerName(params.provider ?? provider);
    switch (code) {
        case "AI_COMPLETED":
        case "AI_CONFIRMATION_NEEDED":
        case "AI_QUESTION_ASKED":
            return null;
        case "AI_NO_RESPONSE":
            return retry("No answer came back.");
        case "AI_NOT_ENABLED":
        case "AI_DISPOSED":
            return setup("The assistant is not connected.");
        case "AI_KEY_MISSING":
            return setup(`Add a key for ${name}.`);
        case "AI_KEY_REJECTED":
            return setup(`${name} refused the key.`);
        case "AI_CONFIG_INVALID":
            return setup("The AI provider settings cannot be used.");
        case "AI_HOSTED_TOOL_UNSUPPORTED":
            return note(`${name} cannot use this tool, so the assistant worked without it.`);
        case "AI_PROVIDER_ERROR":
            return retry(`Could not reach ${name}: ${causeWords(params.status)}.`);
        case "AI_PROVIDER_PAUSED":
            return retry(`${name} paused and did not finish.`);
        case "AI_FAILED":
        case "AI_TOOL_THREW":
        case "AI_TOOL_UNKNOWN":
        case "AI_TOOL_INVALID_ARGUMENTS":
            return retry("The assistant could not finish this step.");
        case "AI_TOOL_FAILED":
            return retry(`${stepName(String(params.tool))} failed.`);
        case "AI_CANCELLED":
            return note("Stopped. Changes taken back.");
        case "AI_UNDONE":
            return note("Undone while running. Changes taken back.");
        case "AI_ROLLBACK_PARTIAL":
            return note(`Stopped. ${params.steps} changes could not be taken back.`);
        case "AI_APPROVAL_DENIED":
            return note("Declined. Nothing changed.");
        case "AI_APPROVAL_STALE":
            return note(staleWords(params.reason));
        case "AI_TOOL_DENIED_BY_POLICY":
            return note("Not allowed here. Nothing changed.");
        case "AI_TOOL_NOT_RUN":
            return note("Not run.");
        case "AI_ANSWER_INVALID":
            return note("That is not one of the choices.");
        case "AI_HISTORY_UNAVAILABLE":
        case "AI_STORAGE_FAILED":
            return note("This conversation is not being saved.");
        case "AI_HISTORY_NEWER_FORMAT":
            return note("Saved by a newer version of graphty, so it was left as it is.");
        default:
            return success ? note("Finished.") : retry("Failed.");
    }
}

/**
 * The third starter.
 * @param column - the first categorical column's name.
 * @returns the question.
 */
export const starterColumn = (column: string): string => `Does ${column} line up with the groups?`;

/**
 * The steps row.
 * @param count - how many.
 * @returns its words.
 */
export const stepsWords = (count: number): string => `${count} ${count === 1 ? "step" : "steps"}`;

/**
 * A step's time.
 * @param ms - how long it ran.
 * @returns its words.
 */
export const durationWords = (ms: number): string => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

/**
 * The working line while a message is sent.
 * @param provider - the provider's name.
 * @returns the words.
 */
export const sendingWords = (provider: string): string => `Sending to ${provider}`;

/**
 * The working line while a tool runs.
 * @param name - the tool or algorithm's plain name.
 * @returns the words.
 */
export const runningWords = (name: string): string => `Running ${name}`;

/**
 * The words the provider section names a provider in.
 * @param provider - its name.
 * @returns the section's sentences and link.
 */
export const providerWords = (provider: string): { readonly disclosure: string; readonly link: string } => ({
    disclosure:
        `Your messages and what the assistant reads from the graph (column names, node ids, labels and ` +
        `values) go straight to ${provider}. ${provider} charges your key.`,
    link: `Get a key from ${provider}`,
});

/**
 * The one line under the key field.
 * @param check - what `checkApiKeyShape` said.
 * @param provider - the provider's name.
 * @returns the line, or null for a key of the right shape.
 */
export function keyShapeWords(check: AiKeyShapeCheck, provider: string): string | null {
    if (check.valid) {
        return null;
    }
    switch (check.code) {
        case "E_KEY_EMPTY":
            return "Enter a key.";
        case "E_KEY_PREFIX":
            return `${provider} keys start with ${check.params.prefix}.`;
        default:
            return "This key is too short.";
    }
}
