/**
 * The streaming XML tokenizer shared by the GEXF and GraphML importers (design sections 8.2 and
 * 8.4): SAX-style start / end / text events over the text chunks of the common reader, so both
 * importers run in one pass with bounded memory and every issue carries a line number.
 *
 * Cost model: every character of the input is scanned once. A token that spans many chunks (a
 * long attribute value, comment, CDATA section or name) resumes where the previous chunk left off
 * instead of re-reading the token from its `<`, and line numbers are counted from a cached next
 * line-break position, so a document without line breaks costs the same as one with them.
 *
 * What it handles: the XML declaration and processing instructions (skipped), comments (skipped;
 * a `--` inside one, which XML 1.0 forbids, is accepted: a comment carries no data and banner
 * comments such as `<!-- ----- -->` are common in hand-written files),
 * CDATA sections (text), a DOCTYPE with an internal subset (skipped; entity declarations are not
 * expanded, so an unknown entity reference is a syntax error), the five predefined entities and
 * numeric character references (decimal and hexadecimal) in text and attribute values, attribute
 * value whitespace normalisation, end-of-line normalisation (CR LF and lone CR become LF), and
 * well-formedness: matching end tags, one root element, no text outside it, no duplicate
 * attributes, no unterminated markup at the end of the input. Namespaces are not resolved; element
 * and attribute names are reported as written (with their prefix).
 *
 * Why not fast-xml-parser: its XMLParser accepts mismatched and unclosed tags without error, does
 * not decode numeric character references unless the deprecated `htmlEntities` option is set, and
 * its validator (`XMLValidator`, the `parse(xml, true)` overload) and `XMLBuilder` are deprecated in
 * 5.x, which the root lint's `no-deprecated` rule forbids using; so the malformed corpus could not
 * be rejected and attribute values written by the common `escapeXmlAttribute` (`&#10;`) could not
 * be read back.
 */

import { type Column, type GraphSnapshot } from "@graphty/graph-format";

import { type LossNote } from "../types.js";
import { XML_ILLEGAL_CHAR_CODE } from "./codes.js";
import { isNameChar } from "./export.js";

/** The events of the tokenizer; every callback is synchronous. */
export interface XmlHandler {
    /**
     * An element starts (a self-closing element produces start then end).
     * @param name - the element name as written, prefix included
     * @param attrs - the attributes, entities decoded, in document order
     * @param line - the 1-based line of the `<`
     * @param ns - the namespace URI the element's prefix (or the default namespace) is bound to:
     * "" when the element is in no namespace, null when its prefix is undeclared or the name is not
     * namespace-well-formed (a leading or trailing colon, two colons)
     */
    start(name: string, attrs: ReadonlyMap<string, string>, line: number, ns: string | null): void;
    /**
     * An element ends.
     * @param name - the element name
     * @param line - the 1-based line of the end tag (or of the self-closing start tag)
     */
    end(name: string, line: number): void;
    /**
     * Character data between two tags (entities decoded, CDATA included), one call per run;
     * whitespace-only runs are delivered too.
     * @param text - the text
     * @param line - the 1-based line where the run starts
     */
    text(text: string, line: number): void;
    /**
     * A DOCTYPE declaration (optional; its internal subset is never expanded).
     * @param text - the declaration as written, from `<!DOCTYPE` to its `>`
     * @param line - the 1-based line of the `<`
     */
    doctype?(text: string, line: number): void;
}

/** A well-formedness or syntax error, with the line it was found on. */
export class XmlSyntaxError extends Error {
    /** The 1-based line. */
    readonly line: number;

    /**
     * Create the error.
     * @param message - a plain-ASCII message
     * @param line - the 1-based line
     */
    constructor(message: string, line: number) {
        super(message);
        this.name = "XmlSyntaxError";
        this.line = line;
    }
}

/**
 * The input holds no markup at all (empty, whitespace only, a byte order mark only): an importer
 * reports it as E_EMPTY_INPUT rather than as a syntax error.
 */
export class XmlEmptyInputError extends XmlSyntaxError {
    /**
     * Create the error.
     * @param line - the 1-based line where the input ended
     */
    constructor(line: number) {
        super("the input is empty: no root element", line);
        this.name = "XmlEmptyInputError";
    }
}

/**
 * Opt-in repairs of two defects the Cytoscape XGMML writer is known to produce (research note
 * `research-xgmml.md` 3.8 and 5). Each is off unless its callback is given; GEXF and GraphML never
 * pass them, so their documents stay strictly well-formed. The callback is told the line of each
 * repair, so the importer can warn per occurrence.
 */
export interface XmlRepairs {
    /**
     * Read an `&` that is not followed by a `;` within the next 7 characters as `&amp;` (Cytoscape's
     * `cytoscape.xgmml.repair.bare.ampersands` lookahead); an `&name;` that does end in time is
     * still decoded, and still fatal when the entity is unknown. A complete numeric character
     * reference is decoded whatever its length (`&#128512;`), where Cytoscape's byte lookahead
     * would turn it into text.
     */
    readonly bareAmpersand?: ((line: number) => void) | undefined;
    /**
     * Join a high-surrogate character reference immediately followed by a low-surrogate one
     * (`&#xd83d;&#xde00;`, which XML 1.0 forbids but Cytoscape writes for astral characters) into
     * the one character they encode; a lone surrogate stays fatal.
     */
    readonly surrogatePair?: ((line: number) => void) | undefined;
}

/** How far Cytoscape's bare-ampersand repair looks for the `;` that ends an entity reference. */
const BARE_AMPERSAND_LOOKAHEAD = 7;

/** A numeric character reference at the start of a text: `&#123;` or `&#x1F;`. */
const CHAR_REFERENCE = /^&#(?:[xX]([0-9a-fA-F]{1,6})|([0-9]{1,7}));/;

/** A numeric character reference at the end of a text. */
const TRAILING_CHAR_REFERENCE = /&#(?:[xX]([0-9a-fA-F]{1,6})|([0-9]{1,7}));$/;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
    lt: "<",
    gt: ">",
    amp: "&",
    quot: '"',
    apos: "'",
};

const LT = 60;
const GT = 62;
const SLASH = 47;
const EQUALS = 61;
const QUOTE = 34;
const APOS = 39;
const OPEN_BRACKET = 91;
const CLOSE_BRACKET = 93;
const BANG = 33;
const DASH = 45;
const QUESTION = 63;

/** The longest entity reference held back at a chunk boundary (`&#x10FFFF;` is 10 characters). */
const MAX_ENTITY_LENGTH = 16;

