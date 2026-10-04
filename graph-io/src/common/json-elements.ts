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
    COLUMN_RENAMED_CODE,
    COUNT_MISMATCH_CODE,
    STATUS_FAILED_CODE,
    STATUS_WARNING_CODE,
} from "./codes.js";
import { type ImportReportBuilder } from "./report.js";

// ============================================================ exact integers

/** A run of 16 digits not inside a fraction: the shortest integer literal that can exceed 2^53 (9007199254740992). */
export const MAYBE_UNSAFE_INTEGER = /(?<![0-9.])[0-9]{16}/;

/**
 * An exponent of 15 or more: a literal such as `9.007199254740993e15` or `1e400` that may denote an
 * integer beyond 2^53 or overflow the double range, which MAYBE_UNSAFE_INTEGER does not see.
 */
export const MAYBE_INEXACT_EXPONENT = /[0-9][eE]\+?0*(1[5-9]|[2-9][0-9]|[1-9][0-9]{2,})/;

/**
 * The prefix of the string a non-standard token or an exact integer is rewritten to (a NUL
 * character first, which no sensible attribute value starts with). A document that already holds
 * the text gets a numbered variant, so a genuine string is never revived as a number.
 */
const SENTINEL = `${String.fromCharCode(0)}graph-io`;

/** The non-standard tokens Python's json module writes, longest first so -Infinity wins over a bare minus. */
const NONSTANDARD_TOKENS: readonly (readonly [string, number])[] = [
    ["-Infinity", -Infinity],
    ["Infinity", Infinity],
    ["NaN", NaN],
];

/** A JSON integer literal (no fraction, no exponent, no leading zero), as CANONICAL_INTEGER in common/ids.ts. */
const INTEGER_LITERAL = /^-?(0|[1-9][0-9]*)$/;

/** A JSON number literal, split into sign, integer digits, fraction digits and exponent. */
const NUMBER_PARTS = /^(-?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/;

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
     * hold (`9007199254740993.0`), and the finite literals that overflow to an infinity (`1e400`):
     * read as the nearest double, which changes the value.
     */
    readonly inexact: string[];
    /** The JSON.parse reviver that turns the sentinel strings of this rewrite back into numbers. */
    readonly revive: (key: string, value: unknown) => unknown;
    /** The JSON.parse reviver that turns this rewrite's exact sentinels into ExactInteger. */
    readonly reviveExact: (key: string, value: unknown) => unknown;
}

/**
 * The sentinel prefix of one rewrite: SENTINEL with a colon, or a numbered variant when the text
 * already contains that one (only the NUL-free part is searched, since the JSON text spells a NUL
 * as an escape).
 * @param text - the document text
 * @returns the prefix
 */
function sentinelFor(text: string): string {
    let k = 0;
    while (text.includes(`graph-io${k === 0 ? "" : String(k)}:`)) {
        k++;
    }
    return `${SENTINEL}${k === 0 ? "" : String(k)}:`;
}

/**
 * Whether a number literal with a fraction or an exponent reads back as another value: an integer
 * beyond 2^53 written with more significant digits than a double keeps, which the nearest double
 * misses, or a finite literal beyond the double range.
 * @param literal - the literal as written
 * @returns true when the double read for it is not the value it denotes
 */
