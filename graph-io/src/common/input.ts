/**
 * Input handling shared by every importer (design section 8.4): the ImportInput union (whole
 * text, whole bytes, a byte stream, an async iterable of text or byte chunks) read as a sequence of
 * text chunks, as lines, or as one string, with BOM handling, cancellation through an AbortSignal
 * and byte progress.
 *
 * Bytes are decoded ONCE, here, for every importer. The encoding is, in order of precedence: a
 * byte order mark (UTF-8, UTF-16LE, UTF-16BE; a UTF-32 one is E_INVALID_ENCODING); the caller's
 * `encoding` option; the encoding the file declares (the importer's `declaredEncoding` reader: the
 * XML prolog for GEXF and GraphML, the `charset` attribute for DOT); else UTF-8. Whenever two of
 * them disagree the one that applies is named in a W_ENCODING_CONFLICT warning. BOM-less UTF-16
 * (every other byte 0) is E_INVALID_ENCODING asking for the option, and a known non-graph file (an
 * HTML page, a PDF, gzip or zip data, a PNG) is E_FOREIGN_FORMAT. Decoding is strict (`fatal: true`): an invalid sequence
 * is never a silent U+FFFD that could alias two ids. Only in the last case, when bytes that are not
 * valid UTF-8 appear while everything before them was ASCII, is the rest of the input read as
 * windows-1252 (the superset of ISO 8859-1 that Excel, Pajek and older tools write), with the
 * warning W_ENCODING_FALLBACK; invalid UTF-8 after valid non-ASCII UTF-8, in data holding control
 * bytes (binary data), or cut at the end of the input is E_INVALID_UTF8.
 *
 * The decoded text, whatever the input shape, is then checked once: leading U+FEFFs are stripped, a
 * trailing Ctrl-Z (the DOS end-of-file marker) is dropped, the first control character or stray
 * U+FEFF is reported W_CONTROL_CHARACTER, and a text that is empty or only whitespace is the fatal
 * E_EMPTY_INPUT.
 */

import { GraphFormatError } from "@graphty/graph-format";

import { type ImportInput } from "../types.js";
import {
    CONTROL_CHARACTER_CODE,
    EMPTY_INPUT_CODE,
    ENCODING_CONFLICT_CODE,
    ENCODING_FALLBACK_CODE,
    FOREIGN_FORMAT_CODE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    OPTION_IGNORED_CODE,
    TOO_LARGE_CODE,
    UNKNOWN_ENCODING_CODE,
} from "./codes.js";
import { type ImportReportBuilder } from "./report.js";

export { INVALID_UTF8_CODE };

/**
 * Cancellation and progress hooks of the reader; the resolved importer options satisfy this shape.
 * @public
 * @category Plugin helpers
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
    /** How many leading bytes the declaration reader sees (default 1024). */
    readonly declarationBytes?: number | undefined;
    /**
     * Whether BOM-less UTF-16 that the NUL pattern of its head shows is read in that encoding (JSON:
     * RFC 8259 section 8.1, RFC 4627 section 3) instead of failing with E_INVALID_ENCODING.
     */
    readonly bomlessUtf16?: boolean | undefined;
    /** Whether an input with no text but whitespace is valid (else E_EMPTY_INPUT). */
    readonly allowEmpty?: boolean | undefined;
    /**
     * Whether the format is XML: an (X)HTML document is then left to the format's own root-element
     * check (an XHTML page may embed the format's elements) instead of being E_FOREIGN_FORMAT.
     */
    readonly xml?: boolean | undefined;
    /**
     * Whether a NUL byte in undeclared input fails the import as binary data (or BOM-less UTF-16)
     * even where the bytes are valid UTF-8: for formats whose grammar never reports a NUL itself
     * (CSV). False by default, so a format's own syntax error names it.
     */
    readonly nulIsBinary?: boolean | undefined;
}

/** How many leading bytes the declaration check sees (an XML prolog, a DOT `charset` near the top). */
const HEAD_BYTES = 1024;

/** How many leading bytes the BOM check needs (a UTF-32 mark is four). */
const BOM_BYTES = 4;

/**
 * The canonical name of an encoding label, or null when the platform's TextDecoder does not know it.
 * @param label - a WHATWG encoding label ("latin1", "UTF-16LE", "cp1252", ...)
 * @returns the canonical name ("windows-1252", "utf-16le", ...) or null
 * @category Plugin helpers
 */
export function canonicalEncoding(label: string): string | null {
    try {
        return new TextDecoder(label.trim()).encoding;
    } catch {
        return null;
    }
}

/**
 * The encoding a byte order mark announces. The UTF-32 marks are checked first: FF FE 00 00 is the
 * UTF-32LE mark, not a UTF-16LE one.
 * @param head - the first bytes
 * @returns "utf-8", "utf-16le", "utf-16be", "utf-32le", "utf-32be" or null
 */
function bomEncoding(head: Uint8Array): string | null {
    if (startsWithBytes(head, [0xff, 0xfe, 0x00, 0x00])) {
        return "utf-32le";
    }
    if (startsWithBytes(head, [0x00, 0x00, 0xfe, 0xff])) {
        return "utf-32be";
    }
    if (startsWithBytes(head, [0xef, 0xbb, 0xbf])) {
        return "utf-8";
    }
    if (startsWithBytes(head, [0xff, 0xfe])) {
        return "utf-16le";
    }
    if (startsWithBytes(head, [0xfe, 0xff])) {
        return "utf-16be";
    }
    return null;
}

/**
 * Whether bytes start with a signature.
 * @param bytes - the bytes
 * @param signature - the leading bytes to look for
 * @returns true when every signature byte matches
 */
function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
    return bytes.byteLength >= signature.length && signature.every((b, i) => bytes[i] === b);
}

/**
 * The UTF-16 byte order of a head without a BOM whose every other byte is 0 (ASCII text in UTF-16),
 * or null. At least 90% of the first 512 code units must follow the pattern.
 * @param head - the first bytes
 * @returns "utf-16le", "utf-16be" or null
 */
