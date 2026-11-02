/**
 * The JSON reading the two CX formats share (design section 1.0 of
 * design/graph-io/cytoscape-and-obo/design.md): the exact-integer rewrite (also used by the JSON
 * importer), a streaming scanner that walks a CX document's top-level array and hands over each
 * aspect element as soon as its closing brace arrives (section 1.2.5), and the CX id rule of
 * section 1.0.2.
 *
 * The scanner never holds the document as one string, so a file larger than the longest string a
 * JavaScript engine can hold is still read: it keeps the text of the element being read and
 * nothing else. Each element is parsed with `JSON.parse`; an integer literal beyond 2^53 is kept as
 * an ExactInteger (its digits) so an id never loses a digit.
 */

import {
    type ColumnDecl,
    type ColumnHandle,
    GraphFormatError,
    type GraphSink,
    INVALID_INDEX,
    type NodeId,
} from "@graphty/graph-format";

import { declareResolved, uniqueColumnName } from "./attributes.js";
import {
    ASPECT_ORDER_CODE,
    BAD_ASPECT_BLOCK_CODE,
    BAD_VALUE_CODE,
    COLUMN_RENAMED_CODE,
    COUNT_MISMATCH_CODE,
    DUPLICATE_ATTRIBUTE_CODE,
    JSON_NONSTANDARD_NUMBER_CODE,
    MULTI_ASPECT_FRAGMENT_CODE,
    PRECISION_CODE,
    STATUS_FAILED_CODE,
    STATUS_WARNING_CODE,
} from "./codes.js";
import { agree, plural } from "./plural.js";
import { type ImportReportBuilder } from "./report.js";
import { trimTrailingZeros } from "./text.js";

// ============================================================ exact integers

/**
 * A run of 16 digits not inside a fraction: the shortest integer literal that can exceed 2^53 (9007199254740992).
 * @category Plugin helpers
 */
export const MAYBE_UNSAFE_INTEGER = /(?<![0-9.])\d{16}/;

/**
 * A literal the double read for may not equal: an exponent of 15 or more (`9.007199254740993e15`,
 * `1e400`: an integer beyond 2^53 or an overflow), an exponent of -300 or less (`1e-400`: an
 * underflow to 0), or 16 or more digits split by a decimal point before an exponent
 * (`90071992547409.93e2`). MAYBE_UNSAFE_INTEGER sees none of them.
 * ponytail: a literal that underflows through 300+ leading fraction zeros and no exponent is not
 * gated; add a digit-count check if such files turn up.
 * @category Plugin helpers
 */
export const MAYBE_INEXACT_EXPONENT = new RegExp(
    [
        /\d[eE]\+?0*(?:1[5-9]|[2-9]\d|[1-9]\d{2,})/, // an exponent of 15 or more
        /\d[eE]-0*(?:[3-9]\d{2}|[1-9]\d{3,})/, // an exponent of -300 or less
        /(?<![\d.])(?=(?:\d\.?){16})\d+\.\d+[eE]/, // 16 or more digits split by a decimal point
    ]
        .map((r) => r.source)
        .join("|"),
);

/**
 * The prefix of the string a non-standard token or an exact integer is rewritten to (a NUL
 * character first, which no sensible attribute value starts with). A document that already holds
 * the text gets a numbered variant, so a genuine string is never revived as a number.
 */
const SENTINEL = `${String.fromCodePoint(0)}graph-io`;

/** The non-standard tokens Python's json module writes, longest first so -Infinity wins over a bare minus. */
const NONSTANDARD_TOKENS: readonly (readonly [string, number])[] = [
    ["-Infinity", -Infinity],
    ["Infinity", Infinity],
    ["NaN", Number.NaN],
];

/** A JSON integer literal (no fraction, no exponent, no leading zero), as CANONICAL_INTEGER in common/ids.ts. */
const INTEGER_LITERAL = /^-?(0|[1-9]\d*)$/;

/** A JSON number literal, split into sign, integer digits, fraction digits and exponent. */
const NUMBER_PARTS = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

/** What rewriteNumbers() found. */
interface RewrittenNumbers {
    /** The rewritten text. */
    readonly text: string;
    /** The non-standard tokens seen (only when they were allowed). */
    readonly tokens: Set<string>;
    /** The integer literals beyond 2^53 that were quoted. */
    readonly bigIntegers: string[];
    /**
     * The literals with a fraction or an exponent that denote an integer beyond 2^53 a double cannot
     * hold (`9007199254740993.0`), and the finite literals that overflow to an infinity (`1e400`) or
     * underflow to 0 (`1e-400`):
     * read as the nearest double, which changes the value.
     */
    readonly inexact: string[];
    /** The JSON.parse reviver that turns the sentinel strings of this rewrite back into numbers. */
    readonly revive: (key: string, value: unknown) => unknown;
    /** The JSON.parse reviver that turns this rewrite's exact sentinels into ExactInteger. */
    readonly reviveExact: (key: string, value: unknown) => unknown;
}

/**
 * Every JSON string literal of a text, quotes included, in one left-to-right pass (a regex over
 * untrusted text would scan again from every quote of an unterminated string). An unterminated
 * literal at the end is left out.
 * @param text - the document text
 * @yields each literal
 */
function* stringLiterals(text: string): Generator<string> {
    let i = text.indexOf('"');
    while (i >= 0) {
        let j = i + 1;
        while (j < text.length && text[j] !== '"') {
            j += text[j] === "\\" ? 2 : 1;
        }
        if (j >= text.length) {
            return;
        }
        yield text.slice(i, j + 1);
        i = text.indexOf('"', j + 1);
    }
}

/**
 * The sentinel prefix of one rewrite: SENTINEL with a colon, or a numbered variant when the document
 * already holds that one. A string can only decode to a NUL by escaping it (`\u0000`), so when the
 * text holds that escape the escaped strings are decoded and searched too: any other escape in them
 * (`graph\u002dio:`) would hide the sentinel from a search of the raw text.
 * @param text - the document text
 * @returns the prefix
 */
function sentinelFor(text: string): string {
    let haystack = text;
    if (/\\u0000/i.test(text)) {
        const decoded: string[] = [];
        for (const literal of stringLiterals(text)) {
            if (literal.includes("\\")) {
                decoded.push(decodeString(literal));
            }
        }
        haystack = `${decoded.join("\n")}\n${text}`;
    }
    let k = 0;
    while (haystack.includes(`graph-io${k === 0 ? "" : String(k)}:`)) {
        k++;
    }
    return `${SENTINEL}${k === 0 ? "" : String(k)}:`;
}

/**
 * Decode one JSON string literal, or give it back as written when it is not valid (the parse then
 * reports the syntax error).
 * @param literal - the literal with its quotes
 * @returns the decoded value
 */
function decodeString(literal: string): string {
    try {
        return String(JSON.parse(literal));
    } catch {
        return literal;
    }
}

/**
 * Whether a number literal with a fraction or an exponent reads back as another value: an integer
 * beyond 2^53 written with more significant digits than a double keeps, which the nearest double
 * misses, or a finite literal beyond the double range or a non-zero one below it.
 * @param literal - the literal as written
 * @returns true when the double read for it is not the value it denotes
 */
function isInexactLiteral(literal: string): boolean {
    const value = Number(literal);
    if (!Number.isFinite(value)) {
        return true;
    }
    if (value === 0) {
        // a non-zero literal below the smallest double underflows to 0
        return /[1-9]/.test(literal.split(/[eE]/)[0]);
    }
    if (Number.isSafeInteger(value) || !Number.isInteger(value)) {
        return false;
    }
    const m = NUMBER_PARTS.exec(literal);
    if (m === null) {
        return false;
    }
    const digits = trimTrailingZeros(m[2] + (m[3] ?? ""));
    const exponent = Number(m[4] ?? "0") - (m[3] ?? "").length + ((m[2] + (m[3] ?? "")).length - digits.length);
    if (digits.replace(/^0+/, "").length <= 15 || exponent < 0) {
        // up to 15 significant digits the nearest double reads back as the same text (1e39 is the
        // float it says); a fraction that rounds to an integer is ordinary floating-point rounding
        return false;
    }
    const exact = BigInt(digits) * 10n ** BigInt(exponent);
    return exact !== BigInt(Math.abs(value));
}

/**
 * Rewrite the numbers JSON.parse cannot read exactly, outside strings and in value positions only:
 * NaN / Infinity / -Infinity become sentinel strings (when `nonstandard` is true), an integer
 * literal that is not a safe integer becomes a string of its digits (or, with `exactSentinel`, a
 * sentinel string the result's reviveExact turns into an ExactInteger). A container stack tells a
 * value position (after `:`, `[`, or `,` inside an array) from a key position, so `{NaN: 1}` stays
 * invalid. Literals with a fraction or an exponent that no double holds are listed, not rewritten.
 * @param text - the document text
 * @param options - which rewrites apply
 * @param options.nonstandard - rewrite NaN / Infinity / -Infinity (default true)
 * @param options.exactSentinel - quote big integers as sentinels instead of bare digits (default false)
 * @returns the rewritten text, what was found and the revivers of this rewrite
 * @category Plugin helpers
 */
