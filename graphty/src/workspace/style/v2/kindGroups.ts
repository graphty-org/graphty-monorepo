/**
 * Style panel v2's kind groups (design/ui/style-panel-v2/design.md, section 5): one thing whose row picks one
 * of several kinds of the same style from its Switch to -- a node's Label is Text or Glyph (owner, 2026-11-19:
 * "glyph seems duplicative to label"). Which kinds share a row is presentation, so it is the app's; every value
 * is graphty-element's own channels. A switch moves the kinds' shared slots (color, size) in one undo step and
 * holds the rest, while the same row stays selected, so switching back brings them back.
 */

import {
    type Channel,
    channelDescriptor,
    edgeBandWidthAs,
    LABEL_LOOKS,
    type LabelLookId,
} from "@graphty/graphty-element/catalog";
import type { Encoding, Layer, StaticStyle } from "@graphty/graphty-element/session";

import { itemChannels, partsFor } from "../parts/parts";
import type { RowContext } from "../PropertyRow";
import { lineIn } from "../row";
import { heldFor, holdsAny } from "./families";
import { setOn } from "./things";

/** Where a slot's value lives: a channel, or a field of a style channel (a label's color). */
export type SlotRef = Channel | { readonly style: Channel; readonly field: string };

/** One kind of a group. */
export interface KindMember {
    readonly id: string;
    readonly plainName: string;
    /** Its main channel: the row's main control. */
    readonly head: Channel;
    /** The channels it owns, of its row's `parts.ts` item. */
    readonly owns: (channel: Channel) => boolean;
    /** The values a switch moves to the same slot of the kind switched to. */
    readonly slots: { readonly color?: readonly SlotRef[]; readonly size?: readonly SlotRef[] };
    /** What it writes when switched to with nothing moved or held, so the row stays (graphty-element's starts). */
    readonly start: () => Readonly<Record<string, unknown>>;
    /** What its main control takes, as the row's tooltip (E269: a box says what to type in it). */
    readonly hint?: string;
    /** What all its channels start with: a switch moves each value to the same-named channel of the kind switched to. */
    readonly prefix?: string;
    /**
     * Values a switch to it writes over what moved (a plate laid over the node starts translucent, ia-design 2), or
     * what to write given what moved.
     */
    readonly onSwitch?: SwitchWrites;
    /** Values "+" writes beside its main value, over graphty-element's starts, given the row's line width. */
    readonly plusStarts?: (lineWidth: number | undefined) => Readonly<Record<string, unknown>>;
    /**
     * A look of a text (E196): the label style it is the look of, and graphty-element's look id. Looks of one style
     * share its channels and are told apart by the style's `look`; a switch between two writes only `look`.
     */
    readonly look?: { readonly id: LabelLookId; readonly style: Channel };
}

/**
 * What a switch to a kind writes over what moved: values, or values worked out from what moved, what left and the
 * width of the row's line.
 */
type SwitchWrites =
    | Readonly<Record<string, unknown>>
    | ((
          moved: Readonly<Record<string, unknown>>,
          left: Readonly<Record<string, unknown>>,
          lineWidth: number | undefined,
      ) => Readonly<Record<string, unknown>>);

/** One group: the thing it is drawn as, and its kinds, the first the one "+" adds. */
export interface KindGroup {
    readonly id: string;
    readonly plainName: string;
    readonly side: "node" | "edge";
    /** The thing (things.ts) whose row it is. */
    readonly thing: string;
    /** The `parts.ts` items its kinds' channels come from, when not the one named as the thing. */
    readonly items?: readonly string[];
    /** A switch carries the main value over too (an arrowhead's shape, a caption's words). */
    readonly moveHead?: true;
    /**
     * Only a set main value gives a kind its row while some kind's main value is set: a Label's Text kind owns the
     * label settings a Glyph is drawn with too, so a glyph file's label settings are no second row.
     */
    readonly rowsByHead?: true;
    /** "+" writes a kind's size slot at graphty-element's start too, so its Size line shows (an arrow, E305). */
    readonly startsSize?: true;
    /** Its Switch to also lists the text's looks, after a divider, for the style of the row's kind (End caption). */
    readonly looks?: true;
    readonly members: readonly KindMember[];
}

