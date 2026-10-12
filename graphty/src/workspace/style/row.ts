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

import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Binding, Channel, ChannelValue, CombineMode, LabelStyle, LayerId } from "@graphty/graphty-element/schema";
import type { ColumnRef, GraphSession, Layer } from "@graphty/graphty-element/session";

import { runName } from "../runWords";
import type { BeneathValue } from "./PropertyRow";
import { type Beneath, channelWord, resultWord, valueWords } from "./words";

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
 * Whether a layer below the row sets the channel (the Label section's Show checkbox appears only
 * then: tier1-design.md section 3, item 1).
 * @param session - the element's session.
 * @param ids - the row's layer ids.
 * @param channel - the channel.
 * @returns true when a lower layer of the same side sets or binds it.
 */
export function setBeneath(session: GraphSession, ids: readonly LayerId[], channel: Channel): boolean {
    const stack = session.styles.list();
    const lowest = stack.findIndex((layer) => ids.includes(layer.id));
    return stack
        .slice(0, Math.max(0, lowest))
        .some(
            (layer) => layer.enabled && (layer.set?.[channel] !== undefined || layer.encode?.[channel] !== undefined),
        );
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
 * The app's starting look and size for a label line being bound, unless the layer already styles
 * its labels.
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
function topmostRow(session: GraphSession): Layer | undefined {
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
 * @returns the id of the layer written to.
 */
export async function writeLine(
    session: GraphSession,
    ids: readonly LayerId[],
    target: Target,
    channel: Channel,
    write: LiteralWrite | { readonly binding: DataBinding },
    fresh: NewLayer | undefined,
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
    const set = "value" in write && !combined ? { [channel]: write.value } : undefined;
    let encode: Partial<Record<Channel, Binding>> | undefined;
    if ("binding" in write) {
        encode = { [channel]: write.binding };
    } else if (combined) {
        encode = { [channel]: { value: write.value, combine: write.combine } };
    }
    // A label line being bound brings the app's label look with it, in the same step.
    const look = "binding" in write ? labelLookFor(channel, own?.set) : {};
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
                ...(set === undefined && Object.keys(look).length === 0 ? {} : { set: { ...look, ...set } }),
                ...(encode === undefined ? {} : { encode }),
                ...(fresh.userData === undefined ? {} : { userData: fresh.userData }),
            };
            const at = base === undefined ? undefined : { above: base.id };
            const added = fresh.both
                ? await styles.addRow({ ...spec, target: "both" }, at)
                : await styles.add({ ...spec, target }, at);
            await strip(styles);
            return added.id;
        }
        if (own === undefined) {
            throw new Error(`The row has no ${target} layer to write ${channel} to`);
        }
        await styles.update(own.id, {
            set: set === undefined ? without({ ...own.set, ...look }, channel) : { ...own.set, ...set },
            encode: encode === undefined ? without(own.encode, channel) : { ...own.encode, ...encode },
        });
        await strip(styles);
        return own.id;
    };
    return others.length === 0
        ? apply(session.styles)
        : session.transaction(`Change ${channelWord(channel)}`, async (tx) => apply(tx.styles));
}

/**
 * Removes a line (or every part of a compound line) from the layer that sets it. The reader's
 * Everything layer is removed when nothing is left on it. One undoable step of the element's.
 * @param session - the element's session.
 * @param layer - the layer that sets the line.
 * @param channels - the channel, or each part's channel.
 */
