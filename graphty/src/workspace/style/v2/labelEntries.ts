/**
 * A node's or an edge's further labels in Style panel v2 (ledger E234, E265): graphty-element's label list
 * (`node.labels`, `edge.labels`), one row per entry. An entry's words are its fixed `text` or a binding on its
 * field address `<target>.labels.<id>.text`; its look is its own `style`, merged over the main label's. Every
 * write lands on the row's topmost layer the reader may edit, as any other line does. A further label a layer
 * beneath draws is reached by its id (E263, E265): "+" offers it, and its row writes only what it changes,
 * `{ id, style }`, which graphty-element merges into that label by id.
 */

import { type Channel, type LabelEntry, labelFieldAddress, MAIN_LABEL_ID } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import type { Encoding, Layer } from "@graphty/graphty-element/session";

import type { RowContext } from "../PropertyRow";
import { type DataBinding, type Line, lineIn, lineOf, writeLine } from "../row";
import { TEXT_THINGS } from "./labelRubric";

/**
 * The label list channel of a kind.
 * @param side - nodes or edges.
 * @returns `node.labels` or `edge.labels`.
 */
export function listChannel(side: "node" | "edge"): Channel {
    return TEXT_THINGS[side].label?.list ?? `${side}.labels`;
}

/**
 * The list the row writes, as written.
 * @param ctx - the row.
 * @returns its entries, or none.
 */
function listOf(ctx: RowContext): readonly LabelEntry[] {
    const value = lineIn(ctx, listChannel(ctx.side))?.value;
    return Array.isArray(value) ? (value as readonly LabelEntry[]) : [];
}

/**
 * The layers beneath the row on its side, bottom first: those under its lowest layer, or all of them for a row
 * with no layer yet (its first edit adds one on top). Several rows edited together read none.
 * @param ctx - the row.
 * @returns the layers.
 */
function layersBeneath(ctx: RowContext): readonly Layer[] {
    if (ctx.many !== undefined) {
        return [];
    }
    const side = ctx.session.styles.list().filter((layer) => layer.target === ctx.side);
    const lowest = ctx.layers[0];
    const at = lowest === undefined ? -1 : side.findIndex((layer) => layer.id === lowest.id);
    return at < 0 ? side : side.slice(0, at);
}

/**
 * The further labels the layers beneath the row draw, in the order they were added, each with the last fixed
 * words a layer gave it: an entry switched off leaves the list.
 * @param ctx - the row.
 * @returns their words, by id.
 */
function drawnBeneath(ctx: RowContext): ReadonlyMap<string, string | undefined> {
    const channel = listChannel(ctx.side);
    const drawn = new Map<string, string | undefined>();
    for (const layer of layersBeneath(ctx)) {
        const held = layer.set?.[channel];
        for (const entry of Array.isArray(held) ? (held as readonly LabelEntry[]) : []) {
            if (entry.id === MAIN_LABEL_ID) {
                continue;
            }
            if (entry.off === true) {
                drawn.delete(entry.id);
            } else {
                drawn.set(entry.id, entry.text ?? drawn.get(entry.id));
            }
        }
    }
    return drawn;
}

/**
 * The further labels layers beneath draw that the row neither restyles nor switches off: what "+" offers by id.
 * @param ctx - the row.
 * @returns their ids.
 */
export function labelsBeneath(ctx: RowContext): readonly string[] {
    const own = new Set(listOf(ctx).map((entry) => entry.id));
    return [...drawnBeneath(ctx).keys()].filter((id) => !own.has(id));
}

/**
 * A further label's number, the same on every layer: 2 for the first label the stack adds, the labels the layers
 * beneath draw first, then the row's own in its list's order.
 * @param ctx - the row.
 * @param ids - the row's further labels, waiting ones included.
 * @param id - the one to number.
 * @returns its number.
 */
export function entryNumber(ctx: RowContext, ids: readonly string[], id: string): number {
    const beneath = [...drawnBeneath(ctx).keys()];
    const order = [...beneath, ...ids.filter((each) => !beneath.includes(each))];
    return order.indexOf(id) + 2;
}

/**
 * The further labels the row sets, each a row of its own: every entry but the main label's and those switched off.
 * @param ctx - the row.
 * @returns their ids, in the list's order.
 */
export function entryIds(ctx: RowContext): readonly string[] {
    return listOf(ctx)
        .filter((entry) => entry.id !== MAIN_LABEL_ID && entry.off !== true)
        .map((entry) => entry.id);
}

/**
 * One further label as the row writes it.
 * @param ctx - the row.
 * @param id - its id.
 * @returns the entry, or undefined before its first write.
 */
export function entryOf(ctx: RowContext, id: string): LabelEntry | undefined {
    return listOf(ctx).find((entry) => entry.id === id);
}