/**
 * A kind whose channels all start with one name (an arrow's `edge.arrowHead*`), with the channels its color and
 * size move to and from.
 * @param id - its id.
 * @param plainName - its name.
 * @param head - its main channel.
 * @param slots - its color and size channels.
 * @param slots.color - the channel its color moves to and from.
 * @param slots.size - the channel its size moves to and from.
 * @param prefix - what its channels start with, when not its head's name (a plate's `node.underlay`).
 * @param onSwitch - what a switch to it writes over what moved.
 * @param plusStarts - what "+" writes beside its main value.
 * @returns the kind.
 */
function prefixKind(
    id: string,
    plainName: string,
    head: Channel,
    slots: { readonly color?: Channel; readonly size?: Channel },
    prefix: string = head,
    onSwitch?: SwitchWrites,
    plusStarts?: KindMember["plusStarts"],
): KindMember {
    const others = KIND_HEADS.filter((other) => other !== prefix && other.startsWith(prefix));
    return {
        id,
        plainName,
        head,
        owns: (channel) => channel.startsWith(prefix) && !others.some((other) => channel.startsWith(other)),
        slots: {
            color: slots.color === undefined ? undefined : [slots.color],
            size: slots.size === undefined ? undefined : [slots.size],
        },
        start: () => ({ [head]: channelDescriptor(head)?.start ?? channelDescriptor(head)?.default }),
        prefix,
        onSwitch,
        plusStarts,
    };
}

/**
 * What graphty-element writes beside a channel when a layer starts it (its `needs`): a switch to a kind headed by it
 * starts the same way.
 * @param channel - the kind's head.
 * @returns the writes.
 */
function startsOf(channel: Channel): Readonly<Record<string, unknown>> {
    return Object.fromEntries((channelDescriptor(channel)?.needs ?? []).map((need) => [need.channel, need.value]));
}

/**
 * Everything graphty-element writes beside a channel when a style editor adds it: its `needs`, then its `startsWith`.
 * @param channel - the kind's head.
 * @returns the writes.
 */
function elementStarts(channel: Channel): Readonly<Record<string, unknown>> {
    const startsWith = channelDescriptor(channel)?.startsWith ?? [];
    return { ...startsOf(channel), ...Object.fromEntries(startsWith.map((each) => [each.channel, each.value])) };
}

/**
 * What a switch to a kind headed by a channel writes: graphty-element's `needs` over what moved, and its `startsWith`
 * only where nothing moved into that channel, so a switch keeps a plate's own shape and gives one that has none the
 * shape "+" starts it with.
 * @param channel - the kind's head.
 * @returns the switch writes.
 */
function startsUnlessMoved(channel: Channel): SwitchWrites {
    return (moved) => {
        const startsWith = channelDescriptor(channel)?.startsWith ?? [];
        const fill = startsWith.filter((each) => moved[each.channel] === undefined);
        return { ...startsOf(channel), ...Object.fromEntries(fill.map((each) => [each.channel, each.value])) };
    };
}

/**
 * An Over line's start (ia-design 2): translucent at 30%, as wide as graphty-element starts an Under line beside the
 * row's line, so it reaches past the line's sides on any width.
 * @param lineWidth - the row's line width, or undefined for graphty-element's default line.
 * @returns the writes.
 */
function overLineStart(lineWidth: number | undefined): Readonly<Record<string, unknown>> {
    return { "edge.overlayOpacity": 0.3, ...edgeBandWidthAs("overlay", startsOf("edge.outlineColor"), lineWidth) };
}

/**
 * The width of the line a row's edges draw: the row's own, else what the layers beneath paint.
 * @param ctx - the row.
 * @returns the width, or undefined when neither sets one (graphty-element's default line).
 */
