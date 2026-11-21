/**
 * Style panel v2's kind groups (design/ui/style-panel-v2/design.md, section 5): one thing whose row picks one
 * of several kinds of the same style from its Switch to -- a node's Label is Text or Glyph (owner, 2026-11-19:
 * "glyph seems duplicative to label"). Which kinds share a row is presentation, so it is the app's; every value
 * is graphty-element's own channels. A switch moves the kinds' shared slots (color, size) in one undo step and
 * holds the rest, while the same row stays selected, so switching back brings them back.
 */

import { type Channel, channelDescriptor } from "@graphty/graphty-element/catalog";
import type { Encoding, Layer, StaticStyle } from "@graphty/graphty-element/session";

import { itemChannels, partsFor } from "../parts/parts";
import type { RowContext } from "../PropertyRow";
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
}

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
 * @returns the kind.
 */
function prefixKind(
    id: string,
    plainName: string,
    head: Channel,
    slots: { readonly color?: Channel; readonly size?: Channel },
    prefix: string = head,
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
    };
}

/** Heads one of which starts with another's name: a kind owns none of the longer one's channels. */
const KIND_HEADS: readonly Channel[] = ["edge.arrowHead", "edge.arrowHeadText", "edge.arrowTail", "edge.arrowTailText"];

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
            prefixKind("behind", "Behind", "node.underlayColor", { color: "node.underlayColor" }, "node.underlay"),
            prefixKind("over", "Over", "node.overlayColor", { color: "node.overlayColor" }, "node.overlay"),
        ],
    },
    {
        id: "node.label",
        plainName: "Label",
        side: "node",
        thing: "label",
        members: [
            {
                id: "text",
                plainName: "Text",
                head: "node.label",
                owns: (channel) => !channel.startsWith("node.glyph"),
                slots: {
                    color: ["node.labelColor", { style: "node.labelStyle", field: "color" }],
                    size: [{ style: "node.labelStyle", field: "size" }],
                },
                start: () => ({ "node.labelStyle": {} }),
            },
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
];

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
 * The kinds a row's layers draw, each a row of its own: every kind whose main channel is set (a node may draw
 * its text and a glyph at once), else the first kind something of which is set (a style waiting for its
 * words), else the first kind.
 * @param ctx - the row.
 * @param group - the group.
 * @returns the kinds, in the group's order.
 */
export function kindsShown(ctx: RowContext, group: KindGroup): readonly KindMember[] {
    const headed = group.members.filter((member) => setOn(ctx, member.head));
    if (headed.length > 0) {
        return headed;
    }
    const [first] = group.members;
    return [group.members.find((member) => ownsOf(group, member).some((channel) => setOn(ctx, channel))) ?? first];
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
        const set: Record<string, unknown> = {};
        if (group.moveHead === true) {
            writeSlot(set, [to.head], left.set[from.head]);
        }
        writeSlot(set, to.slots.color, readSlot(left.set, from.slots.color));
        writeSlot(set, to.slots.size, readSlot(left.set, from.slots.size));
        next = { set: Object.keys(set).length > 0 ? set : { ...to.start() }, encode: {} };
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