/** Markup shorter than this (`<![CDATA[` is 9 characters) cannot be classified yet. */
const MIN_DECIDABLE_MARKUP = 9;

/**
 * Whether a char code is XML whitespace (space, tab, LF, CR).
 * @param c - the char code
 * @returns true for whitespace
 */
function isSpace(c: number): boolean {
    return c === 32 || c === 9 || c === 10 || c === 13;
}

/**
 * Whether a code point may start an XML Name: a NameChar that is not a digit, `-`, `.`, U+00B7,
 * a combining character (U+0300..U+036F) or U+203F / U+2040.
 * @param cp - the code point
 * @returns true for a NameStartChar
 */
function isNameStart(cp: number): boolean {
    if (!isNameChar(cp)) {
        return false;
    }
    if ((cp >= 0x30 && cp <= 0x39) || cp === 0x2d || cp === 0x2e || cp === 0xb7) {
        return false;
    }
    return !(cp >= 0x300 && cp <= 0x36f) && cp !== 0x203f && cp !== 0x2040;
}

/** ASCII code -> whether it is a NameStartChar / NameChar, for the fast path of readName(). */
const ASCII_NAME_START = new Uint8Array(128);
const ASCII_NAME_CHAR = new Uint8Array(128);
for (let c = 0; c < 128; c++) {
    ASCII_NAME_START[c] = isNameStart(c) ? 1 : 0;
    ASCII_NAME_CHAR[c] = isNameChar(c) ? 1 : 0;
}

/**
 * Characters XML 1.0 forbids in a document (the Char production): C0 controls other than tab, LF
 * and CR, U+FFFE / U+FFFF, and lone surrogates (the `u` flag makes the surrogate class match only
 * an unpaired one). Built from char codes so no control character appears in the source.
 */
const ILLEGAL_CHAR = new RegExp(
    `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}` +
        `${String.fromCharCode(14)}-${String.fromCharCode(31)}\\uFFFE\\uFFFF\\uD800-\\uDFFF]`,
    "u",
);

/**
 * Whether a text holds a character XML 1.0 forbids (see ILLEGAL_CHAR); such a character cannot be
 * written even as a character reference, so a conforming parser rejects the whole document.
 * @param text - the text
 * @returns true when the text cannot appear in an XML 1.0 document
 */
export function hasIllegalXmlChar(text: string): boolean {
    return ILLEGAL_CHAR.test(text);
}

/**
 * Where the first character XML 1.0 forbids is in a text.
 * @param text - the text
 * @returns its index, or -1
 */
function illegalCharIndex(text: string): number {
    const match = ILLEGAL_CHAR.exec(text);
    return match === null ? -1 : match.index;
}

/**
 * The loss notes of the texts a snapshot holds that no XML 1.0 document can carry (see
 * hasIllegalXmlChar): one E_XML_ILLEGAL_CHAR note per column (node, edge and graph string / dict /
 * list-of-text columns) and one for the ids, each counting the affected rows; export() throws on
 * the first such text. Shared by the GEXF and GraphML exporters' check().
 * @param snapshot - the snapshot
 * @returns the notes, empty when every text is writable
 */
export function xmlIllegalTextNotes(snapshot: GraphSnapshot): LossNote[] {
    const notes: LossNote[] = [];
    let ids = 0;
    for (let i = 0; i < snapshot.nodeCount; i++) {
        const id = snapshot.ids.idOf(i);
        if (typeof id === "string" && hasIllegalXmlChar(id)) {
            ids++;
        }
    }
    if (ids > 0) {
        notes.push(
            Object.freeze({
                code: XML_ILLEGAL_CHAR_CODE,
                message: `${ids} node id(s) hold a character XML 1.0 cannot carry; export() will throw`,
                column: null,
                count: ids,
            }),
        );
    }
    for (const [domain, table] of [
        ["node", snapshot.nodes],
        ["edge", snapshot.edges],
        ["graph", snapshot.graph],
    ] as const) {
        for (const column of table) {
            const bad = countIllegalRows(column);
            if (bad > 0) {
                notes.push(
                    Object.freeze({
                        code: XML_ILLEGAL_CHAR_CODE,
                        message: `${domain} column "${column.meta.name}": ${bad} value(s) hold a character XML 1.0 cannot carry; export() will throw`,
                        column: column.meta.name,
                        count: bad,
                    }),
                );
            }
        }
    }
    return notes;
}

/**
 * How many set rows of a text column hold an XML-illegal character.
 * @param column - the column
 * @returns the count; 0 for a non-text column
 */
function countIllegalRows(column: Column): number {
    let bad = 0;
    if (column.dtype === "string" || column.dtype === "dict") {
        for (let r = 0; r < column.length; r++) {
            if (column.isSet(r) && hasIllegalXmlChar(column.value(r) as string)) {
                bad++;
            }
        }
    } else if (column.dtype === "list" && (column.meta.itemDtype === "string" || column.meta.itemDtype === "dict")) {
        for (let r = 0; r < column.length; r++) {
            if (
                column.isSet(r) &&
                column.sliceOf(r).some((item) => typeof item === "string" && hasIllegalXmlChar(item))
            ) {
                bad++;
            }
        }
    }
    return bad;
}

/**
 * The encoding pseudo-attribute of an XML declaration at the very start of a document (one
 * anywhere else is a syntax error of the tokenizer).
 */