export function rewriteNumbers(
    text: string,
    options: { readonly nonstandard?: boolean; readonly exactSentinel?: boolean } = {},
): RewrittenNumbers {
    const nonstandard = options.nonstandard ?? true;
    const exactSentinel = options.exactSentinel ?? false;
    const sentinel = sentinelFor(text);
    const exactPrefix = `${sentinel}exact:`;
    const parts: string[] = [];
    const scan: NumberScan = {
        text,
        nonstandard,
        exactSentinel,
        sentinel,
        exactPrefix,
        tokens: new Set<string>(),
        bigIntegers: [],
        inexact: [],
        end: 0,
    };
    const arrays: boolean[] = [];
    let expectValue = true;
    let copied = 0;
    let i = 0;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (ch === '"') {
            i = skipJsonString(text, i);
            expectValue = false;
            continue;
        }
        if (ch === "{" || ch === "[") {
            arrays.push(ch === "[");
            expectValue = ch === "[";
        } else if (ch === "}" || ch === "]") {
            arrays.pop();
            expectValue = false;
        } else if (ch === ":") {
            expectValue = true;
        } else if (ch === ",") {
            expectValue = arrays.at(-1) ?? false;
        } else if (expectValue && !isJsonWhitespace(ch)) {
            expectValue = false;
            const replacement = rewriteValueAt(scan, i);
            if (replacement !== null) {
                parts.push(text.slice(copied, i), replacement);
                copied = scan.end;
            }
            i = Math.max(scan.end, i + 1);
            continue;
        }
        i++;
    }
    parts.push(text.slice(copied));
    const { tokens, bigIntegers, inexact } = scan;
    const revive = (_key: string, value: unknown): unknown => {
        if (typeof value === "string" && value.startsWith(sentinel)) {
            const found = NONSTANDARD_TOKENS.find(([word]) => word === value.slice(sentinel.length));
            return found === undefined ? value : found[1];
        }
        return value;
    };
    const reviveExact = (_key: string, value: unknown): unknown =>
        typeof value === "string" && value.startsWith(exactPrefix)
            ? new ExactInteger(value.slice(exactPrefix.length))
            : value;
    return { text: parts.join(""), tokens, bigIntegers, inexact, revive, reviveExact };
}

/** The state of one rewriteNumbers() pass that its value rewrite reads and records into. */
interface NumberScan {
    readonly text: string;
    readonly nonstandard: boolean;
    readonly exactSentinel: boolean;
    readonly sentinel: string;
    readonly exactPrefix: string;
    readonly tokens: Set<string>;
    readonly bigIntegers: string[];
    readonly inexact: string[];
    /** Where the value last read by rewriteValueAt() ends. */
    end: number;
}

/**
 * The index just past the string literal that starts at a quote (past the end of the text when it is not closed).
 * @param text - the document text
 * @param at - the index of the opening quote
 * @returns the index after the closing quote
 */
function skipJsonString(text: string, at: number): number {
    const n = text.length;
    let i = at + 1;
    while (i < n && text[i] !== '"') {
        i += text[i] === "\\" ? 2 : 1;
    }
    return i + 1;
}

/**
 * Whether a character is JSON insignificant whitespace.
 * @param ch - the character
 * @returns true for space, tab, line feed and carriage return
 */
