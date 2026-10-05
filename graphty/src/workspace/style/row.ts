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
import type { Binding, Channel, ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { ColumnRef, GraphSession, Layer } from "@graphty/graphty-element/session";

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
 * Copies a record without one key, or answers undefined when nothing is left (which clears the
 * key on `styles.update`).
 * @param record - the record, or undefined.
 * @param key - the key to drop.
 * @returns the rest, or undefined.
 */
function without<T>(
    record: Partial<Record<Channel, T>> | undefined,
    key: Channel,
): Partial<Record<Channel, T>> | undefined {
    const rest = Object.fromEntries(Object.entries(record ?? {}).filter(([channel]) => channel !== key));
    return Object.keys(rest).length === 0 ? undefined : (rest as Partial<Record<Channel, T>>);
}

/**
 * Writes one line of a row: a literal value or a binding, into the topmost layer of the row the
 * reader may edit. One undoable step of the element's.
 * @param session - the element's session.
 * @param ids - the row's layer ids.
 * @param target - nodes or edges.
 * @param channel - the channel.
 * @param write - the value or the binding.
 * @returns the id of the layer written to.
 */
export async function writeLine(
    session: GraphSession,
    ids: readonly LayerId[],
    target: Target,
    channel: Channel,
    write: { readonly value: ChannelValue } | { readonly binding: DataBinding },
): Promise<LayerId> {
    const layers = rowLayers(session, ids, target);
    const own = [...layers].reverse().find((layer) => !layer.locked);
    const set = "value" in write ? { [channel]: write.value } : undefined;
    const encode = "binding" in write ? { [channel]: write.binding } : undefined;
    if (own === undefined) {
        const base = layers.at(-1);
        const added = await session.styles.add(
            {
                name: "Everything",
                target,
                selector: { match: "everything" },
                ...(set === undefined ? {} : { set }),
                ...(encode === undefined ? {} : { encode }),
                userData: { [EVERYTHING_KEY]: true },
            },
            base === undefined ? undefined : { above: base.id },
        );
        return added.id;
    }
    await session.styles.update(own.id, {
        set: set === undefined ? without(own.set, channel) : { ...own.set, ...set },
        encode: encode === undefined ? without(own.encode, channel) : { ...own.encode, ...encode },
    });
    return own.id;
}

/**
 * Removes one line from the layer that sets it. The reader's Everything layer is removed when
 * nothing is left on it. One undoable step of the element's.
 * @param session - the element's session.
 * @param layer - the layer that sets the line.
 * @param channel - the channel.
 */
export async function removeLine(session: GraphSession, layer: Layer, channel: Channel): Promise<void> {
    const set = without(layer.set, channel);
    const encode = without(layer.encode, channel);
    if (set === undefined && encode === undefined && layer.userData?.[EVERYTHING_KEY] === true) {
        await session.styles.remove(layer.id);
        return;
    }
    await session.styles.update(layer.id, { set, encode });
}

/**
 * The value a line starts with when "+" adds it: the element's own default for the channel, else
 * the first value it accepts.
 * @param descriptor - the channel.
 * @returns the value.
 */
export function startingValue(descriptor: ChannelDescriptor): ChannelValue {
    if (descriptor.default !== undefined) {
        return descriptor.default;
    }
    switch (descriptor.accepts) {
        case "color":
            return "#000000";
        case "number":
            return descriptor.min ?? 0;
        case "boolean":
            return true;
        case "enum":
            return descriptor.values?.[0] ?? "";
        default:
            return "";
    }
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
            return resultWord(run.label, field?.name ?? "", primary === binding.by);
        }
    }
    return null;
}