export function lineWidthOf(ctx: Pick<RowContext, "many" | "layers" | "beneath">): number | undefined {
    const own = lineIn(ctx, "edge.width")?.value;
    if (typeof own === "number") {
        return own;
    }
    const beneath = ctx.beneath("edge.width").value;
    return typeof beneath === "number" ? beneath : undefined;
}

/** Heads one of which starts with another's name: a kind owns none of the longer one's channels. */
const KIND_HEADS: readonly Channel[] = ["edge.arrowHead", "edge.arrowHeadText", "edge.arrowTail", "edge.arrowTailText"];

/** The look a text's row draws with no look written: graphty-element's plain one, the Text kind. */
export const PLAIN_LOOK: LabelLookId = "default";

/**
 * A label style's look as the row writes it: graphty-element's look id, the plain one when none is written.
 * @param ctx - the row.
 * @param style - the label style channel.
 * @returns the look.
 */
export function lookOf(ctx: Pick<RowContext, "many" | "layers">, style: Channel): LabelLookId {
    const value = lineIn(ctx, style)?.value;
    const look = typeof value === "object" && value !== null ? (value as { look?: unknown }).look : undefined;
    return LABEL_LOOKS.find((each) => each.id === look)?.id ?? PLAIN_LOOK;
}

/**
 * A text's looks as kinds (E196): Text (graphty-element's plain look), then Card, Dark, Pill and Callout, in
 * graphty-element's order. Each owns the same channels and writes only its look into the style.
 * @param head - the text's words.
 * @param style - its label style.
 * @param owns - the channels the text owns.
 * @param color - where its color moves to and from, first the one a switch writes.
 * @returns the kinds.
 */
function lookKinds(
    head: Channel,
    style: Channel,
    owns: (channel: Channel) => boolean,
    color: readonly SlotRef[] = [{ style, field: "color" }],
): KindMember[] {
    return LABEL_LOOKS.map((look) => {
        const plain = look.id === PLAIN_LOOK;
        const withLook = (held: unknown): Readonly<Record<string, unknown>> => ({
            [style]: {
                ...(typeof held === "object" && held !== null ? held : {}),
                ...(plain ? {} : { look: look.id }),
            },
        });
        return {
            id: plain ? "text" : look.id,
            plainName: plain ? "Text" : look.plainName,
            head,
            owns,
            slots: { color, size: [{ style, field: "size" }] },
            start: () => withLook(undefined),
            onSwitch: (moved) => withLook(moved[style]),
            look: { id: look.id, style },
        };
    });
}

/**
 * The look kinds of one of a kind's text things, owning every channel of its item but the label list.
 * @param side - nodes or edges.
 * @param thing - the text thing's id.
 * @param head - its words.
 * @param style - its label style.
 * @returns the group.
 */
function textLooks(side: "node" | "edge", thing: string, head: Channel, style: Channel): KindGroup {
    return {
        id: `${side}.${thing}`,
        plainName: thing === "tooltip" ? "Tooltip" : "External label",
        side,
        thing,
        rowsByHead: true,
        members: lookKinds(head, style, () => true),
    };
}

