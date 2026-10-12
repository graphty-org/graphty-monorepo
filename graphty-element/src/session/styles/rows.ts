/**
 * @file Rows: one entry of the style list that may paint nodes AND edges.
 *
 * A layer paints one kind, and `Layer.target` keeps saying which. A row that paints both kinds is
 * two layers, a node part and an edge part, sharing one selector and one id: the node part's id,
 * which both parts carry as `row`. The edge part sits immediately below the node part, and
 * remove, move and the insertion places of the styles API treat the pair as one block, so the two
 * never drift apart and one undo step brings both back.
 *
 * A write to a row names a channel (`edge.width`) or a bare property (`color`), and goes to every
 * part whose kind has that channel: `color` paints both, `width` only the edges.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Binding, ChannelValue, LayerId, LayerSpec, StaticStyle } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { channelDescriptor } from "./channels";
import type { CompiledLayer } from "./Layer";
import type { SelectorTarget } from "./predicate";

/** What a row paints: nodes, edges, or both. */
export type RowTarget = SelectorTarget | "both";

/**
 * A row's literal values, keyed by a channel (`"edge.width"`) or by a bare property (`"color"`)
 * that reaches every part whose kind has `<kind>.<property>`.
 */
export type RowStyle = Readonly<Record<string, ChannelValue | undefined>>;

/** A row's bindings, keyed as {@link RowStyle} is. */
export type RowEncoding = Readonly<Record<string, Binding | undefined>>;

/** A row as `styles.addRow` takes it: a layer specification whose target may be `"both"`. */
export interface RowSpec extends Omit<LayerSpec, "target" | "set" | "encode" | "row"> {
    /** What it paints. `"both"` adds a node part and an edge part sharing the selector. */
    readonly target: RowTarget;
    /** Its literal values, routed to the parts whose kind has each channel. */
    readonly set?: RowStyle;
    /** Its bindings, routed the same way. */
    readonly encode?: RowEncoding;
}

/**
 * One write to every part of a row. `set` and `encode` merge one key deep into each part's own;
 * `undefined` clears a key. `name` and `enabled` (the row's eye) reach every part.
 */
export interface RowWrite {
    /** A new name for every part. */
    readonly name?: string;
    /** Whether every part paints. */
    readonly enabled?: boolean;
    /** Literal values, each to the parts whose kind has the channel. */
    readonly set?: RowStyle;
    /** Bindings, each to the parts whose kind has the channel. */
    readonly encode?: RowEncoding;
}

/** A row as the styles API reads it back. */
export interface RowParts {
    /** The row's id: its node part's id, or the one layer's id for a row of one kind. */
    readonly id: LayerId;
    /** The row's name, which every part carries. */
    readonly name: string;
    /** Whether it paints, which is every part's `enabled`. */
    readonly enabled: boolean;
    /** What it paints, from the parts it has. */
    readonly target: RowTarget;
    /** The layer painting its nodes, when it paints nodes. */
    readonly node?: LayerId;
    /** The layer painting its edges, when it paints edges. */
    readonly edge?: LayerId;
}

/**
 * The key a layer's row is known by.
 * @param entry - A layer in the stack.
 * @returns Its row id.
 */
function rowKey(entry: CompiledLayer): LayerId {
    return entry.layer.row ?? entry.layer.id;
}

/**
 * The parts of the row holding a layer, bottom first, as the stack holds them.
 * @param stack - The stack, bottom first.
 * @param id - Any part's id.
 * @returns The parts; empty when the stack holds no such layer.
 */
export function rowParts(stack: readonly CompiledLayer[], id: LayerId): CompiledLayer[] {
    const found = stack.find((entry) => entry.layer.id === id);
    if (found === undefined) {
        return [];
    }

    const key = rowKey(found);

    return stack.filter((entry) => rowKey(entry) === key);
}

/**
 * Read a row back.
 * @param parts - Its parts, from {@link rowParts}.
 * @returns The row, or undefined for no parts.
 */
export function rowOf(parts: readonly CompiledLayer[]): RowParts | undefined {
    const [first] = parts;
    if (first === undefined) {
        return undefined;
    }

    const node = parts.find((entry) => entry.layer.target === "node")?.layer.id;
    const edge = parts.find((entry) => entry.layer.target === "edge")?.layer.id;

    return Object.freeze({
        id: rowKey(first),
        name: first.layer.name,
        enabled: parts.every((entry) => entry.layer.enabled),
        target: node !== undefined && edge !== undefined ? "both" : first.layer.target,
        ...(node === undefined ? {} : { node }),
        ...(edge === undefined ? {} : { edge }),
    });
}

/**
 * The keys of a row write that reach one kind, as that kind's channels.
 * @param keyed - The row's values or bindings.
 * @param kind - The part's kind.
 * @returns The channel-keyed entries for that part.
 */
function routed<T>(keyed: Readonly<Record<string, T>>, kind: SelectorTarget): Record<string, T> {
    const out: Record<string, T> = {};
    for (const [key, value] of Object.entries(keyed)) {
        const channel = key.includes(".") ? key : `${kind}.${key}`;
        if (channel.startsWith(`${kind}.`) && channelDescriptor(channel) !== undefined) {
            out[channel] = value;
        }
    }

    return out;
}

