/**
 * Style panel v2's sections and things (design/ui/style-panel-v2/design.md, sections 2.3 and 4):
 * which section each thing sits in, in the panel's order, how its section's "+" menu groups it,
 * and which channel its row's main control edits. What each thing holds is `parts.ts`'s: a thing
 * names the parts items it is made of, so the channels stay in one place.
 */

import type { Channel, ChannelDescriptor } from "@graphty/graphty-element/catalog";

import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { lineIn, partlySet } from "../row";

/** One thing a section's "+" adds and a row draws. */
export interface ThingSpec {
    /** Its id, unique within its kind. */
    readonly id: string;
    /** Its name: the row's name column and its "+" menu item. */
    readonly name: string;
    /** The ids of the `parts.ts` items of its section that it is made of. */
    readonly items: readonly string[];
    /**
     * The channels its row's main control may edit, the first one the layer sets winning (a model
     * in place of a basic shape); the first is the one "+" starts with.
     */
    readonly main: readonly Channel[];
    /** The main channel "+" starts with, when not the first (a basic shape, not a model). */
    readonly start?: Channel;
    /** Its channels taken from another item of the section (an edge's Record takes the label table). */
    readonly own?: readonly Channel[];
    /** Its section already names it (Fill, Border, Shape, Line, Visibility): the row has no name column. */
    readonly unnamed?: boolean;
}

/** One section: the `parts.ts` part it draws and its things, in "+" menu groups. */
export interface SectionThings {
    /** The `parts.ts` part's id. */
    readonly part: string;
    /** Its things, a divider between each two groups in its "+" menu. */
    readonly groups: readonly (readonly ThingSpec[])[];
}

