/**
 * `Array.isArray` that narrows to `readonly unknown[]`: the built-in narrows to `any[]`, which lets
 * an unchecked value through, and narrows a `readonly` array type poorly.
 *
 * A leaf module with no imports, so any entry point may reach it for this function alone.
 * @param value - The value.
 * @returns True when it is an array.
 */
export function isArray(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
}
