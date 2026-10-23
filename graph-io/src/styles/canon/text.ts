/**
 * Canonical text: the text a tool draws. Text is copied whatever its length and never matched with a pattern that
 * can backtrack; every pass here is linear in the text's length and spends one operation per character.
 */

import { STYLE_ISSUE } from "../codes.js";
import { type CanonSite, noteAt, spendAt } from "./site.js";

/**
 * A text value: a string as it is, a finite number or a boolean as its text. Anything else is null with a
 * `W_STYLE_BAD_VALUE` note; an absent value is null without one.
 * @param raw - the file's value
 * @param site - where it was read
 * @returns the text, or null
 * @category Styles
 */
export function canonText(raw: unknown, site: CanonSite): string | null {
    spendAt(site, 1);
    if (raw === null || raw === undefined) {
        return null;
    }
    if (typeof raw === "string") {
        spendAt(site, raw.length);
        return raw;
    }
    if ((typeof raw === "number" && Number.isFinite(raw)) || typeof raw === "boolean") {
        return String(raw);
    }
    noteAt(site, STYLE_ISSUE.BAD_VALUE, typeof raw === "number" ? String(raw) : typeof raw);
    return null;
}

/**
 * The names Graphviz substitutes for `\N`, `\G`, `\E`, `\T` and `\H` in a label; an absent name leaves its escape
 * as written.
 * @category Styles
 */
export interface DotEscapeNames {
    /** The node's name, for `\N`. */
    readonly node?: string;
    /** The graph's name, for `\G`. */
    readonly graph?: string;
    /** The edge's name (`a->b` or `a--b`), for `\E`. */
    readonly edge?: string;
    /** The edge's tail node, for `\T`. */
    readonly tail?: string;
    /** The edge's head node, for `\H`. */
    readonly head?: string;
}

/**
 * The text a DOT label draws, in Graphviz's two passes: first `\N`, `\G`, `\E`, `\T` and `\H` are replaced by the
 * names and every other backslash pair is kept; then `\n`, `\l` and `\r` end a line (a final one adds no empty line)
 * and any other escaped character stands for itself. So a node name holding `\n` breaks the line. Between the
 * two, HTML entities (`&amp;`, `&#946;`) are decoded, as Graphviz's `htmlEntityUTF8` does for a plain label.
 * @param text - the label as the file gives it
 * @param names - the names to substitute
 * @param site - where it was read, for the budget
 * @returns the label's text
 * @category Styles
 */
export function dotLabelText(text: string, names: DotEscapeNames, site?: CanonSite): string {
    if (site !== undefined) {
        spendAt(site, text.length);
    }
    const out = replaceEscapes(decodeEntities(substituteNames(text, names)), (e) =>
        e === "n" || e === "l" || e === "r" ? "\n" : e,
    );
    return out.endsWith("\n") ? out.slice(0, -1) : out;
}

/**
 * Graphviz's first pass over a label: `\N`, `\G`, `\E`, `\T` and `\H` replaced by the names, every other
 * backslash pair kept.
 * @param text - the label as the file gives it
 * @param names - the names to substitute
 * @returns the text
 */
function substituteNames(text: string, names: DotEscapeNames): string {
    const subs: Readonly<Record<string, string | undefined>> = {
        N: names.node,
        G: names.graph,
        E: names.edge,
        T: names.tail,
        H: names.head,
    };
    return replaceEscapes(text, (e) => (Object.hasOwn(subs, e) ? subs[e] : undefined) ?? `\\${e}`);
}

/**
 * How a DOT label's lines line up: each line ended by `\l` is drawn against the left, by `\r` against the right, and
 * any other line centered (Graphviz's second pass, after `\N` and the other names are substituted). graphty lines
 * up a label's lines one way, so the way most of its lines take wins, the first line's on a tie.
 * @param text - the label as the file gives it
 * @param names - the names to substitute
 * @returns `left` or `right`, or null for a centered label
 * @category Styles
 */
export function dotLabelAlign(text: string, names: DotEscapeNames): "left" | "right" | null {
    // each line's end, in order: "n" centered, "l" left, "r" right; text after the last end is a centered line
    const parts = replaceEscapes(substituteNames(text, names), (e) =>
        e === "n" || e === "l" || e === "r" ? `\u0000${e}\u0000` : "x",
    ).split("\u0000");
    const ends = parts.filter((_, i) => i % 2 === 1);
    if (parts.at(-1) !== "") {
        ends.push("n");
    }
    const count = (end: string): number => ends.filter((e) => e === end).length;
    const best = ["l", "r", "n"].filter((end) => count(end) === Math.max(count("l"), count("r"), count("n")));
    const winner = best.length > 1 ? (ends.find((e) => best.includes(e)) ?? "n") : best[0];
    if (winner === "l") {
        return "left";
    }
    return winner === "r" ? "right" : null;
}

