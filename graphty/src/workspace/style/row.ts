/**
 * A row of the paint tree as the Style tab edits it: one or more of graphty-element's style layers
 * (a row may paint nodes and edges, one layer each). Every read is of the element's layer stack
 * and every write is one of its style verbs, so the row's look lives only in the element.
 *
 * "A bind edits the row it is on" (tier1-design.md 5.T9): a line is written into the topmost layer
 * of the row the reader may edit. The Everything row holds only the element's own base layers,
 * which are locked, so its first edit adds the reader's Everything layer directly above them,
 * marked in the layer's `userData` so the row keeps finding it.
 */

import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { Binding, Channel, ChannelValue, CombineMode, LayerId } from "@graphty/graphty-element/schema";
import { type ColumnRef, type GraphSession, type Layer, OVERFLOW_SHAPES } from "@graphty/graphty-element/session";

import { findTreeRow, rowLayers as treeRowLayers } from "../graph-place/rows";
import { DEFAULT_NAME_KEY } from "./cards";
import type { BeneathValue, RowContext } from "./PropertyRow";
import { channelPhrase, hexOf, OPACITY_OF, readableName } from "./words";

/** Which side of the Style tab: nodes or edges. */
export type Target = "node" | "edge";

/** A binding that reads a value from the data. */
export type DataBinding = Extract<Binding, { by: string }>;

/** The `userData` key that marks the reader's Everything layer. */
export const EVERYTHING_KEY = "graphtyEverything";

/** What the From data list hands back: a column of the file, or one field of a run's result. */
export type DataChoice =
    | { readonly kind: "column"; readonly column: ColumnRef }
    | { readonly kind: "result"; readonly runId: string; readonly field: string };

/** What a row says for one channel: the layer that says it, and the value or the binding. */
export interface Line {
    readonly layer: Layer;
    readonly value?: ChannelValue;
    readonly binding?: DataBinding;
    /** How a literal number meets what lies beneath, when not "replace". */
    readonly combine?: CombineMode;
    /** The lines of a `{ template }` binding: text built from several values. */
    readonly template?: readonly string[];
}

/** Text built from several values: a `{ template }` binding's lines. */
export interface TemplateWrite {
    readonly template: readonly string[];
}

/** A literal value to write, and how it meets what lies beneath (a number only). */
export interface LiteralWrite {
    readonly value: ChannelValue;
    readonly combine?: CombineMode;
}

/**
 * The layers of the Everything row: the element's own base layers and the reader's Everything
 * layer, bottom first.
 * @param session - the element's session.
 * @returns their ids.
 */
export function everythingRow(session: GraphSession): LayerId[] {
    return session.styles
        .list()
        .filter(
            (layer) =>
                (layer.source.by === "element" && layer.source.reason === "default") ||
                layer.userData?.[EVERYTHING_KEY] === true,
        )
        .map((layer) => layer.id);
}

/**
 * A row's layers on one side, bottom first (paint order).
 * @param session - the element's session.
 * @param ids - the row's layer ids.
 * @param target - nodes or edges.
 * @returns the layers.
 */
export function rowLayers(session: GraphSession, ids: readonly LayerId[], target: Target): Layer[] {
    return session.styles.list().filter((layer) => layer.target === target && ids.includes(layer.id));
}

/**
 * What the row says for a channel: the topmost of its layers that sets or binds it.
 * @param layers - the row's layers on one side, bottom first.
 * @param channel - the channel.
 * @returns the line, or undefined when the row does not set it.
 */
export function lineOf(layers: readonly Layer[], channel: Channel): Line | undefined {
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const bound = layer.encode?.[channel];
        if (bound !== undefined) {
            if ("by" in bound) {
                return { layer, binding: bound };
            }
            if ("template" in bound) {
                return { layer, template: bound.template };
            }
            return bound.combine === undefined || bound.combine === "replace"
                ? { layer, value: bound.value }
                : { layer, value: bound.value, combine: bound.combine };
        }
        const value = layer.set?.[channel];
        if (value !== undefined) {
            return { layer, value };
        }
    }
    return undefined;
}

/**
 * Copies a record without some keys, or answers undefined when nothing is left (which clears the
 * key on `styles.update`).
 * @param record - the record, or undefined.
 * @param keys - the keys to drop.
 * @returns the rest, or undefined.
 */
export function without<T>(
    record: Partial<Record<Channel, T>> | undefined,
    ...keys: Channel[]
): Partial<Record<Channel, T>> | undefined {
    const rest = Object.fromEntries(
        Object.entries(record ?? {}).filter(([channel]) => !keys.includes(channel as Channel)),
    );
    return Object.keys(rest).length === 0 ? undefined : rest;
}

/** How a label bound to a number writes it: three significant digits, not fifteen decimals. */
const NUMBER_FORMAT = { maximumSignificantDigits: 3 } as const;

/**
 * A text binding as the app writes it: a number value is written with three significant digits.
 * @param session - the element's session.
 * @param binding - the binding the element proposed.
 * @returns the binding, with a number format when it reads a number.
 */