function bomlessUtf16(head: Uint8Array): string | null {
    const pairs = Math.min(head.byteLength >> 1, 512);
    if (pairs < 2) {
        return null;
    }
    let le = 0;
    let be = 0;
    for (let i = 0; i < pairs; i++) {
        const even = head[2 * i];
        const odd = head[2 * i + 1];
        if (even !== 0 && odd === 0) {
            le++;
        } else if (even === 0 && odd !== 0) {
            be++;
        }
    }
    if (le >= pairs * 0.9) {
        return "utf-16le";
    }
    return be >= pairs * 0.9 ? "utf-16be" : null;
}

/**
 * The UTF-16 byte order of BOM-less UTF-16 input that starts with an XML declaration (XML 1.0
 * Appendix F: `<?` as 3C 00 3F 00 or 00 3C 00 3F).
 * @param head - the first bytes
 * @returns "utf-16le", "utf-16be" or null
 */
function xmlDeclarationUtf16(head: Uint8Array): string | null {
    if (startsWithBytes(head, [0x3c, 0x00, 0x3f, 0x00])) {
        return "utf-16le";
    }
    return startsWithBytes(head, [0x00, 0x3c, 0x00, 0x3f]) ? "utf-16be" : null;
}

/**
 * What a head is when it is a known file type that is no graph format: compressed or archived data,
 * an image, a PDF, an HTML page. Graph formats are text (or, for a Cytoscape session, a zip the
 * registry hands to its own importer), so such an input is never read as text.
 * @param head - the first bytes or characters of the input
 * @returns a description such as "gzip-compressed data (decompress it first)", or null
 * @category Plugin helpers
 */
export function foreignKind(head: Uint8Array | string): string | null {
    if (typeof head !== "string") {
        if (startsWithBytes(head, [0x1f, 0x8b])) {
            return "gzip-compressed data (decompress it first)";
        }
        if (startsWithBytes(head, [0x50, 0x4b, 0x03, 0x04]) || startsWithBytes(head, [0x50, 0x4b, 0x05, 0x06])) {
            return "a zip archive (a Cytoscape session (.cys) is read by the cys importer; extract any other graph file from it first)";
        }
        if (startsWithBytes(head, [0x89, 0x50, 0x4e, 0x47])) {
            return "a PNG image";
        }
    }
    const text = typeof head === "string" ? head.slice(0, 64) : String.fromCodePoint(...head.subarray(0, 64));
    const utf8Bom = String.fromCodePoint(0xef, 0xbb, 0xbf);
    let body = text.startsWith(utf8Bom) ? text.slice(3) : text;
    body = body.startsWith(BOM) ? body.slice(1) : body;
    if (body.startsWith("%PDF-")) {
        return "a PDF document";
    }
    if (/^\s*(<!doctype\s+html[\s>]|<html[\s>])/i.test(body)) {
        return "an HTML document (likely an error page saved in place of the file)";
    }
    return null;
}

/**
 * Fail the import with E_FOREIGN_FORMAT when its head is a known non-graph file; an (X)HTML page
 * is left to an XML format's own root-element check.
 * @param head - the first bytes or the first text
 * @param report - the report
 * @param options - whether the format is XML
 */
function refuseForeign(head: Uint8Array | string, report: ImportReportBuilder, options: ReadOptions): void {
    const foreign = foreignKind(head);
    if (foreign !== null && !(options.xml === true && foreign.startsWith("an HTML"))) {
        report.fail(FOREIGN_FORMAT_CODE, `the input is ${foreign}, not ${report.format} text`);
    }
}

/**
 * Whether two encodings name the same family for a declaration check: equal, or both UTF-16 (a
 * prolog's "UTF-16" says nothing about the byte order the BOM gives).
 * @param a - a canonical encoding name
 * @param b - another
 * @returns true when they agree
 */
