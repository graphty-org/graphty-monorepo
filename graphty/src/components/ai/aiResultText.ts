import type { ExecutionResult } from "@graphty/graphty-element/ai";
import type { AiResultCode } from "@graphty/graphty-element/catalog";

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
};

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
    const words = result.code === undefined ? undefined : WORDS[result.code];
    if (result.success) {
        return words ?? (result.message || result.llmText || "Done.");
    }

    return words ?? "The assistant could not answer.";
}
