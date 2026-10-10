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
import type { Binding, Channel, ChannelValue, LabelStyle, LayerId } from "@graphty/graphty-element/schema";
import type { ColumnRef, GraphSession, Layer } from "@graphty/graphty-element/session";

import { runName } from "../runWords";
import { resultWord } from "./words";

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
            return "by" in bound ? { layer, binding: bound } : { layer, value: bound.value };
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
function without<T>(
    record: Partial<Record<Channel, T>> | undefined,
    ...keys: Channel[]
): Partial<Record<Channel, T>> | undefined {
    const rest = Object.fromEntries(
        Object.entries(record ?? {}).filter(([channel]) => !keys.includes(channel as Channel)),
    );
    return Object.keys(rest).length === 0 ? undefined : rest;
}

/** Each label channel's style channel. */
const LABEL_STYLE_CHANNEL: Partial<Readonly<Record<Channel, Channel>>> = {
    "node.label": "node.labelStyle",
    "edge.label": "edge.labelStyle",
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
 * The app's look for a label: the font the app itself is set in, at a size a reader can read,
 * drawn over the graph on a white chip, so a nearer node or a selected edge's band never cuts a
 * name. On top alone keeps every letter, but a label's ground is transparent: a selected edge's
 * blue band showed between the strokes and through a letter's open middle, and "Stadium" read
 * "Stadi m". The chip is the ground the letters need. graphty-element leaves all of it to its
 * consumer (its own default face is often missing, and then the browser falls back to a serif;
 * its labels sort by depth and have no ground), so the app states its choice on every label line
 * it adds. A click on a drawn name picks the node it names (`pickable`): a reader points at the
 * word they can read, not at the sphere under it.
 * @returns the label style.
 */
function appLabelLook(): LabelStyle {
    return {
        font: getComputedStyle(document.body).fontFamily,
        sizePx: LABEL_SIZE_PX,
        onTop: true,
        background: "#FFFFFF",
        cornerRadius: 4,
        pickable: true,
    };
}

/**
 * The app's label look for a label line being bound, unless the layer already styles its labels.
 * @param channel - the channel being written.
 * @param set - what the layer already sets.
 * @returns the style channel's entry to add, or nothing.
 */
function labelLookFor(
    channel: Channel,
    set: Partial<Record<Channel, ChannelValue>> | undefined,
): Partial<Record<Channel, ChannelValue>> {
    const style = LABEL_STYLE_CHANNEL[channel];
    return style === undefined || set?.[style] !== undefined ? {} : { [style]: appLabelLook() };
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
 * The selection's own row: the reader's layers whose `{ match: "ids" }` selector names exactly
 * the selected nodes and edges. One set of ids has one row, so selecting the same things again
 * edits the same row.
 * @param session - the element's session.
 * @returns the row's layer ids, empty when the selection has no row yet.
 */
export function selectionRow(session: GraphSession): LayerId[] {
    const { nodes, edges } = session.selection;
    return session.styles
        .list()
        .filter(
            ({ source, selector }) =>
                source.by === "user" &&
                selector.match === "ids" &&
                sameIds(selector.nodes, nodes) &&
                sameIds(selector.edges, edges),
        )
        .map((layer) => layer.id);
}

/**
 * The layer the selection's first edit adds: its ids, named after what is selected.
 * @param session - the element's session.
 * @param name - the selection's name (a node's label, "3 nodes").
 * @returns the layer to add.
 */
export function selectionLayer(session: GraphSession, name: string): NewLayer {
    const { nodes, edges } = session.selection;
    return { name, selector: { match: "ids", nodes: [...nodes], edges: [...edges] } };
}

/**
 * Writes one line of a row: a literal value or a binding, into the topmost layer of the row the
 * reader may edit. One undoable step of the element's.
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
    write: { readonly value: ChannelValue } | { readonly binding: DataBinding },
    fresh: NewLayer | undefined,
): Promise<LayerId> {
    const layers = rowLayers(session, ids, target);
    const own = [...layers].reverse().find((layer) => !layer.locked);
    const set = "value" in write ? { [channel]: write.value } : undefined;
    const encode = "binding" in write ? { [channel]: write.binding } : undefined;
    // A label line being bound brings the app's label look with it, in the same step.
    const look = encode === undefined ? {} : labelLookFor(channel, own?.set);
    if (own === undefined) {
        if (fresh === undefined) {
            throw new Error(`The row has no ${target} layer to write ${channel} to`);
        }
        const base = layers.at(-1) ?? topmostRow(session);
        const added = await session.styles.add(
            {
                name: fresh.name,
                target,
                selector: fresh.selector,
                ...(set === undefined && Object.keys(look).length === 0 ? {} : { set: { ...look, ...set } }),
                ...(encode === undefined ? {} : { encode }),
                ...(fresh.userData === undefined ? {} : { userData: fresh.userData }),
            },
            base === undefined ? undefined : { above: base.id },
        );
        return added.id;
    }
    await session.styles.update(own.id, {
        set: set === undefined ? without({ ...own.set, ...look }, channel) : { ...own.set, ...set },
        encode: encode === undefined ? without(own.encode, channel) : { ...own.encode, ...encode },
    });
    return own.id;
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
