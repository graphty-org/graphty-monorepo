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
import type { Binding, Channel, ChannelValue, CombineMode, LabelStyle, LayerId } from "@graphty/graphty-element/schema";
import type { ColumnRef, GraphSession, Layer } from "@graphty/graphty-element/session";

import { findTreeRow } from "../graph-place/rows";
import type { BeneathValue, RowContext } from "./PropertyRow";
import { channelWord, hexOf, readableName } from "./words";

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

/** Each label channel's style channel and size channel. */
const LABEL_CHANNELS: Partial<Readonly<Record<Channel, { readonly style: Channel; readonly size: Channel }>>> = {
    "node.label": { style: "node.labelStyle", size: "node.labelSize" },
    "edge.label": { style: "edge.labelStyle", size: "edge.labelSize" },
};

/**
 * How tall the app draws a label's letters on the label's own canvas. graphty-element sizes a
 * label in world units (one unit per 48 of these), so its size on screen follows the zoom: at 72
 * a 20-node file framed whole reads at about 10 px and a 9-node one at about 22 px, where the
 * element's own 48 drew the 20-node one at 6 px. A size fixed on screen would need the element to
 * offer one.
 */
export const LABEL_SIZE_PX = 72;

/**
 * The app's starting look for a new label: graphty-element's Card look (dark text on a white,
 * bordered chip, in a sans serif), drawn over the graph, and picking the node it names. On top
 * alone keeps every letter, but a label's ground is transparent: a selected edge's blue band
 * showed between the strokes and through a letter's open middle, and "Stadium" read "Stadi m". The
 * chip is the ground the letters need. A click on a drawn name picks the node it names
 * (`pickable`): a reader points at the word they can read, not at the sphere under it. Where it
 * sits and how it behaves are not part of a look, so the entry reads "Card", not "Card, edited".
 * @returns the label style.
 */
function appLabelLook(): LabelStyle {
    return { look: "card", onTop: true, pickable: true };
}

/**
 * The app's starting look and size for an attribute's "Add label line", unless the layer already
 * styles its labels. A label added from the Style tab's Text list writes only its words.
 * @param channel - the channel being written.
 * @param set - what the layer already sets.
 * @returns the style and size channels' entries to add, or nothing.
 */
function labelLookFor(
    channel: Channel,
    set: Partial<Record<Channel, ChannelValue>> | undefined,
): Partial<Record<Channel, ChannelValue>> {
    const label = LABEL_CHANNELS[channel];
    if (label === undefined || set?.[label.style] !== undefined) {
        return {};
    }
    return {
        [label.style]: appLabelLook(),
        ...(set?.[label.size] === undefined ? { [label.size]: LABEL_SIZE_PX } : {}),
    };
}

/**
 * Adds a row on top whose node label reads a column, in the app's label look: one undoable step.
 * The door of every "Add label line" on an attribute.
 * @param session - the element's session.
 * @param column - the node attribute.
 * @returns the new layer.
 */
export async function addLabelRow(session: GraphSession, column: ColumnRef): Promise<Layer> {
    return session.transaction("Add label line", async (tx) => {
        const layer = await tx.styles.encode({ column, channel: "node.label" });
        await tx.styles.update(layer.id, { set: { ...layer.set, ...labelLookFor("node.label", layer.set) } });
        return layer;
    });
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
    return { name, selector: session.selection.layerSelector };
}

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
    write: LiteralWrite | { readonly binding: DataBinding },
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
    let encode: Partial<Record<Channel, Binding>> | undefined;
    if ("binding" in write) {
        encode = { [channel]: write.binding };
    } else if (combined) {
        encode = { [channel]: { value: write.value, combine: write.combine } };
    }
    // On the Everything row, the other layers that write this channel, so the new line is its only one.
    const others = everything
        ? layers.filter(
              (layer) =>
                  !layer.locked &&
                  layer !== own &&
                  (layer.set?.[channel] !== undefined || layer.encode?.[channel] !== undefined),
          )
        : [];
    if (own === undefined && fresh === undefined) {
        throw new Error(`The row has no ${target} layer to write ${channel} to`);
    }
    // Where a new layer goes when it lands above a row: just above it, among that row's siblings.
    const place = own === undefined && fresh?.above !== undefined ? placeAbove(session, fresh.above) : undefined;
    // Taken off after the write, so a layer added above one of them has it to stand on.
    const strip = async (styles: GraphSession["styles"]): Promise<void> => {
        for (const layer of others) {
            const rest = { set: without(layer.set, channel), encode: without(layer.encode, channel) };
            if (rest.set === undefined && rest.encode === undefined && layer.userData?.[EVERYTHING_KEY] === true) {
                await styles.remove(layer.id);
            } else {
                await styles.update(layer.id, rest);
            }
        }
    };
    const apply = async (styles: GraphSession["styles"]): Promise<LayerId> => {
        if (own === undefined && fresh !== undefined) {
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
            await strip(styles);
            return added.id;
        }
        if (own === undefined) {
            throw new Error(`The row has no ${target} layer to write ${channel} to`);
        }
        await styles.update(own.id, {
            set: set === undefined ? without(own.set, channel) : { ...without(own.set, channel), ...set },
            encode: encode === undefined ? without(own.encode, channel) : { ...own.encode, ...encode },
        });
        await strip(styles);
        return own.id;
    };
    if (place !== undefined) {
        return session.transaction(`Add ${fresh?.name ?? "layer"}`, async (tx) => apply(tx.styles));
    }
    return others.length === 0
        ? apply(session.styles)
        : session.transaction(`Change ${channelWord(channel)}`, async (tx) => apply(tx.styles));
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
    return choice.kind === "column"
        ? session.styles.proposeEncoding({ column: choice.column, channel })
        : session.styles.proposeEncoding({ run: choice.runId, field: choice.field, channel });
}

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
export function sourceName(session: GraphSession, binding: DataBinding): string | null {
    const column = session.data.attributes().find((attribute) => attribute.path === binding.by);
    if (column !== undefined) {
        return column.name;
    }
    const value = session.data.readableValues().find((each) => each.runId !== undefined && each.path === binding.by);
    return value === undefined ? null : readableName(session, value).name;
}

