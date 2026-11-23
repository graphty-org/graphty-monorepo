/**
 * A number of degrees from a node attribute: a number, or a string that reads as one.
 * @param value - the attribute's value
 * @returns the number, NaN for anything else
 */
export function degrees(value: unknown): number {
    if (typeof value === "number") {
        return value;
    }

    return typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
}