/** Each kind's sections in the panel's order (design 2.3) and their things (design 4.1, 4.2). */
export const SECTIONS: Readonly<Record<"node" | "edge", readonly SectionThings[]>> = {
    node: [
        {
            part: "shape",
            groups: [
                [
                    {
                        id: "shape",
                        name: "Shape",
                        items: ["shape", "model"],
                        main: ["node.model", "node.shape"],
                        start: "node.shape",
                        unnamed: true,
                    },
                ],
            ],
        },
        {
            part: "fill",
            groups: [
                [
                    {
                        id: "fill",
                        name: "Fill",
                        items: ["solid", "gradient", "picture"],
                        main: ["node.color", "node.gradientColors", "node.texture"],
                        unnamed: true,
                    },
                ],
                [{ id: "image", name: "Image", items: ["image"], main: ["node.image"] }],
                [
                    { id: "pie", name: "Pie", items: ["pie"], main: ["node.pieColors"] },
                    { id: "stripes", name: "Stripes", items: ["stripes"], main: ["node.stripeColors"] },
                    { id: "chart", name: "Chart", items: ["chart"], main: ["node.chartKind"] },
                ],
            ],
        },
        {
            part: "border",
            groups: [
                [{ id: "border", name: "Border", items: ["border"], main: ["node.borderColor"], unnamed: true }],
                [
                    { id: "rings", name: "Rings", items: ["rings"], main: ["node.outerBorderColor"] },
                    { id: "raised", name: "Raised edge", items: ["raised"], main: ["node.raisedBorderWidth"] },
                    { id: "outline", name: "Outline", items: ["outline"], main: ["node.outline"] },
                    { id: "innerLines", name: "Inner lines", items: ["innerLines"], main: ["node.shapeLines"] },
                ],
            ],
        },
        {
            part: "text",
            groups: [
                [{ id: "label", name: "Label", items: ["label"], main: ["node.label"] }],
                [
                    { id: "xlabel", name: "External label", items: ["xlabel"], main: ["node.xlabel"] },
                    { id: "tooltip", name: "Tooltip", items: ["tooltip"], main: ["node.tooltip"] },
                ],
                [
                    { id: "glyph", name: "Glyph", items: ["glyph"], main: ["node.glyph"] },
                    { id: "record", name: "Record", items: ["record"], main: ["node.shapeTexts"] },
                ],
            ],
        },
        {
            part: "effects",
            groups: [
                [
                    { id: "shadow", name: "Drop shadow", items: ["shadow"], main: ["node.shadowColor"] },
                    { id: "glow", name: "Glow", items: ["glow"], main: ["node.glow"] },
                    { id: "halo", name: "Halo", items: ["halo"], main: ["node.haloColor"] },
                ],
                [
                    { id: "underlay", name: "Underlay", items: ["underlay"], main: ["node.underlayColor"] },
                    { id: "overlay", name: "Overlay", items: ["overlay"], main: ["node.overlayColor"] },
                ],
            ],
        },
        {
            part: "visibility",
            groups: [
                [{ id: "visibility", name: "Visibility", items: ["visible"], main: ["node.visible"], unnamed: true }],
            ],
        },
        {
            part: "order",
            groups: [
                [{ id: "order", name: "Order", items: ["order"], main: ["node.zIndex"] }],
                [
                    {
                        id: "group",
                        name: "Group",
                        items: ["group"],
                        main: ["node.groupPadding", "node.groupPaddingRatio"],
                    },
                ],
            ],
        },
        { part: "shaders", groups: [] },
    ],
    edge: [
        {
            part: "line",
            groups: [
                [
                    {
                        id: "line",
                        name: "Line",
                        items: ["line", "gradient"],
                        main: ["edge.color", "edge.gradientColors"],
                        unnamed: true,
                    },
                ],
                [{ id: "band", name: "Band", items: ["band"], main: ["edge.bandColor"] }],
                [{ id: "outline", name: "Outline", items: ["outline"], main: ["edge.outlineColor"] }],
            ],
        },
        {
            part: "ends",
            groups: [
                [
                    { id: "target", name: "Target end", items: ["target"], main: ["edge.arrowHead"] },
                    { id: "source", name: "Source end", items: ["source"], main: ["edge.arrowTail"] },
                ],
                [
                    {
                        id: "middleTarget",
                        name: "Middle target end",
                        items: ["middleTarget"],
                        main: ["edge.arrowMiddleHead"],
                    },
                    {
                        id: "middleSource",
                        name: "Middle source end",
                        items: ["middleSource"],
                        main: ["edge.arrowMiddleTail"],
                    },
                ],
            ],
        },
        {
            part: "route",
            groups: [
                [{ id: "route", name: "Route", items: ["route"], main: ["edge.route"] }],
                [{ id: "bundling", name: "Bundling", items: ["support"], main: ["edge.supportModel"] }],
            ],
        },
        {
            part: "text",
            groups: [
                [{ id: "label", name: "Label", items: ["label"], main: ["edge.label"] }],
                [
                    { id: "xlabel", name: "External label", items: ["xlabel"], main: ["edge.xlabel"] },
                    { id: "record", name: "Record", items: [], main: ["edge.labelTable"], own: ["edge.labelTable"] },
                ],
                [
                    {
                        id: "targetCaption",
                        name: "Target caption",
                        items: ["targetCaption"],
                        main: ["edge.arrowHeadText"],
                    },
                    {
                        id: "sourceCaption",
                        name: "Source caption",
                        items: ["sourceCaption"],
                        main: ["edge.arrowTailText"],
                    },
                ],
            ],
        },
        {
            part: "effects",
            groups: [
                [
                    { id: "underlay", name: "Underlay", items: ["underlay"], main: ["edge.underlayColor"] },
                    { id: "overlay", name: "Overlay", items: ["overlay"], main: ["edge.overlayColor"] },
                ],
            ],
        },
        {
            part: "visibility",
            groups: [
                [{ id: "visibility", name: "Visibility", items: ["visible"], main: ["edge.visible"], unnamed: true }],
            ],
        },
        { part: "shaders", groups: [] },
    ],
};

/**
 * Whether the row sets a channel: a line of its own (not the element's locked base), or, for
 * several rows, a line some of them write.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns true when it is set.
 */
export function setOn(ctx: RowContext, channel: Channel): boolean {
    const line = lineIn(ctx, channel);
    return (line !== undefined && !line.layer.locked) || partlySet(ctx, channel) !== undefined;
}

/**
 * The channel a thing's main control edits: the first of its main channels the row sets, else its
 * start, else the first the element offers; only channels its section offers count.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param channels - the thing's channels its section offers.
 * @returns its descriptor, or undefined when the element offers none of them here.
 */
export function mainOf(ctx: RowContext, thing: ThingSpec, channels: readonly Channel[]): ChannelDescriptor | undefined {
    const mains = thing.main.filter((channel) => channels.includes(channel));
    const set = mains.find((channel) => setOn(ctx, channel));
    const offered = (channel: Channel, held: boolean): ChannelDescriptor | undefined => {
        const descriptor = shownChannel(ctx.session, ctx.side, channel, held);
        return descriptor?.renderable === true ? descriptor : undefined;
    };
    if (set !== undefined) {
        return offered(set, true);
    }
    const first = thing.start !== undefined && mains.includes(thing.start) ? [thing.start] : [];
    return [...first, ...mains].map((channel) => offered(channel, false)).find((d) => d !== undefined);
}
