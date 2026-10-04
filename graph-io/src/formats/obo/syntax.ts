/**
 * The lexical layer of the OBO importer (research-obo.md section 4.1): the tag-value line, the
 * hidden `!` comment, the trailing `{name="value", ...}` qualifier block, the escapes of the OBO
 * guides, quoted strings and bracketed xref lists. Pure functions over one logical line; the
 * importer joins backslash continuations and splits form feeds before calling them.
 *
 * Every function works on the RAW text (escapes still in place) and unescapes only the pieces it
 * hands back, so an escaped quote, colon, comma, brace or `!` never ends a construct.
 */

/** The OBO escapes with a meaning of their own; any other `\x` is `x` (the guides). */
const ESCAPES: Readonly<Record<string, string>> = Object.freeze({
    n: "\n",
    t: "\t",
    // the guides read `\W` as a space; the 1.4 BNF (and fastobo) as the letter W (design 4.1)
    W: " ",
});

/**
 * Remove the OBO escapes: `\n` newline, `\t` tab, `\W` space, any other `\x` the character x; a
 * backslash at the very end is dropped.
 * @param text - raw text
 * @returns the unescaped text
 */
export function unescapeObo(text: string): string {
    if (!text.includes("\\")) {
        return text;
    }
    let out = "";
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch !== "\\") {
            out += ch;
            continue;
        }
        i++;
        if (i < text.length) {
            const next = text[i];
            out += ESCAPES[next] ?? next;
        }
    }
    return out;
}

/**
 * Whether the character at `index` is escaped (preceded by an odd run of backslashes).
 * @param text - the text
 * @param index - the character's index
 * @returns true when escaped
 */
function isEscaped(text: string, index: number): boolean {
    let run = 0;
    for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) {
        run++;
    }
    return run % 2 === 1;
}

/**
 * Split a line at the form feeds outside quotes (the 1.4 grammar counts a form feed as a line end;
 * one inside a quoted value is text).
 * @param line - the raw line
 * @returns the pieces, the line itself when it holds no such form feed
 */
export function splitFormFeeds(line: string): string[] {
    if (!line.includes("\f")) {
        return [line];
    }
    const pieces: string[] = [];
    let quoted = false;
    let start = 0;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "\\") {
            i++;
        } else if (ch === '"') {
            quoted = !quoted;
        } else if (ch === "\f" && !quoted) {
            pieces.push(line.slice(start, i));
            start = i + 1;
        }
    }
    pieces.push(line.slice(start));
    return pieces;
}

/**
 * Whether a raw line ends with an unescaped backslash (the 1.0 / 1.2 line continuation).
 * @param line - the raw line, trailing whitespace included
 * @returns true when the line continues on the next one
 */
export function endsWithContinuation(line: string): boolean {
    return line.endsWith("\\") && !isEscaped(line, line.length - 1);
}

/** A tag-value line split at its first unescaped colon. */
interface TagValue {
    /** The tag, unescaped and trimmed. */
    readonly tag: string;
    /** The raw text after the colon, leading whitespace removed. */
    readonly rest: string;
}

/**
 * Split a line at its first unescaped colon (values contain colons freely: `is_a: GO:0000001`).
 * @param line - the raw line, trimmed
 * @returns the tag and the rest, or null when the line has no colon
 */
export function splitTagValue(line: string): TagValue | null {
    for (let i = 0; i < line.length; i++) {
        if (line[i] === "\\") {
            i++;
            continue;
        }
        if (line[i] === ":") {
            return { tag: unescapeObo(line.slice(0, i).trim()), rest: line.slice(i + 1).trimStart() };
        }
    }
    return null;
}

/**
 * Strip the hidden comment: an unescaped `!` outside quotes that starts the value or follows
 * whitespace begins a comment running to the end of the line. A `!` glued to the text before it
 * (`#!/`, `Hello!`) is text, so URLs and names are never cut. A quote opens a string only where a
 * token starts, as tokenize() reads it, so the `"` of an unquoted `5" pipe` is text and does not
 * hide the comment after it.
 * @param rest - the raw value
 * @returns the value before the comment, trailing whitespace removed
 */
