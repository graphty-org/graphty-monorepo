/**
 * A pie, chart or record from data in Style panel v2 (tmp/entries-first/spec.md, Part 2): which data channel a thing
 * writes, the spec a row's layer holds, the picker's rows, an entry's name and its sample's words, and the one write
 * that changes a spec. graphty-element reads, counts, formats and colors (`dataFacts`, `dataFit`); nothing here does.
 */

import type { DataField } from "@graphty/compact-mantine";
import {
    type Channel,
    DATA_FIXED_CHANNELS,
    type DataChannel,
    type DataEntry,
    type DataEntryFact,
    dataFit,
    type ReadableValue,
} from "@graphty/graphty-element/catalog";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";

import type { RowContext } from "../PropertyRow";
import { writeIn } from "../row";
import { dataFitWords, graphValueWords, readableName, valueFact } from "../words";

/** The data channel each thing that draws from data writes. */
export const DATA_OF: Readonly<Partial<Record<string, DataChannel>>> = {
    pie: "node.pieData",
    chart: "node.chartData",
    record: "node.recordData",
};

/**
 * Whether a thing's row draws from data: a node's Pie, Chart or Record (never a further label's row).
 * @param ctx - the row.
 * @param thing - the thing's id.
 * @param entry - a further label's id, when the row is one.
 * @returns its data channel, or undefined.
 */
export function dataChannelOf(ctx: Pick<RowContext, "side">, thing: string, entry?: string): DataChannel | undefined {
    return ctx.side === "node" && entry === undefined ? DATA_OF[thing] : undefined;
}

/** A data spec as the panel reads and writes it. */
export interface Spec {
    readonly entries: readonly DataEntry[];
    readonly [option: string]: unknown;
}

/** What the trigger and the lines read when the layer holds fixed values. */
export const FIXED = "Fixed";

/**
 * The unlocked layer of the row that holds a spec on a channel, else the row's topmost unlocked layer.
 * @param ctx - the row.
 * @param channel - the data channel.
 * @returns the layer, or undefined when the row has none yet.
 */
export function holderOf(ctx: Pick<RowContext, "layers">, channel: DataChannel): Layer | undefined {
    const open = ctx.layers.filter((layer) => !layer.locked);
    return open.findLast((layer) => layer.set?.[channel] !== undefined) ?? open.at(-1);
}

/**
 * The spec the row's layer holds.
 * @param ctx - the row.
 * @param channel - the data channel.
 * @returns the spec, or undefined for fixed values.
 */
export function specOf(ctx: Pick<RowContext, "layers">, channel: DataChannel): Spec | undefined {
    const value = holderOf(ctx, channel)?.set?.[channel] as Spec | undefined;
    return value !== undefined && Array.isArray(value.entries) ? value : undefined;
}

/**
 * Write a spec, or take it off: one `styles.update` of the layer's whole set, so it is one undo step. Writing data
 * unsets the fixed lists the channel fills; taking data off writes `fixed` (the thing's first fixed values) instead.
 * @param ctx - the row.
 * @param channel - the data channel.
 * @param spec - the spec, or undefined for fixed values.
 * @param fixed - with no spec: the fixed values to write.
 * @returns when it is written.
 */
export async function writeSpec(
    ctx: RowContext,
    channel: DataChannel,
    spec: Spec | undefined,
    fixed: Readonly<Partial<Record<Channel, unknown>>> = {},
): Promise<unknown> {
    const layer = holderOf(ctx, channel);
    if (layer === undefined) {
        return spec === undefined ? undefined : writeIn(ctx, channel, { value: spec as never });
    }
    const set: Record<string, unknown> = { ...layer.set };
    if (spec === undefined) {
        Reflect.deleteProperty(set, channel);
        Object.assign(set, fixed);
    } else {
        for (const each of DATA_FIXED_CHANNELS[channel]) {
            Reflect.deleteProperty(set, each);
        }
        set[channel] = spec;
    }
    return ctx.session.styles.update(layer.id, { set }, { keepEmpty: true });
}

/**
 * An entry's id in the picker: a field's path, a pattern's words, else its kind and place.
 * @param entry - the entry.
 * @param at - its place.
 * @returns the id.
 */
export function entryId(entry: DataEntry, at: number): string {
    if ("field" in entry) {
        return entry.field;
    }
    if ("pattern" in entry) {
        return `pattern:${entry.except === true ? "!" : ""}${entry.pattern}`;
    }
    if ("graph" in entry) {
        return `graph:${String(at)}`;
    }
    return "text" in entry ? `text:${String(at)}` : `value:${String(at)}`;
}

/**
 * A readable value's plain name.
 * @param session - the session.
 * @param path - its path.
 * @returns the name.
 */