function isInexactLiteral(literal: string): boolean {
    const value = Number(literal);
    if (!Number.isFinite(value)) {
        return true;
    }
    if (Number.isSafeInteger(value) || !Number.isInteger(value)) {
        return false;
    }
    const m = NUMBER_PARTS.exec(literal);
    if (m === null) {
        return false;
    }
    const digits = (m[2] + (m[3] ?? "")).replace(/0+$/, "");
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
    const tokens = new Set<string>();
    const bigIntegers: string[] = [];
    const inexact: string[] = [];
    const arrays: boolean[] = [];
    let expectValue = true;
    let copied = 0;
    let i = 0;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (ch === '"') {
            i++;
            while (i < n && text[i] !== '"') {
                i += text[i] === "\\" ? 2 : 1;
            }
            i++;
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
            expectValue = arrays.length > 0 && arrays[arrays.length - 1];
        } else if (expectValue && ch !== " " && ch !== "\t" && ch !== "\n" && ch !== "\r") {
            expectValue = false;
            const token = nonstandard ? NONSTANDARD_TOKENS.find(([word]) => text.startsWith(word, i)) : undefined;
            let end = i;
            let replacement: string | null = null;
            if (token !== undefined) {
                end = i + token[0].length;
                tokens.add(token[0]);
                replacement = JSON.stringify(`${sentinel}${token[0]}`);
            } else if (ch === "-" || (ch >= "0" && ch <= "9")) {
                end = i + 1;
                while (end < n && "0123456789+-.eE".includes(text[end])) {
                    end++;
                }
                const literal = text.slice(i, end);
                if (INTEGER_LITERAL.test(literal)) {
                    if (!Number.isSafeInteger(Number(literal))) {
                        bigIntegers.push(literal);
                        replacement = exactSentinel ? JSON.stringify(`${exactPrefix}${literal}`) : `"${literal}"`;
                    }
                } else if (isInexactLiteral(literal)) {
                    inexact.push(literal);
                }
            }
            if (replacement !== null) {
                parts.push(text.slice(copied, i), replacement);
                copied = end;
            }
            i = Math.max(end, i + 1);
            continue;
        }
        i++;
    }
    parts.push(text.slice(copied));
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
 * Keys are compared as written: `"\u0069d"` and `"id"` are not recognised as one key.
 * @param text - a text JSON.parse accepted (or its rewrite)
 * @returns every repetition in document order
 */
export function findDuplicateKeys(text: string): DuplicateKey[] {
    const found: DuplicateKey[] = [];
    // per depth: the [start, end) of each key of the open object (reused), or -1 for an array
    const spans: number[][] = [];
    const wide: (Set<string> | null)[] = [];
    let depth = 0;
    const n = text.length;
    for (let at = 0; at < n; at++) {
        const c = text.charCodeAt(at);
        if (c === 123 || c === 91) {
            // { or [
            if (spans.length === depth) {
                spans.push([]);
                wide.push(null);
            }
            spans[depth].length = 0;
            if (c === 91) {
                spans[depth].push(-1);
            }
            wide[depth] = null;
            depth++;
        } else if (c === 125 || c === 93) {
            depth--;
        } else if (c === 34) {
            const end = closingQuote(text, at + 1);
            const keys = depth > 0 ? spans[depth - 1] : null;
            if (keys !== null && keys[0] !== -1 && isKey(text, end + 1)) {
                if (isRepeated(text, at + 1, end, keys, wide, depth - 1)) {
                    found.push({ key: text.slice(at + 1, end), offset: at });
                }
            }
            at = end;
        }
    }
    return found;
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
        if (text.charCodeAt(a + i) !== text.charCodeAt(b + i)) {
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
        while (text.charCodeAt(q - 1 - backslashes) === 92) {
            backslashes++;
        }
        if (backslashes % 2 === 0) {
            return q;
        }
    }
    return text.length;
}

/**
 * Whether the string that ends before an offset is an object key: a colon follows after whitespace.
 * @param text - the text
 * @param from - the offset after the closing quote
 * @returns true for a key
 */
function isKey(text: string, from: number): boolean {
    let i = from;
    while (i < text.length && isSpace(text.charCodeAt(i))) {
        i++;
    }
    return text.charCodeAt(i) === 58;
}

/** An integer literal beyond 2^53, kept as its exact digits (a CX id must never lose a digit). */
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
            out[key] = plainJson(item, onPrecision);
        }
        return out;
    }
    return value;
}

// ============================================================ the streaming aspect scanner

/** A problem with the document's JSON; the importer turns it into a fatal E_SYNTAX or E_EMPTY_INPUT. */
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

/** One thing the scanner found in a CX document. */
export type AspectEvent =
    | {
          /** A top-level value that is not an array: the whole document, parsed. */
          readonly kind: "root";
          readonly value: unknown;
          readonly line: number;
      }
    | {
          /** A member `{"<aspect>": [` whose elements follow one by one. */
          readonly kind: "block";
          readonly aspect: string;
          readonly block: number;
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
          /** Keys after the first one of a block member (`{"nodes": [...], "edges": [...]}`); their values were skipped. */
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
          readonly line: number;
      };

/**
 * Whether a character code is whitespace to JSON.
 * @param c - the character code
 * @returns true for space, line feed, carriage return and tab
 */
