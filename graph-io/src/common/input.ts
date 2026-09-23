/**
 * Input handling shared by every importer (design section 8.4): the ImportInput union (whole
 * text, whole bytes, a byte stream, an async iterable of text or byte chunks) read as a sequence of
 * text chunks, as lines, or as one string, with BOM handling, cancellation through an AbortSignal
 * and byte progress.
 *
 * Bytes are decoded ONCE, here, for every importer. The encoding is, in order of precedence: the
 * caller's `encoding` option; a byte order mark (UTF-8, UTF-16LE, UTF-16BE); the encoding the file
 * declares (the importer's `declaredEncoding` reader: the XML prolog for GEXF and GraphML, the
 * `charset` attribute for DOT); else UTF-8. Decoding is strict (`fatal: true`): an invalid sequence
 * is never a silent U+FFFD that could alias two ids. Only in the last case, when bytes that are not
 * valid UTF-8 appear while everything before them was ASCII, is the rest of the input read as
 * windows-1252 (the superset of ISO 8859-1 that Excel, Pajek and older tools write), with the
 * warning W_ENCODING_FALLBACK; invalid UTF-8 after valid non-ASCII UTF-8 is E_INVALID_UTF8. A
 * leading U+FEFF is stripped from text and from decoded bytes alike.
 */

import { GraphFormatError } from "@graphty/graph-format";

import { type ImportInput } from "../types.js";
import { ENCODING_FALLBACK_CODE, INVALID_ENCODING_CODE, INVALID_UTF8_CODE, UNKNOWN_ENCODING_CODE } from "./codes.js";
import { type ImportReportBuilder } from "./report.js";

export { INVALID_UTF8_CODE };

/**
 * Cancellation and progress hooks of the reader; the resolved importer options satisfy this shape.
 * Consumed by the per-format importers and exporters under src/formats.
 * @public
 */
export interface ReadOptions {
    /** The cancellation signal, or null / undefined for none. */
    readonly signal?: AbortSignal | null | undefined;
    /** The progress callback, or null / undefined for none. */
    readonly onProgress?: ((bytesDone: number, bytesTotal?: number) => void) | null | undefined;
    /** The caller's `encoding` option (a label TextDecoder knows), or null / undefined for detection. */
    readonly encoding?: string | null | undefined;
    /**
     * The format's reader of a declared encoding: given the head of the input decoded as
     * windows-1252 (ASCII-compatible), the encoding label it declares, or null.
     */
    readonly declaredEncoding?: ((head: string) => string | null) | undefined;
}

/** How many leading bytes the declaration check sees (an XML prolog, a DOT `charset` near the top). */
const HEAD_BYTES = 1024;

/** How many leading bytes the BOM check needs. */
const BOM_BYTES = 3;

/**
 * The canonical name of an encoding label, or null when the platform's TextDecoder does not know it.
 * @param label - a WHATWG encoding label ("latin1", "UTF-16LE", "cp1252", ...)
 * @returns the canonical name ("windows-1252", "utf-16le", ...) or null
 */
export function canonicalEncoding(label: string): string | null {
    try {
        return new TextDecoder(label.trim()).encoding;
    } catch {
        return null;
    }
}

/**
 * The encoding a byte order mark announces.
 * @param head - the first bytes
 * @returns "utf-8", "utf-16le", "utf-16be" or null
 */
function bomEncoding(head: Uint8Array): string | null {
    if (head.byteLength >= 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
        return "utf-8";
    }
    if (head.byteLength >= 2 && head[0] === 0xff && head[1] === 0xfe) {
        return "utf-16le";
    }
    if (head.byteLength >= 2 && head[0] === 0xfe && head[1] === 0xff) {
        return "utf-16be";
    }
    return null;
}

/**
 * The one byte decoder of an import: picks the encoding from the head (option, BOM, declaration,
 * UTF-8) and decodes strictly, switching to windows-1252 with a warning when undeclared input
 * turns out not to be UTF-8 while everything decoded so far was ASCII.
 */
class ByteDecoder {
    private decoder: TextDecoder | null = null;

    private encoding = "utf-8";

    /** Whether a failed UTF-8 decode may switch to windows-1252 (nothing chose UTF-8 explicitly). */
    private mayFallBack = false;

    /** Whether every character decoded so far was ASCII (so switching encodings changes no earlier text). */
    private asciiSoFar = true;

    /** While asciiSoFar: the bytes the UTF-8 decoder holds back (a sequence split across chunks). */
    private carry: Uint8Array = new Uint8Array(0);