export function stripComment(rest: string): string {
    let quoted = false;
    for (let i = 0; i < rest.length; i++) {
        const ch = rest[i];
        if (ch === "\\") {
            i++;
            continue;
        }
        const atStart = i === 0 || rest[i - 1] === " " || rest[i - 1] === "\t";
        if (ch === '"' && (quoted || atStart)) {
            quoted = !quoted;
        } else if (ch === "!" && !quoted && atStart) {
            return rest.slice(0, i).trimEnd();
        }
    }
    return rest.trimEnd();
}

/** The qualifiers of a clause: name to value (a list when a name repeats). */
export type Qualifiers = Record<string, string | string[]>;

/** A value with its trailing qualifier blocks split off. */
interface QualifiedValue {
    /** The raw value without the blocks, trimmed. */
    readonly value: string;
    /** The qualifiers, or null when the value has none. */
    readonly qualifiers: Qualifiers | null;
    /** A block that closes the value but does not parse, kept in `value` as text. */
    readonly badBlock: string | null;
}

/**
 * Split the trailing qualifier blocks off a value: a `{...}` is a block only when it closes the
 * value (after the comment was stripped); several blocks (`{a="1"}{b="2"}`, 1.2 examples) are
 * merged. A closing brace whose block does not parse is left in the value and reported. The value
 * is scanned once, so a value of many blocks costs its length, not its length times its blocks.
 * @param value - the raw value without its comment
 * @returns the value and its qualifiers
 */
export function splitQualifiers(value: string): QualifiedValue {
    if (!value.endsWith("}")) {
        return { value, qualifiers: null, badBlock: null };
    }
    const blocks = braceBlocks(value);
    // the blocks read right to left, merged left to right below
    const parsed: Qualifiers[] = [];
    let end = value.length;
    let badBlock: string | null = null;
    while (end > 0 && value[end - 1] === "}" && !isEscaped(value, end - 1)) {
        const open = blocks.get(end - 1) ?? -1;
        const block = open < 0 ? null : parseQualifiers(value.slice(open + 1, end - 1));
        if (block === null) {
            badBlock = value.slice(open < 0 ? 0 : open, end);
            break;
        }
        parsed.push(block);
        end = open;
        while (end > 0 && /\s/.test(value[end - 1])) {
            end--;
        }
    }
    let qualifiers: Qualifiers | null = null;
    for (let i = parsed.length - 1; i >= 0; i--) {
        qualifiers ??= Object.create(null) as Qualifiers;
        for (const [name, v] of Object.entries(parsed[i])) {
            addQualifier(qualifiers, name, v);
        }
    }
    return { value: value.slice(0, end), qualifiers, badBlock };
}

/**
 * The qualifier blocks of a value in one scan: for every unescaped `}` outside quotes, the index of
 * the unescaped `{` outside quotes that opens it (-1 when a `}` came after that `{`, or none did).
 * @param value - a raw value
 * @returns the opening index by closing index
 */
function braceBlocks(value: string): Map<number, number> {
    const blocks = new Map<number, number>();
    let quoted = false;
    let open = -1;
    for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (ch === "\\") {
            i++;
            continue;
        }
        if (ch === '"') {
            quoted = !quoted;
        } else if (!quoted && ch === "{") {
            open = i;
        } else if (!quoted && ch === "}") {
            blocks.set(i, open);
            open = -1;
        }
    }
    return blocks;
}

/**
 * The index of an unescaped `{` outside quotes that no `}` closes: a qualifier block cut short (a
 * file truncated inside it).
 * @param value - a raw value, closing blocks already split off
 * @returns the index, or -1 when every brace is closed
 */
export function unclosedBlock(value: string): number {
    let quoted = false;
    let open = -1;
    for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (ch === "\\") {
            i++;
            continue;
        }
        if (ch === '"' && open < 0) {
            quoted = !quoted;
        } else if (!quoted && ch === "{") {
            open = i;
        } else if (!quoted && ch === "}") {
            open = -1;
        }
    }
    return open;
}

/**
 * Add one qualifier, turning a repeated name into a list (a list the record owns, appended to in
 * place). The record must have a null prototype, so a name such as `__proto__` is an own key.
 * @param record - the record
 * @param name - the name
 * @param value - the value (or values)
 */
