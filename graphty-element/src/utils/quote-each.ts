/**
 * Each value in double quotes, joined: `quoteEach(["a", "b"], " or ")` is `"a" or "b"`.
 *
 * A leaf module with no imports, so the Node-safe entry points that build messages with it pay for
 * this function and nothing else.
 * @param values - The values.
 * @param separator - The text between two quoted values.
 * @returns The quoted values, joined.
 */
export function quoteEach(values: readonly string[], separator: string): string {
    return values.map((value) => `"${value}"`).join(separator);
}