export async function removeLine(session: GraphSession, layer: Layer, ...channels: Channel[]): Promise<void> {
    const set = without(layer.set, ...channels);
    const encode = without(layer.encode, ...channels);
    if (set === undefined && encode === undefined && layer.userData?.[EVERYTHING_KEY] === true) {
        await session.styles.remove(layer.id);
        return;
    }
    await session.styles.update(layer.id, { set, encode });
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
        descriptor.default ??
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
 * The name of what a binding reads, for its line: the column's name, or the run's result in the
 * app's words.
 * @param session - the element's session.
 * @param binding - the binding.
 * @returns the name, or null when no column or run result of this session has the binding's path.
 */
export function sourceName(session: GraphSession, binding: DataBinding): string | null {
    const column = session.data.attributes().find((attribute) => attribute.path === binding.by);
    if (column !== undefined) {
        return column.name;
    }
    for (const run of session.runs.list()) {
        const primary = session.results.path(run.id);
        const field = run.fields.find((f) => session.results.path(run.id, f.name) === binding.by);
        if (field !== undefined || primary === binding.by) {
            return resultWord(runName(session, run), field?.name ?? "", primary === binding.by);
        }
    }
    return null;
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

/** What one layer beneath a row writes for a channel. */
export interface BeneathShare {
    readonly value: unknown;
    readonly name: string;
}

/**
 * What the layers beneath a row write for one channel, each with its layer's name: graphty-element's
 * own answer (`styles.agreement` with `below`), over the whole graph.
 * ponytail: read over the whole graph, not the row's own elements (no scope names a layer's
 * matches), as the label's gray line does; scope it when the element offers one.
 * @param session - the element's session.
 * @param layers - the row's layers on this side, bottom first.
 * @param channel - the channel.
 * @returns the shares, empty when nothing beneath writes it or the row has no layer yet.
 */
export function sharesBeneath(session: GraphSession, layers: readonly Layer[], channel: Channel): BeneathShare[] {
    const own = layers.find((layer) => !layer.locked);
    if (own === undefined) {
        return [];
    }
    let channels: ReturnType<GraphSession["styles"]["agreement"]>["channels"];
    try {
        ({ channels } = session.styles.agreement("graph", channel, { below: own.row ?? own.id }));
    } catch {
        // A row the element's tree does not hold (a run's own layers) has no "beneath" to read.
        return [];
    }
    const nameOf = (id: string): string => session.styles.get(id)?.name ?? id;
    return channels.flatMap((found) => {
        if (found.state === "agree") {
            return found.value === undefined ? [] : [{ value: found.value, name: nameOf(found.layerId) }];
        }
        return found.breakdown
            .filter((share) => share.value !== undefined)
            .map((share) => ({ value: share.value, name: nameOf(share.layerId) }));
    });
}

/**
 * What the layers beneath a row give each channel, from graphty-element's own answer
 * (`styles.agreement` below the row): one value and the layer that paints it, the layers when the
 * value differs, or the channel's default when nothing beneath paints it.
 * @param session - the element's session.
 * @param below - the tree row the answer reads beneath, or undefined for the stack as it is.
 * @returns a reader by channel.
 */
export function beneathOf(session: GraphSession, below: string | undefined): (channel: Channel) => BeneathValue {
    // ponytail: read over the whole graph, not the row's own elements -- the element publishes no
    // scope for "what a layer matches" yet (owed with "Select what it paints"); one pass per panel
    // render over every element, fine at Les Miserables' size.
    let agreement: ReturnType<GraphSession["styles"]["agreement"]>;
    try {
        agreement = session.styles.agreement("graph", undefined, below === undefined ? undefined : { below });
    } catch {
        agreement = session.styles.agreement("graph");
    }
    const nameOf = (id: string): string => session.styles.get(id)?.name ?? id;
    const descriptorOf = (channel: Channel): ChannelDescriptor | undefined =>
        channelsFor(channel.startsWith("node.") ? "node" : "edge").find((d) => d.channel === channel);
    return (channel) => {
        const descriptor = descriptorOf(channel);
        const entry = agreement.channels.find((c) => c.channel === channel);
        if (descriptor === undefined) {
            return {};
        }
        if (entry === undefined) {
            return descriptor.default === undefined
                ? {}
                : {
                      value: descriptor.default,
                      words: { value: valueWords(descriptor, descriptor.default), from: undefined },
                  };
        }
        if (entry.state === "agree") {
            return {
                value: entry.value,
                words: { value: valueWords(descriptor, entry.value), from: nameOf(entry.layerId) },
            };
        }
        const values = new Set(entry.breakdown.map((share) => JSON.stringify(share.value)));
        const layers = [...new Set(entry.breakdown.map((share) => nameOf(share.layerId)))];
        // One value from several layers is still that value; only differing values are "Mixed".
        const words: Beneath =
            values.size === 1
                ? { value: valueWords(descriptor, entry.breakdown[0].value), from: layers.join(" and ") }
                : { mixed: layers.slice(0, 3) };
        return values.size === 1 ? { value: entry.breakdown[0].value, words } : { words };
    };
}