function addQualifier(record: Qualifiers, name: string, value: string | string[]): void {
    const values = Array.isArray(value) ? value : [value];
    if (!Object.prototype.hasOwnProperty.call(record, name)) {
        record[name] = Array.isArray(value) ? [...value] : value;
        return;
    }
    const before = record[name];
    if (Array.isArray(before)) {
        for (const v of values) {
            before.push(v);
        }
    } else {
        record[name] = [before, ...values];
    }
}

/**
 * Parse the inside of a qualifier block: `name="value"` pairs separated by commas, the 1.2
 * unquoted form (`source=PMID:1`) and missing spaces accepted. A name is everything up to `=`
 * (qualifier names may be IRIs with colons).
 * @param inner - the text between the braces
 * @returns the qualifiers, or null when the block does not parse (a pair without `=`, an unclosed quote)
 */
export function parseQualifiers(inner: string): Qualifiers | null {
    const out: Qualifiers = Object.create(null) as Qualifiers;
    let i = 0;
    const n = inner.length;
    let any = false;
    while (i < n) {
        while (i < n && (inner[i] === " " || inner[i] === "\t" || inner[i] === ",")) {
            i++;
        }
        if (i >= n) {
            break;
        }
        const eq = inner.indexOf("=", i);
        if (eq < 0) {
            return null;
        }
        const name = unescapeObo(inner.slice(i, eq).trim());
        if (name.length === 0 || name.includes('"')) {
            return null;
        }
        i = eq + 1;
        while (i < n && (inner[i] === " " || inner[i] === "\t")) {
            i++;
        }
        let value: string;
        if (inner[i] === '"') {
            const end = closingQuote(inner, i + 1);
            if (end < 0) {
                return null;
            }
            value = unescapeObo(inner.slice(i + 1, end));
            i = end + 1;
        } else {
            let end = i;
            while (end < n && inner[end] !== ",") {
                end += inner[end] === "\\" ? 2 : 1;
            }
            value = unescapeObo(inner.slice(i, end).trim());
            i = end;
        }
        addQualifier(out, name, value);
        any = true;
    }
    return any ? out : null;
}

/**
 * The index of the unescaped closing quote.
 * @param text - the text
 * @param from - the index after the opening quote
 * @returns the index, or -1 when the text ends first
 */
function closingQuote(text: string, from: number): number {
    for (let i = from; i < text.length; i++) {
        if (text[i] === "\\") {
            i++;
        } else if (text[i] === '"') {
            return i;
        }
    }
    return -1;
}

/** One token of a value. */
export interface Token {
    /** A bare word, a quoted string or a bracketed list. */
    readonly kind: "word" | "quoted" | "list";
    /** The token's text: unescaped for a word or a quoted string, raw inside the brackets for a list. */
    readonly text: string;
    /** Whether the quote or bracket was never closed (the token runs to the end of the value). */
    readonly unterminated: boolean;
}

/**
 * Split a value (comment and qualifiers removed) into words, quoted strings and bracketed lists.
 * Whitespace separates tokens; an escaped space belongs to its word.
 * @param value - the raw value
 * @returns the tokens
 */
export function tokenize(value: string): Token[] {
    const tokens: Token[] = [];
    const n = value.length;
    let i = 0;
    while (i < n) {
        const ch = value[i];
        if (ch === " " || ch === "\t") {
            i++;
            continue;
        }
        if (ch === '"') {
            const end = closingQuote(value, i + 1);
            const stop = end < 0 ? n : end;
            // a 1.4 language tag glued to the closing quote ("chat"@fr) is kept with the text, as an
            // unquoted chat@fr is (research-obo.md 4.1: no language is split out)
            let after = stop + 1;
            if (end >= 0 && value[after] === "@") {
                while (after < n && value[after] !== " " && value[after] !== "\t") {
                    after++;
                }
            }
            const suffix = end < 0 ? "" : value.slice(stop + 1, after);
            tokens.push({
                kind: "quoted",
                text: unescapeObo(value.slice(i + 1, stop)) + suffix,
                unterminated: end < 0,
            });
            i = after;
            continue;
        }
        if (ch === "[") {
            const end = closingBracket(value, i + 1);
            const stop = end < 0 ? n : end;
            tokens.push({ kind: "list", text: value.slice(i + 1, stop), unterminated: end < 0 });
            i = stop + 1;
            continue;
        }
        let end = i;
        while (end < n && value[end] !== " " && value[end] !== "\t") {
            end += value[end] === "\\" ? 2 : 1;
        }
        tokens.push({ kind: "word", text: unescapeObo(value.slice(i, Math.min(end, n))), unterminated: false });
        i = end;
    }
    return tokens;
}

