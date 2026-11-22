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
import { PATTERN_CHANNELS, SIZE_CHANNELS } from "./rubric";

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
    /** What it does, in its "+" menu item's tooltip, where its name alone does not say. */
    readonly hint?: string;
    /** The `parts.ts` part its items are in, when not its section's (Border and Visibility sit in Effects). */
    readonly from?: string;
    /** The tab's shaders: its "+" item opens the one shader gallery, and each use is a row of its own (E668). */
    readonly shader?: true;
}

/** One section: the `parts.ts` part it draws and its things, in "+" menu groups. */
export interface SectionThings {
    /** The `parts.ts` part's id. */
    readonly part: string;
    /** Its id and heading when not the part's (the edge's Ends part is the Arrows section, ia-design 2). */
    readonly id?: string;
    readonly title?: string;
    /** The first section of the tab's second group (how the mark shows): a separator is drawn above it (E551). */
    readonly breakBefore?: true;
    /** Its things, a divider between each two groups in its "+" menu. */
    readonly groups: readonly (readonly ThingSpec[])[];
}

/** The ring outside the node's border: an Effects thing, though `parts.ts` lists it under Border. */
const RING_CHANNELS: readonly Channel[] = [
    "node.outerBorderColor",
    "node.outerBorderWidth",
    "node.outerBorderOpacity",
    "node.outerBorderStyle",
    "node.outerBorderOffset",
    "node.outerBorderCount",
];

/** A node's Finish, its shading: Fill's, though `parts.ts` lists it under Shape (ia-design 2). */
const FINISH_CHANNELS: readonly Channel[] = ["node.flat", "node.unlit"];

/** The raised edge, a bevel: an Effects thing, though `parts.ts` lists it under Border. */
const RAISED_CHANNELS: readonly Channel[] = [
    "node.raisedBorderWidth",
    "node.raisedBorderLightColor",
    "node.raisedBorderDarkColor",
];

/** An edge's overlay, the Outline's Over line kind (ia-design 2), though `parts.ts` lists it under Effects. */
const OVERLAY_CHANNELS: readonly Channel[] = ["edge.overlayColor", "edge.overlayOpacity", "edge.overlayPadding"];

/** The custom shape's inner lines: the Shape's (its Custom shape sub-group), though `parts.ts` lists them under Border. */
const INNER_LINE_CHANNELS: readonly Channel[] = [
    "node.shapeLines",
    "node.shapeLineWidth",
    "node.shapeLineHaloColor",
    "node.shapeLineHaloWidth",
];

/**
 * The tab's shaders, one Effects item (E668): built-in and custom alike, every place but the node's own
 * (a shader drawn instead of the node is a Shape kind, E378).
 */
const SHADER: ThingSpec = { id: "shader", name: "Shader", items: [], main: [], shader: true };

