/**
 * Whether a value is a plain object: `{...}` or one made with a null prototype. Arrays are not,
 * whatever their prototype.
 *
 * A leaf module with no imports, so any entry point may reach it for this function alone.
 * @param value - The value.
 * @returns True when it is.
 */
export function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