/** Every kind group (ia-design 2; the collapse candidates of implementation plan 6.2). */
export const KIND_GROUPS: readonly KindGroup[] = [
    // C6: the four arrows have the same settings, so they are one Arrow item; a row's kind says which end.
    {
        id: "edge.arrow",
        plainName: "Arrow",
        side: "edge",
        thing: "arrow",
        items: ["target", "source", "middleTarget", "middleSource"],
        moveHead: true,
        startsSize: true,
        members: [
            prefixKind("target", "Target", "edge.arrowHead", {
                color: "edge.arrowHeadColor",
                size: "edge.arrowHeadSize",
            }),
            prefixKind("source", "Source", "edge.arrowTail", {
                color: "edge.arrowTailColor",
                size: "edge.arrowTailSize",
            }),
            prefixKind("middleTarget", "Middle to target", "edge.arrowMiddleHead", {
                color: "edge.arrowMiddleHeadColor",
                size: "edge.arrowMiddleHeadSize",
            }),
            prefixKind("middleSource", "Middle to source", "edge.arrowMiddleTail", {
                color: "edge.arrowMiddleTailColor",
                size: "edge.arrowMiddleTailSize",
            }),
        ],
    },
    // C1: the two end captions are one End caption item, its kind which end.
    {
        id: "edge.endCaption",
        plainName: "End caption",
        side: "edge",
        thing: "endCaption",
        items: ["targetCaption", "sourceCaption"],
        moveHead: true,
        looks: true,
        members: [
            prefixKind("target", "Target", "edge.arrowHeadText", {
                color: "edge.arrowHeadTextColor",
                size: "edge.arrowHeadTextSize",
            }),
            prefixKind("source", "Source", "edge.arrowTailText", {
                color: "edge.arrowTailTextColor",
                size: "edge.arrowTailTextSize",
            }),
        ],
    },
    // C2: a node's underlay and overlay are one Plate item, Behind or Over the node (ia-design 2).
    {
        id: "node.plate",
        plainName: "Plate",
        side: "node",
        thing: "plate",
        items: ["underlay", "overlay"],
        members: [
            // A switch carries the shape and corners; one with no shape starts as the card "+" Plate starts as.
            prefixKind(
                "behind",
                "Behind",
                "node.underlayColor",
                { color: "node.underlayColor" },
                "node.underlay",
                startsUnlessMoved("node.underlayColor"),
            ),
            // A switch carries the shape and corners; the opacity and padding start as graphty-element starts a
            // plate over the node (translucent, a tenth of the node past it; ia-design 2).
            prefixKind(
                "over",
                "Over",
                "node.overlayColor",
                { color: "node.overlayColor" },
                "node.overlay",
                elementStarts("node.overlayColor"),
            ),
        ],
    },
    // C7: every band along an edge's line is one Outline item, Under line (the casing) or Over line (a wash).
    {
        id: "edge.outline",
        plainName: "Outline",
        side: "edge",
        thing: "outline",
        items: ["outline", "overlay"],
        // A switch carries the band's width where graphty-element reads it as the other kind (edgeBandWidthAs); any
        // other band starts at the kind's own start, which at the default line is the same width (ia-design 2).
        members: [
            // Opaque, as graphty-element draws an outline unset.
            prefixKind(
                "under",
                "Under line",
                "edge.outlineColor",
                { color: "edge.outlineColor" },
                "edge.outline",
                (_moved, left) => ({
                    "edge.outlineOpacity": channelDescriptor("edge.outlineOpacity")?.default,
                    ...(edgeBandWidthAs("outline", left) ?? {
                        "edge.outlineWidth": startsOf("edge.outlineColor")["edge.outlineWidth"],
                    }),
                }),
            ),
            // Translucent at 30% (ia-design 2), as wide as the Under line was beside the layer's line.
            prefixKind(
                "over",
                "Over line",
                "edge.overlayColor",
                { color: "edge.overlayColor" },
                "edge.overlay",
                (_moved, left, lineWidth) => ({
                    ...overLineStart(lineWidth),
                    ...edgeBandWidthAs("overlay", left, lineWidth),
                }),
                // "+" again starts it the same way as a switch with no band to carry.
                overLineStart,
            ),
        ],
    },
    // A node's Label is one of the text's looks (E196) or a Glyph, picked from its row's Switch to (E275).
    {
        id: "node.label",
        plainName: "Label",
        side: "node",
        thing: "label",
        rowsByHead: true,
        members: [
            // The further labels are rows of their own (labelEntries.ts), never the main label's.
            ...lookKinds(
                "node.label",
                "node.labelStyle",
                (channel) => !channel.startsWith("node.glyph") && channel !== "node.labels",
                ["node.labelColor", { style: "node.labelStyle", field: "color" }],
            ),
            {
                id: "glyph",
                plainName: "Glyph",
                head: "node.glyph",
                hint: "Character or icon",
                owns: (channel) => channel.startsWith("node.glyph"),
                slots: { color: ["node.glyphColor"], size: ["node.glyphSize"] },
                start: () => ({ "node.glyphColor": channelDescriptor("node.glyphColor")?.default }),
            },
        ],
    },
    {
        id: "edge.label",
        plainName: "Label",
        side: "edge",
        thing: "label",
        rowsByHead: true,
        members: lookKinds("edge.label", "edge.labelStyle", (channel) => channel !== "edge.labels", [
            "edge.labelColor",
            { style: "edge.labelStyle", field: "color" },
        ]),
    },
    textLooks("node", "tooltip", "node.tooltip", "node.tooltipStyle"),
    textLooks("node", "xlabel", "node.xlabel", "node.xlabelStyle"),
    textLooks("edge", "tooltip", "edge.tooltip", "edge.tooltipStyle"),
    textLooks("edge", "xlabel", "edge.xlabel", "edge.xlabelStyle"),
];