const isSpace = (c: number): boolean => c === 32 || c === 10 || c === 13 || c === 9;

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
        for (;;) {
            const next = await this.iterator.next();
            if (next.done === true) {
                this.buf = "";
                this.pos = 0;
                return false;
            }
            if (next.value.length > 0) {
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
        return this.linesBefore + countNewlines(this.buf, 0, Math.min(this.pos, this.buf.length));
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
        if (depth === 0) {
            const c = this.buf.charCodeAt(this.pos);
            if (c === 34) {
                this.pos++;
                await this.skipString();
                return;
            }
            if (c !== 123 && c !== 91) {
                await this.skipScalar();
                return;
            }
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
                if (depth > this.deepest) {
                    this.deepest = depth;
                }
            } else if (c === 125 || c === 93) {
                depth--;
                if (depth === 0) {
                    return;
                }
            }
        }
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
 * The number of line feeds in a slice of a string.
 * @param text - the string
 * @param from - the first index
 * @param to - one past the last index
 * @returns the count
 */
function countNewlines(text: string, from: number, to: number): number {
    let count = 0;
    let i = text.indexOf("\n", from);
    while (i >= 0 && i < to) {
        count++;
        i = text.indexOf("\n", i + 1);
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
 * Parse a captured value, turning a parse failure into a JsonScanError at its line.
 * @param text - the value text
 * @param line - the line the value starts on
 * @returns the value and whether it may hold an ExactInteger
 */
function parseAt(text: string, line: number): { readonly value: unknown; readonly exact: boolean } {
    try {
        return parseExact(text);
    } catch (err) {
        throw new JsonScanError(`invalid JSON: ${messageOf(err)}`, line);
    }
}

/**
 * Walk a CX document (CX1 or CX2): a top-level array of members, each normally a one-key object
 * `{"<aspect>": [elements]}`. The elements of such a block are parsed and yielded one at a time;
 * any other member is parsed whole and yielded as a "member". A document that is not an array is
 * yielded as one "root" event. Syntax errors throw JsonScanError.
 * @param chunks - the decoded text
 * @yields the events in document order
 * @returns nothing
 */
export async function* scanAspects(chunks: AsyncIterable<string>): AsyncGenerator<AspectEvent, void, undefined> {
    const cur = new ChunkCursor(chunks);
    const first = await cur.peek();
    if (first === "") {
        throw new JsonScanError("the input is empty", 1, true);
    }
    if (first !== "[") {
        const line = cur.line();
        cur.beginCapture();
        await cur.skipValue();
        const { value } = parseAt(cur.endCapture(), line);
        if ((await cur.peek()) !== "") {
            throw new JsonScanError("unexpected text after the document", cur.line());
        }
        yield { kind: "root", value, line };
        return;
    }
    cur.pos++;
    let block = 0;
    if ((await cur.peek()) === "]") {
        cur.pos++;
    } else {
        for (;;) {
            yield* member(cur, block);
            block++;
            const next = await cur.peek();
            if (next === ",") {
                cur.pos++;
                continue;
            }
            if (next === "]") {
                cur.pos++;
                break;
            }
            throw new JsonScanError(
                next === "" ? "the document ends before its closing bracket" : `expected "," or "]", found "${next}"`,
                cur.line(),
            );
        }
    }
    if ((await cur.peek()) !== "") {
        throw new JsonScanError("unexpected text after the closing bracket", cur.line());
    }
}

/**
 * Read one member of the top-level array.
 * @param cur - the cursor at the member's first character
 * @param block - the member's position among the members
 * @yields the member's events
 * @returns nothing
 */
async function* member(cur: ChunkCursor, block: number): AsyncGenerator<AspectEvent, void, undefined> {
    const c = await cur.peek();
    const line = cur.line();
    if (c === "" || c === "]" || c === ",") {
        throw new JsonScanError(c === "" ? "the document ends inside its array" : `unexpected "${c}"`, line);
    }
    if (c !== "{") {
        cur.beginCapture();
        await cur.skipValue();
        if (cur.deepest > MAX_ELEMENT_DEPTH) {
            cur.dropCapture();
            yield { kind: "deep", aspect: null, block, depth: cur.deepest, line };
            return;
        }
        const parsed = parseAt(cur.endCapture(), line);
        yield { kind: "member", block, value: parsed.value, exact: parsed.exact, line };
        return;
    }
    cur.beginCapture();
    cur.pos++;
    const k = await cur.peek();
    if (k !== '"') {
        // `{}` or not JSON: parse the whole member so a syntax error is reported as such
        await cur.skipValue(1);
        if (cur.deepest > MAX_ELEMENT_DEPTH) {
            cur.dropCapture();
            yield { kind: "deep", aspect: null, block, depth: cur.deepest, line };
            return;
        }
        const parsed = parseAt(cur.endCapture(), line);
        yield { kind: "member", block, value: parsed.value, exact: parsed.exact, line };
        return;
    }
    // the outer capture keeps the member's text in case it is not a block; readString nests its own
    const outer = cur.endCapture();
    const keyLine = cur.line();
    const aspect = await cur.readString();
    if ((await cur.peek()) !== ":") {
        throw new JsonScanError(`expected ":" after the key "${aspect}"`, cur.line());
    }
    cur.pos++;
    const v = await cur.peek();
    if (v !== "[") {
        // not a block: read the rest of the object and parse the member whole
        cur.beginCapture();
        await cur.skipValue(1);
        if (cur.deepest > MAX_ELEMENT_DEPTH) {
            cur.dropCapture();
            yield { kind: "deep", aspect, block, depth: cur.deepest, line };
            return;
        }
        const rest = cur.endCapture();
        const text = `${outer}${JSON.stringify(aspect)}:${rest}`;
        const parsed = parseAt(text, keyLine);
        yield { kind: "member", block, value: parsed.value, exact: parsed.exact, line };
        return;
    }
    cur.pos++;
    yield { kind: "block", aspect, block, line };
    if ((await cur.peek()) === "]") {
        cur.pos++;
    } else {
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
                const parsed = parseAt(text, elementLine);
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
                break;
            }
            throw new JsonScanError(
                next === ""
                    ? `the document ends inside the "${aspect}" block`
                    : `expected "," or "]" in the "${aspect}" block, found "${next}"`,
                cur.line(),
            );
        }
    }
    const end = await cur.peek();
    if (end === "}") {
        cur.pos++;
        return;
    }
    if (end !== ",") {
        throw new JsonScanError(
            end === "" ? "the document ends inside a member" : `expected "}" after the "${aspect}" block`,
            cur.line(),
        );
    }
    // more keys: a malformed block; skip their values and name them
    const keys: string[] = [];
    const extraLine = cur.line();
    while ((await cur.peek()) === ",") {
        cur.pos++;
        if ((await cur.peek()) !== '"') {
            throw new JsonScanError("expected a key", cur.line());
        }
        keys.push(await cur.readString());
        if ((await cur.peek()) !== ":") {
            throw new JsonScanError('expected ":"', cur.line());
        }
        cur.pos++;
        await cur.peek();
        cur.beginCapture();
        await cur.skipValue();
        parseAt(cur.endCapture(), cur.line());
    }
    if ((await cur.peek()) !== "}") {
        throw new JsonScanError('expected "}"', cur.line());
    }
    cur.pos++;
    yield { kind: "extraKeys", aspect, block, keys, line: extraLine };
}

/**
 * Report an element or member the scanner refused for its depth (E_BAD_ASPECT_BLOCK; skipped).
 * @param report - the report
 * @param event - the "deep" event
 */
export function reportTooDeep(report: ImportReportBuilder, event: Extract<AspectEvent, { kind: "deep" }>): void {
    report.error(
        "parse-error",
        BAD_ASPECT_BLOCK_CODE,
        `${event.aspect === null ? "a member of the document" : `an element of "${event.aspect}"`} is nested ${event.depth} levels deep, more than the ${MAX_ELEMENT_DEPTH} a graph keeps; skipped`,
        { line: event.line, element: event.aspect },
    );
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

const DECIMAL_INTEGER_TEXT = /^-?(0|[1-9][0-9]*)$/;

/**
 * Apply the CX id rule (design section 1.0.2) to a parsed value: a safe integer is the id; an
 * integer beyond 2^53 is its exact digit string; a string spelling a decimal integer is that
 * integer (as Jackson coerces it); anything else is E_INVALID_ID.
 * @param raw - the parsed value
 * @param inexactLiteral - whether the number was written as a non-integer literal (`5.0`, `1e3`)
 * @returns the id and how it was spelled
 */
export function cxId(raw: unknown, inexactLiteral = false): CxId {
    if (raw instanceof ExactInteger) {
        return { id: raw.digits, note: "precision" };
    }
    if (typeof raw === "number") {
        if (Number.isSafeInteger(raw)) {
            return { id: raw === 0 ? 0 : raw, note: inexactLiteral ? "text" : null };
        }
        throw invalidCxId(raw, Number.isInteger(raw) ? "an integer beyond 2^53 written inexactly" : "not an integer");
    }
    if (typeof raw === "string" && raw !== "-0" && DECIMAL_INTEGER_TEXT.test(raw)) {
        const n = Number(raw);
        return Number.isSafeInteger(n) ? { id: n, note: "text" } : { id: raw, note: "precision" };
    }
    throw invalidCxId(raw, "a CX id is an integer");
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

/**
 * Whether the element text writes a top-level key's number as a non-integer literal (`"id": 5.0`,
 * `"@id": 1e3`). A lexical check, so the parsed value (5) cannot tell. Only a key of the element
 * itself counts, not one nested in its `v` (where `s` and `id` are ordinary attribute names).
 * @param text - the element's JSON text
 * @param key - the key
 * @returns true when the literal holds a fraction or an exponent
 */
export function inexactLiteral(text: string, key: string): boolean {
    const quoted = JSON.stringify(key);
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === "{" || c === "[") {
            depth++;
        } else if (c === "}" || c === "]") {
            depth--;
        } else if (c === '"') {
            const start = i;
            for (i++; i < text.length && text[i] !== '"'; i++) {
                if (text[i] === "\\") {
                    i++;
                }
            }
            // the key itself (a string at depth 1 followed by a colon), not a value spelled like it
            if (depth === 1 && text.startsWith(quoted, start) && /^\s*:/.test(text.slice(i + 1, i + 16))) {
                const match = /^\s*:\s*(-?[0-9][0-9.eE+-]*)/.exec(text.slice(i + 1, i + 64));
                return match !== null && /[.eE]/.test(match[1]);
            }
        }
    }
    return false;
}

// ============================================================ Cytoscape positions (design section 1.0.2)

/** The name of the position column of every Cytoscape-family importer. */
export const POSITION_COLUMN = "position";

/** The name of the stacking-order column (Cytoscape's NODE_Z_LOCATION). */
const Z_COLUMN = "z";

/**
 * The position column of a Cytoscape-family importer: f32 x3, y-up, 2 source dimensions.
 * @param format - the importer's format name
 * @param sourceDims - 3 when z goes into the position (zAs "position")
 * @returns the declaration
 */
export function positionDecl(format: string, sourceDims = 2): ColumnDecl {
    return {
        name: POSITION_COLUMN,
        dtype: "f32",
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
 * Cytoscape's screen y (growing downward) as graph-io's y (growing upward), and back: a negation
 * that never yields -0.
 * @param y - the coordinate
 * @returns the flipped coordinate
 */
export function flipY(y: number): number {
    return y === 0 ? 0 : -y;
}

// ============================================================ stream structure shared by CX1 and CX2

/** The aspect names of the stream structure, not of the network. */
const STRUCTURE_ASPECTS: ReadonlySet<string> = new Set(["metaData", "status", "numberVerification"]);

/**
 * The order, metadata and status rules CX1 and CX2 share (design section 1.0.1): a third
 * `metaData` or an aspect after the post-metadata or after `status` is W_ASPECT_ORDER; declared
 * element counts are compared with what was read (W_COUNT_MISMATCH); `status.success: false` is
 * fatal (E_STATUS_FAILED) and `success: true` with an error text a warning (W_STATUS_WARNING).
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

    /**
     * Create the checker.
     * @param report - the report
     */
    constructor(report: ImportReportBuilder) {
        this.report = report;
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
            if (isRecord(value) && typeof value.name === "string" && typeof value.elementCount === "number") {
                this.declared.set(value.name, value.elementCount);
            }
            return;
        }
        if (aspect === "status") {
            this.readStatus(value, line);
        }
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
            const message = `the producer marked the document as failed${error.length > 0 ? `: ${error}` : ""}`;
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
                    `metaData declares ${declared} "${name}" element(s); ${read} were read`,
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