const XML_DECLARED_ENCODING = /^<\?xml\s[^>]*?\bencoding\s*=\s*["']([A-Za-z][A-Za-z0-9._-]*)["']/;

/**
 * The encoding an XML document declares in its prolog (`<?xml version="1.0" encoding="..."?>`),
 * for the shared byte decoder (common/input.ts).
 * @param head - the start of the document, decoded as windows-1252
 * @returns the declared label, or null when there is no declaration or it names no encoding
 */
export function xmlDeclaredEncoding(head: string): string | null {
    const match = XML_DECLARED_ENCODING.exec(head);
    return match === null ? null : match[1];
}

/**
 * The head of a document as text for an XML format's sniff(): UTF-16 when a byte order mark (or
 * BOM-less UTF-16 `<?`, XML 1.0 Appendix F) says so, else UTF-8, never failing.
 * @param head - the first bytes
 * @returns the text, a leading byte order mark removed
 */
export function sniffXmlText(head: Uint8Array): string {
    let label = "utf-8";
    if ((head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0x3c && head[1] === 0x00 && head[2] === 0x3f)) {
        label = "utf-16le";
    } else if ((head[0] === 0xfe && head[1] === 0xff) || (head[0] === 0x00 && head[1] === 0x3c && head[3] === 0x3f)) {
        label = "utf-16be";
    }
    return new TextDecoder(label, { fatal: false }).decode(head);
}

/**
 * Whether a text is an XML Name.
 * @param text - the text
 * @returns true for a well-formed name
 */
export function isXmlName(text: string): boolean {
    if (text.length === 0) {
        return false;
    }
    let first = true;
    for (const ch of text) {
        const cp = ch.codePointAt(0);
        if (cp === undefined || (first ? !isNameStart(cp) : !isNameChar(cp))) {
            return false;
        }
        first = false;
    }
    return true;
}

/**
 * Whether a code point is a legal XML 1.0 character.
 * @param cp - the code point
 * @returns true when a character reference may produce it
 */
function isXmlChar(cp: number): boolean {
    return (
        cp === 0x9 ||
        cp === 0xa ||
        cp === 0xd ||
        (cp >= 0x20 && cp <= 0xd7ff) ||
        (cp >= 0xe000 && cp <= 0xfffd) ||
        (cp >= 0x10000 && cp <= 0x10ffff)
    );
}

/**
 * Decode the predefined entities and character references of a text.
 * @param raw - the text as written
 * @param line - the line, for errors
 * @param repairs - the opt-in repairs (XGMML only); none by default
 * @returns the decoded text
 */
export function decodeEntities(raw: string, line: number, repairs?: XmlRepairs): string {
    let amp = raw.indexOf("&");
    if (amp < 0) {
        return raw;
    }
    let out = "";
    let start = 0;
    while (amp >= 0) {
        out += raw.slice(start, amp);
        const semi = raw.indexOf(";", amp + 1);
        if (
            repairs?.bareAmpersand !== undefined &&
            (semi < 0 || semi - amp > BARE_AMPERSAND_LOOKAHEAD) &&
            // a well-formed character reference longer than the lookahead (&#128512;) is not bare
            !CHAR_REFERENCE.test(raw.slice(amp, amp + 12))
        ) {
            repairs.bareAmpersand(lineAt(raw, amp, line));
            out += "&";
            start = amp + 1;
            amp = raw.indexOf("&", start);
            continue;
        }
        if (semi < 0) {
            throw new XmlSyntaxError("unterminated entity reference", lineAt(raw, amp, line));
        }
        const name = raw.slice(amp + 1, semi);
        if (name.startsWith("#")) {
            const hex = name.startsWith("#x") || name.startsWith("#X");
            const digits = name.slice(hex ? 2 : 1);
            // XML 1.0 puts no limit on leading zeros (&#x0000000041; is "A")
            const ok = hex ? /^0*[0-9a-fA-F]{1,6}$/.test(digits) : /^0*[0-9]{1,7}$/.test(digits);
            const cp = ok ? Number.parseInt(digits, hex ? 16 : 10) : -1;
            const low = cp >= 0xd800 && cp <= 0xdbff ? lowSurrogateAfter(raw, semi + 1, repairs) : null;
            if (low !== null) {
                repairs?.surrogatePair?.(lineAt(raw, amp, line));
                out += String.fromCharCode(cp, low.unit);
                start = low.end;
                amp = raw.indexOf("&", start);
                continue;
            }
            if (cp < 0 || !isXmlChar(cp)) {
                throw new XmlSyntaxError(`invalid character reference &${name};`, lineAt(raw, amp, line));
            }
            out += String.fromCodePoint(cp);
        } else {
            const value = NAMED_ENTITIES[name];
            if (value === undefined) {
                throw new XmlSyntaxError(`unknown entity &${name};`, lineAt(raw, amp, line));
            }
            out += value;
        }
        start = semi + 1;
        amp = raw.indexOf("&", start);
    }
    return out + raw.slice(start);
}

/**
 * The line of a position inside a text that starts on a known line.
 * @param raw - the text
 * @param at - the position
 * @param line - the line the text starts on
 * @returns the line of the position
 */
function lineAt(raw: string, at: number, line: number): number {
    let n = line;
    for (let i = raw.indexOf("\n"); i >= 0 && i < at; i = raw.indexOf("\n", i + 1)) {
        n++;
    }
    return n;
}

/**
 * The low-surrogate character reference that may follow a high-surrogate one, when the
 * surrogate-pair repair is on.
 * @param raw - the text
 * @param at - where the next reference would start
 * @param repairs - the repairs in force
 * @returns the low surrogate code unit and the index after its reference, or null
 */
function lowSurrogateAfter(
    raw: string,
    at: number,
    repairs: XmlRepairs | undefined,
): { readonly unit: number; readonly end: number } | null {
    if (repairs?.surrogatePair === undefined || raw.charCodeAt(at) !== 38) {
        return null;
    }
    const match = CHAR_REFERENCE.exec(raw.slice(at, at + 12));
    if (match === null) {
        return null;
    }
    const unit = match[1] === undefined ? Number.parseInt(match[2], 10) : Number.parseInt(match[1], 16);
    return unit >= 0xdc00 && unit <= 0xdfff ? { unit, end: at + match[0].length } : null;
}

/**
 * Whether a text is whitespace only.
 * @param text - the text
 * @returns true when every character is XML whitespace (also for an empty text)
 */
export function isWhitespace(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        if (!isSpace(text.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}

/**
 * The local part of a possibly prefixed XML name.
 * @param name - the name as written
 * @returns the text after the last colon, or the name itself
 */
export function localName(name: string): string {
    const colon = name.lastIndexOf(":");
    return colon < 0 ? name : name.slice(colon + 1);
}

/**
 * Tokenize XML text arriving in chunks and deliver events to a handler. Throws XmlSyntaxError on
 * malformed input; any error the handler throws propagates unchanged.
 * @param chunks - the text (already UTF-8 decoded, BOM removed)
 * @param handler - the event sink
 * @param repairs - the opt-in repairs (XGMML only); none by default
 */
export async function tokenizeXml(
    chunks: AsyncIterable<string>,
    handler: XmlHandler,
    repairs?: XmlRepairs,
): Promise<void> {
    const tokenizer = new XmlTokenizer(handler, repairs);
    // XML 1.0 section 2.8: nothing may precede the XML declaration, not even whitespace (template
    // output often adds a line break, and the declared encoding would then go unread)
    let skipped = 0;
    let lines = 1;
    let leading = true;
    try {
        for await (const chunk of chunks) {
            if (leading) {
                const start = chunk.search(/\S/);
                const blank = start < 0 ? chunk : chunk.slice(0, start);
                skipped += blank.length;
                lines += blank.split("\n").length - 1;
                if (start >= 0) {
                    leading = false;
                    if (skipped > 0 && /^<\?xml\s/.test(chunk.slice(start, start + 6))) {
                        throw new XmlSyntaxError(
                            "the XML declaration must be at the very start of the document; whitespace precedes it",
                            lines,
                        );
                    }
                }
            }
            tokenizer.push(chunk);
        }
        tokenizer.finish();
    } catch (err) {
        if (err instanceof XmlSyntaxError && tokenizer.declaresXml11 && !err.message.includes("XML 1.1")) {
            throw new XmlSyntaxError(
                `${err.message}; the document declares XML 1.1, which graph-io does not read (it reads XML 1.0)`,
                err.line,
            );
        }
        throw err;
    }
}

/** The result of parsing one start tag out of the buffer. */
interface StartTag {
    /** The element name. */
    readonly name: string;
    /** The attributes. */
    readonly attrs: Map<string, string>;
    /** Whether the tag ends with `/>`. */
    readonly selfClosing: boolean;
    /** Whether an attribute name starts with `xmlns` (a namespace declaration may be among them). */
    readonly declaresNamespace: boolean;
    /** The buffer index one past the `>`. */
    readonly end: number;
}

/** The kinds of markup whose end may lie in a later chunk. */
type PendingKind = "decl" | "comment" | "cdata" | "pi" | "endtag" | "doctype" | "starttag";

/** The terminator of each fixed-terminator markup kind. */
const TERMINATORS: Readonly<Partial<Record<PendingKind, string>>> = {
    comment: "-->",
    cdata: "]]>",
    pi: "?>",
    endtag: ">",
};

/**
 * An incomplete piece of markup at the end of the input so far: its text pieces (never joined
 * until the end is found, so a token spanning many chunks costs its length once) and the state
 * the terminator scan is in. `tail` holds the last characters of the pieces a fixed terminator
 * could straddle; `quote` is the open quote character (0 outside a value) of a start tag or a
 * DOCTYPE; `depth`, `comment`, `pi` and `run` track a DOCTYPE's internal subset.
 */
interface Pending {
    kind: PendingKind;
    readonly pieces: string[];
    tail: string;
    quote: number;
    depth: number;
    comment: boolean;
    pi: boolean;
    run: number;
}

/** One `xmlns` / `xmlns:prefix` declaration in scope. */
interface NamespaceBinding {
    /** The prefix; "" for the default namespace. */
    readonly prefix: string;
    /** The namespace URI; "" undeclares the default namespace. */
    readonly uri: string;
    /** The element depth that declared it (the stack length before the element was pushed). */
    readonly depth: number;
}

/** The namespace the `xml` prefix is bound to by definition. */
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";

/** The markup declarations a truncated `<!...` at the end of the input may have been cut from. */
const DECLARATION_OPENERS: readonly string[] = ["<!--", "<![CDATA[", "<!DOCTYPE"];

/**
 * The tokenizer state: the unconsumed tail of the input, the current line, the open element
 * stack and the text run being accumulated. `push()` chunks, then `finish()`.
 */
export class XmlTokenizer {
    private readonly handler: XmlHandler;

    /** Unconsumed input that is not part of a pending token: at most a held-back entity or the last chunk. */
    private buffer = "";

    /** The markup whose end has not arrived yet, or null. */
    private pending: Pending | null = null;

    /** The line number at the start of `buffer` (or of the pending markup). */
    private line = 1;

    /**
     * The index of the next line break in `buffer` at or after the last counted position: -2
     * when not yet searched for the current buffer, -1 when the buffer holds no further break.
     */
    private nextBreak = -2;

    /** A CR held back from the end of the previous chunk (it may be the first half of CR LF). */
    private pendingCr = false;

    /** Whether the input has ended (an incomplete token is then an error, not a wait). */
    private final = false;

    /** The text run being accumulated (entities decoded), and the line it started on. */
    private text = "";

    private textLine = 1;

    private readonly stack: string[] = [];

    private rootSeen = false;

    private rootClosed = false;

    /** Whether any markup was consumed (an input with none is empty, not malformed). */
    private markupSeen = false;

    /** Whether nothing has been consumed yet: the XML declaration may only appear here. */
    private atStart = true;

    /** Whether a DOCTYPE declaration was read (one is allowed, in the prolog). */
    private doctypeSeen = false;

    /** The version of the XML declaration, or null. */
    private version: string | null = null;

    /** The last two characters of the character data since the last markup, for the `]]>` check. */
    private textTail = "";

    /** A high surrogate held back from the end of the previous chunk (its low half may start the next). */
    private pendingHigh = "";

    /** The namespace declarations in scope, innermost last. */
    private readonly bindings: NamespaceBinding[] = [];

    private readonly repairs: XmlRepairs | undefined;

    /**
     * Create a tokenizer.
     * @param handler - the event sink
     * @param repairs - the opt-in repairs (XGMML only); none by default
     */
    constructor(handler: XmlHandler, repairs?: XmlRepairs) {
        this.handler = handler;
        this.repairs = repairs;
    }

    /**
     * Whether the document's XML declaration says version 1.1 (read by the XML 1.0 rules all the
     * same; the syntax error of a 1.1-only construct then says why).
     * @returns true after a `<?xml version="1.1"?>` declaration
     */
    get declaresXml11(): boolean {
        return this.version === "1.1";
    }

    /**
     * Feed one chunk and emit every complete token in it.
     * @param chunk - the text
     */
    push(chunk: string): void {
        let text = chunk;
        if (this.pendingHigh.length > 0) {
            text = this.pendingHigh + text;
            this.pendingHigh = "";
        }
        const last = text.charCodeAt(text.length - 1);
        if (last >= 0xd800 && last <= 0xdbff) {
            // a text chunk may end between the two halves of an astral character
            this.pendingHigh = text.slice(-1);
            text = text.slice(0, -1);
        }
        if (this.pendingCr) {
            text = `\r${text}`;
            this.pendingCr = false;
        }
        if (text.endsWith("\r")) {
            this.pendingCr = true;
            text = text.slice(0, -1);
        }
        if (text.includes("\r")) {
            text = text.replace(/\r\n?/g, "\n");
        }
        this.feed(text);
    }

    /** Signal the end of the input: flush the last text run and check well-formedness. */
    finish(): void {
        this.final = true;
        const held = this.pendingHigh;
        this.pendingHigh = "";
        if (this.pendingCr) {
            this.pendingCr = false;
            this.feed(`\n${held}`);
        } else {
            this.feed(held);
        }
        if (this.pending !== null || this.buffer.length > 0) {
            throw new XmlSyntaxError("unexpected end of input inside markup", this.line);
        }
        this.flushText();
        if (this.stack.length > 0) {
            throw new XmlSyntaxError(`unclosed element <${this.stack[this.stack.length - 1]}>`, this.line);
        }
        if (!this.rootSeen) {
            if (!this.markupSeen) {
                throw new XmlEmptyInputError(this.line);
            }
            throw new XmlSyntaxError("no root element", this.line);
        }
    }

    /**
     * Append normalised text: continue a pending token's terminator scan over the new text alone,
     * and once the token is complete (or when none is pending) scan the buffer for tokens.
     * @param text - the text, line breaks normalised
     */
    private feed(text: string): void {
        const { pending } = this;
        if (pending === null) {
            this.buffer = this.buffer.length === 0 ? text : this.buffer + text;
            this.nextBreak = -2;
            this.scan();
            return;
        }
        if (pending.kind === "decl") {
            // fewer than MIN_DECIDABLE_MARKUP characters of markup: the kind is decided once enough arrived
            this.pending = null;
            this.buffer = pending.pieces.join("") + text;
            this.nextBreak = -2;
            this.scan();
            return;
        }
        const end = this.scanPending(pending, text);
        if (end < 0) {
            if (text.length > 0) {
                pending.pieces.push(text);
            }
            if (this.final) {
                throw new XmlSyntaxError("unexpected end of input inside markup", this.line);
            }
            return;
        }
        this.pending = null;
        pending.pieces.push(text.slice(0, end));
        this.buffer = pending.pieces.join("") + text.slice(end);
        this.nextBreak = -2;
        this.scan();
    }

    /**
     * Continue the terminator scan of a pending token over new text.
     * @param pending - the pending token
     * @param text - the new text
     * @returns the index in `text` one past the token's end, or -1 when it does not end there
     */
    private scanPending(pending: Pending, text: string): number {
        switch (pending.kind) {
            case "starttag":
                return this.scanStartTag(pending, text, 0);
            case "doctype":
                return this.scanDoctype(pending, text, 0);
            case "decl":
                return -1;
            default: {
                const terminator = TERMINATORS[pending.kind] ?? ">";
                const probe = pending.tail + text;
                const at = probe.indexOf(terminator);
                if (at < 0) {
                    pending.tail = probe.slice(Math.max(0, probe.length - (terminator.length - 1)));
                    return -1;
                }
                return at + terminator.length - pending.tail.length;
            }
        }
    }

    /**
     * Scan text for the `>` that ends a start tag, skipping quoted attribute values (the quote
     * state survives between calls).
     * @param pending - the pending token
     * @param text - the text
     * @param from - where to start
     * @returns the index one past the `>`, or -1
     */
    private scanStartTag(pending: Pending, text: string, from: number): number {
        let { quote } = pending;
        const n = text.length;
        let i = from;
        while (i < n) {
            if (quote !== 0) {
                // inside an attribute value: jump to its closing quote
                const close = text.indexOf(String.fromCharCode(quote), i);
                if (close < 0) {
                    break;
                }
                quote = 0;
                i = close + 1;
                continue;
            }
            const c = text.charCodeAt(i);
            if (c === QUOTE || c === APOS) {
                quote = c;
            } else if (c === GT) {
                pending.quote = 0;
                return i + 1;
            }
            i++;
        }
        pending.quote = quote;
        return -1;
    }

    /**
     * Scan text for the `>` that ends a DOCTYPE declaration, skipping a bracketed internal subset,
     * quoted literals and comments inside the subset. A character state machine, so the state
     * (`depth`, `quote`, `comment`, and `run`, the progress through a `<!--` or the dashes before
     * a `-->`) survives between calls and nothing is re-read.
     * @param pending - the pending token
     * @param text - the text
     * @param from - where to start
     * @returns the index one past the `>`, or -1
     */
    private scanDoctype(pending: Pending, text: string, from: number): number {
        let { quote, depth, comment, pi, run } = pending;
        for (let i = from; i < text.length; i++) {
            const c = text.charCodeAt(i);
            if (pi) {
                // a processing instruction in the subset ends at `?>`; quotes inside it are text
                if (c === GT && run === 1) {
                    pi = false;
                    run = 0;
                } else {
                    run = c === QUESTION ? 1 : 0;
                }
                continue;
            }
            if (comment) {
                if (c === DASH) {
                    run++;
                } else if (c === GT && run >= 2) {
                    comment = false;
                    run = 0;
                } else {
                    run = 0;
                }
                continue;
            }
            if (quote !== 0) {
                if (c === quote) {
                    quote = 0;
                }
                continue;
            }
            if (depth > 0) {
                if (run === 1 && c === BANG) {
                    run = 2;
                    continue;
                }
                if (run === 2 && c === DASH) {
                    run = 3;
                    continue;
                }
                if (run === 3 && c === DASH) {
                    comment = true;
                    run = 0;
                    continue;
                }
                if (run === 1 && c === QUESTION) {
                    pi = true;
                    run = 0;
                    continue;
                }
                run = 0;
                if (c === LT) {
                    run = 1;
                    continue;
                }
            }
            if (c === QUOTE || c === APOS) {
                quote = c;
            } else if (c === OPEN_BRACKET) {
                depth++;
            } else if (c === CLOSE_BRACKET) {
                depth--;
            } else if (c === GT && depth <= 0) {
                pending.quote = 0;
                pending.depth = 0;
                pending.comment = false;
                pending.pi = false;
                pending.run = 0;
                return i + 1;
            }
        }
        pending.quote = quote;
        pending.depth = depth;
        pending.comment = comment;
        pending.pi = pi;
        pending.run = run;
        return -1;
    }

    /**
     * Consume every complete token at the front of the buffer; an incomplete token at its end
     * becomes the pending token (its text moved out of the buffer), a possibly split entity
     * reference is held back in the buffer.
     */
    private scan(): void {
        const { buffer } = this;
        const { length } = buffer;
        let pos = 0;
        let incomplete = false;
        for (;;) {
            const lt = buffer.indexOf("<", pos);
            if (lt < 0) {
                let end = length;
                if (!this.final) {
                    // an entity reference may be split across chunks: hold back from its "&"
                    const amp = buffer.lastIndexOf("&");
                    if (
                        amp >= pos &&
                        buffer.indexOf(";", amp) < 0 &&
                        // ponytail: a zero-padded reference longer than MAX_ENTITY_LENGTH is held back
                        // whole, so an absurdly long run of zeros is re-scanned once per chunk
                        (amp >= length - MAX_ENTITY_LENGTH || /^&#[xX]?0[\da-fA-F]*$/.test(buffer.slice(amp)))
                    ) {
                        end = amp;
                    }
                    if (this.repairs?.surrogatePair !== undefined) {
                        end = this.holdHighSurrogate(pos, end);
                    }
                }
                this.takeText(pos, end);
                pos = end;
                break;
            }
            if (lt > pos) {
                this.takeText(pos, lt);
                pos = lt;
            }
            const next = this.consumeMarkup(pos);
            if (next < 0) {
                incomplete = true;
                break;
            }
            pos = next;
        }
        if (incomplete) {
            this.pending = this.startPending(buffer, pos);
            this.buffer = "";
        } else {
            this.buffer = pos === 0 ? buffer : buffer.slice(pos);
        }
        this.nextBreak = -2;
    }

    /**
     * Turn the incomplete markup at `pos` into a pending token, running the terminator scan over
     * the part already in the buffer so later chunks are scanned alone.
     * @param buffer - the buffer
     * @param pos - the index of the `<`
     * @returns the pending token
     */
    private startPending(buffer: string, pos: number): Pending {
        const piece = pos === 0 ? buffer : buffer.slice(pos);
        const pending: Pending = {
            kind: "starttag",
            pieces: [piece],
            tail: "",
            quote: 0,
            depth: 0,
            comment: false,
            pi: false,
            run: 0,
        };
        if (piece.length < MIN_DECIDABLE_MARKUP) {
            // too short to tell a comment from a start tag: wait for more before choosing a scan
            pending.kind = "decl";
            return pending;
        }
        if (piece.startsWith("<!--")) {
            pending.kind = "comment";
        } else if (piece.startsWith("<![CDATA[")) {
            pending.kind = "cdata";
        } else if (piece.startsWith("<!DOCTYPE")) {
            pending.kind = "doctype";
        } else if (piece.startsWith("<!")) {
            pending.kind = "decl";
            return pending;
        } else if (piece.startsWith("<?")) {
            pending.kind = "pi";
        } else if (piece.startsWith("</")) {
            pending.kind = "endtag";
        }
        // the part in the buffer holds no terminator (consumeMarkup said so); record the scan state
        switch (pending.kind) {
            case "starttag":
                this.scanStartTag(pending, piece, 1);
                break;
            case "doctype":
                this.scanDoctype(pending, piece, 9);
                break;
            default: {
                const terminator = TERMINATORS[pending.kind] ?? ">";
                pending.tail = piece.slice(Math.max(0, piece.length - (terminator.length - 1)));
                break;
            }
        }
        return pending;
    }

    /**
     * Consume the markup starting at `pos` (a `<`).
     * @param pos - the index of the `<`
     * @returns the index after the markup, or -1 when the buffer ends before the markup does
     */
    private consumeMarkup(pos: number): number {
        const end = this.markupEnd(pos);
        if (end >= 0) {
            this.markupSeen = true;
            this.atStart = false;
            // markup ends a run of character data: a `]]>` cannot straddle it
            this.textTail = "";
        }
        return end;
    }

    /**
     * Read the markup starting at `pos` (a `<`) and deliver what it means.
     * @param pos - the index of the `<`
     * @returns the index after the markup, or -1 when the buffer ends before the markup does
     */
    private markupEnd(pos: number): number {
        const { buffer } = this;
        if (buffer.startsWith("<!", pos)) {
            return this.declarationEnd(pos);
        }
        if (buffer.startsWith("<?", pos)) {
            const end = buffer.indexOf("?>", pos + 2);
            if (end < 0) {
                return -1;
            }
            this.processingInstruction(pos, end);
            this.advanceLine(pos, end + 2);
            return end + 2;
        }
        if (buffer.startsWith("</", pos)) {
            const end = buffer.indexOf(">", pos + 2);
            if (end < 0) {
                return -1;
            }
            // whitespace may follow the name, never precede it
            const name = buffer.slice(pos + 2, end).trimEnd();
            if (!isXmlName(name)) {
                throw new XmlSyntaxError(`malformed end tag </${name}>`, this.line);
            }
            this.flushText();
            this.endElement(name);
            this.advanceLine(pos, end + 1);
            return end + 1;
        }
        const tag = this.parseStartTag(pos);
        if (tag === null) {
            return -1;
        }
        this.flushText();
        this.startElement(tag.name, tag.attrs, tag.declaresNamespace);
        if (tag.selfClosing) {
            this.endElement(tag.name);
        }
        this.advanceLine(pos, tag.end);
        return tag.end;
    }

    /**
     * Read the `<!...>` markup at `pos`: a comment, a CDATA section or the DOCTYPE.
     * @param pos - the index of the `<`
     * @returns the index after the markup, or -1 when the buffer ends before the markup does
     */
    private declarationEnd(pos: number): number {
        const { buffer } = this;
        if (buffer.length - pos < MIN_DECIDABLE_MARKUP) {
            // "<![CDATA[" is 9 characters; wait until the kind of declaration is decidable, and at
            // the end of the input read the start of one cut short as a truncation
            const head = buffer.slice(pos);
            if (!this.final || DECLARATION_OPENERS.some((opener) => opener.startsWith(head))) {
                return -1;
            }
        }
        if (buffer.startsWith("<!--", pos)) {
            const end = buffer.indexOf("-->", pos + 4);
            if (end < 0) {
                return -1;
            }
            // a "--" inside, which XML 1.0 forbids, is accepted: the comment carries no data
            this.advanceLine(pos, end + 3);
            return end + 3;
        }
        if (buffer.startsWith("<![CDATA[", pos)) {
            const end = buffer.indexOf("]]>", pos + 9);
            if (end < 0) {
                return -1;
            }
            if (this.text.length === 0) {
                this.textLine = this.line;
            }
            const cdata = buffer.slice(pos + 9, end);
            const bad = illegalCharIndex(cdata);
            if (bad >= 0) {
                throw new XmlSyntaxError(
                    "a character XML 1.0 forbids appears in a CDATA section",
                    this.lineIn(pos, pos + 9 + bad),
                );
            }
            this.text += cdata;
            this.advanceLine(pos, end + 3);
            return end + 3;
        }
        if (!buffer.startsWith("<!DOCTYPE", pos)) {
            if (buffer.slice(pos + 2, pos + 9).toUpperCase() === "DOCTYPE") {
                throw new XmlSyntaxError(
                    `<!${buffer.slice(pos + 2, pos + 9)}> is not XML (it must be written <!DOCTYPE>); the input looks like an HTML document`,
                    this.line,
                );
            }
            throw new XmlSyntaxError("unexpected markup declaration", this.line);
        }
        if (this.rootSeen || this.doctypeSeen) {
            throw new XmlSyntaxError("a DOCTYPE declaration is allowed once, before the root element", this.line);
        }
        const state: Pending = {
            kind: "doctype",
            pieces: [],
            tail: "",
            quote: 0,
            depth: 0,
            comment: false,
            pi: false,
            run: 0,
        };
        const end = this.scanDoctype(state, buffer, pos + 9);
        if (end < 0) {
            return -1;
        }
        this.doctypeSeen = true;
        this.handler.doctype?.(buffer.slice(pos, end), this.line);
        this.advanceLine(pos, end);
        return end;
    }

    /**
     * Check a processing instruction `<?target ...?>` (skipped otherwise): its target must be a
     * name, and the reserved target `xml` is the XML declaration, allowed only at the very start
     * of the document with a 1.x version.
     * @param pos - the index of the `<`
     * @param end - the index of the `?>`
     */
    private processingInstruction(pos: number, end: number): void {
        const body = this.buffer.slice(pos + 2, end);
        const target = /^[^\s]*/.exec(body)?.[0] ?? "";
        if (!isXmlName(target)) {
            throw new XmlSyntaxError(`a processing instruction needs a target name, not "${target}"`, this.line);
        }
        if (target.toLowerCase() !== "xml") {
            return;
        }
        if (target !== "xml") {
            throw new XmlSyntaxError(
                `<?${target} is not an XML declaration (which is written <?xml in lower case); the target is reserved`,
                this.line,
            );
        }
        if (!this.atStart || pos !== 0) {
            throw new XmlSyntaxError(
                "an XML declaration (<?xml ...?>) may appear only at the very start of the document; the target xml is reserved",
                this.line,
            );
        }
        const version = /\bversion\s*=\s*(["'])([^"']*)\1/.exec(body)?.[2];
        if (version === undefined) {
            throw new XmlSyntaxError("the XML declaration has no version", this.line);
        }
        if (!/^1\.[0-9]+$/.test(version)) {
            throw new XmlSyntaxError(`XML version ${version} is not supported (only 1.x)`, this.line);
        }
        this.version = version;
    }

    /**
     * The line of a buffer position after `start`, the position the current line count refers to.
     * Used on the error path only.
     * @param start - a position on line `this.line`
     * @param at - the position
     * @returns its line
     */
    private lineIn(start: number, at: number): number {
        return lineAt(this.buffer.slice(start, at), at - start, this.line);
    }

    /**
     * Decode the entities of a text, naming XML 1.1 when a character reference XML 1.0 forbids
     * appears in a document that declares version 1.1.
     * @param raw - the text as written
     * @param line - the line the text starts on
     * @returns the decoded text
     */
    private decode(raw: string, line: number): string {
        try {
            return decodeEntities(raw, line, this.repairs);
        } catch (err) {
            if (err instanceof XmlSyntaxError && this.version !== null && this.version !== "1.0") {
                throw new XmlSyntaxError(
                    `${err.message} (the document declares XML ${this.version}, whose character rules are not supported; it is read as XML 1.0)`,
                    err.line,
                );
            }
            throw err;
        }
    }

    /**
     * Parse a start tag at `pos`.
     * @param pos - the index of the `<`
     * @returns the tag, or null when the buffer ends inside it
     */
    private parseStartTag(pos: number): StartTag | null {
        const { buffer } = this;
        const { length } = buffer;
        let i = pos + 1;
        const nameEnd = this.readName(i);
        if (nameEnd < 0) {
            return null;
        }
        if (nameEnd === i) {
            throw new XmlSyntaxError("expected an element name after <", this.line);
        }
        const name = buffer.slice(i, nameEnd);
        i = nameEnd;
        const attrs = new Map<string, string>();
        let declaresNamespace = false;
        for (;;) {
            const before = i;
            while (i < length && isSpace(buffer.charCodeAt(i))) {
                i++;
            }
            if (i >= length) {
                return null;
            }
            const c = buffer.charCodeAt(i);
            if (c === GT) {
                return { name, attrs, selfClosing: false, declaresNamespace, end: i + 1 };
            }
            if (c === SLASH) {
                if (i + 1 >= length) {
                    return null;
                }
                if (buffer.charCodeAt(i + 1) !== GT) {
                    throw new XmlSyntaxError(`unexpected "/" in <${name}>`, this.lineIn(pos, i));
                }
                return { name, attrs, selfClosing: true, declaresNamespace, end: i + 2 };
            }
            if (i === before) {
                // the name, or the previous value's closing quote, runs into the next attribute
                throw new XmlSyntaxError(
                    `the attributes of <${name}> must be separated by whitespace`,
                    this.lineIn(pos, i),
                );
            }
            const attrEnd = this.readName(i);
            if (attrEnd < 0) {
                return null;
            }
            if (attrEnd === i) {
                throw new XmlSyntaxError(`malformed attribute in <${name}>`, this.lineIn(pos, i));
            }
            const attrName = buffer.slice(i, attrEnd);
            i = attrEnd;
            while (i < length && isSpace(buffer.charCodeAt(i))) {
                i++;
            }
            if (i >= length) {
                return null;
            }
            if (buffer.charCodeAt(i) !== EQUALS) {
                throw new XmlSyntaxError(`attribute ${attrName} of <${name}> has no value`, this.lineIn(pos, i));
            }
            i++;
            while (i < length && isSpace(buffer.charCodeAt(i))) {
                i++;
            }
            if (i >= length) {
                return null;
            }
            const quote = buffer.charCodeAt(i);
            if (quote !== QUOTE && quote !== APOS) {
                throw new XmlSyntaxError(`attribute ${attrName} of <${name}> is not quoted`, this.lineIn(pos, i));
            }
            const close = buffer.indexOf(quote === QUOTE ? '"' : "'", i + 1);
            if (close < 0) {
                return null;
            }
            const line = this.lineIn(pos, i);
            if (attrs.has(attrName)) {
                throw new XmlSyntaxError(`duplicate attribute ${attrName} in <${name}>`, line);
            }
            const raw = buffer.slice(i + 1, close);
            if (hasIllegalXmlChar(raw)) {
                throw new XmlSyntaxError(
                    `a character XML 1.0 forbids appears in attribute ${attrName} of <${name}>`,
                    line,
                );
            }
            if (raw.includes("<")) {
                throw new XmlSyntaxError(`a "<" in the value of attribute ${attrName} of <${name}> (write &lt;)`, line);
            }
            if (attrName.startsWith("xmlns")) {
                declaresNamespace = true;
            }
            attrs.set(attrName, this.decode(normalizeAttributeValue(raw), line));
            i = close + 1;
        }
    }

    /**
     * The end of the XML Name starting at `i` (an ASCII table for the common case, the code point
     * classes beyond it).
     * @param i - the start index
     * @returns the index after the name; `i` when no name starts there; -1 when the name may
     * continue past the end of the buffer
     */
    private readName(i: number): number {
        const { buffer } = this;
        const { length } = buffer;
        let j = i;
        while (j < length) {
            const c = buffer.charCodeAt(j);
            if (c < 0x80) {
                if ((j === i ? ASCII_NAME_START[c] : ASCII_NAME_CHAR[c]) === 0) {
                    break;
                }
                j++;
                continue;
            }
            const cp = buffer.codePointAt(j);
            if (cp === undefined || (j === i ? !isNameStart(cp) : !isNameChar(cp))) {
                break;
            }
            j += cp > 0xffff ? 2 : 1;
        }
        return j >= length && !this.final ? -1 : j;
    }

    /**
     * Under the surrogate-pair repair, hold back a high-surrogate character reference that ends
     * the text taken so far, so it is decoded together with the low one the next chunk may start with.
     * @param pos - the start of the text
     * @param end - the end of the text that would be taken
     * @returns the end to take up to
     */
    private holdHighSurrogate(pos: number, end: number): number {
        const tail = this.buffer.slice(Math.max(pos, end - 12), end);
        const match = TRAILING_CHAR_REFERENCE.exec(tail);
        if (match === null) {
            return end;
        }
        const unit = match[1] === undefined ? Number.parseInt(match[2], 10) : Number.parseInt(match[1], 16);
        return unit >= 0xd800 && unit <= 0xdbff ? end - match[0].length : end;
    }

    /**
     * Move text from the buffer into the current run.
     * @param start - the start index
     * @param end - the end index (exclusive)
     */
    private takeText(start: number, end: number): void {
        if (end <= start) {
            return;
        }
        if (this.text.length === 0) {
            this.textLine = this.line;
        }
        const raw = this.buffer.slice(start, end);
        const bad = illegalCharIndex(raw);
        if (bad >= 0) {
            throw new XmlSyntaxError(
                "a character XML 1.0 forbids appears in character data",
                lineAt(raw, bad, this.line),
            );
        }
        if (raw.includes(">")) {
            const probe = this.textTail + raw;
            const close = probe.indexOf("]]>");
            if (close >= 0) {
                throw new XmlSyntaxError(
                    '"]]>" is not allowed in character data (write ]]&gt;)',
                    lineAt(raw, Math.max(0, close - this.textTail.length), this.line),
                );
            }
        }
        this.textTail = raw.length >= 2 ? raw.slice(-2) : (this.textTail + raw).slice(-2);
        this.atStart = false;
        this.text += this.decode(raw, this.line);
        this.advanceLine(start, end);
    }

    /**
     * Count the newlines of a consumed range. Ranges are consumed in order, so the next line break
     * is searched for once per buffer and re-searched only after it was passed; a buffer without
     * a further break is searched once and remembered as such.
     * @param start - the start index
     * @param end - the end index (exclusive)
     */
    private advanceLine(start: number, end: number): void {
        let i = this.nextBreak;
        if (i === -1) {
            return;
        }
        if (i === -2 || i < start) {
            i = this.buffer.indexOf("\n", start);
        }
        while (i >= 0 && i < end) {
            this.line++;
            i = this.buffer.indexOf("\n", i + 1);
        }
        this.nextBreak = i;
    }

    /** Deliver the accumulated text run, if any. */
    private flushText(): void {
        if (this.text.length === 0) {
            return;
        }
        const { text } = this;
        this.text = "";
        if (this.stack.length === 0) {
            if (!isWhitespace(text)) {
                throw new XmlSyntaxError("text outside the root element", this.textLine);
            }
            return;
        }
        this.handler.text(text, this.textLine);
    }

    /**
     * Open an element.
     * @param name - the element name
     * @param attrs - its attributes
     * @param declaresNamespace - whether an attribute name starts with `xmlns`
     */
    private startElement(name: string, attrs: Map<string, string>, declaresNamespace: boolean): void {
        if (this.stack.length === 0) {
            if (this.rootClosed) {
                throw new XmlSyntaxError(`a second root element <${name}> follows the document element`, this.line);
            }
            this.rootSeen = true;
        }
        if (declaresNamespace) {
            for (const [key, uri] of attrs) {
                if (key === "xmlns") {
                    this.bindings.push({ prefix: "", uri, depth: this.stack.length });
                } else if (key.startsWith("xmlns:")) {
                    this.bindings.push({ prefix: key.slice(6), uri, depth: this.stack.length });
                }
            }
        }
        this.stack.push(name);
        this.handler.start(name, attrs, this.line, this.namespaceOf(name));
    }

    /**
     * The namespace an element name is in (Namespaces in XML 1.0 section 6).
     * @param name - the element name as written
     * @returns the URI; "" for no namespace; null for an undeclared prefix or a name that is not
     * namespace-well-formed
     */
    private namespaceOf(name: string): string | null {
        const colon = name.indexOf(":");
        if (colon >= 0 && (colon === 0 || colon === name.length - 1 || name.indexOf(":", colon + 1) >= 0)) {
            return null;
        }
        const prefix = colon < 0 ? "" : name.slice(0, colon);
        for (let i = this.bindings.length - 1; i >= 0; i--) {
            if (this.bindings[i].prefix === prefix) {
                return this.bindings[i].uri;
            }
        }
        if (prefix === "xml") {
            return XML_NAMESPACE;
        }
        return prefix === "" ? "" : null;
    }

    /**
     * Close an element, checking that it matches the innermost open one.
     * @param name - the element name
     */
    private endElement(name: string): void {
        const open = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
        if (open === null) {
            throw new XmlSyntaxError(`unexpected end tag </${name}>`, this.line);
        }
        if (open !== name) {
            throw new XmlSyntaxError(`end tag </${name}> does not match <${open}>`, this.line);
        }
        this.stack.pop();
        while (this.bindings.length > 0 && this.bindings[this.bindings.length - 1].depth >= this.stack.length) {
            this.bindings.pop();
        }
        if (this.stack.length === 0) {
            this.rootClosed = true;
        }
        this.handler.end(name, this.line);
    }
}

/**
 * Attribute value normalisation (XML 1.0 section 3.3.3): a literal tab or line break becomes a
 * space; a character reference to one is kept, which is why this runs before entity decoding.
 * @param raw - the value between the quotes
 * @returns the normalised value
 */
function normalizeAttributeValue(raw: string): string {
    return raw.includes("\n") || raw.includes("\t") ? raw.replace(/[\n\t]/g, " ") : raw;
}