    /** Bytes decoded so far, for error positions. */
    private offset = 0;

    /**
     * Create the decoder of one import.
     * @param report - where warnings and the fatal decode error go
     * @param options - the encoding option and the format's declaration reader
     */
    constructor(
        private readonly report: ImportReportBuilder,
        private readonly options: ReadOptions,
    ) {}

    /**
     * Whether start() ran.
     * @returns true once the encoding is chosen
     */
    get started(): boolean {
        return this.decoder !== null;
    }

    /**
     * Choose the encoding from the first bytes of the input.
     * @param head - the first bytes (up to HEAD_BYTES; fewer when the input is shorter)
     */
    start(head: Uint8Array): void {
        const explicit = this.options.encoding ?? null;
        if (explicit !== null) {
            this.use(explicit, false);
            return;
        }
        const bom = bomEncoding(head);
        if (bom !== null) {
            this.use(bom, false);
            return;
        }
        const declared = this.options.declaredEncoding?.(new TextDecoder("windows-1252").decode(head)) ?? null;
        if (declared !== null) {
            const canonical = canonicalEncoding(declared);
            if (canonical === null) {
                this.report.warning(
                    "unsupported",
                    UNKNOWN_ENCODING_CODE,
                    `the input declares the encoding ${JSON.stringify(declared)}, which this platform cannot decode; reading it as UTF-8`,
                    { element: declared },
                );
            } else if (canonical !== "utf-8" && !canonical.startsWith("utf-16")) {
                // a declared UTF-16 without a BOM is not UTF-16 (its declaration read as ASCII), and
                // a declared UTF-8 gets the same undeclared treatment: tools often write the default
                // prolog over Latin-1 bytes
                this.use(canonical, false);
                return;
            }
        }
        this.use("utf-8", true);
    }

    /**
     * Decode the next bytes.
     * @param bytes - the bytes
     * @param stream - whether more bytes follow
     * @returns the text
     */
    decode(bytes: Uint8Array, stream: boolean): string {
        const decoder = this.decoder as TextDecoder;
        let text: string;
        try {
            text = decoder.decode(bytes, { stream });
        } catch (err) {
            if (!(err instanceof TypeError)) {
                throw err;
            }
            text = this.recover(bytes, stream);
        }
        if (this.asciiSoFar && this.mayFallBack) {
            if (/[\u0080-\uffff]/.test(text)) {
                this.asciiSoFar = false;
                this.carry = new Uint8Array(0);
            } else {
                // every character so far is one ASCII byte, so what was not emitted is held back
                const all = this.carry.byteLength === 0 ? bytes : concatBytes([this.carry, bytes]);
                this.carry = all.slice(text.length);
            }
        }
        this.offset += bytes.byteLength;
        return text;
    }

    /**
     * A decode failed: switch to windows-1252 when allowed, else fail the import.
     * @param bytes - the bytes that failed
     * @param stream - whether more bytes follow
     * @returns the bytes decoded as windows-1252
     */
    private recover(bytes: Uint8Array, stream: boolean): string {
        const where = { byteOffset: this.offset };
        const all = this.carry.byteLength === 0 ? bytes : concatBytes([this.carry, bytes]);
        // a NUL byte never occurs in windows-1252 text: it marks binary data (or BOM-less UTF-16)
        if (this.mayFallBack && this.asciiSoFar && !all.includes(0) && !startsWithUtf8(all)) {
            this.report.warning(
                "coercion",
                ENCODING_FALLBACK_CODE,
                `the input is not valid UTF-8 (near byte ${this.offset}) and declares no encoding; read as windows-1252 (pass the encoding option to choose another)`,
            );
            this.use("windows-1252", false);
            return (this.decoder as TextDecoder).decode(all, { stream });
        }
        if (this.encoding === "utf-8") {
            const after = this.mayFallBack ? " after valid non-ASCII UTF-8 text; pass the encoding option" : "";
            return this.report.fail(
                INVALID_UTF8_CODE,
                `invalid UTF-8 near byte ${this.offset}${after}`,
                undefined,
                where,
            );
        }
        return this.report.fail(
            INVALID_ENCODING_CODE,
            `the bytes near byte ${this.offset} are not valid ${this.encoding}`,
            undefined,
            where,
        );
    }

    /**
     * Switch to an encoding.
     * @param label - the encoding label
     * @param mayFallBack - whether a UTF-8 failure may switch to windows-1252
     */
    private use(label: string, mayFallBack: boolean): void {
        this.decoder = new TextDecoder(label, { fatal: true, ignoreBOM: true });
        this.encoding = this.decoder.encoding;
        this.mayFallBack = mayFallBack;
    }
}