/**
 * What "+" writes beside a kind's main value: its size at graphty-element's start, for a group that starts it.
 * @param group - the group.
 * @param member - the kind "+" adds.
 * @returns the writes.
 */
export function kindStarts(group: KindGroup | undefined, member: KindMember | undefined): Record<string, unknown> {
    const [size] = member?.slots.size ?? [];
    if (group?.startsSize !== true || typeof size !== "string") {
        return {};
    }
    const descriptor = channelDescriptor(size);
    const value = descriptor?.start ?? descriptor?.default;
    return value === undefined ? {} : { [size]: value };
}

/**
 * The kind group a thing's row draws.
 * @param side - nodes or edges.
 * @param thing - the thing's id.
 * @returns the group, or undefined.
 */
export function kindGroupOf(side: "node" | "edge", thing: string): KindGroup | undefined {
    return KIND_GROUPS.find((group) => group.side === side && group.thing === thing);
}

/**
 * Every channel a kind owns.
 * @param group - its group.
 * @param member - the kind.
 * @returns the channels.
 */
export function ownsOf(group: KindGroup, member: KindMember): readonly Channel[] {
    const items = partsFor(group.side, new Set()).flatMap((part) => part.items);
    // the thing's items: a Label row's is the Label item, its glyph channels the Glyph kind's
    const ids = group.items ?? [group.thing];
    return items
        .filter((item) => ids.includes(item.id))
        .flatMap((item) => itemChannels(item))
        .filter((channel) => member.owns(channel));
}

/**
 * The kinds a row's layers draw, each a row of its own: every kind any channel of which is set (a node may draw
 * its text and a glyph at once; a file may color a target arrow it gives no shape), else the first kind; for a
 * group whose rows go by their main value, the kinds whose main value is set, when any is.
 * @param ctx - the row.
 * @param group - the group.
 * @returns the kinds, in the group's order.
 */
export function kindsShown(ctx: RowContext, group: KindGroup): readonly KindMember[] {
    // Looks of one text share its channels: only the look its style names is drawn (E196).
    const fits = group.members.filter(
        (member) => member.look === undefined || lookOf(ctx, member.look.style) === member.look.id,
    );
    const headed = fits.filter((member) => setOn(ctx, member.head));
    if (group.rowsByHead === true && headed.length > 0) {
        return headed;
    }
    const held = fits.filter((member) => ownsOf(group, member).some((channel) => setOn(ctx, channel)));
    return held.length > 0 ? held : [fits[0] ?? group.members[0]];
}

/**
 * Writes only a text's look into its label style, on the layer that writes the style (else the row's first the
 * reader may edit), as one undo step: graphty-element's plain look takes `look` off.
 * @param ctx - the row.
 * @param style - the label style channel.
 * @param look - the look.
 * @param name - the text's name, for the undo step.
 * @returns when it is written.
 */