function isJsonWhitespace(ch: string): boolean {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

/**
 * Read the value that starts at an index in a value position for rewriteNumbers(): record a nonstandard token, a big
 * integer or an inexact literal, and set `scan.end` to where the value read ends.
 * @param scan - the pass's state
 * @param i - the index of the value's first character
 * @returns the replacement text, or null to keep the value as written
 */
function rewriteValueAt(scan: NumberScan, i: number): string | null {
    const { text } = scan;
    const ch = text[i];
    const token = scan.nonstandard ? NONSTANDARD_TOKENS.find(([word]) => text.startsWith(word, i)) : undefined;
    scan.end = i;
    if (token !== undefined) {
        scan.end = i + token[0].length;
        scan.tokens.add(token[0]);
        return JSON.stringify(`${scan.sentinel}${token[0]}`);
    }
    if (ch === "-" || (ch >= "0" && ch <= "9")) {
        return rewriteNumberAt(scan, i);
    }
    return null;
}

/**
 * Read the number literal that starts at an index for rewriteValueAt(): a big integer becomes its replacement, an
 * inexact literal is listed.
 * @param scan - the pass's state
 * @param i - the index of the literal's first character
 * @returns the replacement text, or null to keep the literal as written
 */
function rewriteNumberAt(scan: NumberScan, i: number): string | null {
    const { text } = scan;
    const n = text.length;
    let end = i + 1;
    while (end < n && "0123456789+-.eE".includes(text[end])) {
        end++;
    }
    scan.end = end;
    const literal = text.slice(i, end);
    if (INTEGER_LITERAL.test(literal)) {
        if (Number.isSafeInteger(Number(literal))) {
            return null;
        }
        scan.bigIntegers.push(literal);
        return scan.exactSentinel ? JSON.stringify(`${scan.exactPrefix}${literal}`) : `"${literal}"`;
    }
    if (isInexactLiteral(literal)) {
        scan.inexact.push(literal);
    }
    return null;
}

/** One key repeated in a JSON object. */
interface DuplicateKey {
    /** The key. */
    readonly key: string;
    /** The UTF-16 offset of the repeated occurrence. */
    readonly offset: number;
}

/** Keys of one object compared pairwise up to this count; a wider object switches to a Set. */
const LINEAR_KEYS = 32;

/**
 * The keys that occur twice in one object of a valid JSON text, which JSON.parse silently reduces
 * to the last value (RFC 8259 section 4: names SHOULD be unique). One pass over the characters
 * that jumps over strings; the keys of a small object are compared in place, without
 * slicing (the parse itself costs about as much as this scan, so it allocates nothing per key).
 * Keys are compared as written: `"\u0069d"` and `"id"` are not recognized as one key.
 * @param text - a text JSON.parse accepted (or its rewrite)
 * @returns every repetition in document order
 * @category Plugin helpers
 */
export function findDuplicateKeys(text: string): DuplicateKey[] {
    const found: DuplicateKey[] = [];
    // per depth: the [start, end) of each key of the open object (reused), or -1 for an array
    const spans: number[][] = [];
    const wide: (Set<string> | null)[] = [];
    let depth = 0;
    const n = text.length;
    let at = 0;
    while (at < n) {
        const c = text.codePointAt(at);
        if (c === 123 || c === 91) {
            // { or [
            openContainer(spans, wide, depth, c === 91);
            depth++;
        } else if (c === 125 || c === 93) {
            depth--;
        } else if (c === 34) {
            const end = closingQuote(text, at + 1);
            const keys = depth > 0 ? spans[depth - 1] : null;
            // an array's span list starts with -1: its strings are values, never keys
            const isObjectKey = keys !== null && keys[0] !== -1 && isKey(text, end + 1);
            if (isObjectKey && isRepeated(text, at + 1, end, keys, wide, depth - 1)) {
                found.push({ key: text.slice(at + 1, end), offset: at });
            }
            at = end;
        }
        at++;
    }
    return found;
}

/**
 * Start the key list of a container just opened at a depth (reusing the list of an earlier one).
 * @param spans - the key spans per depth
 * @param wide - the key sets per depth, for wide objects
 * @param depth - the container's depth
 * @param isArray - whether it is an array, whose strings are never keys
 */
function openContainer(spans: number[][], wide: (Set<string> | null)[], depth: number, isArray: boolean): void {
    if (spans.length === depth) {
        spans.push([]);
        wide.push(null);
    }
    spans[depth].length = 0;
    if (isArray) {
        spans[depth].push(-1);
    }
    wide[depth] = null;
}

/**
 * Whether a key repeats one already seen in its object, remembering it otherwise.
 * @param text - the text
 * @param start - the key's first character
 * @param end - the key's closing quote
 * @param keys - the spans of the object's keys so far
 * @param wide - the Set of each depth's keys once the object is wide
 * @param level - the object's depth
 * @returns true for a repetition
 */
function isRepeated(
    text: string,
    start: number,
    end: number,
    keys: number[],
    wide: (Set<string> | null)[],
    level: number,
): boolean {
    const set = wide[level];
    if (set !== null) {
        const key = text.slice(start, end);
        return set.has(key) || (set.add(key), false);
    }
    const length = end - start;
    for (let k = 0; k < keys.length; k += 2) {
        if (keys[k + 1] - keys[k] === length && sameText(text, keys[k], start, length)) {
            return true;
        }
    }
    keys.push(start, end);
    if (keys.length > 2 * LINEAR_KEYS) {
        const all = new Set<string>();
        for (let k = 0; k < keys.length; k += 2) {
            all.add(text.slice(keys[k], keys[k + 1]));
        }
        wide[level] = all;
    }
    return false;
}

/**
 * Whether two ranges of one text hold the same characters.
 * @param text - the text
 * @param a - the first range's start
 * @param b - the second range's start
 * @param length - the ranges' length
 * @returns true when equal
 */
function sameText(text: string, a: number, b: number, length: number): boolean {
    for (let i = 0; i < length; i++) {
        if (text.codePointAt(a + i) !== text.codePointAt(b + i)) {
            return false;
        }
    }
    return true;
}

/**
 * The offset of the quote that closes a JSON string.
 * @param text - the text
 * @param from - the offset after the opening quote
 * @returns the closing quote's offset (the text length when there is none)
 */
function closingQuote(text: string, from: number): number {
    for (let q = text.indexOf('"', from); q >= 0; q = text.indexOf('"', q + 1)) {
        let backslashes = 0;
        while (text.codePointAt(q - 1 - backslashes) === 92) {
            backslashes++;
        }
        if (backslashes % 2 === 0) {
            return q;
        }
    }
    return text.length;
}

/**
 * The keys of one object of a valid JSON text in the order the text writes them (a repeated key at its first place),
 * found by a path of keys and array indices from the root. `JSON.parse` gives an object's integer-like keys first, in
 * numeric order, whatever order the text has; this gives the text's.
 * @param text - a text JSON.parse accepted (non-standard number tokens included)
 * @param path - the keys and array indices leading to the object (a repeated key leads to its last value, as
 *     JSON.parse reads it)
 * @returns the keys, or null when the path does not lead to an object
 * @category Plugin helpers
 */
export function keysInTextOrder(text: string, path: readonly (string | number)[]): string[] | null {
    let at = skipJsonSpace(text, 0);
    for (const step of path) {
        let next = -1;
        if (typeof step === "number" && text.codePointAt(at) === 91) {
            let index = 0;
            forEachJsonEntry(text, at, false, (_key, value) => {
                if (index++ === step) {
                    next = value;
                }
            });
        } else if (typeof step === "string" && text.codePointAt(at) === 123) {
            forEachJsonEntry(text, at, true, (key, value) => {
                if (key === step) {
                    next = value;
                }
            });
        }
        if (next < 0) {
            return null;
        }
        at = next;
    }
    if (text.codePointAt(at) !== 123) {
        return null;
    }
    const keys = new Set<string>();
    forEachJsonEntry(text, at, true, (key) => keys.add(key as string));
    return [...keys];
}

/**
 * Call back with each member of an object (its key and the offset of its value) or each element of an array.
 * @param text - the text
 * @param open - the offset of the opening brace or bracket
 * @param object - whether it is an object
 * @param visit - called per member or element
 */
function forEachJsonEntry(
    text: string,
    open: number,
    object: boolean,
    visit: (key: string | null, value: number) => void,
): void {
    let i = skipJsonSpace(text, open + 1);
    const close = object ? 125 : 93;
    while (i < text.length && text.codePointAt(i) !== close) {
        let key: string | null = null;
        if (object) {
            const end = closingQuote(text, i + 1);
            key = JSON.parse(text.slice(i, end + 1)) as string;
            // past the colon
            i = skipJsonSpace(text, skipJsonSpace(text, end + 1) + 1);
        }
        visit(key, i);
        i = skipJsonSpace(text, skipJsonValue(text, i));
        if (text.codePointAt(i) === 44) {
            i = skipJsonSpace(text, i + 1);
        }
    }
}

/**
 * The offset after the JSON value that starts at an offset.
 * @param text - the text
 * @param at - the value's first character
 * @returns the offset after it
 */
function skipJsonValue(text: string, at: number): number {
    const c = text.codePointAt(at);
    if (c === 34) {
        return closingQuote(text, at + 1) + 1;
    }
    if (c !== 123 && c !== 91) {
        let i = at;
        while (i < text.length && !endsScalar(text.codePointAt(i) ?? 32)) {
            i++;
        }
        return i;
    }
    let depth = 0;
    let i = at;
    while (i < text.length) {
        const d = text.codePointAt(i);
        if (d === 34) {
            i = closingQuote(text, i + 1);
        } else if (d === 123 || d === 91) {
            depth++;
        } else if ((d === 125 || d === 93) && --depth === 0) {
            return i + 1;
        }
        i++;
    }
    return text.length;
}

/**
 * The offset of the first character at or after an offset that is not JSON whitespace.
 * @param text - the text
 * @param from - the offset
 * @returns the offset
 */
function skipJsonSpace(text: string, from: number): number {
    let i = from;
    while (i < text.length && isSpace(text.codePointAt(i))) {
        i++;
    }
    return i;
}

/**
 * Whether the string that ends before an offset is an object key: a colon follows after whitespace.
 * @param text - the text
 * @param from - the offset after the closing quote
 * @returns true for a key
 */
function isKey(text: string, from: number): boolean {
    let i = from;
    while (i < text.length && isSpace(text.codePointAt(i))) {
        i++;
    }
    return text.codePointAt(i) === 58;
}

/**
 * An integer literal beyond 2^53, kept as its exact digits (a CX id must never lose a digit).
 * @category Plugin helpers
 */
export class ExactInteger {
    /** The digits, with a leading minus for a negative value. */
    readonly digits: string;

    /**
     * Wrap the digits of an integer literal.
     * @param digits - the literal
     */
    constructor(digits: string) {
        this.digits = digits;
    }

    /**
     * The nearest number (JSON.stringify writes it as such).
     * @returns the number
     */
    toJSON(): number {
        return Number(this.digits);
    }
}

/**
 * Parse one JSON value, keeping integer literals beyond 2^53 as ExactInteger.
 * @param text - the JSON text
 * @returns the value and whether it may hold an ExactInteger; SyntaxError when it is not JSON
 * @category Plugin helpers
 */
export function parseExact(text: string): { readonly value: unknown; readonly exact: boolean } {
    if (!MAYBE_UNSAFE_INTEGER.test(text)) {
        return { value: JSON.parse(text) as unknown, exact: false };
    }
    const scan = rewriteNumbers(text, { nonstandard: false, exactSentinel: true });
    if (scan.bigIntegers.length === 0) {
        return { value: JSON.parse(text) as unknown, exact: false };
    }
    return { value: JSON.parse(scan.text, scan.reviveExact) as unknown, exact: true };
}

/**
 * A parsed value with every ExactInteger replaced by its nearest number, for metadata and for
 * values that are not ids.
 * @param value - the value
 * @param onPrecision - called with the digits of each integer that lost precision
 * @returns the plain JSON value
 * @category Plugin helpers
 */
export function plainJson(value: unknown, onPrecision?: (digits: string) => void): unknown {
    if (value instanceof ExactInteger) {
        onPrecision?.(value.digits);
        return Number(value.digits);
    }
    if (Array.isArray(value)) {
        return value.map((item) => plainJson(item, onPrecision));
    }
    if (typeof value === "object" && value !== null) {
        const out: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            setOwn(out, key, plainJson(item, onPrecision));
        }
        return out;
    }
    return value;
}

/**
 * Set an own property, also for the key `__proto__` (which an assignment would turn into the
 * object's prototype, losing the entry).
 * @param target - the object
 * @param key - the key
 * @param value - the value
 * @category Plugin helpers
 */
export function setOwn(target: Record<string, unknown>, key: string, value: unknown): void {
    if (key === "__proto__") {
        Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
    } else {
        target[key] = value;
    }
}

/**
 * Parse a text with the bare tokens NaN / Infinity / -Infinity that Python's json writes.
 * @param text - the JSON text that JSON.parse refused
 * @returns the value, whether it may hold an ExactInteger and the tokens seen; null when the
 * tokens are not what made the text invalid
 */
function parseNonstandard(
    text: string,
): { readonly value: unknown; readonly exact: boolean; readonly tokens: ReadonlySet<string> } | null {
    if (!/NaN|Infinity/.test(text)) {
        return null;
    }
    const scan = rewriteNumbers(text, { nonstandard: true, exactSentinel: true });
    if (scan.tokens.size === 0) {
        return null;
    }
    try {
        const value = JSON.parse(scan.text, (key, raw) => scan.reviveExact(key, scan.revive(key, raw))) as unknown;
        return { value, exact: scan.bigIntegers.length > 0, tokens: scan.tokens };
    } catch {
        return null;
    }
}

/** A lone surrogate code unit: a high one not followed by a low one, or a low one not after a high one. */
/** The escapes of the surrogate range, as a message writes them. */
const SURROGATE_ESCAPES = String.raw`\uD800-\uDFFF`;

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

/** Text that may hold a surrogate: an escaped one, or a raw one (string input). */
const MAYBE_SURROGATE = /\\u[dD][89a-fA-F]|[\ud800-\udfff]/;

/**
 * Replace every lone surrogate of a parsed value's strings and keys with U+FFFD, in place.
 * @param value - the parsed value
 * @param fixed - counts the strings repaired and names the keys two repaired keys collapse into
 * @param fixed.count - the count
 * @param fixed.collisions - a key one object holds twice once repaired (the later value is kept)
 * @returns the value (a string, or an object with a repaired key, is returned as a new value)
 */