export function textBinding(session: GraphSession, binding: DataBinding): DataBinding {
    const kind = session.data.readableValues().find((value) => value.path === binding.by)?.kind;
    return kind === "number" ? { ...binding, format: NUMBER_FORMAT } : binding;
}

/** The row a label line goes on, as the Style tab edits it, and what to inspect to show it. */
export interface LabelRow {
    readonly row: readonly LayerId[];
    readonly fresh?: NewLayer;
    readonly inspected: { readonly kind: "layer-row" | "everything-row"; readonly id?: string };
}

/**
 * The row "Add label line" writes to: the inspected layer row, else Everything (the starting
 * Everything row when the project has one, as the Graph tree lists it) -- the rows Text "+" writes
 * to when the reader is on them.
 * @param session - the element's session.
 * @param inspected - what is inspected, if anything.
 * @returns the row.
 */
export function labelRow(
    session: GraphSession,
    inspected: { readonly kind: string; readonly id?: string } | null | undefined,
): LabelRow {
    const id = inspected?.id;
    if (inspected?.kind === "layer-row" && id !== undefined && findTreeRow(session.styles.tree(), id) !== undefined) {
        return { row: treeRowLayers(session, id), inspected: { kind: "layer-row", id } };
    }
    const starting = startingEverything(session);
    return starting === undefined
        ? { row: everythingRow(session), fresh: EVERYTHING_LAYER, inspected: { kind: "everything-row" } }
        : { row: treeRowLayers(session, starting), inspected: { kind: "layer-row", id: starting } };
}

/**
 * Labels the nodes with a column on a row: the line Text "+" adds when the column is picked from
 * its source list -- only the words, no look and no size. One undoable step of the element's.
 * @param session - the element's session.
 * @param row - the row.
 * @param column - the node attribute.
 * @returns when it is written.
 */
export async function addLabelLine(session: GraphSession, row: LabelRow, column: ColumnRef): Promise<void> {
    const proposal = propose(session, { kind: "column", column }, "node.label");
    if (!proposal.ok) {
        throw new Error(`The element refused to label by ${column.name}: ${proposal.refusal.code}`);
    }
    await writeLine(
        session,
        row.row,
        "node",
        "node.label",
        { binding: textBinding(session, proposal.binding) },
        row.fresh,
    );
}

/** The layer a row's first edit adds when the row has no layer the reader may edit. */
export interface NewLayer {
    readonly name: string;
    readonly selector: Layer["selector"];
    readonly userData?: Record<string, unknown>;
    /** Whether the first edit adds a row painting nodes AND edges (`styles.addRow`), not one layer. */
    readonly both?: boolean;
    /** The unpinned row the first edit puts it directly above, in that row's folder; else the top. */
    readonly above?: string;
}

/** The reader's Everything layer, which the Everything row's first edit adds. */
export const EVERYTHING_LAYER: NewLayer = {
    name: "Everything",
    selector: { match: "everything" },
    userData: { [EVERYTHING_KEY]: true },
};

/**
 * The top layer of the paint tree's topmost row: the highest layer that is not the element's
 * selection, hover or notes highlight, which stay on top.
 * @param session - the element's session.
 * @returns the layer, or undefined for an empty stack.
 */
export function topmostRow(session: GraphSession): Layer | undefined {
    return [...session.styles.list()]
        .reverse()
        .find((layer) => layer.source.by !== "element" || layer.source.reason === "default");
}

/**
 * Whether two id lists hold the same ids.
 * @param a - one list, or undefined for none.
 * @param b - the other.
 * @returns true when equal as sets.
 */
function sameIds(a: readonly (string | number)[] | undefined, b: readonly (string | number)[]): boolean {
    const mine = new Set(a ?? []);
    return mine.size === new Set(b).size && b.every((id) => mine.has(id));
}

/**
 * The selection's own row: the reader's layers whose selector is the selection's
 * (`selection.layerSelector`): the rule the selection was made from, or, by id, exactly the
 * selected nodes and edges. One selection has one row, so selecting the same things again edits
 * the same row.
 * @param session - the element's session.
 * @returns the row's layer ids, empty when the selection has no row yet.
 */
export function selectionRow(session: GraphSession): LayerId[] {
    const wanted = session.selection.layerSelector;
    return session.styles
        .list()
        .filter(({ source, selector }) => {
            if (source.by !== "user") {
                return false;
            }
            if (wanted.match !== "ids" || selector.match !== "ids") {
                return sameSelector(selector, wanted);
            }
            return sameIds(selector.nodes, wanted.nodes ?? []) && sameIds(selector.edges, wanted.edges ?? []);
        })
        .map((layer) => layer.id);
}

/**
 * The layer the selection's first edit adds: the selection's own selector, named after it.
 * @param session - the element's session.
 * @param name - the selection's name (its rule, a node's label, "3 nodes").
 * @returns the layer to add.
 */
export function selectionLayer(session: GraphSession, name: string): NewLayer {
    // The name is a default: it follows the layer's cards until the reader renames it.
    return { name, selector: session.selection.layerSelector, userData: { [DEFAULT_NAME_KEY]: name } };
}