export async function writeLook(ctx: RowContext, style: Channel, look: LabelLookId, name: string): Promise<void> {
    const line = lineIn(ctx, style);
    const layer = line !== undefined && !line.layer.locked ? line.layer : layerOf(ctx, [style]);
    if (layer === undefined) {
        return;
    }
    const word = LABEL_LOOKS.find((each) => each.id === look)?.plainName ?? look;
    await ctx.session.transaction(`switching ${name.toLowerCase()} to ${word.toLowerCase()}`, async (tx) => {
        const own = tx.styles.get(layer.id);
        const held = own?.set?.[style];
        const next: Record<string, unknown> =
            typeof held === "object" && !Array.isArray(held) ? { ...(held as Readonly<Record<string, unknown>>) } : {};
        if (look === PLAIN_LOOK) {
            Reflect.deleteProperty(next, "look");
        } else {
            next.look = look;
        }
        await tx.styles.update(layer.id, { set: { ...own?.set, [style]: next } }, { keepEmpty: true });
    });
}

/**
 * A kind's values carried to another kind's same-named channels (`edge.arrowHeadColor` to `edge.arrowTailColor`).
 * @param values - the leaving kind's values.
 * @param from - the leaving kind.
 * @param to - the kind switched to.
 * @param toOwns - the channels the kind switched to owns.
 * @returns the carried values.
 */
function carried(
    values: Readonly<Record<string, unknown>>,
    from: KindMember,
    to: KindMember,
    toOwns: readonly Channel[],
): Record<string, unknown> {
    const { prefix: fromPrefix } = from;
    const { prefix: toPrefix } = to;
    if (fromPrefix === undefined || toPrefix === undefined) {
        return {};
    }
    return Object.fromEntries(
        Object.entries(values).flatMap(([channel, value]) => {
            const moved = `${toPrefix}${channel.slice(fromPrefix.length)}`;
            return channel.startsWith(fromPrefix) && toOwns.includes(moved as Channel) ? [[moved, value]] : [];
        }),
    );
}

/**
 * What a switch to a kind writes: what moved, with the kind's own switch values over it.
 * @param to - the kind switched to.
 * @param moved - what moved, or the kind's start when nothing did.
 * @param left - the leaving kind's own values.
 * @param lineWidth - the width of the row's line, when known.
 * @returns the writes.
 */
function switchWrites(
    to: KindMember,
    moved: Readonly<Record<string, unknown>>,
    left: Readonly<Record<string, unknown>>,
    lineWidth: number | undefined,
): Record<string, unknown> {
    const extra = typeof to.onSwitch === "function" ? to.onSwitch(moved, left, lineWidth) : to.onSwitch;
    return { ...moved, ...extra };
}

/**
 * The line width a switch sizes a band by: the switched layer's own, else the row's.
 * @param ctx - the row.
 * @param set - the switched layer's set values.
 * @returns the width, or undefined for graphty-element's default line.
 */
function switchLineWidth(ctx: RowContext, set: Readonly<Record<string, unknown>> | undefined): number | undefined {
    const own = set?.["edge.width"];
    return typeof own === "number" ? own : lineWidthOf(ctx);
}

/**
 * Picks the entries of a record whose keys are in a list.
 * @param record - the record.
 * @param keys - the keys.
 * @param keep - true keeps them, false drops them.
 * @returns the entries.
 */
function pick(
    record: Readonly<Record<string, unknown>> | undefined,
    keys: readonly string[],
    keep: boolean,
): Record<string, unknown> {
    return Object.fromEntries(Object.entries(record ?? {}).filter(([key]) => keys.includes(key) === keep));
}

/**
 * A slot's value among a kind's values: the first of its places that holds one.
 * @param values - the kind's set values.
 * @param refs - the slot's places.
 * @returns the value, or undefined.
 */