function repairSurrogates(value: unknown, fixed: { count: number; collisions: string[] }): unknown {
    if (typeof value === "string") {
        const repaired = value.replaceAll(LONE_SURROGATE, "\ufffd");
        if (repaired !== value) {
            fixed.count++;
        }
        return repaired;
    }
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            value[i] = repairSurrogates(value[i], fixed);
        }
        return value;
    }
    if (isRecord(value)) {
        const keys = Object.keys(value);
        const repairedKeys = keys.map((key) => key.replaceAll(LONE_SURROGATE, "\ufffd"));
        const renamed = repairedKeys.some((key, i) => key !== keys[i]);
        const out: Record<string, unknown> = renamed ? {} : value;
        keys.forEach((key, i) => {
            if (repairedKeys[i] !== key) {
                fixed.count++;
            }
            if (renamed && Object.hasOwn(out, repairedKeys[i])) {
                fixed.collisions.push(repairedKeys[i]);
            }
            setOwn(out, repairedKeys[i], repairSurrogates(value[key], fixed));
        });
        return out;
    }
    return value;
}

/**
 * The number of keys of a parsed value, at every depth.
 * @param value - the value
 * @returns the count
 */
function keyCount(value: unknown): number {
    if (Array.isArray(value)) {
        return value.reduce<number>((n, item) => n + keyCount(item), 0);
    }
    if (isRecord(value)) {
        return Object.keys(value).reduce((n, key) => n + 1 + keyCount(value[key]), 0);
    }
    return 0;
}

/**
 * The first key an object of a JSON text holds twice (JSON.parse keeps the later value silently).
 * @param text - valid JSON text
 * @returns the key, or null
 */
function duplicateKey(text: string): string | null {
    const stack: (Set<string> | null)[] = [];
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === "{") {
            stack.push(new Set());
        } else if (c === "[") {
            stack.push(null);
        } else if (c === "}" || c === "]") {
            stack.pop();
        } else if (c === '"') {
            const start = i;
            i = stringEnd(text, i + 1);
            const keys = stack.at(-1) ?? null;
            if (keys !== null && text[skipJsonSpace(text, i + 1)] === ":") {
                const key = JSON.parse(text.slice(start, i + 1)) as string;
                if (keys.has(key)) {
                    return key;
                }
                keys.add(key);
            }
        }
        i++;
    }
    return null;
}

/**
 * The offset of the quote that ends a JSON string, skipping escaped characters.
 * @param text - the text
 * @param from - the offset after the opening quote
 * @returns the closing quote's offset, or the text length (or one past it) when there is none
 */
function stringEnd(text: string, from: number): number {
    let i = from;
    while (i < text.length && text[i] !== '"') {
        i += text[i] === "\\" ? 2 : 1;
    }
    return i;
}

/** A key followed by its colon, for the cheap duplicate-key check. */
const KEY_COLON = /"\s*:/g;

/**
 * The checks of a parsed element that JSON.parse cannot make, recorded in the report: lone
 * surrogates (replaced with U+FFFD, E_BAD_VALUE) and a key held twice by one object
 * (W_DUPLICATE_ATTRIBUTE; the later value is the one read, also for two keys that a repair makes one).
 * @param text - the element text
 * @param parsed - the parsed element
 * @param line - its line
 * @param report - the report
 * @returns the value, repaired
 */
function checkParsed(text: string, parsed: unknown, line: number, report: ImportReportBuilder): unknown {
    let value = parsed;
    if (MAYBE_SURROGATE.test(text)) {
        const fixed = { count: 0, collisions: [] as string[] };
        value = repairSurrogates(value, fixed);
        for (const key of fixed.collisions) {
            report.warnOnce(
                "validation-error",
                DUPLICATE_ATTRIBUTE_CODE,
                `an object holds two keys that are the same key ${JSON.stringify(key)} once their lone surrogates are replaced with U+FFFD; the later value is read`,
                { line, element: key },
                `${DUPLICATE_ATTRIBUTE_CODE}:json:${key}`,
            );
        }
        if (fixed.count > 0) {
            report.error(
                "validation-error",
                BAD_VALUE_CODE,
                `${fixed.count} string${plural(fixed.count)} ${agree(fixed.count, "holds", "hold")} a lone surrogate (an unpaired ${SURROGATE_ESCAPES} escape); each is read with U+FFFD in its place`,
                { line },
            );
        }
    }
    if (typeof value === "object" && value !== null && (text.match(KEY_COLON)?.length ?? 0) > keyCount(value)) {
        const key = duplicateKey(text);
        if (key !== null) {
            report.warnOnce(
                "validation-error",
                DUPLICATE_ATTRIBUTE_CODE,
                `an object holds the key ${JSON.stringify(key)} twice; the later value is read`,
                { line, element: key },
                `${DUPLICATE_ATTRIBUTE_CODE}:json:${key}`,
            );
        }
    }
    return value;
}

// ============================================================ the streaming aspect scanner

/**
 * A problem with the document's JSON; the importer turns it into a fatal E_SYNTAX or E_EMPTY_INPUT.
 * @category Plugin helpers
 */
export class JsonScanError extends Error {
    /** The 1-based line of the problem. */
    readonly line: number;

    /** Whether the document holds nothing but whitespace. */
    readonly empty: boolean;

    /**
     * Create the error.
     * @param message - what is wrong
     * @param line - the 1-based line
     * @param empty - whether the input is empty
     */
    constructor(message: string, line: number, empty = false) {
        super(message);
        this.name = "JsonScanError";
        this.line = line;
        this.empty = empty;
    }
}

/**
 * One thing the scanner found in a CX document.
 * @category Plugin helpers
 */
export type AspectEvent =
    | {
          /**
           * A top-level value that is not an array: a scalar document, parsed; an object is not
           * read at all (object true, value undefined), however large it is.
           */
          readonly kind: "root";
          readonly value: unknown;
          readonly object: boolean;
          readonly line: number;
      }
    | {
          /** A member `{"<aspect>": [` whose elements follow one by one. */
          readonly kind: "block";
          readonly aspect: string;
          readonly block: number;
          /** Whether the aspect is not the member's first key (`{"nodes": [...], "edges": [...]}`). */
          readonly shared: boolean;
          readonly line: number;
      }
    | {
          /** One element of the current block, parsed. */
          readonly kind: "element";
          readonly aspect: string;
          readonly block: number;
          readonly value: unknown;
          /** Whether the value may hold an ExactInteger. */
          readonly exact: boolean;
          /** The element's JSON text (for lexical checks of its ids). */
          readonly text: string;
          readonly line: number;
      }
    | {
          /** The keys of a block member whose values are not arrays (`{"nodes": [...], "x": 1}`, in any order); skipped. */
          readonly kind: "extraKeys";
          readonly aspect: string;
          readonly block: number;
          readonly keys: readonly string[];
          readonly line: number;
      }
    | {
          /**
           * An element, or a member, nested deeper than MAX_ELEMENT_DEPTH: not parsed, so nothing
           * downstream recurses into it (aspect: the block's aspect, null for a member).
           */
          readonly kind: "deep";
          readonly aspect: string | null;
          readonly block: number;
          readonly depth: number;
          readonly line: number;
      }
    | {
          /** Any other member of the top-level array (a CX2 descriptor, `{"ndexStatus": {...}}`, `1`), parsed. */
          readonly kind: "member";
          readonly block: number;
          readonly value: unknown;
          readonly exact: boolean;
          /** The member's JSON text (for lexical checks of its ids). */
          readonly text: string;
          readonly line: number;
      };

/**
 * Whether a character code is whitespace to JSON.
 * @param c - the character code
 * @returns true for space, line feed, carriage return and tab
 */
const isSpace = (c: number | undefined): boolean => c === 32 || c === 10 || c === 13 || c === 9;

/**
 * Whether a character code ends a bare scalar (number, true, false, null).
 * @param c - the character code
 * @returns true for whitespace, a comma, a closing bracket or brace, or a colon
 */
const endsScalar = (c: number): boolean => isSpace(c) || c === 44 || c === 93 || c === 125 || c === 58;

