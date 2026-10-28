/**
 * @file Finding the column a {@link ColumnRef} names, converting its values to a type, and
 * following its rename through what reads it.
 */

import type { AttributeDescriptor } from "../catalog/types";
import { GraphtyError } from "../errors";
import { nearestNames } from "./results/ResultsApi";
import type { ColumnRef } from "./shared";
import { quotePath } from "./styles/predicate";
import type { TypeChangePreview, ValueType } from "./types";

/**
 * The attribute a column reference names, matched on its kind and its literal name.
 * @param attributes - What `session.data.attributes()` lists now, or any columns with a kind and a name.
 * @param ref - The column.
 * @returns The attribute's descriptor.
 * @throws A `GraphtyError` coded `E_UNKNOWN_ATTRIBUTE`, with `details.kind`, `details.name` and
 *     the nearest names of that kind in `details.candidates`, when no such column exists.
 */
export function resolveColumn<T extends Pick<AttributeDescriptor, "kind" | "name"> = AttributeDescriptor>(
    attributes: readonly T[],
    ref: ColumnRef,
): T {
    const found = attributes.find((attribute) => attribute.kind === ref.kind && attribute.name === ref.name);
    if (found !== undefined) {
        return found;
    }

    const names = attributes.filter((attribute) => attribute.kind === ref.kind).map((attribute) => attribute.name);
    throw new GraphtyError({
        code: "E_UNKNOWN_ATTRIBUTE",
        source: "data",
        message: `No ${ref.kind} column is named ${JSON.stringify(ref.name)}.`,
        details: { kind: ref.kind, name: ref.name, candidates: nearestNames(ref.name, names) },
    });
}

// ---------------------------------------------------------------------------------------------
// Converting a column's values to a type
// ---------------------------------------------------------------------------------------------

/** Every value type a column can be converted to. */
export const VALUE_TYPES: readonly ValueType[] = Object.freeze(["text", "number", "boolean", "date", "category"]);

const TRUE_WORDS = new Set(["true", "yes", "y", "1"]);
const FALSE_WORDS = new Set(["false", "no", "n", "0"]);

/** What one value becomes: `blank` for nothing to convert, `fail` for a value that does not. */
export type Converted = { readonly kind: "value"; readonly value: unknown } | { readonly kind: "blank" | "fail" };

const BLANK: Converted = { kind: "blank" };
const FAIL: Converted = { kind: "fail" };

/**
 * A value read as a number.
 * @param value - The value, not blank.
 * @returns What it becomes.
 */
function toNumber(value: unknown): Converted {
    let number = value;
    if (typeof value === "boolean") {
        number = Number(value);
    } else if (typeof value === "string") {
        number = Number(value.trim());
    }

    return typeof number === "number" && Number.isFinite(number) ? { kind: "value", value: number } : FAIL;
}

/**
 * A value read as yes or no.
 * @param value - The value, not blank.
 * @returns What it becomes.
 */
function toBoolean(value: unknown): Converted {
    if (typeof value === "boolean") {
        return { kind: "value", value };
    }

    const word = typeof value === "string" || typeof value === "number" ? String(value).trim().toLowerCase() : "";
    if (TRUE_WORDS.has(word)) {
        return { kind: "value", value: true };
    }

    return FALSE_WORDS.has(word) ? { kind: "value", value: false } : FAIL;
}

/**
 * A value read as an instant, held as an ISO 8601 string.
 * ponytail: a four-digit integer is a year, any other number is milliseconds since 1970.
 * @param value - The value, not blank.
 * @returns What it becomes.
 */
function toDate(value: unknown): Converted {
    let ms = Number.NaN;
    if (typeof value === "number") {
        ms = Number.isInteger(value) && value >= 1000 && value <= 9999 ? Date.UTC(value, 0, 1) : value;
    } else if (typeof value === "string") {
        const text = value.trim();
        ms = /^\d{4}$/u.test(text) ? Date.UTC(Number(text), 0, 1) : Date.parse(text);
    }

    return Number.isFinite(ms) ? { kind: "value", value: new Date(ms).toISOString() } : FAIL;
}

/**
 * One value read as a type.
 * @param value - The value a record holds.
 * @param type - The type.
 * @returns What it becomes.
 */
export function convertValue(value: unknown, type: ValueType): Converted {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
        return BLANK;
    }

    switch (type) {
        case "number":
            return toNumber(value);
        case "boolean":
            return toBoolean(value);
        case "date":
            return toDate(value);
        default:
            // "text" and "category"
            return { kind: "value", value: toText(value) };
    }
}

/**
 * A value as text: itself for a string, its JSON for an object.
 * @param value - The value, not blank.
 * @returns The text.
 */
function toText(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return String(value);
    }

    return JSON.stringify(value) ?? "";
}

/**
 * Whether a string names a value type.
 * @param type - What was given.
 * @returns True for one of {@link VALUE_TYPES}.
 */
export function isValueType(type: unknown): type is ValueType {
    return (VALUE_TYPES as readonly unknown[]).includes(type);
}

/**
 * What converting these values would do.
 * @param values - The values, one per record; undefined for a record without one.
 * @param type - The type.
 * @returns The counts and up to five examples, the failures first.
 */
