/**
 * The thrown value as an `Error`, for a logger or an error event that takes one.
 * @param thrown - Whatever was caught.
 * @returns It, when it is an `Error`; otherwise an `Error` whose message is its text.
 */
export function asError(thrown: unknown): Error {
    return thrown instanceof Error ? thrown : new Error(String(thrown));
}
