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
 * and any other escaped character stands for itself. So a node name holding `\n` breaks the line.
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
    const subs: Readonly<Record<string, string | undefined>> = {
        N: names.node,
        G: names.graph,
        E: names.edge,
        T: names.tail,
        H: names.head,
    };
    let first = "";
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c !== "\\" || i + 1 >= text.length) {
            first += c;
            continue;
        }
        const e = text[++i];
        const sub = Object.hasOwn(subs, e) ? subs[e] : undefined;
        first += sub ?? c + e;
    }
    let out = "";
    for (let i = 0; i < first.length; i++) {
        const c = first[i];
        if (c !== "\\" || i + 1 >= first.length) {
            out += c;
            continue;
        }
        const e = first[++i];
        out += e === "n" || e === "l" || e === "r" ? "\n" : e;
    }
    return out.endsWith("\n") ? out.slice(0, -1) : out;
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
 * Notes `W_STYLE_HTML_LABEL` at the site, since the markup is lost.
 * @param html - the label, with or without its outer `<` and `>`
 * @param site - where it was read
 * @returns the label's text
 * @category Styles
 */
export function htmlLabelText(html: string, site: CanonSite): string {
    spendAt(site, html.length);
    noteAt(site, STYLE_ISSUE.HTML_LABEL, html);
    const body = html.startsWith("<") && html.endsWith(">") ? html.slice(1, -1) : html;
    let out = "";
    let i = 0;
    while (i < body.length) {
        const c = body[i];
        if (c === "<") {
            const close = body.indexOf(">", i + 1);
            if (close < 0) {
                break;
            }
            if (/^<br\b/i.test(body.slice(i, i + 4))) {
                out += "\n";
            }
            i = close + 1;
        } else if (c === "&") {
            // An entity is at most 9 characters, so the search for its ";" stays short and the pass stays linear.
            const near = body.slice(i + 1, i + 10).indexOf(";");
            const semi = near < 0 ? -1 : i + 1 + near;
            const decoded = semi > i ? entity(body.slice(i + 1, semi)) : undefined;
            if (decoded === undefined) {
                out += c;
                i++;
            } else {
                out += decoded;
                i = semi + 1;
            }
        } else {
            out += c;
            i++;
        }
    }
    return out.trim();
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
    for (let i = 0; i < label.length; i++) {
        const c = label[i];
        if (c === "\\" && i + 1 < label.length && "|{}<> ".includes(label[i + 1])) {
            field += label[++i];
        } else if (c === "<") {
            const close = label.indexOf(">", i + 1);
            i = close < 0 ? label.length : close;
        } else if (c === "|" || c === "{" || c === "}") {
            flush();
        } else {
            field += c;
        }
    }
    flush();
    return fields.join(" | ");
}