const QUOTE_OR_BACKSLASH = /["\\]/g;

/**
 * The deepest nesting of an element the scanner parses. graph-format refuses JSON values (a json
 * cell, meta.extra) nested deeper than 256 levels, and a kept element sits a few levels down
 * meta.extra; a deeper element is reported instead, before anything recurses into it.
 */
const MAX_ELEMENT_DEPTH = 200;

/**
 * A cursor over text chunks with capture: the text of the value being read is kept across chunk
 * boundaries as a list of parts, so a long element costs linear time.
 */
class ChunkCursor {
    private readonly iterator: AsyncIterator<string>;

    private buf = "";

    /** The read position in buf. */
    pos = 0;

    /** The line number of buf's first character. */
    private linesBefore = 1;

    /** The last position line() counted to in buf, and the line breaks before it: line() counts on from there. */
    private countedTo = 0;

    private countedLines = 0;

    private parts: string[] | null = null;

    private captureStart = 0;

    /** The deepest nesting the last skipValue() reached. */
    deepest = 0;

    /**
     * Wrap text chunks.
     * @param chunks - the decoded text
     */
    constructor(chunks: AsyncIterable<string>) {
        this.iterator = chunks[Symbol.asyncIterator]();
    }

    /**
     * Read the next chunk once the current one is consumed.
     * @returns false at the end of the input
     */
    async fill(): Promise<boolean> {
        if (this.parts !== null) {
            this.parts.push(this.buf.slice(this.captureStart));
            this.captureStart = 0;
        }
        this.linesBefore += countNewlines(this.buf, 0, this.buf.length);
        this.countedTo = 0;
        this.countedLines = 0;
        const endsWithCr = this.buf.endsWith("\r");
        for (;;) {
            const next = await this.iterator.next();
            if (next.done === true) {
                this.buf = "";
                this.pos = 0;
                return false;
            }
            if (next.value.length > 0) {
                if (endsWithCr && next.value.startsWith("\n")) {
                    // a CR LF split across two chunks is one line break, counted with the CR
                    this.linesBefore--;
                }
                this.buf = next.value;
                this.pos = 0;
                return true;
            }
        }
    }

    /**
     * The 1-based line of the read position.
     * @returns the line
     */
    line(): number {
        // counted on from the last call, so reading every element of a one-chunk document stays linear
        const to = Math.min(this.pos, this.buf.length);
        if (to < this.countedTo) {
            this.countedTo = 0;
            this.countedLines = 0;
        }
        this.countedLines += countNewlines(this.buf, this.countedTo, to);
        this.countedTo = to;
        return this.linesBefore + this.countedLines;
    }

    /**
     * The text from the read position to the end of the current chunk, at most `length` characters.
     * @param length - the most characters
     * @returns the text
     */
    ahead(length: number): string {
        return this.buf.slice(this.pos, this.pos + length);
    }

    /**
     * Skip whitespace and return the next character without consuming it.
     * @returns the character, or "" at the end of the input
     */
    async peek(): Promise<string> {
        for (;;) {
            while (this.pos < this.buf.length && isSpace(this.buf.charCodeAt(this.pos))) {
                this.pos++;
            }
            if (this.pos < this.buf.length) {
                return this.buf[this.pos];
            }
            if (!(await this.fill())) {
                return "";
            }
        }
    }

    /** Start keeping the text from the read position. */
    beginCapture(): void {
        this.parts = [];
        this.captureStart = this.pos;
    }

    /**
     * Stop keeping text.
     * @returns the text kept since beginCapture()
     */
    endCapture(): string {
        const parts = this.parts ?? [];
        parts.push(this.buf.slice(this.captureStart, this.pos));
        this.parts = null;
        return parts.length === 1 ? parts[0] : parts.join("");
    }

    /** Drop the capture without building its text. */
    dropCapture(): void {
        this.parts = null;
    }

    /**
     * Advance past one JSON value starting at the read position (which holds its first
     * character), tracking strings and nesting only; the value is validated when it is parsed.
     * @param startDepth - the nesting depth already entered (1 when the opening brace was consumed)
     */
    async skipValue(startDepth = 0): Promise<void> {
        let depth = startDepth;
        this.deepest = depth;
        if (depth === 0 && (await this.skipLeaf())) {
            return;
        }
        for (;;) {
            if (this.pos >= this.buf.length && !(await this.fill())) {
                throw new JsonScanError("the document ends inside a value", this.line());
            }
            const c = this.buf.charCodeAt(this.pos);
            this.pos++;
            if (c === 34) {
                await this.skipString();
            } else if (c === 123 || c === 91) {
                depth++;
                this.deepest = Math.max(this.deepest, depth);
            } else if (c === 125 || c === 93) {
                depth--;
                if (depth === 0) {
                    return;
                }
            }
        }
    }

    /**
     * Skip the value at the read position when it is a string or a bare scalar.
     * @returns true when the value was skipped; false when it is an object or an array
     */
    private async skipLeaf(): Promise<boolean> {
        const c = this.buf.charCodeAt(this.pos);
        if (c === 34) {
            this.pos++;
            await this.skipString();
            return true;
        }
        if (c !== 123 && c !== 91) {
            await this.skipScalar();
            return true;
        }
        return false;
    }

    /** Advance past the rest of a string whose opening quote was consumed. */
    private async skipString(): Promise<void> {
        for (;;) {
            QUOTE_OR_BACKSLASH.lastIndex = this.pos;
            const found = QUOTE_OR_BACKSLASH.exec(this.buf);
            if (found === null) {
                this.pos = this.buf.length;
                if (!(await this.fill())) {
                    throw new JsonScanError("the document ends inside a string", this.line());
                }
                continue;
            }
            this.pos = found.index + 1;
            if (found[0] === '"') {
                return;
            }
            // a backslash: skip the escaped character, which may be in the next chunk
            if (this.pos >= this.buf.length && !(await this.fill())) {
                throw new JsonScanError("the document ends inside a string", this.line());
            }
            this.pos++;
        }
    }

    /** Advance past a bare scalar (a number, true, false, null or a stray word). */
    private async skipScalar(): Promise<void> {
        for (;;) {
            while (this.pos < this.buf.length && !endsScalar(this.buf.charCodeAt(this.pos))) {
                this.pos++;
            }
            if (this.pos < this.buf.length || !(await this.fill())) {
                return;
            }
        }
    }

    /**
     * Read one JSON string literal at the read position (its opening quote).
     * @returns the decoded string
     */
    async readString(): Promise<string> {
        this.beginCapture();
        this.pos++;
        await this.skipString();
        const literal = this.endCapture();
        try {
            return JSON.parse(literal) as string;
        } catch (err) {
            throw new JsonScanError(`invalid string: ${messageOf(err)}`, this.line());
        }
    }
}

/**
 * The number of line breaks in a slice of a string: LF, CR LF and a CR alone (old Mac files).
 * @param text - the string
 * @param from - the first index
 * @param to - one past the last index
 * @returns the count
 */
function countNewlines(text: string, from: number, to: number): number {
    // one pass over the slice only: an indexOf() past `to` made each call cost the whole rest of the text
    let count = 0;
    for (let i = from; i < to; i++) {
        const c = text.codePointAt(i);
        if (c === 10 || (c === 13 && text.codePointAt(i + 1) !== 10)) {
            count++;
        }
    }
    return count;
}

/**
 * The message of a caught value.
 * @param err - the thrown value
 * @returns the message
 */
function messageOf(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/**
 * Parse a captured value, turning a parse failure into a JsonScanError at its line. With a report,
 * the bare tokens NaN / Infinity / -Infinity are read as numbers (W_JSON_NONSTANDARD_NUMBER), and
 * lone surrogates and repeated keys are recorded (checkParsed()).
 * @param text - the value text
 * @param line - the line the value starts on
 * @param report - the report, or null to only parse
 * @returns the value and whether it may hold an ExactInteger
 */
function parseAt(
    text: string,
    line: number,
    report: ImportReportBuilder | null,
): { readonly value: unknown; readonly exact: boolean } {
    let parsed: { readonly value: unknown; readonly exact: boolean };
    try {
        parsed = parseExact(text);
    } catch (err) {
        const recovered = report === null ? null : parseNonstandard(text);
        if (recovered === null) {
            throw new JsonScanError(`invalid JSON: ${messageOf(err)}`, line);
        }
        report?.warnOnce(
            "coercion",
            JSON_NONSTANDARD_NUMBER_CODE,
            `the document uses the non-standard token${plural(recovered.tokens.size)} ${[...recovered.tokens].join(", ")}, which strict JSON does not allow; read as numbers`,
            { line },
        );
        parsed = recovered;
    }
    if (report !== null) {
        parsed = { ...parsed, value: checkParsed(text, parsed.value, line, report) };
    }
    return parsed;
}

/**
 * What a document that does not start with "[" looks like, for the syntax error: HTML or XML (an
 * error page saved under the file's name), a ZIP archive, or nothing in particular.
 * @param head - the first characters
 * @returns a sentence to append, or ""
 */
function notJsonHint(head: string): string {
    if (head.startsWith("<")) {
        return "; the input looks like HTML or XML (an error page saved as the file?), not JSON";
    }
    if (head.startsWith("PK\u0003\u0004")) {
        return "; the input is a ZIP archive (a Cytoscape session .cys is read by the cys importer), not JSON";
    }
    return "";
}

/**
 * Walk a CX document (CX1 or CX2): a top-level array of members, each normally a one-key object
 * `{"<aspect>": [elements]}`. The elements of such a block are parsed and yielded one at a time;
 * any other member is parsed whole and yielded as a "member". A document that is not an array is
 * yielded as one "root" event (an object without reading it). Syntax errors throw JsonScanError.
 * @param chunks - the decoded text
 * @param report - where NaN tokens, lone surrogates and repeated keys are recorded (parseAt()); null to only parse
 * @yields the events in document order
 * @returns nothing
 */
export async function* scanAspects(
    chunks: AsyncIterable<string>,
    report: ImportReportBuilder | null = null,
): AsyncGenerator<AspectEvent, void, undefined> {
    const cur = new ChunkCursor(chunks);
    const first = await cur.peek();
    if (first === "") {
        throw new JsonScanError("the input is empty", 1, true);
    }
    const hint = notJsonHint(cur.ahead(16));
    if (hint === "" && cur.ahead(8).includes(String.fromCodePoint(0))) {
        throw new JsonScanError(
            'the input holds NUL characters: UTF-16 without a byte order mark (pass the encoding option, such as "utf-16le"), or binary data; not JSON',
            cur.line(),
        );
    }
    if (first === "[") {
        cur.pos++;
        yield* members(cur, report);
        return;
    }
    const line = cur.line();
    if (first === "{") {
        yield { kind: "root", value: undefined, object: true, line };
        return;
    }
    yield { kind: "root", value: await scalarRoot(cur, line, hint), object: false, line };
}

/**
 * Read a document that is neither an array nor an object: one value, and nothing after it.
 * @param cur - the cursor at the value
 * @param line - the value's line
 * @param hint - what the input looks like when it is not JSON, for the error
 * @returns the value
 */
async function scalarRoot(cur: ChunkCursor, line: number, hint: string): Promise<unknown> {
    cur.beginCapture();
    await cur.skipValue();
    let value: unknown;
    try {
        ({ value } = parseAt(cur.endCapture(), line, null));
    } catch (err) {
        if (err instanceof JsonScanError && hint !== "") {
            throw new JsonScanError(`${err.message}${hint}`, err.line);
        }
        throw err;
    }
    if ((await cur.peek()) !== "") {
        throw new JsonScanError("unexpected text after the document", cur.line());
    }
    return value;
}

/**
 * Read the members of the top-level array, and check that nothing follows it.
 * @param cur - the cursor after the opening bracket
 * @param report - the report of parseAt(), or null
 * @yields the members' events
 * @returns nothing
 */
async function* members(
    cur: ChunkCursor,
    report: ImportReportBuilder | null,
): AsyncGenerator<AspectEvent, void, undefined> {
    let block = 0;
    let next = await cur.peek();
    if (next === "]") {
        cur.pos++;
    }
    while (next !== "]") {
        yield* member(cur, block, report);
        block++;
        next = await cur.peek();
        if (next !== "," && next !== "]") {
            throw new JsonScanError(
                next === "" ? "the document ends before its closing bracket" : `expected "," or "]", found "${next}"`,
                cur.line(),
            );
        }
        cur.pos++;
    }
    if ((await cur.peek()) !== "") {
        throw new JsonScanError("unexpected text after the closing bracket", cur.line());
    }
}

/**
 * Read one member of the top-level array.
 * @param cur - the cursor at the member's first character
 * @param block - the member's position among the members
 * @param report - the report of parseAt(), or null
 * @yields the member's events
 * @returns nothing
 */
async function* member(
    cur: ChunkCursor,
    block: number,
    report: ImportReportBuilder | null,
): AsyncGenerator<AspectEvent, void, undefined> {
    const c = await cur.peek();
    const line = cur.line();
    if (c === "" || c === "]" || c === ",") {
        throw new JsonScanError(c === "" ? "the document ends inside its array" : `unexpected "${c}"`, line);
    }
    cur.beginCapture();
    if (c !== "{") {
        await cur.skipValue();
        yield wholeMember(cur, block, line, report);
        return;
    }
    cur.pos++;
    if ((await cur.peek()) !== '"') {
        // `{}` or not JSON: parse the whole member so a syntax error is reported as such
        await cur.skipValue(1);
        yield wholeMember(cur, block, line, report);
        return;
    }
    // every array-valued key is a block whose elements stream, whatever the key order; any other
    // value is kept as text, so a member without an array is parsed whole (a CX2 descriptor, a
    // one-object aspect) and one with an array names its other keys (extraKeys), skipped
    const outer = cur.endCapture();
    const firstLine = cur.line();
    const keys: MemberKeys = { others: [], firstBlock: null, deep: 0 };
    let next = ",";
    let index = 0;
    while (next === ",") {
        const key = await readKey(cur);
        yield* keyValue(cur, key, index, block, keys, report);
        index++;
        next = await cur.peek();
        if (next !== "," && next !== "}") {
            throw new JsonScanError(
                next === "" ? "the document ends inside a member" : `expected "," or "}" after the key "${key.name}"`,
                cur.line(),
            );
        }
        cur.pos++;
    }
    yield* memberEnd(keys, block, line, { outer, firstLine }, report);
}

/** What one-object member's keys held: the non-array values as text, the first block, the deepest value. */
interface MemberKeys {
    readonly others: { key: string; text: string | null; line: number }[];
    firstBlock: string | null;
    deep: number;
}

/**
 * The event of a member read whole (its capture already taken): the member, or "deep" when it
 * nests too deep to parse.
 * @param cur - the cursor after the member
 * @param block - the member's position among the members
 * @param line - the member's line
 * @param report - the report of parseAt(), or null
 * @returns the event
 */
function wholeMember(cur: ChunkCursor, block: number, line: number, report: ImportReportBuilder | null): AspectEvent {
    if (cur.deepest > MAX_ELEMENT_DEPTH) {
        cur.dropCapture();
        return { kind: "deep", aspect: null, block, depth: cur.deepest, line };
    }
    const text = cur.endCapture();
    const parsed = parseAt(text, line, report);
    return { kind: "member", block, value: parsed.value, exact: parsed.exact, text, line };
}

/**
 * Read a member's key and the colon after it.
 * @param cur - the cursor at the key
 * @returns the key and its line
 */
async function readKey(cur: ChunkCursor): Promise<{ name: string; line: number }> {
    if ((await cur.peek()) !== '"') {
        throw new JsonScanError("expected a key", cur.line());
    }
    const line = cur.line();
    const name = await cur.readString();
    if ((await cur.peek()) !== ":") {
        throw new JsonScanError(`expected ":" after the key "${name}"`, cur.line());
    }
    cur.pos++;
    return { name, line };
}

/**
 * Read one key's value: an array is a block whose elements stream; any other value is kept as text
 * (or, when it nests too deep to parse, only its depth).
 * @param cur - the cursor at the value
 * @param key - the key
 * @param key.name - its name
 * @param key.line - its line
 * @param index - the key's position in the member
 * @param block - the member's position among the members
 * @param keys - what the member's keys held so far
 * @param report - the report of parseAt(), or null
 * @yields the block's events
 * @returns nothing
 */
async function* keyValue(
    cur: ChunkCursor,
    key: { name: string; line: number },
    index: number,
    block: number,
    keys: MemberKeys,
    report: ImportReportBuilder | null,
): AsyncGenerator<AspectEvent, void, undefined> {
    if ((await cur.peek()) === "[") {
        cur.pos++;
        yield { kind: "block", aspect: key.name, block, shared: index > 0, line: key.line };
        keys.firstBlock ??= key.name;
        yield* blockElements(cur, key.name, block, report);
        return;
    }
    cur.beginCapture();
    await cur.skipValue();
    // the member's own brace is one level more
    if (cur.deepest + 1 > MAX_ELEMENT_DEPTH) {
        // never parse (recursively) what no one reads
        cur.dropCapture();
        keys.deep = Math.max(keys.deep, cur.deepest + 1);
        keys.others.push({ key: key.name, text: null, line: key.line });
    } else {
        keys.others.push({ key: key.name, text: cur.endCapture(), line: key.line });
    }
}

/**
 * The events after a one-object member's keys: with a block, its other keys (checked, then named
 * as extraKeys); without one, the member parsed whole from its kept text.
 * @param keys - what the member's keys held
 * @param block - the member's position among the members
 * @param line - the member's line
 * @param start - the member's opening text and the line after it
 * @param start.outer - the text up to the first key
 * @param start.firstLine - the line of the first key
 * @param report - the report of parseAt(), or null
 * @yields the events
 * @returns nothing
 */
function* memberEnd(
    keys: MemberKeys,
    block: number,
    line: number,
    start: { outer: string; firstLine: number },
    report: ImportReportBuilder | null,
): Generator<AspectEvent, void, undefined> {
    const { others, firstBlock, deep } = keys;
    if (firstBlock !== null) {
        for (const other of others) {
            if (other.text !== null) {
                parseAt(other.text, other.line, null);
            }
        }
        if (others.length > 0) {
            yield {
                kind: "extraKeys",
                aspect: firstBlock,
                block,
                keys: others.map((o) => o.key),
                line: others[0].line,
            };
        }
        return;
    }
    if (deep > 0) {
        yield { kind: "deep", aspect: others[0].key, block, depth: deep, line };
        return;
    }
    const members = others.map((o) => [JSON.stringify(o.key), o.text ?? ""].join(":"));
    const text = `${start.outer}${members.join(",")}}`;
    const parsed = parseAt(text, start.firstLine, report);
    yield { kind: "member", block, value: parsed.value, exact: parsed.exact, text, line };
}

/**
 * Read the elements of a block whose opening bracket was consumed, through its closing bracket.
 * @param cur - the cursor after the opening bracket
 * @param aspect - the block's aspect
 * @param block - the member's position among the members
 * @param report - the report of parseAt(), or null
 * @yields an element (or deep) event per element
 * @returns nothing
 */
async function* blockElements(
    cur: ChunkCursor,
    aspect: string,
    block: number,
    report: ImportReportBuilder | null,
): AsyncGenerator<AspectEvent, void, undefined> {
    if ((await cur.peek()) === "]") {
        cur.pos++;
        return;
    }
    for (;;) {
        const e = await cur.peek();
        if (e === "") {
            throw new JsonScanError(`the document ends inside the "${aspect}" block`, cur.line());
        }
        const elementLine = cur.line();
        cur.beginCapture();
        await cur.skipValue();
        if (cur.deepest > MAX_ELEMENT_DEPTH) {
            cur.dropCapture();
            yield { kind: "deep", aspect, block, depth: cur.deepest, line: elementLine };
        } else {
            const text = cur.endCapture();
            const parsed = parseAt(text, elementLine, report);
            yield {
                kind: "element",
                aspect,
                block,
                value: parsed.value,
                exact: parsed.exact,
                text,
                line: elementLine,
            };
        }
        const next = await cur.peek();
        if (next === ",") {
            cur.pos++;
            continue;
        }
        if (next === "]") {
            cur.pos++;
            return;
        }
        throw new JsonScanError(
            next === ""
                ? `the document ends inside the "${aspect}" block`
                : `expected "," or "]" in the "${aspect}" block, found "${next}"`,
            cur.line(),
        );
    }
}

/**
 * Report an element or member the scanner refused for its depth (E_BAD_ASPECT_BLOCK; skipped).
 * @param report - the report
 * @param event - the "deep" event
 * @category Plugin helpers
 */
export function reportTooDeep(report: ImportReportBuilder, event: Extract<AspectEvent, { kind: "deep" }>): void {
    const what = event.aspect === null ? "a member of the document" : `an element of "${event.aspect}"`;
    report.error(
        "parse-error",
        BAD_ASPECT_BLOCK_CODE,
        `${what} is nested ${event.depth} levels deep, more than the ${MAX_ELEMENT_DEPTH} a graph keeps; skipped`,
        { line: event.line, element: event.aspect },
    );
}

/**
 * The precision callback of plainJson() for an aspect kept verbatim in the metadata: W_PRECISION
 * once, since the digits stored there are not the file's.
 * @param report - the report
 * @param where - where the aspect is kept (meta.extra.cx, ...)
 * @returns the callback
 * @category Plugin helpers
 */
export function keptPrecision(report: ImportReportBuilder, where: string): (digits: string) => void {
    return (digits) => {
        report.warnOnce(
            "precision",
            PRECISION_CODE,
            `an aspect kept in ${where} holds ${digits}, beyond 2^53; it is kept as the nearest double`,
            { element: where },
            `${PRECISION_CODE}:kept`,
        );
    };
}

/**
 * Warn once (W_MULTI_ASPECT_FRAGMENT) about a block that shares its array member with another
 * aspect (`{"nodes": [...], "edges": [...]}`); a block of its own needs nothing.
 * @param report - the report
 * @param event - the "block" event
 * @category Plugin helpers
 */
export function reportSharedBlock(report: ImportReportBuilder, event: Extract<AspectEvent, { kind: "block" }>): void {
    if (event.shared) {
        report.warnOnce(
            "coercion",
            MULTI_ASPECT_FRAGMENT_CODE,
            `the "${event.aspect}" aspect shares an array member with another aspect; each is read as its own fragment`,
            { line: event.line, element: event.aspect },
        );
    }
}

// ============================================================ the CX id rule (design section 1.0.2)

/** How an id was spelled, when it was not a plain safe integer. */
type CxIdNote = "text" | "precision" | null;

/** A CX id, decided per id: a safe integer is a number, a larger one its exact digits. */
interface CxId {
    /** The node or edge id. */
    readonly id: NodeId;
    /** "text": spelled as a string or a non-integer literal (W_ID_TEXT_TYPE); "precision": beyond 2^53 (W_PRECISION). */
    readonly note: CxIdNote;
}

const DECIMAL_INTEGER_TEXT = /^-?(0|[1-9]\d*)$/;

/**
 * Apply the CX id rule (design section 1.0.2) to a parsed value: a safe integer is the id; an
 * integer beyond 2^53 is its exact digit string; a string spelling a decimal integer is that
 * integer (as Jackson coerces it); anything else is E_INVALID_ID.
 * @param raw - the parsed value
 * @param inexactLiteral - whether the number was written as a non-integer literal (`5.0`, `1e3`)
 * @returns the id and how it was spelled
 * @category Plugin helpers
 */
export function cxId(raw: unknown, inexactLiteral = false): CxId {
    if (raw instanceof ExactInteger) {
        return { id: raw.digits, note: "precision" };
    }
    if (typeof raw === "number") {
        return numberCxId(raw, inexactLiteral);
    }
    if (typeof raw === "string" && raw !== "-0" && DECIMAL_INTEGER_TEXT.test(raw)) {
        const n = Number(raw);
        return Number.isSafeInteger(n) ? { id: n, note: "text" } : { id: raw, note: "precision" };
    }
    throw invalidCxId(raw, "a CX id is an integer");
}

/**
 * The CX id of a parsed number: a safe integer is the id (-0 read as 0); anything else is E_INVALID_ID.
 * @param raw - the parsed number
 * @param inexactLiteral - whether the number was written as a non-integer literal
 * @returns the id and how it was spelled
 */
function numberCxId(raw: number, inexactLiteral: boolean): CxId {
    if (Number.isSafeInteger(raw)) {
        return { id: raw === 0 ? 0 : raw, note: inexactLiteral ? "text" : null };
    }
    throw invalidCxId(raw, Number.isInteger(raw) ? "an integer beyond 2^53 written inexactly" : "not an integer");
}

/**
 * The E_INVALID_ID error of a rejected CX id.
 * @param raw - the value
 * @param reason - why
 * @returns the error
 */
function invalidCxId(raw: unknown, reason: string): GraphFormatError {
    const shown = typeof raw === "string" || typeof raw === "number" ? JSON.stringify(raw) : typeof raw;
    return new GraphFormatError("E_INVALID_ID", `invalid id ${raw === null ? "null" : shown}: ${reason}`, {
        reason,
    });
}

/** A number literal at lastIndex (sticky). */
const NUMBER_LITERAL = /-?\d[\d.eE+-]*/y;

/**
 * Whether the element text writes a top-level key's number as a non-integer literal (`"id": 5.0`,
 * `"@id": 1e3`). A lexical check, so the parsed value (5) cannot tell. Only a key of the element
 * itself counts, not one nested in its `v` (where `s` and `id` are ordinary attribute names).
 * @param text - the element's JSON text
 * @param key - the key
 * @param keyDepth - the nesting depth of the element's own keys: 1, or 2 for an element written as
 * a member's single object (`{"nodes": {"@id": 1.0}}`)
 * @returns true when the literal holds a fraction or an exponent
 * @category Plugin helpers
 */
export function inexactLiteral(text: string, key: string, keyDepth = 1): boolean {
    const quoted = JSON.stringify(key);
    let depth = 0;
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === "{" || c === "[") {
            depth++;
        } else if (c === "}" || c === "]") {
            depth--;
        } else if (c === '"') {
            const start = i;
            i = stringEnd(text, i + 1);
            // the key itself (a string at depth 1 followed by a colon), not a value spelled like it
            const colon = skipJsonSpace(text, i + 1);
            if (depth === keyDepth && text.startsWith(quoted, start) && text[colon] === ":") {
                return inexactNumberAt(text, skipJsonSpace(text, colon + 1));
            }
        }
        i++;
    }
    return false;
}