/**
 * Refuse a write key that reaches no part of the row.
 * @param keyed - The row's values or bindings.
 * @param kinds - The row's kinds.
 * @param field - `set` or `encode`, for the refusal.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `row-channel-unknown`.
 */
export function assertRouted(
    keyed: Readonly<Record<string, unknown>> | undefined,
    kinds: readonly SelectorTarget[],
    field: "set" | "encode",
): void {
    for (const key of Object.keys(keyed ?? {})) {
        if (!kinds.some((kind) => Object.keys(routed({ [key]: true }, kind)).length > 0)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `"${key}" is not a channel of the ${kinds.join(" or ")} this row paints.`,
                source: "style",
                details: { reason: "row-channel-unknown", field, key, kinds },
            });
        }
    }
}

/**
 * Merge one key deep, `undefined` clearing a key.
 * @param before - The part's own entries.
 * @param write - The routed write.
 * @returns The merged entries, or undefined when none remain.
 */
function merged<T>(
    before: Readonly<Record<string, T>> | undefined,
    write: Readonly<Record<string, T | undefined>>,
): Record<string, T> | undefined {
    const entries = Object.entries({ ...before, ...write }).filter(
        (entry): entry is [string, T] => entry[1] !== undefined,
    );

    return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

/**
 * The patch one part of a row takes from a row write.
 * @param part - The part's layer.
 * @param part.target - Its kind.
 * @param part.set - Its literal values.
 * @param part.encode - Its bindings.
 * @param write - The row write.
 * @returns The patch, or null when the write reaches nothing of this part.
 */
export function partPatch(
    part: { readonly target: SelectorTarget; readonly set?: StaticStyle; readonly encode?: LayerSpec["encode"] },
    write: RowWrite,
): Partial<LayerSpec> | null {
    const patch: { -readonly [K in keyof LayerSpec]?: LayerSpec[K] } = {};
    if (write.name !== undefined) {
        patch.name = write.name;
    }

    if (write.enabled !== undefined) {
        patch.enabled = write.enabled;
    }

    const set = routed(write.set ?? {}, part.target);
    if (Object.keys(set).length > 0) {
        patch.set = merged(part.set, set);
    }

    const encode = routed(write.encode ?? {}, part.target);
    if (Object.keys(encode).length > 0) {
        patch.encode = merged(part.encode, encode);
    }

    return Object.keys(patch).length === 0 ? null : patch;
}

/** The template id a starting row's layers carry, which is how the element finds one again. */
export type StartingRowId = "graphty:starting-everything" | "graphty:starting-selected" | "graphty:starting-hovered";

/** One starting row: what it is, and where it is pinned. */
export interface StartingRow {
    readonly templateId: StartingRowId;
    readonly pin: "top" | "bottom";
    readonly spec: RowSpec;
}

/**
 * The selection look a Selected row starts with, as the selection settings state it.
 * @param look - The selection settings' node halo and edge band.
 * @param look.color - The halo's colour.
 * @param look.scale - The halo's size, as a multiple of the node's drawn radius.
 * @param look.opacity - The halo's opacity.
 * @param look.edgeColor - The band's colour.
 * @param look.edgeScale - The band's width, as a multiple of twice the line's width.
 * @param look.edgeOpacity - The band's opacity.
 * @returns The three rows, in the order they are added: Everything, Selected, Hovered.
 */
export function startingRows(look: {
    readonly color: string;
    readonly scale: number;
    readonly opacity: number;
    readonly edgeColor: string;
    readonly edgeScale: number;
    readonly edgeOpacity: number;
}): readonly StartingRow[] {
    const source = (templateId: StartingRowId): RowSpec["source"] => ({ by: "template", templateId });

    return [
        {
            templateId: "graphty:starting-everything",
            pin: "bottom",
            spec: {
                name: "Everything",
                target: "both",
                selector: { match: "everything" },
                source: source("graphty:starting-everything"),
            },
        },
        {
            templateId: "graphty:starting-selected",
            pin: "top",
            spec: {
                name: "Selected",
                target: "both",
                selector: { match: "state", state: "selected" },
                set: {
                    "node.haloColor": look.color,
                    "node.haloSize": look.scale,
                    "node.haloOpacity": look.opacity,
                    "edge.bandColor": look.edgeColor,
                    "edge.bandWidth": look.edgeScale,
                    "edge.bandOpacity": look.edgeOpacity,
                },
                source: source("graphty:starting-selected"),
            },
        },
        {
            templateId: "graphty:starting-hovered",
            pin: "top",
            spec: {
                name: "Hovered",
                target: "node",
                selector: { match: "state", state: "hovered" },
                source: source("graphty:starting-hovered"),
            },
        },
    ];
}

/**
 * Which starting row a layer is a part of.
 * @param entry - A layer in the stack.
 * @returns Its starting row's template id, or undefined.
 */
export function startingRowOf(entry: CompiledLayer): StartingRowId | undefined {
    const { source } = entry.layer;
    return source.by === "template" && source.templateId.startsWith("graphty:starting-")
        ? (source.templateId as StartingRowId)
        : undefined;
}
