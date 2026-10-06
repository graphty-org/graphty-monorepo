/**
 * Formats a value for copying to clipboard.
 * - Strings, numbers, booleans: converted to string
 * - Objects and arrays: JSON stringified with 2-space indentation
 * - null: "null"
 * - undefined: "undefined"
 * @param value - The value to format for clipboard
 * @returns The formatted string representation
 */
export function formatValueForClipboard(value: unknown): string {
    if (value === null) {
        return "null";
    }

    if (value === undefined) {
        return "undefined";
    }

    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }

    // At this point value is a primitive (string, number, boolean, bigint, symbol)
    // These all have safe toString() implementations
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return value.toString();
    }

    if (typeof value === "symbol") {
        return value.toString();
    }

    // For any other edge cases (function, etc.)
    return typeof value === "function" ? "[Function]" : "[Unknown]";
}