/**
 * A text with every backslash escape (a backslash and the character after it) replaced; a backslash at the end stays.
 * @param text - the text
 * @param replace - the replacement of an escape, given the escaped character
 * @returns the text
 */
function replaceEscapes(text: string, replace: (escaped: string) => string): string {
    let out = "";
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        if (c === "\\" && i + 1 < text.length) {
            out += replace(text[i + 1]);
            i += 2;
        } else {
            out += c;
            i++;
        }
    }
    return out;
}

/** HTML entity names an HTML-like label may use. */
const ENTITIES: ReadonlyMap<string, string> = new Map([
    ["amp", "&"],
    ["lt", "<"],
    ["gt", ">"],
    ["quot", '"'],
    ["apos", "'"],
    ["nbsp", " "],
]);

/**
 * Decodes one entity body (`amp`, `#38`, `#x26`).
 * @param body - the text between `&` and `;`
 * @returns the character, or undefined when it is not an entity
 */
function entity(body: string): string | undefined {
    if (body.startsWith("#")) {
        const hex = body[1] === "x" || body[1] === "X";
        const digits = body.slice(hex ? 2 : 1);
        if (digits === "" || digits.length > 7 || !(hex ? /^[0-9a-f]+$/i : /^\d+$/).test(digits)) {
            return undefined;
        }
        const cp = Number.parseInt(digits, hex ? 16 : 10);
        return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : undefined;
    }
    return ENTITIES.get(body.toLowerCase());
}

/**
 * The text an HTML-like label shows: tags dropped, `<br/>` as a line break, entities decoded, outer blanks trimmed.
 * A table's rows are lines and the cells of a row are parted by a space, as Graphviz lays them out; text in a table
 * outside its cells is not drawn. Notes `W_STYLE_HTML_LABEL` at the site, since the markup is lost.
 * @param html - the label, with or without its outer `<` and `>`
 * @param site - where it was read
 * @returns the label's text
 * @category Styles
 */
export function htmlLabelText(html: string, site: CanonSite): string {
    spendAt(site, html.length);
    noteAt(site, STYLE_ISSUE.HTML_LABEL, html);
    return htmlLabelSpans(html)
        .map((s) => s.text)
        .join("")
        .trim();
}

/** A piece of an HTML-like label's text with the font tags open around it, outermost first. */
export interface HtmlLabelSpan {
    /** The text, entities decoded. */
    readonly text: string;
    /** The open font tags (`<B>`, `<FONT COLOR="red">`, ...) as written, outermost first. */
    readonly tags: readonly string[];
}

/** The tags that change the font of the text inside them. */
const FONT_TAGS = /^<(\/?)(b|i|u|o|s|sub|sup|font)\b/i;

/**
 * The pieces of text an HTML-like label shows, untrimmed, each with the font tags around it (the text
 * {@link htmlLabelText} joins and trims).
 * @param html - the label, with or without its outer `<` and `>`
 * @returns the pieces in order
 * @category Styles
 */
export function htmlLabelSpans(html: string): HtmlLabelSpan[] {
    const body = html.startsWith("<") && html.endsWith(">") ? html.slice(1, -1) : html;
    const s: SpanState = { spans: [], tags: [], out: "", open: [] };
    let i = 0;
    while (i < body.length) {
        const c = body[i];
        if (c === "<") {
            const close = body.indexOf(">", i + 1);
            if (close < 0) {
                break;
            }
            readTag(s, body, i, close);
            i = close + 1;
        } else {
            const [text, next]: [string, number] = c === "&" ? entityAt(body, i) : [c, i + 1];
            emitSpan(s, s.open.at(-1) === "table" ? "" : text);
            i = next;
        }
    }
    return s.spans;
}

/** What {@link htmlLabelSpans} has read so far. */
interface SpanState {
    /** the pieces so far */
    spans: HtmlLabelSpan[];
    /** the font tags open now; a new array whenever they change, so a piece's tags are compared by identity */
    tags: string[];
    /** the text so far */
    out: string;
    /** the open tables and cells, innermost last: text is drawn outside every table or inside a cell */
    open: ("table" | "td")[];
}

/**
 * Adds text to the last piece when its tags are the ones open, else as a new piece.
 * @param s - the reading so far, changed in place
 * @param text - the text
 */
function emitSpan(s: SpanState, text: string): void {
    s.out += text;
    const last = s.spans.at(-1);
    if (last?.tags === s.tags) {
        s.spans[s.spans.length - 1] = { text: last.text + text, tags: s.tags };
    } else if (text !== "") {
        s.spans.push({ text, tags: s.tags });
    }
}

/**
 * Whether the line being read has text on it.
 * @param s - the reading so far
 * @returns whether it has
 */