/**
 * Whether the first non-ASCII byte of a chunk starts a valid UTF-8 sequence: then the chunk holds
 * valid non-ASCII UTF-8 before whatever made it fail, and the input is not windows-1252.
 * @param bytes - a chunk that failed to decode as UTF-8
 * @returns true when its first non-ASCII sequence is valid UTF-8
 */
function startsWithUtf8(bytes: Uint8Array): boolean {
    const i = bytes.findIndex((b) => b >= 0x80);
    const lead = bytes[i];
    let length = 0;
    if (lead >= 0xc2 && lead <= 0xdf) {
        length = 2;
    } else if (lead >= 0xe0 && lead <= 0xef) {
        length = 3;
    } else if (lead >= 0xf0 && lead <= 0xf4) {
        length = 4;
    }
    if (i < 0 || length === 0 || i + length > bytes.byteLength) {
        return false;
    }
    try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(i, i + length));
        return true;
    } catch {
        return false;
    }
}

/**
 * Join byte chunks.
 * @param chunks - the chunks
 * @returns one array holding them in order
 */
function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
    if (chunks.length === 1) {
        return chunks[0];
    }
    const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.byteLength, 0));
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return out;
}

/**
 * Bytes decoded per call when the input is one in-memory Uint8Array: every consumer of textChunks()
 * then sees bounded chunks whatever the input shape (a line reader or a record reader that holds
 * one parse result per chunk never holds more than this much text at once), and progress stays
 * granular.
 */
const DECODE_SLICE = 256 * 1024;

const BOM = String.fromCharCode(0xfeff);

/**
 * Whether a value is an ImportInput this module can read.
 * @param input - any value
 * @returns true for a string, a Uint8Array, a ReadableStream or an async iterable
 */
export function isImportInput(input: unknown): input is ImportInput {
    if (typeof input === "string" || input instanceof Uint8Array) {
        return true;
    }
    if (typeof input !== "object" || input === null) {
        return false;
    }
    return typeof (input as { getReader?: unknown }).getReader === "function" || Symbol.asyncIterator in input;
}

/**
 * The total size of an in-memory input (bytes for a Uint8Array, UTF-16 code units for a string),
 * for the `bytesTotal` argument of onProgress; null for a stream or an iterable.
 * @param input - the input
 * @returns the size, or null when unknown up front
 */
export function inputLength(input: ImportInput): number | null {
    if (typeof input === "string") {
        return input.length;
    }
    if (input instanceof Uint8Array) {
        return input.byteLength;
    }
    return null;
}

/**
 * Throw the signal's reason when it is aborted, exactly as the platform's
 * `AbortSignal.throwIfAborted()` does: the reason as it is (the DOMException named "AbortError"
 * of a reason-less abort, or whatever the caller passed to `abort(reason)`, an Error or not), so a
 * caller can compare the rejection with `signal.reason`. Only a runtime that stores no reason at
 * all gets a synthesised AbortError.
 * @param signal - the signal, or null
 */
export function throwIfAborted(signal: AbortSignal | null | undefined): void {
    if (signal === null || signal === undefined || !signal.aborted) {
        return;
    }
    const { reason }: { reason: unknown } = signal;
    if (reason === undefined) {
        throw abortError();
    }
    // the platform contract: the reason itself, whatever its type
    throw reason as Error;
}

/**
 * An abort error for a signal that carries no reason.
 * @returns a DOMException named "AbortError" where DOMException exists, else an Error with that name
 */
function abortError(): Error {
    const message = "The import was aborted";
    if (typeof DOMException === "function") {
        return new DOMException(message, "AbortError");
    }
    const err = new Error(message);
    err.name = "AbortError";
    return err;
}

/**
 * Read an ImportInput as a sequence of decoded text chunks. Chunk boundaries carry no meaning:
 * a caller that needs lines uses LineReader, one that needs the whole document uses readText().
 * The signal is checked before every chunk; a stream is cancelled when the consumer stops early
 * or the signal fires. Progress is reported after every chunk.
 * @param input - the input
 * @param report - the report the decode error is recorded in (E_INVALID_UTF8, then ImportError)
 * @param options - cancellation and progress
 * @yields decoded text; the first chunk has any leading BOM removed
 * @returns nothing
 */
