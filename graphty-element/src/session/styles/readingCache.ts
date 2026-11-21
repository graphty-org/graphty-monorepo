/**
 * A reading of the style stack kept while nothing it reads changes.
 */

/**
 * Keep readings while their token stands.
 * @param readingToken - Everything a reading depends on besides its own arguments; equal tokens
 *   give equal answers, and null keeps nothing.
 * @returns A function that answers a question from the kept answer, or reads a fresh one.
 */
export function createReadingCache(
    readingToken: () => readonly unknown[] | null,
): <T>(key: string, read: () => T) => T {
    /** The readings answered under one token, by question; dropped when the token moves. */
    let readings: { token: readonly unknown[]; answers: Map<string, unknown> } | null = null;
    /**
     * A reading of the stack, kept while nothing it reads changes: on 50,000 nodes one agreement
     * walk takes most of a second, and a panel re-renders it on every keystroke around it.
     * @param key - The question, spelled uniquely.
     * @param read - Reads the answer.
     * @returns The kept answer, or a fresh one.
     */
    const kept = <T>(key: string, read: () => T): T => {
        const token = readingToken();
        if (token === null) {
            return read();
        }
        if (readings?.token.length !== token.length || readings.token.some((part, at) => !Object.is(part, token[at]))) {
            readings = { token, answers: new Map() };
        }
        if (readings.answers.has(key)) {
            return readings.answers.get(key) as T;
        }
        const answer = read();
        readings.answers.set(key, answer);
        return answer;
    };

    return kept;
}
