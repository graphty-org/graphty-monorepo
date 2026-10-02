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

import { type ColumnDecl, GraphFormatError, type NodeId } from "@graphty/graph-format";

import { ASPECT_ORDER_CODE, COUNT_MISMATCH_CODE, STATUS_FAILED_CODE, STATUS_WARNING_CODE } from "./codes.js";
import { type ImportReportBuilder } from "./report.js";

// ============================================================ exact integers

/** A run of 16 digits not inside a fraction: the shortest integer literal that can exceed 2^53 (9007199254740992). */
export const MAYBE_UNSAFE_INTEGER = /(?<![0-9.])[0-9]{16}/;

/**
 * The prefix of the string a non-standard token or an exact integer is rewritten to (a NUL
 * character first, which no sensible attribute value starts with).
 */
const SENTINEL = `${String.fromCharCode(0)}graph-io:`;

/** The sentinel prefix of an integer literal kept as its digits. */
const EXACT_SENTINEL = `${SENTINEL}exact:`;

/** The non-standard tokens Python's json module writes, longest first so -Infinity wins over a bare minus. */
const NONSTANDARD_TOKENS: readonly (readonly [string, number])[] = [
    ["-Infinity", -Infinity],
    ["Infinity", Infinity],
    ["NaN", NaN],
];

/** A JSON integer literal (no fraction, no exponent, no leading zero), as CANONICAL_INTEGER in common/ids.ts. */
const INTEGER_LITERAL = /^-?(0|[1-9][0-9]*)$/;

/** What rewriteNumbers() found. */
export interface RewrittenNumbers {
    /** The rewritten text. */
    readonly text: string;
    /** The non-standard tokens seen (only when they were allowed). */
    readonly tokens: Set<string>;
    /** The integer literals beyond 2^53 that were quoted. */
    readonly bigIntegers: string[];
}

/**
 * Rewrite the numbers JSON.parse cannot read exactly, outside strings and in value positions only:
 * NaN / Infinity / -Infinity become sentinel strings (when `nonstandard` is true), an integer
 * literal that is not a safe integer becomes a string of its digits (or, with `exactSentinel`, a
 * sentinel string reviveExact() turns into an ExactInteger). A container stack tells a value
 * position (after `:`, `[`, or `,` inside an array) from a key position, so `{NaN: 1}` stays invalid.
 * @param text - the document text
 * @param options - which rewrites apply
 * @param options.nonstandard - rewrite NaN / Infinity / -Infinity (default true)
 * @param options.exactSentinel - quote big integers as sentinels instead of bare digits (default false)
 * @returns the rewritten text, the non-standard tokens seen and the integer literals quoted
 */
export function rewriteNumbers(
    text: string,
    options: { readonly nonstandard?: boolean; readonly exactSentinel?: boolean } = {},
): RewrittenNumbers {
    const nonstandard = options.nonstandard ?? true;
    const exactSentinel = options.exactSentinel ?? false;
    const parts: string[] = [];
    const tokens = new Set<string>();
    const bigIntegers: string[] = [];
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
                replacement = JSON.stringify(`${SENTINEL}${token[0]}`);
            } else if (ch === "-" || (ch >= "0" && ch <= "9")) {
                end = i + 1;
                while (end < n && "0123456789+-.eE".includes(text[end])) {
                    end++;
                }
                const literal = text.slice(i, end);
                if (INTEGER_LITERAL.test(literal) && !Number.isSafeInteger(Number(literal))) {
                    bigIntegers.push(literal);
                    replacement = exactSentinel ? JSON.stringify(`${EXACT_SENTINEL}${literal}`) : `"${literal}"`;
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
    return { text: parts.join(""), tokens, bigIntegers };
}

/**
 * The JSON.parse reviver that turns the non-standard sentinel strings of rewriteNumbers() back into
 * numbers.
 * @param _key - the member key (unused)
 * @param value - the parsed value
 * @returns the number for a sentinel string, the value otherwise
 */
export function reviveNonstandard(_key: string, value: unknown): unknown {
    if (typeof value === "string" && value.startsWith(SENTINEL)) {
        const found = NONSTANDARD_TOKENS.find(([word]) => word === value.slice(SENTINEL.length));
        return found === undefined ? value : found[1];
    }
    return value;
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
 * The JSON.parse reviver of an element whose big integers were rewritten as exact sentinels.
 * @param _key - the member key (unused)
 * @param value - the parsed value
 * @returns an ExactInteger for an exact sentinel, the value otherwise
 */
function reviveExact(_key: string, value: unknown): unknown {
    if (typeof value === "string" && value.startsWith(EXACT_SENTINEL)) {
        return new ExactInteger(value.slice(EXACT_SENTINEL.length));
    }
    return value;
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
    return { value: JSON.parse(scan.text, reviveExact) as unknown, exact: true };
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
            const text = cur.endCapture();
            const parsed = parseAt(text, elementLine);
            yield { kind: "element", aspect, block, value: parsed.value, exact: parsed.exact, text, line: elementLine };
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

// ============================================================ the CX id rule (design section 1.0.2)

/** How an id was spelled, when it was not a plain safe integer. */
export type CxIdNote = "text" | "precision" | null;

/** A CX id, decided per id: a safe integer is a number, a larger one its exact digits. */
export interface CxId {
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
 * `"@id": 1e3`). A lexical check, so the parsed value (5) cannot tell; the first occurrence of the
 * key is the one checked.
 * @param text - the element's JSON text
 * @param key - the key
 * @returns true when the literal holds a fraction or an exponent
 */
export function inexactLiteral(text: string, key: string): boolean {
    const at = text.indexOf(`"${key}"`);
    if (at < 0) {
        return false;
    }
    const match = /^\s*:\s*(-?[0-9][0-9.eE+-]*)/.exec(text.slice(at + key.length + 2, at + key.length + 64));
    return match !== null && /[.eE]/.test(match[1]);
}

// ============================================================ Cytoscape positions (design section 1.0.2)

/** The name of the position column of every Cytoscape-family importer. */
export const POSITION_COLUMN = "position";

/** The name of the stacking-order column (Cytoscape's NODE_Z_LOCATION). */
export const Z_COLUMN = "z";

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