export function previewConversion(values: Iterable<unknown>, type: ValueType): TypeChangePreview {
    let converts = 0;
    let fails = 0;
    const failed: { value: unknown; converted: unknown }[] = [];
    const passed: { value: unknown; converted: unknown }[] = [];
    for (const value of values) {
        const converted = convertValue(value, type);
        if (converted.kind === "fail") {
            fails++;
            if (failed.length < 5) {
                failed.push({ value, converted: null });
            }
        } else if (converted.kind === "value") {
            converts++;
            if (passed.length < 5) {
                passed.push({ value, converted: converted.value });
            }
        }
    }

    return Object.freeze({
        converts,
        fails,
        examples: Object.freeze([...failed, ...passed].slice(0, 5).map((each) => Object.freeze(each))),
    });
}

// ---------------------------------------------------------------------------------------------
// Following a rename
// ---------------------------------------------------------------------------------------------

/** The keys whose string is a value path read literally, never an expression. */
const PATH_KEYS = new Set(["path", "attribute", "reads", "by"]);

/** The keys whose string is a reader's own text, never a path: a `text` leaf's `text`. */
const TEXT_KEYS = new Set(["text"]);

/**
 * Escape a string for a regular expression.
 * @param text - The text.
 * @returns It, with every special character escaped.
 */
function escapeRegExp(text: string): string {
    return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

/**
 * A rewriter of the strings that name column `from`, so they name `to`.
 * @param from - The old column name.
 * @param to - The new one.
 * @returns Rewrites one string; `literal` for a path field, otherwise an expression or template.
 */
function stringRenamer(from: string, to: string): (text: string, literal: boolean) => string {
    const old = `data.${from}`;
    const quotedNew = quotePath(`data.${to}`);
    // Quoted always matches; unquoted only when the old name can be written without quotes.
    const forms = [String.raw`data\.${escapeRegExp(JSON.stringify(from))}`];
    if (quotePath(old) === old) {
        forms.push(String.raw`data\.${escapeRegExp(from)}(?![\w$])`);
    }

    // ponytail: a quoted string literal inside an expression that spells the path is rewritten
    // too; parse the expression if that ever matters.
    const pattern = new RegExp(String.raw`(?<![\w$."])(?:${forms.join("|")})`, "gu");
    return (text, literal) => {
        if (literal) {
            return text === old || text.startsWith(`${old}.`) ? `data.${to}${text.slice(old.length)}` : text;
        }

        return text.replace(pattern, quotedNew);
    };
}

/**
 * A copy of a value with every path to column `from` naming `to`: path fields (`path`,
 * `attribute`, `by`) read literally, every other string as an expression or a template.
 * Unchanged parts are the same objects, and an unchanged value is the value itself.
 * @param value - A layer's selector or bindings, a rule tree, a time window.
 * @param from - The old column name.
 * @param to - The new one.
 * @param scope - Whether an object (and what is inside it) speaks of the renamed column's
 *     kind, given whether its parent did. Default: everything does.
 * @param start - Whether the value's root speaks of it, before `scope` is asked. Default true.
 * @returns The value, renamed.
 */
export function renameColumnIn<T>(
    value: T,
    from: string,
    to: string,
    scope: (node: Readonly<Record<string, unknown>>, inherited: boolean) => boolean = (_node, inherited) => inherited,
    start = true,
): T {
    const rename = stringRenamer(from, to);
    const visit = (at: unknown, literal: boolean, on: boolean): unknown => {
        if (typeof at === "string") {
            return on ? rename(at, literal) : at;
        }

        if (Array.isArray(at)) {
            const out = at.map((each) => visit(each, literal, on));
            return out.some((each, index) => each !== at[index]) ? out : at;
        }

        if (typeof at === "object" && at !== null) {
            const record = at as Readonly<Record<string, unknown>>;
            const inside = scope(record, on);
            let changed = false;
            const out: Record<string, unknown> = {};
            for (const [key, each] of Object.entries(record)) {
                out[key] = TEXT_KEYS.has(key) ? each : visit(each, PATH_KEYS.has(key), inside);
                changed ||= out[key] !== each;
            }

            return changed ? out : at;
        }

        return at;
    };

    return visit(value, false, start) as T;
}

/**
 * Where a rule tree speaks of one kind's columns: a node column everywhere but inside an `edges`
 * leaf, an edge column only inside one, a `threshold` leaf or a value leaf (`range`, `categories`,
 * `text`), which reads whichever half carries its path. Pass `start` as `kind === "node"`.
 * @param kind - The renamed column's kind.
 * @returns The scope for {@link renameColumnIn}.
 */
export function ruleScope(
    kind: "node" | "edge",
): (node: Readonly<Record<string, unknown>>, inherited: boolean) => boolean {
    // ponytail: a value leaf reads either half, so renaming an edge column also renames a node
    // column of the same name read by such a leaf; split by half if both kinds share names.
    const onEdges = (node: Readonly<Record<string, unknown>>): boolean => node.kind === "edges";
    return kind === "node"
        ? (node, inherited) => inherited && !onEdges(node)
        : (node, inherited) => inherited || onEdges(node) || VALUE_LEAVES.has(String(node.kind));
}

/** The leaves that read one value path on whichever half carries it, and `threshold`. */
const VALUE_LEAVES = new Set(["threshold", "range", "categories", "text"]);