function sameFamily(a: string, b: string): boolean {
    return a === b || (a.startsWith("utf-16") && b.startsWith("utf-16"));
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

    /** Whether the decoder switched to windows-1252 because undeclared input was not UTF-8. */
    private fellBack = false;

    /**
     * The first control byte (other than TAB, LF, FF, CR and a final Ctrl-Z) of undeclared input
     * that may still turn out not to be UTF-8: its offset and value, or null. Tracked from the
     * start of the input, so the binary-data verdict never depends on how the input was chunked.
     */
    private control: { readonly at: number; readonly byte: number } | null = null;

    /** The offset of a Ctrl-Z that ended the previous chunk: control data if more bytes follow. */
    private subAt = -1;

    /** Set while flushing because a text chunk follows: a sequence cut there is not windows-1252. */
    private textFollows = false;

    /** Whether the file declares UTF-8 (read like an undeclared file, but the fallback warning says so). */
    private declaredUtf8 = false;

    /** After the windows-1252 fallback: whether later bytes holding valid UTF-8 are still to be reported (once). */
    private mixedPending = false;

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
     * Choose the encoding from the first bytes of the input: a BOM, else the option, else the
     * declaration, else UTF-8 (see the module comment), warning where two of them disagree.
     * @param head - the first bytes (up to the declaration size; fewer when the input is shorter)
     */
    start(head: Uint8Array): void {
        refuseForeign(head, this.report, this.options);
        const explicit = this.options.encoding ?? null;
        const bom = bomEncoding(head);
        if (bom === "utf-32le" || bom === "utf-32be") {
            this.report.fail(
                INVALID_ENCODING_CODE,
                `the input starts with a ${bom.toUpperCase()} byte order mark; UTF-32 is not supported (convert the file to UTF-8)`,
                undefined,
                { byteOffset: 0 },
            );
        }
        if (bom !== null) {
            const option = explicit === null ? null : canonicalEncoding(explicit);
            if (option !== null && option !== bom) {
                this.conflict(`the encoding option says ${option} but the byte order mark says ${bom}; read as ${bom}`);
            }
            this.checkDeclaration(head, bom, "its byte order mark says");
            this.use(bom, false);
            return;
        }
        if (explicit !== null) {
            this.use(explicit, false);
            this.checkDeclaration(head, this.encoding, "the encoding option says");
            return;
        }
        const xmlUtf16 = xmlDeclarationUtf16(head);
        if (xmlUtf16 !== null) {
            this.checkDeclaration(head, xmlUtf16, "its XML declaration's byte pattern says");
            this.use(xmlUtf16, false);
            return;
        }
        const utf16 = bomlessUtf16(head);
        if (utf16 !== null && this.options.bomlessUtf16 === true) {
            this.use(utf16, false);
            return;
        }
        if (utf16 !== null) {
            this.report.fail(
                INVALID_ENCODING_CODE,
                `the input looks like ${utf16} text without a byte order mark (every other byte is 0); pass the encoding option ${JSON.stringify(utf16)} to read it`,
                undefined,
                { byteOffset: 0 },
            );
        }
        const declared = this.declared(head, "windows-1252");
        if (declared !== null) {
            const canonical = canonicalEncoding(declared);
            if (canonical === null) {
                this.report.warning(
                    "unsupported",
                    UNKNOWN_ENCODING_CODE,
                    `the input declares the encoding ${JSON.stringify(declared)}, which this platform cannot decode; reading it as UTF-8`,
                    { element: declared },
                );
            } else if (canonical.startsWith("utf-16")) {
                // a declared UTF-16 over bytes that are not UTF-16 (no BOM, no NUL pattern): the
                // declaration itself was readable as ASCII
                this.conflict(
                    `the input declares ${JSON.stringify(declared)} but has no byte order mark and its bytes are not UTF-16; read as UTF-8`,
                );
            } else if (canonical === "utf-8") {
                this.declaredUtf8 = true;
            } else {
                // a declared UTF-8 gets the undeclared treatment: tools often write the default
                // prolog over Latin-1 bytes
                this.use(canonical, false);
                return;
            }
        }
        this.use("utf-8", true);
    }

    /**
     * The encoding the head declares, read through the format's declaration reader.
     * @param head - the first bytes
     * @param encoding - the encoding to read the head in for the reader
     * @returns the declared label, or null (also for a format without declarations)
     */
    private declared(head: Uint8Array, encoding: string): string | null {
        const reader = this.options.declaredEncoding;
        return reader === undefined ? null : reader(new TextDecoder(encoding).decode(head));
    }

    /**
     * Warn when the file declares an encoding other than the one a BOM or the option chose.
     * @param head - the first bytes
     * @param chosen - the encoding the input is read in
     * @param why - what chose it, for the message
     */
    private checkDeclaration(head: Uint8Array, chosen: string, why: string): void {
        const declared = this.declared(head, chosen);
        const canonical = declared === null ? null : canonicalEncoding(declared);
        if (canonical !== null && !sameFamily(canonical, chosen)) {
            this.conflict(
                `the input declares the encoding ${JSON.stringify(declared)} but ${why} ${chosen}; read as ${chosen}`,
            );
        }
    }

    /**
     * Record a W_ENCODING_CONFLICT warning.
     * @param message - which sources disagree and which applies
     */
    private conflict(message: string): void {
        this.report.warning("coercion", ENCODING_CONFLICT_CODE, message);
    }

    /**
     * Decode the next bytes.
     * @param input - the bytes
     * @param stream - whether more bytes follow
     * @returns the text
     */
    decode(input: Uint8Array, stream: boolean): string {
        // a browser TextDecoder refuses a view of shared memory: decode a private copy
        const bytes =
            typeof SharedArrayBuffer === "function" && input.buffer instanceof SharedArrayBuffer
                ? input.slice()
                : input;
        const decoder = this.decoder as TextDecoder;
        if (this.fellBack || (this.mayFallBack && this.asciiSoFar)) {
            this.watch(bytes, !stream);
            if (this.fellBack && this.control !== null) {
                this.binary(this.control);
            }
        }
        let text: string;
        try {
            text = decoder.decode(bytes, { stream });
        } catch (err) {
            if (!(err instanceof TypeError)) {
                throw err;
            }
            text = this.recover(bytes, stream);
        }
        if (this.mixedPending) {
            this.reportUtf8After(bytes, this.offset);
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
        if (this.mayFallBack && this.options.nulIsBinary === true && text.includes("\0")) {
            // a NUL never occurs in a text file: undeclared bytes holding one are binary or BOM-less UTF-16
            this.binary({ at: this.offset + bytes.indexOf(0), byte: 0 });
        }
        this.offset += bytes.byteLength;
        return text;
    }

    /**
     * Flush the bytes held back because a text chunk follows (the input switches from bytes to
     * strings): a multi-byte sequence cut there is invalid UTF-8, never windows-1252 text.
     * @param flush - the flush to run (the decoder's own, or the head's)
     * @returns the text of the held-back bytes
     */
    flushBeforeText(flush: () => string): string {
        this.textFollows = true;
        try {
            return flush();
        } finally {
            this.textFollows = false;
        }
    }

    /**
     * A decode failed: switch to windows-1252 when allowed, else fail the import with the position
     * of the first byte that is not valid.
     * @param bytes - the bytes that failed
     * @param stream - whether more bytes follow
     * @returns the bytes decoded as windows-1252
     */
    private recover(bytes: Uint8Array, stream: boolean): string {
        const all = this.carry.byteLength === 0 ? bytes : concatBytes([this.carry, bytes]);
        const base = this.offset - this.carry.byteLength;
        const bad = this.encoding === "utf-8" ? invalidUtf8(all) : null;
        const at = base + (bad === null ? 0 : bad.index);
        if (this.mayFallBack && this.asciiSoFar) {
            // windows-1252 text holds no control bytes but TAB, LF, FF and CR: one anywhere in
            // undeclared input that is not UTF-8 marks binary data (watch() saw every byte so far)
            if (this.control !== null) {
                return this.binary(this.control);
            }
            if (this.textFollows && bad?.cut === true) {
                return this.report.fail(
                    INVALID_UTF8_CODE,
                    `invalid UTF-8 at byte ${at}: a byte chunk ends inside a multi-byte sequence and a text chunk follows`,
                    undefined,
                    { byteOffset: at },
                );
            }
            if (!stream && bad?.truncated === true) {
                return this.report.fail(
                    INVALID_UTF8_CODE,
                    `the input ends in the middle of a UTF-8 sequence at byte ${at} (it may be truncated)`,
                    undefined,
                    { byteOffset: at },
                );
            }
            if (!startsWithUtf8(all)) {
                const cutNote =
                    !stream && bad?.cut === true
                        ? ": it ends inside a multi-byte UTF-8 sequence, so it may be truncated"
                        : "";
                this.report.warning(
                    "coercion",
                    ENCODING_FALLBACK_CODE,
                    this.declaredUtf8
                        ? `the input declares UTF-8 but is not valid UTF-8 (at byte ${at}); everything before was ASCII, so it is read as windows-1252 (pass the encoding option to choose another)`
                        : `the input is not valid UTF-8 (at byte ${at}${cutNote}) and declares no encoding; read as windows-1252 (pass the encoding option to choose another)`,
                );
                this.use("windows-1252", false);
                this.fellBack = true;
                this.mixedPending = true;
                this.reportUtf8After(all, base);
                return (this.decoder as TextDecoder).decode(all, { stream });
            }
        }
        if (this.encoding === "utf-8") {
            const after = this.mayFallBack ? " after valid non-ASCII UTF-8 text; pass the encoding option" : "";
            return this.report.fail(INVALID_UTF8_CODE, `invalid UTF-8 at byte ${at}${after}`, undefined, {
                byteOffset: at,
            });
        }
        const end = this.offset + bytes.byteLength;
        const odd = !stream && this.encoding.startsWith("utf-16") && end % 2 === 1;
        return this.report.fail(
            INVALID_ENCODING_CODE,
            odd
                ? `the input ends with half a ${this.encoding} code unit at byte ${end - 1} (it may be truncated)`
                : `the bytes near byte ${base} are not valid ${this.encoding}`,
            undefined,
            { byteOffset: odd ? end - 1 : base },
        );
    }

    /**
     * After the windows-1252 fallback, report once that later bytes hold a valid multi-byte UTF-8
     * sequence: the input mixes encodings, and those characters are read as two or three
     * windows-1252 characters each.
     * @param bytes - bytes being decoded as windows-1252
     * @param start - the byte offset of the first of them
     */
    private reportUtf8After(bytes: Uint8Array, start: number): void {
        const at = utf8SequenceIndex(bytes);
        if (at < 0) {
            return;
        }
        this.mixedPending = false;
        this.report.warning(
            "coercion",
            ENCODING_FALLBACK_CODE,
            `bytes read as windows-1252 hold valid UTF-8 (at byte ${start + at}): the input mixes encodings, and its UTF-8 characters are read as windows-1252 (pass the encoding option to choose one)`,
        );
    }

    /**
     * Note the first control byte of the next bytes (see `control`).
     * @param bytes - the bytes, starting at `offset`
     * @param final - whether they end the input
     */
    private watch(bytes: Uint8Array, final: boolean): void {
        if (this.control !== null || bytes.byteLength === 0) {
            return;
        }
        if (this.subAt >= 0) {
            this.control = { at: this.subAt, byte: 0x1a };
            return;
        }
        // a Ctrl-Z at the end of a chunk is held until it is known whether more bytes follow
        const index = controlByte(bytes, true);
        if (index >= 0) {
            this.control = { at: this.offset + index, byte: bytes[index] };
        } else if (!final && bytes[bytes.byteLength - 1] === 0x1a) {
            this.subAt = this.offset + bytes.byteLength - 1;
        }
    }

    /**
     * Fail the import as binary data.
     * @param control - the control byte that shows it
     * @param control.at - its offset
     * @param control.byte - its value
     * @returns never
     */
    private binary(control: { readonly at: number; readonly byte: number }): never {
        const hex = control.byte.toString(16).padStart(2, "0");
        return this.report.fail(
            INVALID_UTF8_CODE,
            `the input is binary data, not text: control byte 0x${hex} at byte ${control.at}`,
            undefined,
            { byteOffset: control.at },
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
 * Where the first complete, valid multi-byte UTF-8 sequence of some bytes starts.
 * @param bytes - the bytes
 * @returns its index, or -1
 */
function utf8SequenceIndex(bytes: Uint8Array): number {
    for (let i = 0; i < bytes.byteLength; i++) {
        if (bytes[i] >= 0xc2 && isUtf8SequenceAt(bytes, i)) {
            return i;
        }
    }
    return -1;
}

/**
 * Whether the first non-ASCII byte of a chunk starts a valid UTF-8 sequence: then the chunk holds
 * valid non-ASCII UTF-8 before whatever made it fail, and the input is not windows-1252.
 * @param bytes - a chunk that failed to decode as UTF-8
 * @returns true when its first non-ASCII sequence is valid UTF-8
 */
function startsWithUtf8(bytes: Uint8Array): boolean {
    const i = bytes.findIndex((b) => b >= 0x80);
    return i >= 0 && isUtf8SequenceAt(bytes, i);
}

/** A strict UTF-8 decoder for checking single sequences (decode() without stream keeps no state). */
const STRICT_UTF8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Whether a complete, valid multi-byte UTF-8 sequence starts at an index.
 * @param bytes - the bytes
 * @param i - the index of the lead byte
 * @returns true when the sequence is complete and valid
 */
function isUtf8SequenceAt(bytes: Uint8Array, i: number): boolean {
    const lead = bytes[i];
    let length = 0;
    if (lead >= 0xc2 && lead <= 0xdf) {
        length = 2;
    } else if (lead >= 0xe0 && lead <= 0xef) {
        length = 3;
    } else if (lead >= 0xf0 && lead <= 0xf4) {
        length = 4;
    }
    if (length === 0 || i + length > bytes.byteLength) {
        return false;
    }
    try {
        STRICT_UTF8.decode(bytes.subarray(i, i + length));
        return true;
    } catch {
        return false;
    }
}

/** The upper half (0x80-0xFF) of code page 437, the zip format's legacy name encoding (APPNOTE appendix D). */
const CP437_HIGH: readonly number[] = [
    0x00c7, 0x00fc, 0x00e9, 0x00e2, 0x00e4, 0x00e0, 0x00e5, 0x00e7, 0x00ea, 0x00eb, 0x00e8, 0x00ef, 0x00ee, 0x00ec,
    0x00c4, 0x00c5, 0x00c9, 0x00e6, 0x00c6, 0x00f4, 0x00f6, 0x00f2, 0x00fb, 0x00f9, 0x00ff, 0x00d6, 0x00dc, 0x00a2,
    0x00a3, 0x00a5, 0x20a7, 0x0192, 0x00e1, 0x00ed, 0x00f3, 0x00fa, 0x00f1, 0x00d1, 0x00aa, 0x00ba, 0x00bf, 0x2310,
    0x00ac, 0x00bd, 0x00bc, 0x00a1, 0x00ab, 0x00bb, 0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x2561, 0x2562, 0x2556,
    0x2555, 0x2563, 0x2551, 0x2557, 0x255d, 0x255c, 0x255b, 0x2510, 0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c,
    0x255e, 0x255f, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x2567, 0x2568, 0x2564, 0x2565, 0x2559,
    0x2558, 0x2552, 0x2553, 0x256b, 0x256a, 0x2518, 0x250c, 0x2588, 0x2584, 0x258c, 0x2590, 0x2580, 0x03b1, 0x00df,
    0x0393, 0x03c0, 0x03a3, 0x03c3, 0x00b5, 0x03c4, 0x03a6, 0x0398, 0x03a9, 0x03b4, 0x221e, 0x03c6, 0x03b5, 0x2229,
    0x2261, 0x00b1, 0x2265, 0x2264, 0x2320, 0x2321, 0x00f7, 0x2248, 0x00b0, 0x2219, 0x00b7, 0x221a, 0x207f, 0x00b2,
    0x25a0, 0x00a0,
];

/**
 * The first invalid UTF-8 sequence of a chunk (the WHATWG decoder's rules: no overlong forms, no
 * surrogates, nothing above U+10FFFF).
 * @param bytes - the bytes
 * @returns its index, whether it is a valid sequence cut by the end of the bytes (`cut`), and whether
 * that cut sequence holds at least one continuation byte (truncation rather than a stray windows-1252
 * byte); index 0 when none is found
 */
function invalidUtf8(bytes: Uint8Array): {
    readonly index: number;
    readonly truncated: boolean;
    readonly cut: boolean;
} {
    let i = 0;
    while (i < bytes.byteLength) {
        const lead = bytes[i];
        if (lead < 0x80) {
            i++;
            continue;
        }
        let need = 0;
        let low = 0x80;
        let high = 0xbf;
        if (lead >= 0xc2 && lead <= 0xdf) {
            need = 1;
        } else if (lead >= 0xe0 && lead <= 0xef) {
            need = 2;
            low = lead === 0xe0 ? 0xa0 : 0x80;
            high = lead === 0xed ? 0x9f : 0xbf;
        } else if (lead >= 0xf0 && lead <= 0xf4) {
            need = 3;
            low = lead === 0xf0 ? 0x90 : 0x80;
            high = lead === 0xf4 ? 0x8f : 0xbf;
        } else {
            return { index: i, truncated: false, cut: false };
        }
        for (let k = 1; k <= need; k++) {
            if (i + k >= bytes.byteLength) {
                return { index: i, truncated: k > 1, cut: true };
            }
            const next = bytes[i + k];
            if (next < (k === 1 ? low : 0x80) || next > (k === 1 ? high : 0xbf)) {
                return { index: i, truncated: false, cut: false };
            }
        }
        i += need + 1;
    }
    return { index: 0, truncated: false, cut: false };
}

/**
 * The first control byte of a chunk that text never holds: below 0x20 but TAB, LF, FF and CR, and
 * not a Ctrl-Z that ends the input (the DOS end-of-file marker).
 * @param bytes - the bytes
 * @param final - whether the bytes end the input
 * @returns its index, or -1
 */
function controlByte(bytes: Uint8Array, final: boolean): number {
    const last = bytes.byteLength - 1;
    return bytes.findIndex(
        (b, i) =>
            b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0c && b !== 0x0d && !(b === 0x1a && final && i === last),
    );
}

/**
 * A zip entry name as text (APPNOTE 4.4.17 and appendix D): UTF-8 when the bytes are valid UTF-8,
 * whether or not the entry sets the language-encoding flag (bit 11); otherwise code page 437 when
 * the flag is clear (what Windows and older tools write), and windows-1252 when the entry claims
 * UTF-8 (or no flags are known). Never throws: a name is a matching key, never a path, so an
 * undecodable one still has to name its entry.
 * @param bytes - the name bytes from the central directory or a local header
 * @param cp437 - the entry's bit 11 is clear: decode a non-UTF-8 name as code page 437
 * @returns the name
 * @category Plugin helpers
 */
export function decodeEntryName(bytes: Uint8Array, cp437 = false): string {
    try {
        return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
    } catch {
        if (!cp437) {
            return new TextDecoder("windows-1252").decode(bytes);
        }
        let out = "";
        for (const byte of bytes) {
            out += String.fromCodePoint(byte < 0x80 ? byte : CP437_HIGH[byte - 0x80]);
        }
        return out;
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
 * Bytes decoded per call when the input is one in-memory Uint8Array, and characters per chunk of a
 * string input: every consumer of textChunks() then sees bounded chunks whatever the input shape (a
 * line reader or a record reader that holds one parse result per chunk never holds more than this
 * much text at once), and progress stays granular.
 */
const DECODE_SLICE = 256 * 1024;

const BOM = String.fromCharCode(0xfeff);

/** The DOS end-of-file marker, Ctrl-Z. */
const SUB = String.fromCodePoint(0x1a);

/**
 * The longest string V8 makes (2^29 - 24 UTF-16 code units); longer text cannot be one string.
 * @category Plugin helpers
 */
export const MAX_TEXT_LENGTH = 2 ** 29 - 24;

/**
 * A character text keeps only by accident: a C0 control but TAB, LF, FF and CR, DEL, a C1 control
 * (also what windows-1252 bytes it leaves undefined decode to), and U+FEFF inside the text.
 */
const CONTROL_CHARACTER = new RegExp(
    `[${String.fromCodePoint(0x00)}-${String.fromCodePoint(0x08, 0x0b, 0x0e)}-${String.fromCodePoint(0x1f, 0x7f)}-${String.fromCodePoint(0x9f)}${BOM}]`,
);

/**
 * Whether a value is an ImportInput this module can read.
 * @param input - any value
 * @returns true for a string, a Uint8Array, a ReadableStream or an async iterable
 * @category Plugin helpers
 */
export function isImportInput(input: unknown): input is ImportInput {
    if (typeof input === "string" || asBytes(input) !== null) {
        return true;
    }
    if (typeof input !== "object" || input === null) {
        return false;
    }
    return typeof (input as { getReader?: unknown }).getReader === "function" || Symbol.asyncIterator in input;
}

/**
 * A Uint8Array, also one from another realm (a vm context, an iframe), as a Uint8Array of this one.
 * @param value - any value
 * @returns the bytes, or null when the value is not a Uint8Array
 */
function asBytes(value: unknown): Uint8Array | null {
    if (value instanceof Uint8Array) {
        return value;
    }
    if (ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === "[object Uint8Array]") {
        return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    return null;
}

/**
 * The input as one of the ImportInput shapes, or E_UNSUPPORTED naming what was passed and how to
 * pass it instead (an ArrayBuffer, a Blob, a fetch Response, null from a failed read).
 * @param input - what the caller passed
 * @returns the input (a Uint8Array from another realm re-viewed in this one)
 * @category Plugin helpers
 */
export function normalizeInput(input: unknown): ImportInput {
    if (typeof input === "string") {
        return input;
    }
    const bytes = asBytes(input);
    if (bytes !== null) {
        return bytes;
    }
    if (isImportInput(input)) {
        return input;
    }
    const tag = Object.prototype.toString.call(input).slice(8, -1);
    let found: string = input === null ? "null" : typeof input;
    let fix = "";
    if (tag === "ArrayBuffer" || tag === "SharedArrayBuffer") {
        found = `an ${tag}`;
        fix = "; wrap it as new Uint8Array(buffer)";
    } else if (ArrayBuffer.isView(input)) {
        found = `a ${tag}`;
        fix = "; pass new Uint8Array(view.buffer, view.byteOffset, view.byteLength)";
    } else if (typeof input === "object" && input !== null) {
        const object = input as { stream?: unknown; size?: unknown; body?: unknown; arrayBuffer?: unknown };
        if (typeof object.stream === "function" && typeof object.size === "number") {
            found = "a Blob or File";
            fix = "; pass blob.stream()";
        } else if ("body" in object && typeof object.arrayBuffer === "function") {
            found = "a fetch Response";
            fix = "; pass response.body";
        } else {
            found = `an object (${tag})`;
        }
    }
    throw new GraphFormatError(
        "E_UNSUPPORTED",
        `the input is ${found}; an importer reads a string, a Uint8Array, a ReadableStream or an async iterable of strings and Uint8Arrays${fix}`,
        { reason: "input type", found },
    );
}

/**
 * The total size of an in-memory input (bytes for a Uint8Array, UTF-16 code units for a string),
 * null for a stream or an iterable.
 * @param input - the input
 * @returns the size, or null when unknown up front
 * @category Plugin helpers
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
 * The UTF-8 length of a text, the unit onProgress counts text in (a lone surrogate counts as the
 * three bytes of U+FFFD).
 * @param text - the text
 * @returns its length in UTF-8 bytes
 */
function utf8Length(text: string): number {
    let bytes = 0;
    let i = 0;
    while (i < text.length) {
        const c = text.charCodeAt(i); // NOSONAR(S7758): reads UTF-16 code units on purpose
        const pair = c >= 0xd800 && c <= 0xdbff && (text.charCodeAt(i + 1) & 0xfc00) === 0xdc00; // NOSONAR(S7758): reads UTF-16 code units on purpose
        if (c < 0x80) {
            bytes++;
        } else if (c < 0x800) {
            bytes += 2;
        } else {
            bytes += pair ? 4 : 3;
        }
        i += pair ? 2 : 1;
    }
    return bytes;
}

/**
 * Throw the signal's reason when it is aborted, exactly as the platform's
 * `AbortSignal.throwIfAborted()` does: the reason as it is (the DOMException named "AbortError"
 * of a reason-less abort, or whatever the caller passed to `abort(reason)`, an Error or not), so a
 * caller can compare the rejection with `signal.reason`. Only a runtime that stores no reason at
 * all gets a synthesized AbortError.
 * @param signal - the signal, or null
 * @category Writing a format
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
 * A promise that also settles when the signal fires, rejecting with its reason: a read that stalls
 * (a network body that never delivers) cannot keep an aborted import pending. The caller checks
 * the signal before calling.
 * @param promise - the pending operation
 * @param signal - the cancellation signal, or null
 * @returns the operation's result, or the abort reason as a rejection
 * @category Plugin helpers
 */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal | null): Promise<T> {
    if (signal === null || typeof signal.addEventListener !== "function") {
        return promise;
    }
    return new Promise<T>((resolve, reject) => {
        const onAbort = (): void => {
            try {
                throwIfAborted(signal);
            } catch (err) {
                reject(err as Error);
            }
        };
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(
            (value) => {
                signal.removeEventListener("abort", onAbort);
                resolve(value);
            },
            (err: unknown) => {
                signal.removeEventListener("abort", onAbort);
                reject(err as Error);
            },
        );
    });
}

/**
 * A reader of a stream, or E_UNSUPPORTED when another reader holds the stream already.
 * @param stream - the stream
 * @returns the reader
 * @category Plugin helpers
 */
export function lockReader(stream: ReadableStream<Uint8Array>): ReadableStreamDefaultReader<Uint8Array> {
    if (stream.locked) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            "the input ReadableStream is locked: another reader holds it (release it, or pass a fresh stream)",
            { reason: "stream locked" },
        );
    }
    return stream.getReader();
}

/**
 * The checks every decoded text passes once, whatever the input shape: leading U+FEFFs stripped,
 * a known non-graph document (HTML, PDF) refused, a trailing Ctrl-Z held back and dropped at the
 * end, the first control character reported, and an input with no text but whitespace refused.
 */
class TextFilter {
    private first = true;

    private content = false;

    private heldSub = false;

    private warned = false;

    private strayBom = false;

    /**
     * Create the filter of one import.
     * @param report - where the warnings and the fatal errors go
     * @param options - whether an empty input is valid, whether the format is XML
     */
    constructor(
        private readonly report: ImportReportBuilder,
        private readonly options: ReadOptions,
    ) {}

    /**
     * Filter the next decoded text.
     * @param chunk - the text
     * @returns the text to hand on
     */
    push(chunk: string): string {
        let text = this.heldSub ? SUB + chunk : chunk;
        this.heldSub = false;
        if (text.length === 0) {
            return text;
        }
        if (this.first) {
            let start = 0;
            while (text.codePointAt(start) === 0xfeff) {
                start++;
            }
            if (start > 1 && !this.strayBom) {
                // the first U+FEFF is the byte order mark; another one is a stray character
                this.strayBom = true;
                this.report.warning(
                    "validation-error",
                    CONTROL_CHARACTER_CODE,
                    `the input starts with ${start} byte order marks (U+FEFF); the extra ones were ignored`,
                    { element: "U+FEFF" },
                );
            }
            text = text.slice(start);
            if (text.length === 0) {
                return text;
            }
            this.first = false;
            // ponytail: only the first non-empty chunk is checked, so a document arriving one
            // character per chunk is not recognized; the parser then fails on it instead
            refuseForeign(text, this.report, this.options);
        }
        if (text.endsWith(SUB)) {
            this.heldSub = true;
            text = text.slice(0, -1);
        }
        if (!this.content && /\S/.test(text)) {
            this.content = true;
        }
        if (!this.warned) {
            const match = CONTROL_CHARACTER.exec(text);
            if (match !== null) {
                this.warned = true;
                const code = (match[0].codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
                const around = JSON.stringify(text.slice(Math.max(0, match.index - 20), match.index + 20));
                this.report.warning(
                    "validation-error",
                    CONTROL_CHARACTER_CODE,
                    `the input holds the control character U+${code} (in ${around}); it is kept in the id or value it is part of`,
                    { element: `U+${code}` },
                );
            }
        }
        return text;
    }

    /** The input ended: drop a held Ctrl-Z with a warning, and refuse an input without content. */
    end(): void {
        if (this.heldSub) {
            this.report.warning(
                "validation-error",
                CONTROL_CHARACTER_CODE,
                "the input ends with a Ctrl-Z (0x1A), the DOS end-of-file marker; it was ignored",
                { element: "U+001A" },
            );
        }
        if (!this.content && this.options.allowEmpty !== true) {
            this.report.fail(EMPTY_INPUT_CODE, this.first ? "the input is empty" : "the input holds only whitespace");
        }
    }
}

/**
 * Record W_OPTION_IGNORED for an encoding option given with text input, which is already decoded.
 * @param report - the report
 * @param encoding - the option, or null / undefined
 */
function reportTextEncoding(report: ImportReportBuilder, encoding: string | null | undefined): void {
    if (encoding !== null && encoding !== undefined) {
        report.warning(
            "unsupported",
            OPTION_IGNORED_CODE,
            "option encoding has no effect on text input, which is already decoded",
            { element: "encoding" },
        );
    }
}

/**
 * Read an ImportInput as a sequence of decoded text chunks. Chunk boundaries carry no meaning:
 * a caller that needs lines uses LineReader, one that needs the whole document uses readText().
 * The signal is checked before every chunk and while a stream read is pending; a stream is
 * canceled when the consumer stops early or the signal fires. Progress is reported after every
 * chunk, in bytes (text counted as UTF-8).
 * @param rawInput - the input
 * @param report - the report decode errors and the text checks are recorded in (E_INVALID_UTF8,
 * E_EMPTY_INPUT, ... then ImportError)
 * @param options - cancellation, progress and the encoding
 * @yields decoded text; leading BOMs and a trailing Ctrl-Z removed
 * @returns nothing
 * @category Writing a format
 */
export async function* textChunks(
    rawInput: ImportInput,
    report: ImportReportBuilder,
    options: ReadOptions = {},
): AsyncGenerator<string, void, undefined> {
    const input = normalizeInput(rawInput);
    const signal = options.signal ?? null;
    const onProgress = options.onProgress ?? null;
    const filter = new TextFilter(report, options);
    throwIfAborted(signal);
    if (typeof input === "string") {
        reportTextEncoding(report, options.encoding);
        const total = onProgress === null ? 0 : utf8Length(input);
        let done = 0;
        let start = 0;
        while (start < input.length) {
            throwIfAborted(signal);
            let end = Math.min(start + DECODE_SLICE, input.length);
            if (end < input.length && (input.charCodeAt(end - 1) & 0xfc00) === 0xd800) {
                // NOSONAR(S7758): reads UTF-16 code units on purpose
                end++; // never split a surrogate pair
            }
            const piece = start === 0 && end === input.length ? input : input.slice(start, end);
            start = end;
            const text = filter.push(piece);
            if (text.length > 0) {
                yield text;
            }
            if (onProgress !== null) {
                done += utf8Length(piece);
                onProgress(done, total);
            }
        }
        if (input.length === 0) {
            onProgress?.(0, 0);
        }
        filter.end();
        return;
    }
    const decoder = new ByteDecoder(report, options);
    const headBytes = Math.max(options.declarationBytes ?? HEAD_BYTES, BOM_BYTES);
    if (input instanceof Uint8Array) {
        const length = input.byteLength;
        decoder.start(input.subarray(0, headBytes));
        for (let offset = 0; offset < length; offset += DECODE_SLICE) {
            throwIfAborted(signal);
            if (input.byteLength !== length) {
                throw new GraphFormatError(
                    "E_UNSUPPORTED",
                    "the input's buffer was detached (transferred) or resized during the import",
                    { reason: "detached" },
                );
            }
            const slice = input.subarray(offset, Math.min(offset + DECODE_SLICE, length));
            const text = filter.push(decoder.decode(slice, offset + DECODE_SLICE < length));
            if (text.length > 0) {
                yield text;
            }
            onProgress?.(Math.min(offset + DECODE_SLICE, length), length);
        }
        if (length === 0) {
            onProgress?.(0, 0);
        }
        filter.end();
        return;
    }
    // the first bytes of a stream are held back until the BOM check (and the declaration check,
    // when the format has one) can see enough of them, or the input ended, or text arrived, so a
    // BOM or a declaration split across small chunks is still seen
    const needed = options.declaredEncoding === undefined ? BOM_BYTES : headBytes;
    let done = 0;
    let head: Uint8Array[] = [];
    let headLength = 0;
    const flushHead = (stream: boolean): string => {
        const bytes = concatBytes(head);
        head = [];
        headLength = 0;
        decoder.start(bytes.subarray(0, headBytes));
        return decoder.decode(bytes, stream);
    };
    const chunks = isReadableStream(input) ? streamChunks(input, signal) : input;
    for await (const chunk of chunks) {
        throwIfAborted(signal);
        let text: string;
        const bytes = typeof chunk === "string" ? null : asBytes(chunk);
        if (typeof chunk === "string") {
            // finish any byte sequence still pending in the decoder before switching to text; the
            // BOM and declaration checks apply to the start of the input only, so bytes after text
            // are never taken for a BOM
            let pending = "";
            if (headLength > 0) {
                pending = decoder.flushBeforeText(() => flushHead(false));
            } else if (decoder.started) {
                pending = decoder.flushBeforeText(() => decoder.decode(new Uint8Array(0), false));
            } else {
                decoder.start(new Uint8Array(0));
            }
            text = filter.push(pending + chunk);
            done += onProgress === null ? 0 : utf8Length(chunk);
        } else if (bytes !== null) {
            done += bytes.byteLength;
            if (decoder.started) {
                text = filter.push(decoder.decode(bytes, true));
            } else {
                head.push(bytes);
                headLength += bytes.byteLength;
                text = headLength >= needed ? filter.push(flushHead(true)) : "";
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
    if (headLength > 0) {
        tail = flushHead(false);
    } else if (decoder.started) {
        tail = decoder.decode(new Uint8Array(0), false);
    }
    tail = filter.push(tail);
    if (tail.length > 0) {
        yield tail;
    }
    filter.end();
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
 * Iterate a ReadableStream through a reader, cancelling the stream (with the signal's reason) when
 * iteration stops early or the signal fires, also while a read is pending.
 * @param stream - the stream
 * @param signal - the cancellation signal, or null
 * @yields the stream's chunks
 * @returns nothing
 */
async function* streamChunks(
    stream: ReadableStream<Uint8Array>,
    signal: AbortSignal | null,
): AsyncGenerator<Uint8Array, void, undefined> {
    const reader = lockReader(stream);
    let finished = false;
    try {
        for (;;) {
            throwIfAborted(signal);
            const { done, value } = await abortable(reader.read(), signal);
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
 * Read the whole input as bytes, for a binary format (a zip): nothing is decoded. The signal is
 * checked before every chunk and progress reported after it; a stream is canceled when the read
 * stops early.
 * @param rawInput - the input
 * @param options - cancellation and progress (the encoding is ignored)
 * @returns the bytes, or null when the input is text (a string, or a chunk that is a string),
 * which a binary format cannot read
 */
export async function readBytes(rawInput: ImportInput, options: ReadOptions = {}): Promise<Uint8Array | null> {
    const input = normalizeInput(rawInput);
    const signal = options.signal ?? null;
    throwIfAborted(signal);
    if (typeof input === "string") {
        return null;
    }
    if (input instanceof Uint8Array) {
        options.onProgress?.(input.byteLength, input.byteLength);
        return input;
    }
    const parts: Uint8Array[] = [];
    let done = 0;
    for await (const chunk of isReadableStream(input) ? streamChunks(input, signal) : input) {
        throwIfAborted(signal);
        if (typeof chunk === "string") {
            return null;
        }
        const bytes = asBytes(chunk);
        if (bytes === null) {
            throw new GraphFormatError("E_UNSUPPORTED", "an input chunk must be a string or a Uint8Array", {
                reason: "chunk type",
                found: typeof chunk,
            });
        }
        parts.push(bytes);
        done += bytes.byteLength;
        options.onProgress?.(done);
    }
    options.onProgress?.(done, done);
    return parts.length === 0 ? new Uint8Array(0) : concatBytes(parts);
}

/**
 * Fail an import whose text is longer than one JavaScript string can hold.
 * @param report - the report
 * @param message - what is too long
 * @param line - the line, when known
 * @category Plugin helpers
 */
export function tooLarge(report: ImportReportBuilder, message: string, line?: number): never {
    report.failWith("unsupported", TOO_LARGE_CODE, message, line === undefined ? undefined : { line });
}

/**
 * Read the whole input as one string (what the GML, DOT and JSON importers do), failing with
 * E_TOO_LARGE (category unsupported) before the join when it is longer than one JavaScript string
 * can hold. A string input is used as it is (one progress call), after the same text checks.
 * @param rawInput - the input
 * @param report - the report the decode error is recorded in
 * @param options - cancellation and progress
 * @returns the decoded text without a leading BOM or a trailing Ctrl-Z
 * @category Writing a format
 */
export async function readText(
    rawInput: ImportInput,
    report: ImportReportBuilder,
    options: ReadOptions = {},
): Promise<string> {
    const input = normalizeInput(rawInput);
    if (typeof input === "string") {
        throwIfAborted(options.signal);
        reportTextEncoding(report, options.encoding);
        const filter = new TextFilter(report, options);
        const text = filter.push(input);
        filter.end();
        if (options.onProgress !== null && options.onProgress !== undefined) {
            const total = utf8Length(input);
            options.onProgress(total, total);
        }
        return text;
    }
    const parts: string[] = [];
    let length = 0;
    for await (const chunk of textChunks(input, report, options)) {
        length += chunk.length;
        if (length > MAX_TEXT_LENGTH) {
            tooLarge(
                report,
                `the document is longer than ${MAX_TEXT_LENGTH} characters, the most one JavaScript string holds`,
            );
        }
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
 * @category Writing a format
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
     * The E_TOO_LARGE message of a line longer than one string.
     * @returns the message
     */
    private lineTooLong(): string {
        return `a line is longer than ${MAX_TEXT_LENGTH} characters, the most one JavaScript string holds`;
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
        let pendingLength = 0;
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
                pendingLength = 0;
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
                    if (pendingLength + piece.length > MAX_TEXT_LENGTH) {
                        tooLarge(this.report, this.lineTooLong(), this.lineNumber);
                    }
                    pending.push(piece);
                    const joined = pending.join("");
                    pending.length = 0;
                    pendingLength = 0;
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
                pendingLength += end - start;
                if (pendingLength > MAX_TEXT_LENGTH) {
                    tooLarge(this.report, this.lineTooLong(), this.lineNumber + 1);
                }
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
