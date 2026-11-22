/**
 * @file Whether a channel, or a label style field, changes the picture where it is set: the one
 * reader of `ChannelDescriptor.drawnWhen` and `LabelStyleFieldDescriptor.drawnWhen`, so an
 * application never re-derives "an unset channel counts as its default".
 *
 * Plain data in, plain data out; nothing here reaches Babylon.js, Lit or the DOM.
 */

import { CHANNEL_DESCRIPTORS, type ChannelCondition } from "../session/styles/channels";
import { LABEL_STYLE_DESCRIPTORS, type LabelFieldCondition } from "./label-style";
import type { Channel, ChannelValue, CombineMode, LabelStyle } from "./types";

/**
 * Whether a channel or a field is drawn, and when it is not, the first condition that does not hold.
 * @since 3.62.0
 */
export type DrawnResult<Condition> = { readonly drawn: true } | { readonly drawn: false; readonly unmet: Condition };

/**
 * A value as a condition's `values` write it: a boolean as `"true"` or `"false"`, a number as its digits.
 * @param value - The value read.
 * @returns Its text, or undefined for anything else.
 */
function asText(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value;
    }

    return typeof value === "boolean" || typeof value === "number" ? String(value) : undefined;
}

/**
 * The first condition that does not hold.
 * @param conditions - The conditions.
 * @param view - The view, and the layout when known.
 * @param read - What a condition's subject holds, undefined when unset.
 * @param fallback - What an unset subject counts as.
 * @returns The condition, or undefined when every one holds.
 */
function firstUnmet<Condition extends ChannelCondition | LabelFieldCondition>(
    conditions: readonly Condition[] | undefined,
    view: DrawnView,
    read: (condition: Condition) => unknown,
    fallback: (condition: Condition) => unknown,
): Condition | undefined {
    const { dimension, arrangedDimension } = typeof view === "string" ? { dimension: view } : view;
    return conditions?.find((condition) => {
        if ("dimension" in condition) {
            return condition.dimension !== dimension;
        }

        // Unknown, the layout may place nodes either way.
        if ("arranged" in condition) {
            return arrangedDimension !== undefined && condition.arranged !== arrangedDimension;
        }

        if ("anyOf" in condition) {
            return !condition.anyOf.some(
                (all) => firstUnmet(all as readonly Condition[], view, read, fallback) === undefined,
            );
        }

        const value = read(condition);
        if ("set" in condition) {
            return value === undefined;
        }

        // A value that is not one value (a binding, or layers that paint different ones) may hold any of them, and
        // some elements may hold none: it meets a values condition and an unset one.
        if (value !== undefined && value !== null && typeof value === "object") {
            return false;
        }

        if ("unset" in condition) {
            return value !== undefined;
        }

        const text = asText(value ?? fallback(condition));
        return text === undefined || !condition.values.includes(text);
    });
}

/**
 * The view a channel is drawn in: `"2d"` or `"3d"`, or `session.layout` itself, which also says how many dimensions
 * the layout places nodes in (`edge.lift` rises only out of a flat layout) and which layout draws (a location map
 * raises an unset `edge.route` in 3D).
 * @since 3.66.0
 */
export type DrawnView =
    "2d" | "3d" | { readonly dimension: "2d" | "3d"; readonly arrangedDimension?: "2d" | "3d"; readonly id?: string };

/**
 * What a channel left unset draws as where the view decides it: an edge's route on a location map in the 3D view is
 * raised (Edge.routeOf: an arc over its flat map, a great circle round its globe), and with a dimension alone the
 * layout is unknown and may raise it.
 * @param channel - The channel.
 * @param view - The view.
 * @returns The value, or undefined where the view does not decide it.
 */
function viewDefault(channel: Channel, view: DrawnView): ChannelValue | undefined {
    if (channel !== "edge.route") {
        return undefined;
    }
    // A dimension alone does not say which layout draws: it may be one that raises the route.
    if (typeof view === "string") {
        return "arc";
    }
    return view.id === "location-map" && view.dimension === "3d" ? "arc" : undefined;
}

/**
 * The channels whose unset value depends on another channel the same edge or node holds: the value drawn while that
 * other channel is set. An edge's support scale is "unit" when only its support unit is set (Edge.supportEdge).
 */
const DEFAULT_WHEN_SET: ReadonlyMap<Channel, { readonly when: Channel; readonly value: ChannelValue }> = new Map([
    ["edge.supportScale", { when: "edge.supportUnit", value: "unit" }],
] satisfies [Channel, { when: Channel; value: ChannelValue }][]);

/**
 * What a channel left unset draws as, given what else is set: its catalog default, except where that depends on
 * another channel (an edge's support scale is "unit" once its support unit is set, else "drawing").
 * @param channel - The channel.
 * @param read - What another channel holds where this one is unset: the row's own value, else what the layers
 *   beneath give; undefined when nothing sets it.
 * @returns The value drawn, or undefined for a channel with no default.
 * @since 3.65.0
 * @example
 * ```ts
 * import { drawnDefault } from "@graphty/graphty-element/catalog";
 *
 * drawnDefault("edge.supportScale", () => undefined); // "drawing"
 * drawnDefault("edge.supportScale", (other) => (other === "edge.supportUnit" ? 2 : undefined)); // "unit"
 * ```
 */