function plainOf(session: GraphSession, path: string): string {
    const value = session.data.readableValues().find((each) => each.path === path && each.on === "node");
    return value === undefined
        ? (path
              .replace(/^data\./u, "")
              .split(".")
              .at(-1) ?? path)
        : readableName(session, value).name;
}

/**
 * An entry's name: its own, else its column's, its pattern's, its Graph value's sentence or its fixed value.
 * @param session - the session.
 * @param entry - the entry.
 * @returns the name.
 */
export function entryName(session: GraphSession, entry: DataEntry): string {
    if (entry.label !== undefined && entry.label !== "") {
        return entry.label;
    }
    if ("field" in entry) {
        return plainOf(session, entry.field);
    }
    if ("pattern" in entry) {
        return `${entry.except === true ? "All but " : ""}${entry.pattern}*`;
    }
    if ("graph" in entry) {
        return graphValueWords(entry.graph);
    }
    return "text" in entry ? entry.text : String(entry.value);
}

/**
 * What an entry line reads for the sample node: the value in its format, a spread's parts ("dog 2, cat 1"), or "-"
 * for a missing value. The words are graphty-element's (`dataFacts`); only the joining is the panel's.
 * @param fact - the entry's facts on the sample, or undefined before there is one.
 * @returns the words.
 */
export function entryWords(fact: DataEntryFact | undefined): string {
    if (fact === undefined) {
        return "-";
    }
    const parts = fact.parts ?? [];
    // A pattern's parts are its columns: their values alone, joined, "-" in a missing one's place.
    if (parts.length > 0 && parts.every((part) => part.key.includes("."))) {
        return parts.map((part) => (part.text === "" ? "-" : part.text)).join(", ");
    }
    if (parts.length > 0) {
        return parts.map((part) => `${part.name} ${part.text}`).join(", ");
    }
    return fact.text ?? "-";
}

/** A readable value's type in the field list. */
const TYPES: Readonly<Record<ReadableValue["kind"], DataField["type"]>> = {
    number: "number",
    category: "category",
    text: "string",
    "yes-no": "boolean",
};

/**
 * The fields a data channel's picker lists: the node's columns and finished runs' fields (each with its fact, the list
 * glyph for a list, and the reason a pie or chart cannot take it), the spec's patterns under Data, and its Graph
 * values under Calculated.
 * @param session - the session.
 * @param channel - the data channel.
 * @param entries - the entries in the draft.
 * @returns the fields.
 */
export function fieldsFor(session: GraphSession, channel: DataChannel, entries: readonly DataEntry[]): DataField[] {
    const fields: DataField[] = [];
    for (const value of session.data.readableValues()) {
        if (value.on !== "node" || value.from === "element" || value.end !== undefined || value.holdsNodeIds === true) {
            continue;
        }
        const { name, group } = readableName(session, value);
        const fit = dataFit(channel, value);
        fields.push({
            id: value.path,
            name,
            type: value.spread === undefined ? TYPES[value.kind] : "list",
            group: value.from === "data" ? "Data" : group,
            sample: valueFact(value),
            keywords: [value.technicalName],
            disabledReason: fit === null ? undefined : dataFitWords(fit.code),
        });
    }
    entries.forEach((entry, at) => {
        if ("pattern" in entry) {
            fields.unshift({ id: entryId(entry, at), name: entryName(session, entry), type: "number", group: "Data" });
        } else if ("graph" in entry) {
            fields.push({
                id: entryId(entry, at),
                name: entryName(session, entry),
                type: entry.graph.groupBy === undefined ? "number" : "list",
                group: "Calculated",
            });
        } else if ("text" in entry || "value" in entry) {
            fields.push({ id: entryId(entry, at), name: entryName(session, entry), type: "string", group: "Values" });
        }
    });
    return fields;
}

/**
 * The draft's entries after the picker's checks changed: the entries still checked, in their order and with their
 * own settings, then each field checked now as a new field entry.
 * @param entries - the draft's entries.
 * @param checked - the ids checked now.
 * @returns the entries.
 */
export function draftAfter(entries: readonly DataEntry[], checked: readonly string[]): DataEntry[] {
    const held = entries.filter((entry, at) => checked.includes(entryId(entry, at)));
    const ids = new Set(entries.map((entry, at) => entryId(entry, at)));
    const added = checked.filter((id) => !ids.has(id)).map((field): DataEntry => ({ field }));
    return [...held, ...added];
}

/**
 * The entries with one moved a place up or down.
 * @param entries - the entries.
 * @param at - the one to move.
 * @param by - -1 up, 1 down.
 * @returns the entries, or the same list when it cannot move.
 */
export function moved(entries: readonly DataEntry[], at: number, by: -1 | 1): readonly DataEntry[] {
    const to = at + by;
    if (to < 0 || to >= entries.length) {
        return entries;
    }
    const next = [...entries];
    [next[at], next[to]] = [next[to], next[at]];
    return next;
}
