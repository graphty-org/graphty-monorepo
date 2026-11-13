/**
 * A canonical text for a json-column cell that tells apart every value the column can hold. Unlike
 * JSON.stringify it keeps NaN, Infinity, -Infinity and -0 distinct from null and 0, keeps an
 * undefined array entry or property (an unset row) distinct from null, and never throws: a value no
 * json column may hold (a bigint, a function, a class instance, a cycle) gets a marker of its own.
 * Used by the immutable-column checksum (design section 5.8) and the unique-column check.
 */

/** Deeper than any value a json column accepts (MAX_JSON_DEPTH is 256), so it only stops a cycle. */
const MAX_DEPTH = 300;

/**
 * The canonical text of one json value.
 * @param value - the cell value (undefined for an unset row)
 * @param depth - the nesting depth of `value`
 * @returns text that differs whenever the values differ
 */
export function jsonKey(value: unknown, depth = 0): string {
    if (value === undefined) {
        return "u";
    }
    if (value === null) {
        return "z";
    }
    switch (typeof value) {
        case "boolean":
            return value ? "t" : "f";
        case "number":
            return Object.is(value, -0) ? "n-0" : `n${String(value)}`;
        case "string":
            return `s${JSON.stringify(value)}`;
        default:
            break;
    }
    if (typeof value !== "object" || depth >= MAX_DEPTH) {
        return `?${typeof value}`;
    }
    if (Array.isArray(value)) {
        return `[${value.map((item: unknown) => jsonKey(item, depth + 1)).join(",")}]`;
    }
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
        return "?object";
    }
    const record = value as Record<string, unknown>;
    const fields = Object.keys(record).map((key) => `${JSON.stringify(key)}:${jsonKey(record[key], depth + 1)}`);
    return `{${fields.join(",")}}`;
}
