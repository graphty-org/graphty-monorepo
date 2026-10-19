/**
 * Parse a whole-number setting, refusing anything that is not a plain integer in range.
 * `Number.parseInt` turns "abc" into NaN and "12abc" into 12; this throws instead.
 * @param name - The setting's name, quoted in the error message
 * @param raw - The text to parse
 * @param min - The smallest accepted value
 * @param max - The largest accepted value
 * @returns The parsed integer
 */
export function parseIntegerSetting(
    name: string,
    raw: string | undefined,
    min: number,
    max = Number.MAX_SAFE_INTEGER,
): number {
    const value = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (value >= min && value <= max) {
        return value;
    }
    const range = max === Number.MAX_SAFE_INTEGER ? `of at least ${min}` : `from ${min} to ${max}`;
    throw new Error(`${name} must be an integer ${range}, got "${raw ?? ""}"`);
}