/**
 * The sessions whose next selection layer is being made by a section's "+" with a starting value
 * rather than a value the reader chose, so Escape before any change may take it back.
 */
export const startingAdds = new WeakSet<GraphSession>();

/**
 * The selector a binding needs on a row that paints everything, when graphty-element refuses it
 * there: a binding to a run's result is refused on a layer that paints every element
 * (`E_UNSCOPED_RUN_ENCODING`), and the element's own remedy is a layer scoped to the elements
 * that carry the result.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param channel - the bound channel.
 * @param binding - the binding.
 * @returns the scoped selector, or undefined when a layer that paints everything may hold it.
 */
function scopeFor(
    session: GraphSession,
    target: Target,
    channel: Channel,
    binding: DataBinding,
): Layer["selector"] | undefined {
    const check = session.styles.validate({
        name: "check",
        target,
        selector: { match: "everything" },
        encode: { [channel]: binding },
    });
    return check.errors.some((error) => error.code === "E_UNSCOPED_RUN_ENCODING")
        ? { match: "has", path: binding.by }
        : undefined;
}

/**
 * The place directly above a row, in the folder that holds it (bottom-first index).
 * @param session - the element's session.
 * @param id - the row.
 * @returns the place, or undefined when the row is gone.
 */
function placeAbove(session: GraphSession, id: string): { parent: string | null; index: number } | undefined {
    const found = findTreeRow(session.styles.tree(), id);
    if (found === undefined) {
        return undefined;
    }
    const parent = found.folders.at(-1);
    const siblings = parent?.children ?? session.styles.tree();
    return { parent: parent?.id ?? null, index: siblings.findIndex((row) => row.id === id) + 1 };
}

/**
 * Whether two selectors are the same.
 * @param a - one selector.
 * @param b - the other.
 * @returns true when equal.
 */
function sameSelector(a: Layer["selector"], b: Layer["selector"]): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** What one line of a row writes: a literal value, a data binding, or a text template. */
export type LineWrite =
    { readonly value: ChannelValue } | { readonly binding: DataBinding } | { readonly template: readonly string[] };

/**
 * Writes one line of a row: a literal value or a binding, into the topmost layer of the row the
 * reader may edit. One undoable step of the element's.
 *
 * On a row that paints everything (the Everything row) a binding to a run's result goes on a
 * layer of the row scoped to the elements the run measured, as graphty-element requires; every
 * other write goes on the row's layer that paints everything. The row keeps one line per channel:
 * the channel is taken off the row's other layers in the same step.
 * @param session - the element's session.
 * @param ids - the row's layer ids.
 * @param target - nodes or edges.
 * @param channel - the channel.
 * @param write - the value or the binding.
 * @param fresh - the layer the row's first edit adds when it has none the reader may edit, or
 *   undefined for a row that adds none (a run's row): the write then fails rather than land on a
 *   layer the row does not name.
 * @param also - values for other channels written in the same step where the layer has none.
 * @returns the id of the layer written to.
 */
export async function writeLine(
    session: GraphSession,
    ids: readonly LayerId[],
    target: Target,
    channel: Channel,
    write: LiteralWrite | { readonly binding: DataBinding } | TemplateWrite,
    fresh: NewLayer | undefined,
    also?: Readonly<Partial<Record<Channel, ChannelValue>>>,
): Promise<LayerId> {
    const layers = rowLayers(session, ids, target);
    const everything = fresh?.selector.match === "everything";
    const scope = everything && "binding" in write ? scopeFor(session, target, channel, write.binding) : undefined;
    const home = scope ?? fresh?.selector;
    const own = [...layers]
        .reverse()
        .find((layer) => !layer.locked && (!everything || home === undefined || sameSelector(layer.selector, home)));
    // A literal that combines with what lies beneath is an encoding of the value; a plain one is set.
    const combined = "value" in write && write.combine !== undefined && write.combine !== "replace";
    const literal = "value" in write && !combined ? { [channel]: write.value } : undefined;
    // Values written with it in the same step (a new label's size), where the layer has none.
    const extra = Object.fromEntries(
        Object.entries(also ?? {}).filter(([c]) => own?.set?.[c as Channel] === undefined),
    );
    const set = literal === undefined && Object.keys(extra).length === 0 ? undefined : { ...extra, ...literal };
    const encode = encodeOf(write, channel, combined);
    // On the Everything row, the other layers that write this channel, so the new line is its only one.
    const others = everything ? othersWriting(layers, own, channel) : [];
    if (own === undefined && fresh === undefined) {
        throw new Error(`The row has no ${target} layer to write ${channel} to`);
    }
    // Where a new layer goes when it lands above a row: just above it, among that row's siblings.
    const place = own === undefined && fresh?.above !== undefined ? placeAbove(session, fresh.above) : undefined;
    const plan: LinePlan = { session, layers, target, channel, fresh, home, own, set, encode, others, place };
    if (place !== undefined) {
        return session.transaction(`adding ${fresh?.name ?? "a layer"}`, async (tx) => applyLine(tx.styles, plan));
    }
    return others.length === 0
        ? applyLine(session.styles, plan)
        : session.transaction(`changing ${channelPhrase(channel)}`, async (tx) => applyLine(tx.styles, plan));
}

