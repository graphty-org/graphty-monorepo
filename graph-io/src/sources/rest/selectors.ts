/**
 * Selectors of the REST mapping (design section 13.2): graph-io's dotted paths plus `[]` to flatten
 * an array. `results`, `meta.next_cursor`, `authorships[].author.id`; `.` is the value itself and
 * `#` is a record's position in the array it came from. Not JMESPath, so graph-io keeps zero
 * dependencies.
 */

/** One step of a selector: a key, and whether its value's array is flattened. */
interface Step {
    readonly key: string;
    readonly flatten: boolean;
}

/** A key: anything but a dot or a bracket. */
const STEP = /^([^.[\]]+)(\[\])?$/;

/** Parsed selectors, by text. */
const PARSED = new Map<string, readonly Step[] | null>();

/**
 * Parse a selector.
 * @param selector - the text
 * @returns its steps ([] for "."), or null when it is not a selector
 */
export function parseSelector(selector: string): readonly Step[] | null {
    const cached = PARSED.get(selector);
    if (cached !== undefined) {
        return cached;
    }
    let steps: Step[] | null = [];
    if (selector !== ".") {
        for (const part of selector.split(".")) {
            const m = STEP.exec(part);
            if (m === null) {
                steps = null;
                break;
            }
            steps.push({ key: m[1], flatten: m[2] !== undefined });
        }
    }
    PARSED.set(selector, steps);
    return steps;
}

/**
 * Every value a selector reaches, in document order; missing keys reach nothing.
 * @param value - where to start
 * @param selector - the selector (a checked mapping holds only valid ones)
 * @returns the values
 */
export function select(value: unknown, selector: string): unknown[] {
    let out: unknown[] = value === undefined ? [] : [value];
    for (const step of parseSelector(selector) ?? []) {
        const next: unknown[] = [];
        for (const v of out) {
            if (typeof v !== "object" || v === null || !Object.hasOwn(v, step.key)) {
                continue;
            }
            const got = (v as Record<string, unknown>)[step.key];
            if (step.flatten && Array.isArray(got)) {
                next.push(...(got as unknown[]));
            } else if (got !== undefined && got !== null) {
                next.push(got);
            }
        }
        out = next;
    }
    return out.filter((v) => v !== null && v !== undefined);
}

/**
 * The first value a selector reaches.
 * @param value - where to start
 * @param selector - the selector
 * @returns the value, or undefined
 */
export function selectOne(value: unknown, selector: string): unknown {
    return select(value, selector)[0];
}

/**
 * The records a request's `records` selector names: an array it reaches is the records, any other
 * value is one record.
 * @param body - the response body
 * @param selector - the selector
 * @returns the records
 */
export function selectRecords(body: unknown, selector: string): unknown[] {
    const out = select(body, selector);
    return out.length === 1 && Array.isArray(out[0]) ? (out[0] as unknown[]) : out;
}