/**
 * Where a further label's words come from, as a line: the binding on its text address, else its fixed text.
 * @param ctx - the row.
 * @param id - its id.
 * @returns the line, or undefined when it draws the main label's words.
 */
export function entryWords(ctx: RowContext, id: string): Line | undefined {
    const bound = lineIn(ctx, labelFieldAddress(ctx.side, id, "text") as Channel);
    if (bound !== undefined) {
        return bound;
    }
    const entry = entryOf(ctx, id);
    const line = lineIn(ctx, listChannel(ctx.side));
    if (entry?.text !== undefined && line !== undefined) {
        return { layer: line.layer, value: entry.text };
    }
    // A label a layer beneath draws reads its words there until the row gives it words of its own.
    const beneath = layersBeneath(ctx);
    const text = drawnBeneath(ctx).get(id);
    const bottom = beneath.at(-1);
    return (
        lineOf(beneath, labelFieldAddress(ctx.side, id, "text") as Channel) ??
        (text === undefined || bottom === undefined ? undefined : { layer: bottom, value: text })
    );
}

/** A change to one further label: its words (fixed text or a binding) and its style, undefined keeping each. */
export interface EntryChange {
    readonly text?: string;
    readonly binding?: DataBinding;
    /** Its whole style; an empty one takes the style off. */
    readonly style?: Readonly<LabelStyle>;
}

/**
 * A new id for a further label, one no label on the stack nor a row waiting for its first value uses.
 * @param ctx - the row.
 * @param waiting - ids already handed to rows that wait.
 * @returns the id, or undefined when no layer on the stack draws this kind (so no label is drawn to add to).
 */
export function freshEntryId(ctx: RowContext, waiting: readonly string[]): string | undefined {
    const layer = ctx.layers[0] ?? ctx.session.styles.list().find((each) => each.target === ctx.side);
    return layer === undefined ? undefined : ctx.session.styles.newLabelId(layer.id, waiting);
}

/**
 * Writes one further label, adding it to the list when it is new, as one undo step.
 * @param ctx - the row.
 * @param id - its id.
 * @param change - what changes.
 * @returns when it is written.
 */
export async function writeEntry(ctx: RowContext, id: string, change: EntryChange): Promise<void> {
    const list = listOf(ctx);
    const now: LabelEntry = list.find((entry) => entry.id === id) ?? { id };
    const style = change.style ?? now.style;
    const text = change.binding === undefined ? (change.text ?? now.text) : undefined;
    const next: LabelEntry = {
        id,
        ...(text === undefined ? {} : { text }),
        ...(style === undefined || Object.keys(style).length === 0 ? {} : { style }),
    };
    const entries = list.some((entry) => entry.id === id)
        ? list.map((entry) => (entry.id === id ? next : entry))
        : [...list, next];
    const address = labelFieldAddress(ctx.side, id, "text");
    await ctx.session.transaction(`changing ${ctx.side} label`, async (tx) => {
        const layer = await writeLine(tx, ctx.row, ctx.side, listChannel(ctx.side), { value: entries }, ctx.fresh);
        if (change.binding === undefined && change.text === undefined) {
            return;
        }
        // Fixed words take the binding off; a binding goes on the layer that holds the entry.
        const own = tx.styles.get(layer);
        const encode: Record<string, unknown> = { ...own?.encode };
        if (change.binding === undefined) {
            Reflect.deleteProperty(encode, address);
        } else {
            encode[address] = change.binding;
        }
        await tx.styles.update(layer, { set: own?.set, encode: encode as Encoding }, { keepEmpty: true });
    });
}

/**
 * Takes one further label off every layer of the row the reader may edit, its bindings with it, as one undo step.
 * @param ctx - the row.
 * @param id - its id.
 * @returns when it is done.
 */
export async function removeEntry(ctx: RowContext, id: string): Promise<void> {
    const channel = listChannel(ctx.side);
    const prefix = `${ctx.side}.labels.${id}.`;
    await ctx.session.transaction(`removing ${ctx.side} label`, async (tx) => {
        for (const { id: layer } of ctx.layers.filter((each) => !each.locked)) {
            const own = tx.styles.get(layer);
            const held = own?.set?.[channel];
            const entries = Array.isArray(held) ? (held as readonly LabelEntry[]) : [];
            const keys = Object.keys(own?.encode ?? {}).filter((key) => key.startsWith(prefix));
            if (own === undefined || (!entries.some((entry) => entry.id === id) && keys.length === 0)) {
                continue;
            }
            const rest = entries.filter((entry) => entry.id !== id);
            const set: Record<string, unknown> = { ...own.set, [channel]: rest };
            if (rest.length === 0) {
                Reflect.deleteProperty(set, channel);
            }
            const encode: Record<string, unknown> = { ...own.encode };
            keys.forEach((key) => Reflect.deleteProperty(encode, key));
            await tx.styles.update(layer, { set, encode: encode as Encoding }, { keepEmpty: true });
        }
    });
}