/**
 * The binding a line writes: a data binding, a text template, or a literal that combines with what
 * lies beneath.
 * @param write - the line's write.
 * @param channel - the channel.
 * @param combined - whether the literal combines with what lies beneath.
 * @returns the encode, or undefined for a plain literal.
 */
function encodeOf(
    write: LiteralWrite | { readonly binding: DataBinding } | TemplateWrite,
    channel: Channel,
    combined: boolean,
): Partial<Record<Channel, Binding>> | undefined {
    if ("binding" in write) {
        return { [channel]: write.binding };
    }
    if ("template" in write) {
        return { [channel]: { template: write.template } };
    }
    return combined ? { [channel]: { value: write.value, combine: write.combine } } : undefined;
}

/**
 * The row's other layers the reader may edit that write a channel.
 * @param layers - the row's layers.
 * @param own - the layer written to.
 * @param channel - the channel.
 * @returns the layers.
 */
function othersWriting(layers: readonly Layer[], own: Layer | undefined, channel: Channel): Layer[] {
    return layers.filter(
        (layer) =>
            !layer.locked &&
            layer !== own &&
            (layer.set?.[channel] !== undefined || layer.encode?.[channel] !== undefined),
    );
}

/** What writeLine writes, and where. */
interface LinePlan {
    readonly session: GraphSession;
    readonly layers: readonly Layer[];
    readonly target: Target;
    readonly channel: Channel;
    readonly fresh: NewLayer | undefined;
    /** The selector a new line's layer takes on the Everything row. */
    readonly home: Layer["selector"] | undefined;
    /** The layer written to, when the row has one. */
    readonly own: Layer | undefined;
    readonly set: Partial<Record<Channel, ChannelValue>> | undefined;
    readonly encode: Partial<Record<Channel, Binding>> | undefined;
    /** The other layers the channel is taken off. */
    readonly others: readonly Layer[];
    /** Where a new layer goes when it lands above a row. */
    readonly place: { parent: string | null; index: number } | undefined;
}

/**
 * Takes the channel off the plan's other layers, after the write, so a layer added above one of
 * them has it to stand on.
 * @param styles - the styles to write through.
 * @param plan - the write.
 */
async function stripOthers(styles: GraphSession["styles"], plan: LinePlan): Promise<void> {
    const { others, channel } = plan;
    for (const layer of others) {
        const rest = { set: without(layer.set, channel), encode: without(layer.encode, channel) };
        if (rest.set === undefined && rest.encode === undefined && layer.userData?.[EVERYTHING_KEY] === true) {
            await styles.remove(layer.id);
        } else {
            await styles.update(layer.id, rest);
        }
    }
}

/**
 * Writes the plan: into the row's layer, or a new layer when it has none.
 * @param styles - the styles to write through.
 * @param plan - the write.
 * @returns the id of the layer written to.
 */
async function applyLine(styles: GraphSession["styles"], plan: LinePlan): Promise<LayerId> {
    const { own, fresh, set, encode, channel } = plan;
    if (own === undefined && fresh !== undefined) {
        return addLine(styles, plan, fresh);
    }
    if (own === undefined) {
        throw new Error(`The row has no ${plan.target} layer to write ${channel} to`);
    }
    await styles.update(own.id, {
        set: set === undefined ? without(own.set, channel) : { ...without(own.set, channel), ...set },
        encode: encode === undefined ? without(own.encode, channel) : { ...own.encode, ...encode },
    });
    await stripOthers(styles, plan);
    return own.id;
}

/**
 * Writes the plan on the new layer the row's first edit adds, just above the row's topmost.
 * @param styles - the styles to write through.
 * @param plan - the write.
 * @param fresh - the new layer.
 * @returns the new layer's id.
 */
async function addLine(styles: GraphSession["styles"], plan: LinePlan, fresh: NewLayer): Promise<LayerId> {
    const { session, layers, home, set, encode, target, place } = plan;
    const base = layers.at(-1) ?? topmostRow(session);
    const spec = {
        name: fresh.name,
        selector: home ?? fresh.selector,
        ...(set === undefined ? {} : { set }),
        ...(encode === undefined ? {} : { encode }),
        ...(fresh.userData === undefined ? {} : { userData: fresh.userData }),
    };
    const at = base === undefined ? undefined : { above: base.id };
    const added = fresh.both
        ? await styles.addRow({ ...spec, target: "both" }, at)
        : await styles.add({ ...spec, target }, at);
    if (place !== undefined) {
        await styles.moveRow("row" in added ? (added.row ?? added.id) : added.id, place);
    }
    await stripOthers(styles, plan);
    return added.id;
}

/**
 * What a row writes for a channel: the line several rows share, or the row's own topmost.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns the line, or undefined.
 */
export function lineIn(ctx: Pick<RowContext, "many" | "layers">, channel: Channel): Line | undefined {
    return ctx.many === undefined ? lineOf(ctx.layers, channel) : ctx.many.line(channel);
}

