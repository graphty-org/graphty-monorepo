/**
 * @file The byte walk the sets tests check a cache's own accounting against (design/sets plan
 * 1.4): every typed-array byte reachable from a value, written independently of the accounting.
 */

/**
 * Every typed-array byte reachable from a value through its own enumerable values.
 * @param value - The value.
 * @param seen - Objects walked already, so a shared array counts once.
 * @returns The bytes.
 */
export function reachableBytes(value: unknown, seen = new Set<unknown>()): number {
    if (typeof value !== "object" || value === null || seen.has(value)) {
        return 0;
    }

    seen.add(value);
    if (ArrayBuffer.isView(value)) {
        return value.byteLength;
    }

    return Object.values(value).reduce<number>((sum, child) => sum + reachableBytes(child, seen), 0);
}