/** The legend block of a run that paints a color. */
type ColorBlock = ReturnType<GraphSession["styles"]["legend"]>[number];

/**
 * The legend block through which a run paints its color, or undefined when it paints none (or
 * the element has not prepared it yet).
 * @param session - the element's session.
 * @param runId - the run.
 * @returns the block.
 */
export function colorBlockOf(session: GraphSession, runId: string): ColorBlock | undefined {
    return session.styles.legend().find((block) => block.runId === runId && block.palette !== undefined);
}

/** Where a run binds its color: the layer, the channel and the binding, read from the style stack. */
interface RunColor {
    readonly layerId: LayerId;
    readonly channel: Channel;
    readonly binding: DataBinding;
}

/**
 * The color binding of a run's layers, or undefined when the run binds no color.
 * @param session - the element's session.
 * @param runId - the run.
 * @returns the binding and where it sits.
 */
export function runColorOf(session: GraphSession, runId: string): RunColor | undefined {
    const owned = session.runs.bindings(runId);
    for (const layer of session.styles.list()) {
        if (!owned.includes(layer.id)) {
            continue;
        }
        const channel: Channel = `${layer.target}.color`;
        const binding = layer.encode?.[channel];
        if (binding !== undefined && "by" in binding) {
            return { layerId: layer.id, channel, binding };
        }
    }
    return undefined;
}

/**
 * Whether a run's color binding leaves a group unpainted (`styles.setValueHidden`). Compared as
 * the legend spells a value, so the group `0` and the text `"0"` are the same.
 * @param color - the run's color binding.
 * @param group - the group.
 * @returns true when hidden.
 */
export function groupHidden(color: RunColor, group: string | number): boolean {
    return (color.binding.hidden ?? []).some((value) => String(value) === String(group));
}

/**
 * Paints one group of a run in its own color: one `styles.update` of the run's color binding with
 * that group's entry in `map` set, so the other groups keep the palette. The palette the element
 * reports is written into the binding, so naming one group's color does not drop the rest.
 * @param session - the element's session.
 * @param color - the run's color binding.
 * @param palette - the palette the element paints it with, from the run's legend block.
 * @param group - the group, as the run's summary spells it.
 * @param value - the color.
 */
export async function writeGroupColor(
    session: GraphSession,
    color: RunColor,
    palette: ColorBlock["palette"],
    group: string | number,
    value: string,
): Promise<void> {
    const layer = session.styles.get(color.layerId);
    if (layer === undefined) {
        return;
    }
    const { binding } = color;
    await session.styles.update(layer.id, {
        encode: {
            ...layer.encode,
            [color.channel]: {
                ...binding,
                palette: binding.palette ?? palette?.name,
                map: { ...binding.map, [String(group)]: value },
            },
        },
    });
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
 * @returns the answer.
 */
function agreementBeneath(
    session: GraphSession,
    row: string | undefined,
    channel?: Channel,
): ReturnType<GraphSession["styles"]["agreement"]> {
    if (row === undefined) {
        return session.styles.agreement("graph", channel);
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
 * @returns a reader by channel.
 */
export function beneathOf(session: GraphSession, row: string | undefined): (channel: Channel) => BeneathValue {
    const agreement = agreementBeneath(session, row);
    return (channel) => {
        const entry = agreement.channels.find((c) => c.channel === channel);
        return entry?.state === "agree" && entry.value !== undefined ? { value: entry.value } : {};
    };
}

/** A field a layer above paints over: who, and on how many of this row's elements. */
export interface PaintedOver {
    /** The rows that paint over it, the most elements first. */
    readonly by: readonly string[];
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
        return {
            by: layerWords(
                session,
                above.map((share) => share.layerId),
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