/**
 * Whether a number literal at an offset holds a fraction or an exponent.
 * @param text - the text
 * @param at - the offset
 * @returns true when it does; false for an integer or no number
 */
function inexactNumberAt(text: string, at: number): boolean {
    NUMBER_LITERAL.lastIndex = at;
    const match = NUMBER_LITERAL.exec(text);
    return match !== null && /[.eE]/.test(match[0]);
}

// ============================================================ Cytoscape positions (design section 1.0.2)

/**
 * The name of the position column of every Cytoscape-family importer.
 * @category Plugin helpers
 */
export const POSITION_COLUMN = "position";

/** The name of the stacking-order column (Cytoscape's NODE_Z_LOCATION). */
const Z_COLUMN = "z";

/**
 * The position column of a Cytoscape-family importer: f64 x3, y-up, 2 source dimensions.
 * @param format - the importer's format name
 * @param sourceDims - 3 when z goes into the position (zAs "position")
 * @returns the declaration
 * @category Plugin helpers
 */
export function positionDecl(format: string, sourceDims = 2): ColumnDecl {
    return {
        name: POSITION_COLUMN,
        dtype: "f64",
        components: 3,
        role: "position",
        mutable: true,
        nullable: true,
        extra: { sourceDims, units: "file" },
        origin: { format, namespace: "cytoscape" },
    };
}

