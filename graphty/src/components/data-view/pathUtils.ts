import type { keyPathNode } from "./DataGrid";

/**
 * Flattens a keyPathNode array, handling cases where nodes might be arrays themselves.
 * The keyPathNode type is: string | string[] | number | number[]
 * @param keyPath - The key path array to flatten
 * @returns The flattened array of string or number segments
 */
function flattenKeyPath(keyPath: keyPathNode[]): (string | number)[] {
    const result: (string | number)[] = [];
    for (const node of keyPath) {
        if (Array.isArray(node)) {
            result.push(...node);
        } else {
            result.push(node);
        }
    }

    return result;
}

/**
 * Checks if a string represents a valid array index (non-negative integer).
 * @param value - The value to check
 * @returns True if the value represents a valid array index
 */
function isArrayIndex(value: string | number): boolean {
    if (typeof value === "number") {
        return Number.isInteger(value) && value >= 0;
    }

    // Check if it's a pure numeric string (like "0", "1", "42")
    return /^(0|[1-9]\d*)$/.test(value);
}

/**
 * Checks if a key needs to be quoted in JMESPath.
 * Keys need quoting if they contain special characters or start with a digit.
 * @param key - The key to check
 * @returns True if the key needs to be quoted
 */
function needsQuoting(key: string): boolean {
    // JMESPath identifiers must start with a letter or underscore and
    // contain only letters, digits, and underscores
    return !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
}

/**
 * Converts a keyPath array (from react-json-grid) to a JMESPath string.
 *
 * Examples:
 * - ["name"] -> "name"
 * - ["metadata", "created"] -> "metadata.created"
 * - [0, "name"] -> "[0].name"
 * - ["users", 0, "profile"] -> "users[0].profile"
 * - ["my-key", "value"] -> '"my-key".value'
 * @param keyPath - Array of path segments from react-json-grid's onSelect callback
 * @returns JMESPath string that can be used to query the data
 */
export function keyPathToJMESPath(keyPath: keyPathNode[]): string {
    if (keyPath.length === 0) {
        return "";
    }

    const flatPath = flattenKeyPath(keyPath);
    const parts: string[] = [];

    for (const segment of flatPath) {
        const isIndex = isArrayIndex(segment);

        if (isIndex) {
            // Array index: [n]
            parts.push(`[${segment}]`);
        } else {
            const key = String(segment);
            // Object key: .key or "key" if special characters
            if (needsQuoting(key)) {
                if (parts.length === 0) {
                    parts.push(`"${key}"`);
                } else {
                    parts.push(`."${key}"`);
                }
            } else if (parts.length === 0) {
                parts.push(key);
            } else {
                parts.push(`.${key}`);
            }
        }
    }

    return parts.join("");
}

/**
 * Gets the value at a given keyPath within a data object.
 * @param data - The root object to traverse
 * @param keyPath - Array of path segments to the desired value
 * @returns The value at the path, or undefined if the path doesn't exist
 */
export function getValueAtPath(data: object, keyPath: keyPathNode[]): unknown {
    if (keyPath.length === 0) {
        return data;
    }

    const flatPath = flattenKeyPath(keyPath);
    let current: unknown = data;

    for (const segment of flatPath) {
        if (current === null || current === undefined) {
            return undefined;
        }

        if (typeof current !== "object") {
            return undefined;
        }

        const key = typeof segment === "number" ? segment : segment;
        current = (current as Record<string | number, unknown>)[key];
    }

    return current;
}