/**
 * Each kind's sections in the panel's order and their things: the parts of the mark first (node Shape, Fill,
 * Text; edge Line, Arrows, Route, Text), a separator, then Effects, which holds Border and Visibility
 * (owner, 2026-11-22). There is no Shaders section: shaders are Effects' Shader item (E668).
 */
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
                        own: INNER_LINE_CHANNELS,
                        unnamed: true,
                    },
                    // Size is its own row, after Shape (owner, 2026-11-22): "size by degree" needs no Shape row.
                    { id: "size", name: "Size", items: [], main: ["node.size"], own: SIZE_CHANNELS },
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
                        items: ["solid", "gradient"],
                        main: ["node.color", "node.gradientColors"],
                        unnamed: true,
                    },
                ],
                // One picture style: placed on the node, or wrapped over its surface (ia-design 2).
                [
                    {
                        id: "image",
                        name: "Image",
                        items: ["image", "picture"],
                        main: ["node.image", "node.texture"],
                        start: "node.image",
                    },
                ],
                // ia-design 2's order: stripes are set in more files than pies.
                [
                    { id: "stripes", name: "Stripes", items: ["stripes"], main: ["node.stripeColors"] },
                    { id: "pie", name: "Pie", items: ["pie"], main: ["node.pieColors"] },
                    { id: "chart", name: "Chart", items: ["chart"], main: ["node.chartKind"] },
                    // How light falls on the surface (3D only): the Shape keeps its mesh (ia-design 2).
                    { id: "finish", name: "Finish", items: [], main: FINISH_CHANNELS, own: FINISH_CHANNELS },
                ],
            ],
        },
        {
            part: "text",
            groups: [
                // Label is Text or Glyph, picked from its row (kindGroups.ts): Glyph is no thing of its own (E275).
                [
                    {
                        id: "label",
                        name: "Label",
                        items: ["label"],
                        main: ["node.label", "node.glyph"],
                        start: "node.label",
                    },
                ],
                [{ id: "tooltip", name: "Tooltip", items: ["tooltip"], main: ["node.tooltip"] }],
                [
                    {
                        id: "record",
                        name: "Record",
                        items: ["record"],
                        main: ["node.shapeTexts"],
                        hint: "A table of fields inside the node",
                    },
                    { id: "xlabel", name: "External label", items: ["xlabel"], main: ["node.xlabel"] },
                ],
            ],
        },
        {
            part: "effects",
            breakBefore: true,
            groups: [
                // Border and Visibility are Effects options (owner, 2026-11-22).
                [
                    { id: "border", name: "Border", items: ["border"], main: ["node.borderColor"], from: "border" },
                    {
                        id: "visibility",
                        name: "Visibility",
                        items: ["visible"],
                        main: ["node.visible"],
                        from: "visibility",
                    },
                ],
                // Every look drawn around the node is here (ia-design 2): the ring stands off the rim.
                [
                    { id: "rings", name: "Ring", items: [], main: ["node.outerBorderColor"], own: RING_CHANNELS },
                    SHADER,
                    { id: "glow", name: "Glow", items: ["glow"], main: ["node.glow"] },
                ],
                [
                    {
                        id: "shadow",
                        name: "Drop shadow",
                        items: ["shadow"],
                        main: ["node.shadowColor"],
                    },
                    {
                        id: "raised",
                        name: "Raised edge",
                        items: [],
                        main: ["node.raisedBorderWidth"],
                        own: RAISED_CHANNELS,
                    },
                    // Underlay and overlay are one Plate, Behind or Over the node (kindGroups.ts, C2).
                    {
                        id: "plate",
                        name: "Plate",
                        items: ["underlay", "overlay"],
                        main: ["node.underlayColor", "node.overlayColor"],
                        start: "node.underlayColor",
                    },
                ],
            ],
        },
    ],
    edge: [
        {
            part: "line",
            groups: [
                [
                    {
                        id: "line",
                        name: "Line",
                        items: ["line", "gradient", "strands"],
                        main: ["edge.color", "edge.gradientColors"],
                        unnamed: true,
                    },
                    // Pattern is its own item, so "dashed" is in "+" (ia-design 2).
                    { id: "pattern", name: "Pattern", items: [], main: ["edge.style"], own: PATTERN_CHANNELS },
                ],
                // Every band along the line is one Outline, Under line or Over line (kindGroups.ts, C7).
                [
                    {
                        id: "outline",
                        name: "Outline",
                        items: ["outline"],
                        main: ["edge.outlineColor", "edge.overlayColor"],
                        start: "edge.outlineColor",
                        own: OVERLAY_CHANNELS,
                    },
                ],
            ],
        },
        {
            part: "ends",
            id: "arrows",
            title: "Arrows",
            groups: [
                // The four arrows are one Arrow item, a row per end in use (kindGroups.ts, C6).
                [
                    {
                        id: "arrow",
                        name: "Arrow",
                        items: ["target", "source", "middleTarget", "middleSource"],
                        main: ["edge.arrowHead", "edge.arrowTail", "edge.arrowMiddleHead", "edge.arrowMiddleTail"],
                        start: "edge.arrowHead",
                    },
                ],
            ],
        },
        {
            part: "route",
            groups: [
                [{ id: "route", name: "Route", items: ["route"], main: ["edge.route"] }],
                [
                    {
                        id: "bundling",
                        name: "Force curves",
                        items: ["support"],
                        main: ["edge.supportModel"],
                        hint: "Bows each edge as a physics simulation pulls and pushes it, so edges bend around one another",
                    },
                ],
            ],
        },
        {
            part: "text",
            groups: [
                [{ id: "label", name: "Label", items: ["label"], main: ["edge.label"] }],
                // In the node tab's place (ia-design 5, fix 2), so the two Text "+" menus match.
                [{ id: "tooltip", name: "Tooltip", items: ["tooltip"], main: ["edge.tooltip"] }],
                // The two end captions are one End caption item, a row per end (kindGroups.ts, C1).
                [
                    {
                        id: "endCaption",
                        name: "End caption",
                        items: ["targetCaption", "sourceCaption"],
                        main: ["edge.arrowHeadText", "edge.arrowTailText"],
                        start: "edge.arrowHeadText",
                    },
                    { id: "record", name: "Record", items: [], main: ["edge.labelTable"], own: ["edge.labelTable"] },
                    { id: "xlabel", name: "External label", items: ["xlabel"], main: ["edge.xlabel"] },
                ],
            ],
        },
        {
            part: "effects",
            breakBefore: true,
            groups: [
                [
                    {
                        id: "visibility",
                        name: "Visibility",
                        items: ["visible"],
                        main: ["edge.visible"],
                        from: "visibility",
                    },
                ],
                // The edge's shaders and its animation; the bands along the line are Line's Outline (ia-design 2).
                [
                    SHADER,
                    {
                        id: "animation",
                        name: "Animation",
                        items: [],
                        main: ["edge.animationSpeed"],
                        own: ["edge.animationSpeed"],
                    },
                ],
            ],
        },
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

/** How many rows a section draws before it separates them by kind (design 6.7). */
const LONG_SECTION = 8;

/**
 * A section's rows, and in a long section the same rows in runs of one thing each under that thing's name as an
 * always-open legend (a divider only, never a second collapsible level; feedback ledger items 25 and 56).
 * @param rows - the rows, in the section's order.
 * @returns the runs: one with no legend for a short section.
 */
export function byKind<T extends { readonly thing: ThingSpec }>(
    rows: readonly T[],
): readonly { readonly legend?: string; readonly rows: readonly T[] }[] {
    if (rows.length <= LONG_SECTION) {
        return [{ rows }];
    }
    const runs: { legend: string; rows: T[] }[] = [];
    for (const row of rows) {
        const last = runs.at(-1);
        if (last?.legend === row.thing.name) {
            last.rows.push(row);
        } else {
            runs.push({ legend: row.thing.name, rows: [row] });
        }
    }
    return runs;
}