/**
 * Whether a color field carries its opacity: Fill and Line do, unless the color or the opacity
 * varies by data, when the opacity keeps a line of its own.
 * @param ctx - the row.
 * @param channel - the color's channel.
 * @returns the opacity channel, or undefined.
 */
export function carriedOpacity(ctx: Pick<RowContext, "many" | "layers">, channel: Channel): Channel | undefined {
    const opacity = OPACITY_OF[channel];
    const bound = (each: Channel): boolean => lineIn(ctx, each)?.binding !== undefined;
    return opacity === undefined || bound(channel) || bound(opacity) ? undefined : opacity;
}

/**
 * Writes one value or binding to the row, or to every row of several edited together.
 * @param ctx - the row.
 * @param channel - the channel.
 * @param write - the value or the binding.
 * @param also - values for other channels written with it where the row has none.
 * @returns when it is written.
 */
export function writeIn(
    ctx: Pick<RowContext, "many" | "session" | "row" | "side" | "fresh">,
    channel: Channel,
    write: LiteralWrite | { readonly binding: DataBinding },
    also?: Readonly<Partial<Record<Channel, ChannelValue>>>,
): Promise<unknown> {
    const { many } = ctx;
    if (many === undefined) {
        return writeLine(ctx.session, ctx.row, ctx.side, channel, write, ctx.fresh, also);
    }
    // ponytail: several rows take the extra values as separate writes, one undo step each.
    return many.write(channel, write).then(() =>
        Promise.all(
            Object.entries(also ?? {})
                .filter(([c, value]) => value !== undefined && many.line(c as Channel) === undefined)
                .map(([c, value]) => many.write(c as Channel, { value })),
        ),
    );
}

/**
 * Removes a line (or every part of a compound line) from the layer that sets it. The reader's
 * Everything layer is removed when nothing is left on it. One undoable step of the element's.
 * @param session - the element's session, or a transaction's scope.
 * @param layer - the layer that sets the line.
 * @param channels - the channel, or each part's channel.
 */
export async function removeLine(
    session: Pick<GraphSession, "styles">,
    layer: Layer,
    ...channels: Channel[]
): Promise<void> {
    const set = without(layer.set, ...channels);
    const encode = without(layer.encode, ...channels);
    if (set === undefined && encode === undefined && layer.userData?.[EVERYTHING_KEY] === true) {
        await session.styles.remove(layer.id);
        return;
    }
    // The layer stays when this was its last value: the panel removes properties one at a time.
    await session.styles.update(layer.id, { set, encode }, { keepEmpty: true });
}

/**
 * The value a line starts with when "+" adds it: on a selection's layer (a selector that names
 * ids), what the element's highlight paints for the channel, so the chosen things change at once;
 * otherwise the element's own default for the channel, else the least or first value the element
 * says it accepts, else no value for a text. The app never invents a graph value: a channel the
 * element states none of these for is an element defect.
 * @param descriptor - the channel.
 * @param session - the element's session, when the layer may be a selection's.
 * @param selector - the selector of the layer the line goes on, when known.
 * @returns the value.
 */
export function startingValue(
    descriptor: ChannelDescriptor,
    session?: GraphSession,
    selector?: Layer["selector"],
): ChannelValue {
    const own = APP_STARTS[descriptor.channel];
    if (own !== undefined) {
        return own;
    }
    const highlight =
        session !== undefined && selector?.match === "ids"
            ? session.styles.highlightStyle(descriptor.target)[descriptor.channel]
            : undefined;
    const value =
        highlight ??
        // What the element draws there now (no head on an undirected graph), else the catalog's:
        // its default, or the value that draws nothing (a label background with no color).
        session?.styles.defaultValue(descriptor.channel) ??
        descriptor.default ??
        descriptor.off ??
        (descriptor.accepts === "number" ? descriptor.min : undefined) ??
        (descriptor.accepts === "enum" ? descriptor.values?.[0] : undefined) ??
        (descriptor.accepts === "text" ? "" : undefined);
    if (value === undefined) {
        throw new Error(`graphty-element states no starting value for ${descriptor.channel}`);
    }
    return value;
}

/**
 * Starting values the app chooses where the element has no value that draws what is there now.
 * A pattern count left unset follows the element's spacing rule, which differs edge by edge, and
 * the channel's floor (2) draws only a mark at each end, so the line seems to vanish.
 */
const APP_STARTS: Readonly<Partial<Record<Channel, ChannelValue>>> = { "edge.patternCount": 10 };

/**
 * What `encode()` would store for a choice on a channel, from the element.
 * @param session - the element's session.
 * @param choice - the column or the run field.
 * @param channel - the channel.
 * @returns the element's proposal.
 */
export function propose(
    session: GraphSession,
    choice: DataChoice,
    channel: Channel,
): ReturnType<GraphSession["styles"]["proposeEncoding"]> {
    const range = appRange(channel);
    return choice.kind === "column"
        ? session.styles.proposeEncoding({ column: choice.column, channel, ...range })
        : session.styles.proposeEncoding({ run: choice.runId, field: choice.field, channel, ...range });
}