/**
 * The stacking-order column `z` (f64, origin namespace "cytoscape").
 * @param format - the importer's format name
 * @returns the declaration
 * @category Plugin helpers
 */
export function zDecl(format: string): ColumnDecl {
    return {
        name: Z_COLUMN,
        dtype: "f64",
        nullable: true,
        origin: { format, id: null, namespace: "cytoscape" },
        extra: { cytoscape: "z" },
    };
}

/**
 * The head of an input as text for a sniff: UTF-16 by its byte order mark, else UTF-8, never
 * failing, without the BOM.
 * @param head - the first bytes
 * @returns the text
 * @category Plugin helpers
 */
export function headText(head: Uint8Array): string {
    let encoding = "utf-8";
    if (head.byteLength >= 2 && head[0] === 0xff && head[1] === 0xfe) {
        encoding = "utf-16le";
    } else if (head.byteLength >= 2 && head[0] === 0xfe && head[1] === 0xff) {
        encoding = "utf-16be";
    }
    return new TextDecoder(encoding).decode(head).replace(/^\uFEFF/, "");
}

// Cytoscape's screen y (growing downward) as graph-io's y (growing upward), and back: the one
// shared flip lives with the other position conversions.
export { flipY } from "../positions/convert.js";

// ============================================================ stream structure shared by CX1 and CX2