function readSlot(values: Readonly<Record<string, unknown>>, refs: readonly SlotRef[] | undefined): unknown {
    for (const ref of refs ?? []) {
        const value =
            typeof ref === "string"
                ? values[ref]
                : (values[ref.style] as Readonly<Record<string, unknown>> | undefined)?.[ref.field];
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}

/**
 * Writes a slot's value to its first place.
 * @param values - the kind's set values, changed in place.
 * @param refs - the slot's places.
 * @param value - the value.
 */
function writeSlot(values: Record<string, unknown>, refs: readonly SlotRef[] | undefined, value: unknown): void {
    const [ref] = refs ?? [];
    if (ref === undefined || value === undefined) {
        return;
    }
    if (typeof ref === "string") {
        values[ref] = value;
    } else {
        values[ref.style] = { ...(values[ref.style] as Record<string, unknown> | undefined), [ref.field]: value };
    }
}

/**
 * The layer a switch writes: the unlocked layer holding the kind drawn now, else the row's first unlocked one.
 * @param ctx - the row.
 * @param owns - the channels of the kind drawn now.
 * @returns the layer.
 */
function layerOf(ctx: RowContext, owns: readonly Channel[]): Layer | undefined {
    const layers = ctx.layers.filter((layer) => !layer.locked);
    const holds = (layer: Layer): boolean => {
        const own = ctx.session.styles.get(layer.id);
        return owns.some((channel) => own?.set?.[channel] !== undefined || own?.encode?.[channel] !== undefined);
    };
    return [...layers].reverse().find((layer) => holds(layer)) ?? layers[0];
}

/**
 * Switches a row from one kind to another as one undo step: the leaving kind's channels come off and are held;
 * the new kind gets what it held, else the leaving kind's color and size in its own slots, else its start.
 * @param ctx - the row.
 * @param group - the group.
 * @param from - the kind drawn now.
 * @param to - the kind to draw.
 * @returns when it is written.
 */
export async function switchKind(ctx: RowContext, group: KindGroup, from: KindMember, to: KindMember): Promise<void> {
    if (from.id === to.id) {
        return;
    }
    // Between two looks of one text only the look changes (E196).
    if (to.look !== undefined && from.look?.style === to.look.style) {
        await writeLook(ctx, to.look.style, to.look.id, group.plainName);
        return;
    }
    const fromOwns = ownsOf(group, from);
    const toOwns = ownsOf(group, to);
    const layer = layerOf(ctx, fromOwns);
    if (layer === undefined) {
        return;
    }
    const store = heldFor(ctx);
    const keyOf = (member: KindMember): string => `${layer.id}|${group.id}|${member.id}`;
    const own = ctx.session.styles.get(layer.id);
    const left = {
        set: pick(own?.set, fromOwns, true) as StaticStyle,
        encode: pick(own?.encode, fromOwns, true) as Encoding,
        uses: [],
    };
    store.set(keyOf(from), left);
    const back = store.get(keyOf(to));
    let next: { set: Readonly<Record<string, unknown>>; encode: Readonly<Record<string, unknown>> };
    if (holdsAny(back)) {
        next = back;
    } else {
        // Kinds of one channel family carry every value across by name (an arrow's opacity and image, a plate's
        // padding and shape); others move their color and size slots.
        const set: Record<string, unknown> = carried(left.set, from, to, toOwns);
        if (group.moveHead === true) {
            writeSlot(set, [to.head], left.set[from.head]);
        }
        writeSlot(set, to.slots.color, readSlot(left.set, from.slots.color));
        writeSlot(set, to.slots.size, readSlot(left.set, from.slots.size));
        next = {
            set: switchWrites(
                to,
                Object.keys(set).length > 0 ? set : to.start(),
                left.set,
                switchLineWidth(ctx, own?.set),
            ),
            encode: carried(left.encode, from, to, toOwns),
        };
    }
    const off = [...fromOwns, ...toOwns];
    await ctx.session.transaction(`switching ${group.plainName.toLowerCase()} to ${to.plainName.toLowerCase()}`, (tx) =>
        tx.styles.update(
            layer.id,
            {
                set: { ...pick(own?.set, off, false), ...next.set },
                encode: { ...pick(own?.encode, off, false), ...next.encode } as Encoding,
            },
            { keepEmpty: true },
        ),
    );
}