export function drawnDefault(channel: Channel, read: (other: Channel) => unknown): ChannelValue | undefined {
    const depends = DEFAULT_WHEN_SET.get(channel);
    if (depends !== undefined && read(depends.when) !== undefined) {
        return depends.value;
    }
    return CHANNEL_DESCRIPTORS[channel].default;
}

/**
 * Whether a channel changes the picture: every condition of its `drawnWhen` holds.
 * @param channel - The channel.
 * @param read - What another channel holds where this one is set: the row's own value, else what
 *   the layers beneath give. Undefined when nothing sets it; it then counts as its default. An object (a data binding, or
 *   any value standing for values that differ from element to element) counts as set, and as meeting any
 *   values condition and any unset one, since some elements may hold the value it asks for and some none.
 * @param dimension - The view: `session.layout.dimension`, or `session.layout` itself so the conditions on the
 *   layout (`arranged`, a location map's raised routes) are read too; with a dimension alone they count as met.
 * @returns `{ drawn: true }`, or `{ drawn: false, unmet }` naming the first condition that fails.
 * @since 3.62.0
 * @example
 * ```ts
 * import { channelDrawn } from "@graphty/graphty-element/catalog";
 *
 * channelDrawn("node.zIndex", () => undefined, "3d"); // { drawn: false, unmet: { dimension: "2d" } }
 * ```
 */
export function channelDrawn(
    channel: Channel,
    read: (other: Channel) => unknown,
    dimension: DrawnView,
): DrawnResult<ChannelCondition> {
    const unmet = firstUnmet<ChannelCondition>(
        CHANNEL_DESCRIPTORS[channel].drawnWhen,
        dimension,
        (condition) => ("channel" in condition ? read(condition.channel) : undefined),
        (condition) =>
            "channel" in condition
                ? (viewDefault(condition.channel, dimension) ?? drawnDefault(condition.channel, read))
                : undefined,
    );
    return unmet === undefined ? { drawn: true } : { drawn: false, unmet };
}

/** Each label style field's descriptor, by field. */
const FIELDS = new Map(LABEL_STYLE_DESCRIPTORS.map((descriptor) => [descriptor.field, descriptor]));

/**
 * Whether a label style field changes the picture: every condition of its `drawnWhen` holds.
 * @param field - The field.
 * @param read - What another field of the same label style holds, undefined when unset; an unset
 *   field counts as its default.
 * @param dimension - The view.
 * @returns `{ drawn: true }`, or `{ drawn: false, unmet }` naming the first condition that fails.
 * @since 3.62.0
 */
export function labelFieldDrawn(
    field: keyof LabelStyle,
    read: (other: keyof LabelStyle) => unknown,
    dimension: "2d" | "3d",
): DrawnResult<LabelFieldCondition> {
    const unmet = firstUnmet<LabelFieldCondition>(
        FIELDS.get(field)?.drawnWhen,
        dimension,
        (condition) => ("field" in condition ? read(condition.field) : undefined),
        (condition) => ("field" in condition ? FIELDS.get(condition.field)?.default : undefined),
    );
    return unmet === undefined ? { drawn: true } : { drawn: false, unmet };
}

/**
 * Whether a combine mode can paint a value `"replace"` would not. A layer's number meets what the layers beneath
 * paint, or the channel's default where they paint nothing; `"multiply"` over 1 and `"add"` over 0 paint the layer's
 * own number, the same as `"replace"`, so a style editor offers the mode only where it can change the picture.
 * @param channel - The number channel.
 * @param mode - The combine mode.
 * @param beneath - What the layers beneath paint for the channel: one number where they agree on it, `"mixed"`
 *   where they paint different values, undefined where they paint nothing.
 * @returns `{ drawn: true }`, or `{ drawn: false, unmet: { mode, base } }`: the number the mode meets is its identity.
 * @since 3.64.0
 * @example
 * ```ts
 * import { combineDrawn } from "@graphty/graphty-element/catalog";
 *
 * combineDrawn("node.size", "multiply", undefined); // { drawn: false, unmet: { mode: "multiply", base: 1 } }
 * combineDrawn("node.size", "multiply", "mixed"); // { drawn: true }
 * combineDrawn("node.size", "add", undefined); // { drawn: true }: the default of 1 is added to
 * ```
 */
export function combineDrawn(
    channel: Channel,
    mode: CombineMode,
    beneath: number | "mixed" | undefined,
): DrawnResult<{ readonly mode: CombineMode; readonly base: number }> {
    if (mode === "replace" || beneath === "mixed") {
        return { drawn: true };
    }

    const fallback = CHANNEL_DESCRIPTORS[channel].default;
    // The number each mode meets where nothing beneath paints, as the repaint pass reads it (repaint.ts combineOf).
    const identity = mode === "multiply" ? 1 : 0;
    const base = beneath ?? (typeof fallback === "number" ? fallback : identity);
    return base === identity ? { drawn: false, unmet: { mode, base } } : { drawn: true };
}