/**
 * The app's own range for a channel that varies: an opacity never fades below 20%, so the faintest
 * element stays visible. The element's default range stays 0 to 1.
 * @param channel - the channel.
 * @returns `{ range }` for an opacity, else nothing.
 */
export function appRange(channel: Channel): { range?: [number, number] } {
    return OPACITY.test(channel) ? { range: [...OPACITY_RANGE] as [number, number] } : {};
}

/** The channels the app's opacity range applies to: every opacity. */
const OPACITY = /opacity$/i;

/** How faint to how solid a varying opacity draws: 20% to 100%. */
const OPACITY_RANGE: readonly [number, number] = [0.2, 1];

/**
 * Whether graphty-element answers the path a binding reads: its own check of the binding
 * (`styles.validate`), which reports a path nothing in the session answers. The app does not
 * search the data for it.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param channel - the bound channel.
 * @param binding - the binding.
 * @returns true when the element reports the path unresolved.
 */
export function readsNothing(session: GraphSession, target: Target, channel: Channel, binding: DataBinding): boolean {
    const check = session.styles.validate({
        name: "check",
        target,
        selector: { match: "everything" },
        encode: { [channel]: binding },
    });
    return check.unresolvedPaths.includes(binding.by);
}

/**
 * The name of what a binding reads, for its line: the column's name, or the run's value by the
 * name every other surface gives it ("Connections", not the method's "Degree").
 * @param session - the element's session.
 * @param binding - the binding.
 * @returns the name, or null when no column or run result of this session has the binding's path.
 */
export function sourceName(session: GraphSession, binding: Pick<DataBinding, "by">): string | null {
    // The node id, and a column that only spells it, go by one name wherever they are listed.
    if (
        binding.by === "id" ||
        session.data.readableValues().some((each) => each.path === binding.by && each.holdsNodeIds === true)
    ) {
        return "Node id";
    }
    const column = session.data.attributes().find((attribute) => attribute.path === binding.by);
    if (column !== undefined) {
        return column.name;
    }
    const value = session.data.readableValues().find((each) => each.runId !== undefined && each.path === binding.by);
    return value === undefined ? null : readableName(session, value).name;
}

/**
 * A layer as the reader knows it: its tree row's name, or undefined for graphty-element's own base
 * layers, which the tree never shows and the panel calls "the default".
 * @param session - the element's session.
 * @param id - the layer.
 * @returns the name, or undefined for a base layer.
 */
export function layerWord(session: GraphSession, id: LayerId): string | undefined {
    const layer = session.styles.get(id);
    if (layer === undefined) {
        return id;
    }
    if (layer.source.by === "element" && layer.source.reason === "default") {
        return undefined;
    }
    return findTreeRow(session.styles.tree(), layer.row ?? layer.id)?.row.name ?? layer.name;
}

/**
 * graphty-element's answer for what lies beneath a row, read over the row's own elements
 * (`over`): a row that matches nothing (Selected with nothing selected, Hovered) is read over
 * every element through the layers that match every element, its floor.
 * @param session - the element's session.
 * @param row - the tree row, or undefined for the stack as it is.
 * @param channel - one channel, or every channel.
 * @param scope - the elements a row not written yet reads over.
 * @returns the answer.
 */
function agreementBeneath(
    session: GraphSession,
    row: string | undefined,
    channel?: Channel,
    scope: "graph" | "selection" = "graph",
): ReturnType<GraphSession["styles"]["agreement"]> {
    if (row === undefined) {
        return session.styles.agreement(scope, channel);
    }
    try {
        return session.styles.agreement("graph", channel, { below: row, over: row });
    } catch {
        // A row the element's tree does not hold (a run's own layers) has no "beneath" to read.
        return session.styles.agreement("graph", channel);
    }
}

/**
 * Names for a list of layers: each once, "the default" for graphty-element's base layers.
 * @param session - the element's session.
 * @param ids - the layers, most elements first.
 * @returns the names.
 */
function layerWords(session: GraphSession, ids: readonly LayerId[]): string[] {
    return [...new Set(ids.map((id) => layerWord(session, id) ?? "the default"))];
}

/**
 * What the layers beneath a row paint for each channel over the row's own elements, when they
 * paint one value on all of them: graphty-element's own answer (`styles.agreement` with `below`
 * and `over`). It is never shown; "+" starts a property from it, so adding a property over one
 * plain value changes nothing on the canvas, and over values that vary (a binding beneath) starts
 * from one plain value instead of copying a mapping.
 * @param session - the element's session.
 * @param row - the tree row the answer reads beneath and over, or undefined for the stack as it is.
 * @param scope - for a row not written yet, the elements it will paint: the selection's own row
 *     reads over the selection, so "+" there starts at what the selected elements draw now.
 * @returns a reader by channel.
 */
export function beneathOf(
    session: GraphSession,
    row: string | undefined,
    scope: "graph" | "selection" = "graph",
): (channel: Channel) => BeneathValue {
    const agreement = agreementBeneath(session, row, undefined, scope);
    return (channel) => {
        const entry = agreement.channels.find((c) => c.channel === channel);
        return entry?.state === "agree" && entry.value !== undefined ? { value: entry.value } : {};
    };
}