function lineHasText(s: SpanState): boolean {
    return s.out.slice(s.out.lastIndexOf("\n") + 1).trim() !== "";
}

/**
 * One tag of an HTML-like label: a line break, a table, row or cell, or a font tag.
 * @param s - the reading so far, changed in place
 * @param body - the label
 * @param i - the offset of the tag's `<`
 * @param close - the offset of its `>`
 */
function readTag(s: SpanState, body: string, i: number, close: number): void {
    const tag = /^<(\/?)(br|table|tr|td)\b/i.exec(body.slice(i, i + 7));
    if (tag !== null) {
        layoutTag(s, tag[2].toLowerCase(), tag[1] === "/");
        return;
    }
    const font = FONT_TAGS.exec(body.slice(i, i + 6));
    if (font !== null && font[1] === "/") {
        s.tags = withoutLastTag(s.tags, font[2]);
    } else if (font !== null && body[close - 1] !== "/") {
        s.tags = [...s.tags, body.slice(i, close + 1)];
    }
}

/**
 * A line break, table, row or cell tag: a break and a row with text before it start a line, a cell with text before
 * it on its line a space.
 * @param s - the reading so far, changed in place
 * @param name - `br`, `table`, `tr` or `td`, in lower case
 * @param closing - whether it is a closing tag
 */
function layoutTag(s: SpanState, name: string, closing: boolean): void {
    if (name === "br" || name === "tr") {
        if (name === "br" || (!closing && lineHasText(s))) {
            emitSpan(s, "\n");
        }
    } else if (closing) {
        s.open.pop();
    } else {
        if (name === "td" && lineHasText(s)) {
            emitSpan(s, " ");
        }
        s.open.push(name === "td" ? "td" : "table");
    }
}

/**
 * The open font tags without the innermost one a closing tag closes.
 * @param tags - the open tags
 * @param name - the closing tag's name
 * @returns the tags left open (the same array when none matched)
 */
function withoutLastTag(tags: string[], name: string): string[] {
    const lower = name.toLowerCase();
    let at = tags.length - 1;
    while (at >= 0 && /^<(\w+)/.exec(tags[at])?.[1].toLowerCase() !== lower) {
        at--;
    }
    return at < 0 ? tags : [...tags.slice(0, at), ...tags.slice(at + 1)];
}

/**
 * Every entity of a text decoded; an `&` that starts none is itself.
 * @param text - the text
 * @returns the decoded text
 */
function decodeEntities(text: string): string {
    let out = "";
    let i = 0;
    for (let amp = text.indexOf("&"); amp >= 0; amp = text.indexOf("&", i)) {
        const [decoded, next] = entityAt(text, amp);
        out += text.slice(i, amp) + decoded;
        i = next;
    }
    return out + text.slice(i);
}

/**
 * The entity starting at an `&`, decoded; an `&` that starts none is itself. An entity is at most 9 characters, so
 * the search for its ";" stays short and the pass stays linear.
 * @param body - the text
 * @param i - the offset of the `&`
 * @returns the text it stands for and the offset after it
 */
function entityAt(body: string, i: number): [string, number] {
    const near = body.slice(i + 1, i + 10).indexOf(";");
    const semi = near < 0 ? -1 : i + 1 + near;
    const decoded = semi > i ? entity(body.slice(i + 1, semi)) : undefined;
    return decoded === undefined ? ["&", i + 1] : [decoded, semi + 1];
}

/**
 * The text a Graphviz record label shows: its fields (`<f0> left|<f1> mid|{a|b}`) without their port names, trimmed,
 * empty ones left out, joined with " | ". Notes `W_STYLE_RECORD_LABEL` at the site, since the boxes are lost.
 * @param label - the record label
 * @param site - where it was read
 * @returns the fields' text
 * @category Styles
 */
export function recordLabelText(label: string, site: CanonSite): string {
    spendAt(site, label.length);
    noteAt(site, STYLE_ISSUE.RECORD_LABEL, label);
    const fields: string[] = [];
    let field = "";
    const flush = (): void => {
        const t = field.trim();
        if (t !== "") {
            fields.push(t);
        }
        field = "";
    };
    let i = 0;
    while (i < label.length) {
        const c = label[i];
        if (c === "\\" && i + 1 < label.length && "|{}<> ".includes(label[i + 1])) {
            field += label[i + 1];
            i += 2;
            continue;
        }
        if (c === "<") {
            // a port name runs to its ">"
            const close = label.indexOf(">", i + 1);
            i = close < 0 ? label.length : close + 1;
            continue;
        }
        if (c === "|" || c === "{" || c === "}") {
            flush();
        } else {
            field += c;
        }
        i++;
    }
    flush();
    return fields.join(" | ");
}