/**
 * The index of the unescaped `]` outside quotes closing a list.
 * @param text - the text
 * @param from - the index after `[`
 * @returns the index, or -1 when the text ends first
 */
function closingBracket(text: string, from: number): number {
    let quoted = false;
    for (let i = from; i < text.length; i++) {
        const ch = text[i];
        if (ch === "\\") {
            i++;
        } else if (ch === '"') {
            quoted = !quoted;
        } else if (ch === "]" && !quoted) {
            return i;
        }
    }
    return -1;
}

/** One cross-reference: `ID "description" {qualifiers}`. */
export interface Xref {
    /** The id (may hold spaces: `NIST Chemistry WebBook:110-63-4`, which owlapi reads). */
    readonly id: string;
    /** The description, or null. */
    readonly description: string | null;
    /** Per-xref qualifiers (OBO 1.2 inside a list), or null. */
    readonly qualifiers: Qualifiers | null;
    /** Whether the description's quote was never closed (it runs to the end). */
    readonly unterminated: boolean;
}

/**
 * Read one cross-reference: the id is the text before the first unescaped quote, the quoted
 * string its description, a closing block its qualifiers.
 * @param raw - the raw text of one xref
 * @returns the xref, or null when it has no id
 */
export function parseXref(raw: string): Xref | null {
    const { value, qualifiers } = splitQualifiers(raw.trim());
    let quote = -1;
    for (let i = 0; i < value.length; i++) {
        if (value[i] === "\\") {
            i++;
        } else if (value[i] === '"') {
            quote = i;
            break;
        }
    }
    const id = unescapeObo((quote < 0 ? value : value.slice(0, quote)).trim());
    if (id.length === 0) {
        return null;
    }
    let description: string | null = null;
    let unterminated = false;
    if (quote >= 0) {
        const end = closingQuote(value, quote + 1);
        unterminated = end < 0;
        description = unescapeObo(value.slice(quote + 1, end < 0 ? value.length : end));
    }
    return { id, description, qualifiers, unterminated };
}

/**
 * Split the inside of a bracketed list into xrefs at the unescaped commas outside quotes and
 * braces (a solitary xref needs no escaping of its commas only outside a list).
 * @param inner - the raw text between the brackets
 * @returns the xrefs, in order
 */
export function parseXrefList(inner: string): Xref[] {
    const out: Xref[] = [];
    let quoted = false;
    let depth = 0;
    let start = 0;
    const flush = (end: number): void => {
        const xref = parseXref(inner.slice(start, end));
        if (xref !== null) {
            out.push(xref);
        }
    };
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === "\\") {
            i++;
        } else if (ch === '"') {
            quoted = !quoted;
        } else if (!quoted && ch === "{") {
            depth++;
        } else if (!quoted && ch === "}") {
            depth = Math.max(0, depth - 1);
        } else if (!quoted && depth === 0 && ch === ",") {
            flush(i);
            start = i + 1;
        }
    }
    flush(inner.length);
    return out;
}

/**
 * Whether the raw value holds an unescaped `{` or `}` outside quotes and outside a bracketed xref
 * list (a brace mid-value that is not a closing qualifier block is literal text the writer should
 * have escaped).
 * @param value - the raw value, qualifiers already split off
 * @returns true when a stray brace is present
 */
export function hasStrayBrace(value: string): boolean {
    let quoted = false;
    let listed = false;
    for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (ch === "\\") {
            i++;
        } else if (ch === '"') {
            quoted = !quoted;
        } else if (!quoted && (ch === "[" || ch === "]")) {
            // inside an xref list a brace opens that xref's qualifiers (OBO 1.2)
            listed = ch === "[";
        } else if (!quoted && !listed && (ch === "{" || ch === "}")) {
            return true;
        }
    }
    return false;
}