/** A field a layer above paints over: who, and on how many of this row's elements. */
export interface PaintedOver {
    /** The rows that paint over it, the most elements first. */
    readonly by: readonly string[];
    /** A layer of each name in `by`, in the same order, which a link to it opens. */
    readonly layers: readonly LayerId[];
    /** On how many of the row's elements. */
    readonly count: number;
    /** How many elements of the field's kind the row matches. */
    readonly of: number;
}

/**
 * Which of a row's fields a layer above paints over, read from graphty-element's answer over the
 * row's own elements with the whole stack (`styles.agreement` with `over`): an element whose
 * deciding layer is not one of the row's. A row that matches nothing is never painted over.
 * @param session - the element's session.
 * @param row - the tree row.
 * @param ids - the row's layers.
 * @returns a reader by channel: the facts, or undefined where nothing paints over it.
 */
export function paintedOverOf(
    session: GraphSession,
    row: string,
    ids: readonly LayerId[],
): (channel: Channel) => PaintedOver | undefined {
    let agreement: ReturnType<GraphSession["styles"]["agreement"]>;
    try {
        agreement = session.styles.agreement("graph", undefined, { over: row });
    } catch {
        return () => undefined;
    }
    if (agreement.readOver !== "row") {
        return () => undefined;
    }
    const matchedOf = (kind: Target): number =>
        rowLayers(session, ids, kind).reduce(
            (most, layer) => Math.max(most, session.styles.counts(layer.id).matched),
            0,
        );
    return (channel) => {
        const entry = agreement.channels.find((c) => c.channel === channel);
        if (entry === undefined) {
            return undefined;
        }
        const of = matchedOf(channel.startsWith("node.") ? "node" : "edge");
        const shares =
            entry.state === "agree"
                ? [{ layerId: entry.layerId, count: of - entry.unpainted }]
                : entry.breakdown.map((share) => ({ layerId: share.layerId, count: share.count }));
        const above = shares.filter((share) => !ids.includes(share.layerId) && share.count > 0);
        if (above.length === 0) {
            return undefined;
        }
        const covering = above.map((share) => share.layerId);
        const by = layerWords(session, covering);
        return {
            by,
            layers: by.map(
                (name) => covering.find((id) => (layerWord(session, id) ?? "the default") === name) ?? covering[0],
            ),
            count: above.reduce((sum, share) => sum + share.count, 0),
            of,
        };
    };
}

/**
 * How many of several rows edited together write a channel, while they do not all write it alike:
 * "Set on 1 of 2". Undefined when one row is edited, none of them writes it, or all write the
 * same.
 * @param ctx - the rows.
 * @param channels - the channel, or each channel of one entry.
 * @returns how many write it, of how many.
 */
export function partlySet(
    ctx: Pick<RowContext, "many">,
    ...channels: Channel[]
): { readonly set: number; readonly of: number } | undefined {
    const { many } = ctx;
    if (many === undefined || channels.some((channel) => many.line(channel) !== undefined)) {
        return undefined;
    }
    const set = Math.max(...channels.map((channel) => many.count(channel)));
    return set === 0 ? undefined : { set, of: many.of };
}

/**
 * The value "+" starts a property with: what the layers beneath paint when they paint one plain
 * value on the row's elements, else graphty-element's starting value for the channel.
 * @param ctx - the row.
 * @param descriptor - the property.
 * @returns the value.
 */
export function startFor(
    ctx: Pick<RowContext, "session" | "beneath" | "layers" | "fresh">,
    descriptor: ChannelDescriptor,
): ChannelValue {
    const beneath = ctx.beneath(descriptor.channel).value;
    if (beneath !== undefined) {
        if (descriptor.accepts === "color") {
            const hex = hexOf(beneath);
            if (hex !== null) {
                return hex;
            }
        } else if (typeof beneath === "number" || typeof beneath === "string" || typeof beneath === "boolean") {
            return beneath;
        }
    }
    const selector = ctx.layers.find((layer) => !layer.locked)?.selector ?? ctx.fresh?.selector;
    return startingValue(descriptor, ctx.session, selector);
}

/**
 * The starting Everything row: the tree row whose layers carry graphty-element's Everything
 * template (`startingRows`).
 * @param session - the element's session.
 * @returns its id, or undefined when the tree has none.
 */
export function startingEverything(session: GraphSession): string | undefined {
    const layer = session.styles
        .list()
        .find((each) => each.source.by === "template" && each.source.templateId === EVERYTHING_TEMPLATE);
    return layer === undefined ? undefined : (layer.row ?? layer.id);
}

/** The template id graphty-element gives the Everything starting row's layers. */
export const EVERYTHING_TEMPLATE = "graphty:starting-everything";

/**
 * The palettes a set of layers or groups can be told apart by: the categorical ones.
 * @param session - the element's session.
 * @returns the palettes.
 */
export function groupPalettes(session: GraphSession): ReturnType<GraphSession["catalog"]["palettes"]> {
    // Two-color highlight palettes name one value against the rest, never a set of groups.
    return session.catalog.palettes().filter((p) => p.kind === "categorical" && p.colors.length > 2);
}