export async function* textChunks(
    input: ImportInput,
    report: ImportReportBuilder,
    options: ReadOptions = {},
): AsyncGenerator<string, void, undefined> {
    const signal = options.signal ?? null;
    const onProgress = options.onProgress ?? null;
    const total = inputLength(input);
    let done = 0;
    let first = true;
    const emit = (text: string): string => {
        if (first && text.length > 0) {
            first = false;
            return text.startsWith(BOM) ? text.slice(1) : text;
        }
        return text;
    };
    throwIfAborted(signal);
    if (typeof input === "string") {
        const text = emit(input);
        done = input.length;
        if (text.length > 0) {
            yield text;
        }
        onProgress?.(done, total ?? undefined);
        return;
    }
    const decoder = new ByteDecoder(report, options);
    if (input instanceof Uint8Array) {
        decoder.start(input.subarray(0, HEAD_BYTES));
        for (let offset = 0; offset < input.byteLength; offset += DECODE_SLICE) {
            throwIfAborted(signal);
            const slice = input.subarray(offset, Math.min(offset + DECODE_SLICE, input.byteLength));
            const text = emit(decoder.decode(slice, offset + DECODE_SLICE < input.byteLength));
            done = Math.min(offset + DECODE_SLICE, input.byteLength);
            if (text.length > 0) {
                yield text;
            }
            onProgress?.(done, total ?? undefined);
        }
        if (input.byteLength === 0) {
            onProgress?.(0, 0);
        }
        return;
    }
    // the first bytes of a stream are held back until the BOM check (and the declaration check,
    // when the format has one) can see enough of them, or the input ended, or text arrived, so a
    // BOM or a declaration split across small chunks is still seen
    const needed = options.declaredEncoding === undefined ? BOM_BYTES : HEAD_BYTES;
    let head: Uint8Array[] = [];
    let headLength = 0;
    const flushHead = (stream: boolean): string => {
        const bytes = concatBytes(head);
        head = [];
        headLength = 0;
        decoder.start(bytes.subarray(0, HEAD_BYTES));
        return decoder.decode(bytes, stream);
    };
    const chunks = isReadableStream(input) ? streamChunks(input, signal) : input;
    for await (const chunk of chunks) {
        throwIfAborted(signal);
        let text: string;
        if (typeof chunk === "string") {
            // finish any byte sequence still pending in the decoder before switching to text
            let pending = "";
            if (!decoder.started && headLength > 0) {
                pending = flushHead(false);
            } else if (decoder.started) {
                pending = decoder.decode(new Uint8Array(0), false);
            }
            text = emit(pending + chunk);
            done += chunk.length;
        } else if (chunk instanceof Uint8Array) {
            done += chunk.byteLength;
            if (decoder.started) {
                text = emit(decoder.decode(chunk, true));
            } else {
                head.push(chunk);
                headLength += chunk.byteLength;
                text = headLength >= needed ? emit(flushHead(true)) : "";
            }
        } else {
            throw new GraphFormatError("E_UNSUPPORTED", "an input chunk must be a string or a Uint8Array", {
                reason: "chunk type",
                found: typeof chunk,
            });
        }
        if (text.length > 0) {
            yield text;
        }
        onProgress?.(done);
    }
    let tail = "";
    if (!decoder.started && headLength > 0) {
        tail = flushHead(false);
    } else if (decoder.started) {
        tail = decoder.decode(new Uint8Array(0), false);
    }
    tail = emit(tail);
    if (tail.length > 0) {
        yield tail;
    }
    onProgress?.(done, done);
}

/**
 * Whether an input is a ReadableStream (by duck type, so a stream from another realm qualifies).
 * @param input - a non-string, non-Uint8Array input
 * @returns true for a ReadableStream
 */
function isReadableStream(
    input: ReadableStream<Uint8Array> | AsyncIterable<string | Uint8Array>,
): input is ReadableStream<Uint8Array> {
    return typeof (input as { getReader?: unknown }).getReader === "function";
}

/**
 * Iterate a ReadableStream through a reader, cancelling the stream when iteration stops early.
 * @param stream - the stream
 * @param signal - the cancellation signal, or null
 * @yields the stream's chunks
 * @returns nothing
 */
async function* streamChunks(
    stream: ReadableStream<Uint8Array>,
    signal: AbortSignal | null,
): AsyncGenerator<Uint8Array, void, undefined> {
    const reader = stream.getReader();
    let finished = false;
    try {
        for (;;) {
            throwIfAborted(signal);
            const { done, value } = await reader.read();
            if (done) {
                finished = true;
                return;
            }
            yield value;
        }
    } finally {
        if (!finished) {
            await reader.cancel(signal?.reason).catch(() => undefined);
        }
        reader.releaseLock();
    }
}

