import { redactSecrets } from "../logging/redactSecrets";

/** The name of the error a provider throws when it needs an API key and has none. */
export const API_KEY_MISSING_ERROR = "ApiKeyMissingError";

/**
 * An error safe to hand to a consumer, a log or an error reporter: the name, the message and the
 * stack of the original with every credential removed, plus its HTTP status when it had one.
 *
 * A provider SDK's error (the AI SDK's `APICallError`, `RetryError`) carries the request it sent
 * and the response it got -- the prompt, the person's message, graph values, tool results and the
 * request headers -- as properties, and an error reporter that serializes an error's own
 * properties sends all of it. So none of those are copied, and neither is `cause`.
 * @param error - what was thrown.
 * @param secrets - values known to be secret, such as the configured API key.
 * @returns a new Error holding only the safe parts.
 */
export function toSafeError(error: unknown, secrets: readonly (string | undefined)[] = []): Error {
    const original = error instanceof Error ? error : new Error(String(error));
    const safe = new Error(redactSecrets(original.message, secrets));
    safe.name = original.name;
    safe.stack = original.stack === undefined ? undefined : redactSecrets(original.stack, secrets);
    const { statusCode, lastError } = original as { statusCode?: unknown; lastError?: { statusCode?: unknown } };
    const status = statusCode ?? lastError?.statusCode;
    if (typeof status === "number") {
        Object.assign(safe, { statusCode: status });
    }
    return safe;
}