/**
 * A painted value as it is written back as a plain value: a color's hex, a number or words.
 * @param paint - what the element paints.
 * @returns the value, or undefined when it paints nothing.
 */
function plainOf(paint: unknown): ChannelValue | undefined {
    if (typeof paint === "number" || typeof paint === "string") {
        return paint;
    }
    return hexOf(paint)?.toUpperCase();
}

/** What a binding across layers reads: a binding without a path, its `map` keyed by layer id. */
export type LayerBinding = Parameters<GraphSession["styles"]["sequence"]>[0];

/** One layer's values: the property's, and the overflow's second cue's when it steps one. */
export type LayerValues = Readonly<Partial<Record<ChannelDescriptor["channel"], ChannelValue>>>;

/**
 * A layer's paints as plain values, by channel.
 * @param paints - what a binding paints it, by channel.
 * @returns the plain values.
 */
function plainValues(paints: Readonly<Partial<Record<ChannelDescriptor["channel"], unknown>>>): LayerValues {
    return Object.fromEntries(
        Object.entries(paints).flatMap(([channel, paint]) => {
            const value = plainOf(paint);
            return value === undefined ? [] : [[channel, value]];
        }),
    );
}

/**
 * The plain values a binding across layers gives each layer, read from graphty-element's
 * `styles.layerGroups` (a layer's own map entry included): what closing the popover writes. Past
 * the given layers ("Also set those" goes on after them), the sequence continues without the map.
 * @param session - the element's session
 * @param binding - the binding
 * @param channel - the property
 * @param layers - the layers, top first
 * @param count - how many values, at least as many as the layers
 * @returns one entry per item, or null when the element refuses the binding
 */
export function layerValues(
    session: GraphSession,
    binding: LayerBinding,
    channel: ChannelDescriptor["channel"],
    layers: readonly LayerId[],
    count: number,
): LayerValues[] | null {
    try {
        const paints = new Map(
            session.styles.layerGroups(layers, binding, { channel }).map((g) => [g.value, g.paints]),
        );
        const first = layers.map((id) => plainValues(paints.get(id) ?? {}));
        if (count <= first.length) {
            return first.slice(0, count);
        }
        const { map: _map, ...rest } = binding;
        const seq = session.styles.sequence(rest, { channel, count });
        return [
            ...first,
            ...seq.values.slice(first.length).map((paint, at) =>
                plainValues({
                    [channel]: paint,
                    ...(seq.cue === null ? {} : { [seq.cue.channel]: seq.cue.values[first.length + at] }),
                }),
            ),
        ];
    } catch {
        return null;
    }
}

/**
 * The shape list with the shapes graphty-element keeps apart past a palette first (its
 * "repeat colors, change shape" overflow), then the rest in the channel's order.
 * @param descriptor - the node shape channel.
 * @returns every shape, most distinct first.
 */
function shapesApartFirst(descriptor: ChannelDescriptor): string[] {
    const first: readonly string[] = OVERFLOW_SHAPES;
    return [...first, ...(descriptor.values ?? []).filter((shape) => !first.includes(shape))];
}

/**
 * The binding Vary by Layer starts from: the first group palette with a color for each layer, every
 * layer its own color, for a color, the shapes kept apart first for a shape, the app's range for a number.
 * @param session - the element's session.
 * @param descriptor - the property.
 * @param count - how many layers it varies across.
 * @returns the binding.
 */
function startingBinding(session: GraphSession, descriptor: ChannelDescriptor, count: number): LayerBinding {
    const isColor = descriptor.accepts === "color";
    // The first group palette with a color for every layer, so ten layers never draw three
    // near-identical colors past an eight-color palette's end; the first when none has room.
    const palettes = groupPalettes(session);
    const palette = isColor ? (palettes.find((p) => p.colors.length >= count) ?? palettes[0])?.id : undefined;
    const { range } = appRange(descriptor.channel);
    return {
        ...(palette === undefined ? {} : { palette }),
        ...(isColor ? { overflow: "extend" as const } : {}),
        ...(descriptor.channel === "node.shape" ? { choices: shapesApartFirst(descriptor) } : {}),
        ...(range === undefined ? {} : { range: [range[0], range[1]] }),
    };
}

/**
 * The binding Vary by Layer opens on: each layer's value now as its own entry (the map keyed by
 * layer id), over the starting binding.
 * @param session - the element's session.
 * @param descriptor - the property.
 * @param prefill - each layer's value now; none to start from the palette.
 * @param count - how many layers it varies across; by default, how many the prefill names.
 * @returns the binding.
 */
export function layersBinding(
    session: GraphSession,
    descriptor: ChannelDescriptor,
    prefill?: readonly { readonly id: LayerId; readonly value: ChannelValue }[],
    count = prefill?.length ?? 0,
): LayerBinding {
    const binding = startingBinding(session, descriptor, count);
    if (prefill === undefined) {
        return binding;
    }
    // Each layer's own value is its row's entry: nothing is kept between openings.
    const map = Object.fromEntries(prefill.map((each) => [each.id, each.value]));
    return { ...binding, map: map as LayerBinding["map"] };
}