/**
 * Read the whole input as one string (the GML / DOT / JSON path, design section 8.4).
 * @param input - the input
 * @param report - the report the decode error is recorded in
 * @param options - cancellation and progress
 * @returns the decoded text without a leading BOM
 */
export async function readText(
    input: ImportInput,
    report: ImportReportBuilder,
    options: ReadOptions = {},
): Promise<string> {
    if (typeof input === "string") {
        throwIfAborted(options.signal);
        options.onProgress?.(input.length, input.length);
        return input.startsWith(BOM) ? input.slice(1) : input;
    }
    const parts: string[] = [];
    for await (const chunk of textChunks(input, report, options)) {
        parts.push(chunk);
    }
    return parts.length === 1 ? parts[0] : parts.join("");
}

/**
 * Lines of an ImportInput without allocating anything per line but the string itself: iterate with
 * `for await (const text of reader)` and read `reader.line` (1-based) for the line just yielded.
 * `\n`, `\r\n` and lone `\r` all end a line; the terminator is not part of the text; a final
 * line without a terminator is yielded when non-empty, and every line in between is yielded even
 * when empty (the importer decides what a blank line means).
 */
export class LineReader implements AsyncIterable<string> {
    private readonly input: ImportInput;

    private readonly report: ImportReportBuilder;

    private readonly options: ReadOptions;

    private lineNumber = 0;

    /**
     * Create a reader over an input; nothing is read until iteration starts.
     * @param input - the input
     * @param report - the report decode errors are recorded in
     * @param options - cancellation and progress
     */
    constructor(input: ImportInput, report: ImportReportBuilder, options: ReadOptions = {}) {
        this.input = input;
        this.report = report;
        this.options = options;
    }

    /**
     * The 1-based number of the line most recently yielded.
     * @returns the line number; 0 before the first line
     */
    get line(): number {
        return this.lineNumber;
    }

    /**
     * Iterate the lines.
     * @yields one line at a time, terminator removed
     * @returns nothing
     */
    async *[Symbol.asyncIterator](): AsyncGenerator<string, void, undefined> {
        // The pieces of the line in progress (none of them holds a line break, except that the last
        // may end with a `\r` whose meaning the next chunk decides); joined once when the line ends,
        // so a line spanning many chunks costs its length, not its length times the chunk count.
        const pending: string[] = [];
        let trailingCr = false;
        for await (const chunk of textChunks(this.input, this.report, this.options)) {
            let start = 0;
            const end = chunk.length;
            if (trailingCr) {
                // the previous chunk ended with `\r`: that ended a line, and a leading `\n` here is
                // the second half of the same terminator
                trailingCr = false;
                this.lineNumber++;
                const joined = pending.join("");
                pending.length = 0;
                yield joined.slice(0, -1);
                if (chunk.charCodeAt(0) === 10) {
                    start = 1;
                }
            }
            // the next `\n` and `\r` at or after `start`; each is searched for once per chunk and
            // again only after it was consumed, so a chunk is scanned once whatever its line count
            let nl = chunk.indexOf("\n", start);
            let cr = chunk.indexOf("\r", start);
            while (nl >= 0 || cr >= 0) {
                let cut: number;
                let next: number;
                if (cr >= 0 && (nl < 0 || cr < nl)) {
                    if (cr === end - 1) {
                        // a trailing \r may be the first half of \r\n split across chunks
                        break;
                    }
                    cut = cr;
                    next = chunk.charCodeAt(cr + 1) === 10 ? cr + 2 : cr + 1;
                } else {
                    cut = nl;
                    next = nl + 1;
                }
                this.lineNumber++;
                const piece = chunk.slice(start, cut);
                if (pending.length === 0) {
                    yield piece;
                } else {
                    pending.push(piece);
                    const joined = pending.join("");
                    pending.length = 0;
                    yield joined;
                }
                start = next;
                if (nl >= 0 && nl < next) {
                    nl = chunk.indexOf("\n", next);
                }
                if (cr >= 0 && cr < next) {
                    cr = chunk.indexOf("\r", next);
                }
            }
            if (start < end) {
                pending.push(start === 0 ? chunk : chunk.slice(start));
                trailingCr = chunk.charCodeAt(end - 1) === 13;
            }
        }
        if (pending.length > 0) {
            this.lineNumber++;
            const joined = pending.join("");
            yield joined.endsWith("\r") ? joined.slice(0, -1) : joined;
        }
    }
}