/** The aspect names of the stream structure, not of the network. */
const STRUCTURE_ASPECTS: ReadonlySet<string> = new Set(["metaData", "status", "numberVerification"]);

/**
 * The order, metadata and status rules CX1 and CX2 share (design section 1.0.1): a third
 * `metaData` or an aspect after the post-metadata or after `status` is W_ASPECT_ORDER; declared
 * element counts are compared with what was read (W_COUNT_MISMATCH); `status.success: false` is
 * fatal (E_STATUS_FAILED) and `success: true` with an error text a warning (W_STATUS_WARNING).
 * @category Plugin helpers
 */
export class CxStructure {
    private readonly report: ImportReportBuilder;

    /** Elements read per aspect name. */
    readonly counts = new Map<string, number>();

    /** Blocks read per aspect name. */
    readonly blocks = new Map<string, number>();

    /** The element counts the metadata declares, by aspect name (a later declaration wins). */
    private readonly declared = new Map<string, number>();

    private metaDataBlocks = 0;

    private networkBlocks = 0;

    private postMetadata = false;

    private statusSeen = false;

    /** The status element, when one was read. */
    status: unknown = undefined;

    /**
     * Whether a status block was read.
     * @returns true once a status block began
     */
    get hasStatus(): boolean {
        return this.statusSeen;
    }

    /** The name an aspect is counted under (CX1 reads old Cytoscape names under their cy names). */
    private readonly canonical: (name: string) => string;

    /**
     * Create the checker.
     * @param report - the report
     * @param canonical - the name an aspect named in metaData is counted under (default: itself)
     */
    constructor(report: ImportReportBuilder, canonical: (name: string) => string = (name) => name) {
        this.report = report;
        this.canonical = canonical;
    }

    /**
     * Record the start of a block (or a member holding one aspect).
     * @param aspect - the aspect name
     * @param line - its line
     */
    block(aspect: string, line: number): void {
        this.blocks.set(aspect, (this.blocks.get(aspect) ?? 0) + 1);
        if (this.statusSeen) {
            this.report.warnOnce(
                "validation-error",
                ASPECT_ORDER_CODE,
                `the "${aspect}" block comes after the status block, which must be last; it is read`,
                { line, element: aspect },
                `${ASPECT_ORDER_CODE}:status`,
            );
        }
        if (aspect === "metaData") {
            this.metaDataBlocks++;
            if (this.networkBlocks > 0) {
                this.postMetadata = true;
            }
            if (this.metaDataBlocks > 2) {
                this.report.warnOnce(
                    "validation-error",
                    ASPECT_ORDER_CODE,
                    `${this.metaDataBlocks} metaData blocks; a document has at most two (pre and post)`,
                    { line, element: aspect },
                    `${ASPECT_ORDER_CODE}:metaData`,
                );
            }
            return;
        }
        if (aspect === "status") {
            this.statusSeen = true;
            return;
        }
        if (STRUCTURE_ASPECTS.has(aspect)) {
            return;
        }
        this.networkBlocks++;
        if (this.postMetadata) {
            this.report.warnOnce(
                "validation-error",
                ASPECT_ORDER_CODE,
                `the "${aspect}" block comes after the post-metadata, where only status is allowed; it is read`,
                { line, element: aspect },
                `${ASPECT_ORDER_CODE}:post`,
            );
        }
    }

    /**
     * Record one element of a block; metaData and status elements are checked here.
     * @param aspect - the aspect name
     * @param value - the parsed element
     * @param line - its line
     */
    element(aspect: string, value: unknown, line: number): void {
        this.counts.set(aspect, (this.counts.get(aspect) ?? 0) + 1);
        if (aspect === "metaData") {
            this.readCount(value, line);
            return;
        }
        if (aspect === "status") {
            this.readStatus(value, line);
        }
    }

    /**
     * Record the element count a metaData element declares; a count that is not an integer (text,
     * a fraction) or that names no aspect is W_COUNT_MISMATCH and not checked.
     * @param value - the metaData element
     * @param line - its line
     */
    private readCount(value: unknown, line: number): void {
        if (!isRecord(value) || value.elementCount === undefined || value.elementCount === null) {
            return;
        }
        const raw = value.elementCount;
        let count: number | null = null;
        if (raw instanceof ExactInteger) {
            count = Number(raw.digits);
        } else if (typeof raw === "number" && Number.isInteger(raw)) {
            count = raw;
        }
        if (typeof value.name !== "string" || count === null) {
            const shownCount = raw instanceof ExactInteger ? raw.digits : JSON.stringify(raw);
            this.report.warning(
                "validation-error",
                COUNT_MISMATCH_CODE,
                `a metaData element declares the elementCount ${shownCount} for the name ${JSON.stringify(value.name) ?? "undefined"}; not a count of a named aspect, not checked`,
                { line, element: "metaData" },
            );
            return;
        }
        this.declared.set(this.canonical(value.name), count);
    }

    /**
     * Check a status element: success false is fatal, an error text with success true a warning.
     * @param value - the element
     * @param line - its line
     */
    private readStatus(value: unknown, line: number): void {
        if (this.status !== undefined) {
            this.report.warnOnce(
                "validation-error",
                ASPECT_ORDER_CODE,
                "more than one status element; the last is used",
                { line, element: "status" },
                `${ASPECT_ORDER_CODE}:status2`,
            );
        }
        this.status = value;
        if (!isRecord(value)) {
            return;
        }
        const error = typeof value.error === "string" ? value.error : "";
        if (value.success === false) {
            const detail = error.length > 0 ? `: ${error}` : "";
            const message = `the producer marked the document as failed${detail}`;
            this.report.error("validation-error", STATUS_FAILED_CODE, message, { line, element: "status" });
            throw this.report.abort(message, { code: STATUS_FAILED_CODE });
        }
        if (value.success === true && error.length > 0) {
            this.report.warning("validation-error", STATUS_WARNING_CODE, `the producer reports a warning: ${error}`, {
                line,
                element: "status",
            });
        }
    }

    /**
     * Whether the status element is one object with a boolean success.
     * @returns true for a well-formed status
     */
    statusWellFormed(): boolean {
        return isRecord(this.status) && typeof this.status.success === "boolean";
    }

    /** Compare the declared element counts with what was read (W_COUNT_MISMATCH per aspect). */
    checkCounts(): void {
        for (const [name, declared] of this.declared) {
            const read = this.counts.get(name) ?? 0;
            if (read !== declared) {
                this.report.warning(
                    "validation-error",
                    COUNT_MISMATCH_CODE,
                    `metaData declares ${declared} "${name}" element${plural(declared)}; ${read} ${agree(read, "was", "were")} read`,
                    { element: name },
                );
            }
        }
    }
}

/**
 * Whether a value is a plain JSON object.
 * @param value - any value
 * @returns true for a non-null, non-array object
 * @category Plugin helpers
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof ExactInteger);
}

/**
 * Declare a column under a name no column of the table holds yet: a per-element visual property
 * whose name an attribute already has gets `<name>#2` (W_COLUMN_RENAMED), even when the two share a
 * shape, so the visual value never overwrites the attribute.
 * @param sink - the sink
 * @param domain - node or edge
 * @param decl - the declaration
 * @param report - the report the rename is recorded in
 * @returns the handle
 * @category Plugin helpers
 */
export function declareFresh(
    sink: GraphSink,
    domain: "node" | "edge",
    decl: ColumnDecl,
    report: ImportReportBuilder,
): ColumnHandle {
    const taken = (name: string): boolean =>
        (domain === "node" ? sink.nodeColumn(name) : sink.edgeColumn(name)) !== INVALID_INDEX;
    let fresh = decl;
    if (taken(decl.name)) {
        fresh = { ...decl, name: uniqueColumnName(decl.name, null, taken) };
        report.warning(
            "coercion",
            COLUMN_RENAMED_CODE,
            `${domain} column "${decl.name}" renamed to "${fresh.name}": an attribute holds that name`,
            { element: decl.name },
        );
    }
    return declareResolved(sink, domain, fresh, report).handle;
}
