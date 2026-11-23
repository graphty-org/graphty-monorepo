/**
 * Style panel v2's dimmed lines and "+" items (design/ui/style-panel-v2/design.md, "a style that only does
 * anything in one view stays visible in the other view but is dimmed there"): whether graphty-element draws
 * a channel or a label field with what the row holds now and in the view shown now, read from the element's
 * own facts (`channelDrawn`, `labelFieldDrawn`), and the tooltip words saying why not. Nothing is hidden,
 * reordered or removed for it.
 */

import {
    type Channel,
    type ChannelCondition,
    type ChannelDescriptor,
    channelDescriptor,
    channelDrawn,
    type LabelFieldCondition,
    labelFieldDrawn,
    valueDrawn,
} from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";

import type { RowContext } from "../PropertyRow";
import { lineIn } from "../row";
import { channelWord, enumWords } from "../words";
import { labelFieldDescriptor } from "./labelRubric";
import { EDGE_RUBRIC, NODE_RUBRIC, rubricLines } from "./rubric";

/**
 * The view shown now.
 * @param session - the element's session.
 * @returns 2D or 3D.
 */
function viewOf(session: GraphSession): "2d" | "3d" {
    return session.layout.dimension;
}

/**
 * The tooltip words for a condition that is not met: "2D only", "Only when Pattern is dash or dot".
 * @param unmet - the condition.
 * @param name - the name of the channel or field it is on.
 * @returns the words.
 */
function unmetWords(unmet: ChannelCondition | LabelFieldCondition, name: string): string {
    if ("dimension" in unmet) {
        return unmet.dimension === "2d" ? "2D only" : "3D only";
    }
    if ("arranged" in unmet) {
        return unmet.arranged === "2d" ? "Only for a flat layout" : "Only for a 3D layout";
    }
    if ("anyOf" in unmet) {
        const names = unmet.anyOf
            .flatMap((all) => all.slice(0, 1))
            .map((one) => ("channel" in one ? channelWord(one.channel) : ""));
        return `Only when ${[names.slice(0, -1).join(", "), names.at(-1)].filter(Boolean).join(" or ")} is set`;
    }
    if ("set" in unmet) {
        return `Only when ${name} is set`;
    }
    if ("unset" in unmet) {
        return `Only while ${name} is not set`;
    }
    const SWITCH: Readonly<Record<string, string>> = { true: "on", false: "off" };
    const values = unmet.values.map((value) => SWITCH[value] ?? enumWords(value));
    return `Only when ${name} is ${values.join(" or ")}`;
}

/**
 * Why one value of a channel draws nothing new with what the row holds now in the view shown now (`valueDrawn`: a
 * node size's Pivot draws only in 3D, its Uniform what Scale draws for an icosphere), or undefined when it does.
 * @param ctx - the row.
 * @param descriptor - the channel's descriptor.
 * @param value - the value.
 * @returns the tooltip words, or undefined.
 */
export function valueDimOf(ctx: RowContext, descriptor: ChannelDescriptor, value: string): string | undefined {
    const found = valueDrawn(descriptor.channel, value, rowReader(ctx), ctx.session.layout);
    if (found.drawn) {
        return undefined;
    }
    return unmetWords(found.unmet, "channel" in found.unmet ? channelWord(found.unmet.channel) : "");
}

/**
 * What the row holds for a channel: its own line's value or binding, else what the layers beneath give (an object
 * where they paint different values).
 * @param ctx - the row.
 * @returns the reader, undefined where nothing sets the channel.
 */
export function rowReader(ctx: RowContext): (other: Channel) => unknown {
    return (other) => {
        const line = lineIn(ctx, other);
        if (line?.binding !== undefined) {
            // Varies by data: set, and some elements may hold any value (channelDrawn reads an object so).
            return line.binding;
        }
        const beneath = ctx.beneath(other);
        return line?.value ?? (beneath.mixed === true ? beneath : beneath.value);
    };
}

/**
 * What an unset line shows (design "Input rules": every input has a value): what the layers beneath paint,
 * else what graphty-element draws by default for the row.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns the value drawn, or undefined when graphty-element names none.
 */
export function drawnValue(ctx: RowContext, channel: Channel): unknown {
    return (
        ctx.beneath(channel).value ??
        ctx.session.styles.defaultValue(channel, undefined, rowReader(ctx)) ??
        channelDescriptor(channel)?.default
    );
}

/**
 * Why a channel draws nothing with what the row holds now in the view shown now, or undefined when it draws.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns the tooltip words, or undefined.
 */
export function dimOf(ctx: RowContext, channel: Channel): string | undefined {
    if (channelDescriptor(channel) === undefined) {
        return undefined;
    }
    const read = rowReader(ctx);
    // The layout itself, so a lift out of a 3D layout's plane and a location map's raised routes are read too.
    const found = channelDrawn(channel, read, ctx.session.layout);
    if (found.drawn) {
        return undefined;
    }
    if ("set" in found.unmet) {
        const moved = unitWords(ctx.side, found.unmet.channel, read);
        if (moved !== undefined) {
            return moved;
        }
    }
    return unmetWords(found.unmet, "channel" in found.unmet ? channelWord(found.unmet.channel) : "");
}

/**
 * The words for a channel left unset because its value moved to another unit of the same Unit line (Wrap around
 * shape on moves `node.image` to `node.texture`): "Only when Wrap around shape is off", or undefined.
 * @param side - nodes or edges.
 * @param channel - the unset channel the condition needs.
 * @param read - reads what the row holds.
 * @returns the words, or undefined.
 */
function unitWords(side: string, channel: Channel, read: (other: Channel) => unknown): string | undefined {
    const rubrics = side === "edge" ? EDGE_RUBRIC : NODE_RUBRIC;
    for (const line of Object.values(rubrics).flatMap((rubric) => rubricLines(rubric))) {
        const own = line.unit?.find(([, unit]) => unit === channel);
        const moved = line.unit?.some(([, unit]) => unit !== channel && read(unit) !== undefined) === true;
        if (own !== undefined && moved && typeof line.name === "string") {
            return `Only when ${line.name} is ${own[0].toLowerCase()}`;
        }
    }
    return undefined;
}

/**
 * Why a label style field draws nothing with what the row holds now in the view shown now, or undefined.
 * @param ctx - the row.
 * @param styleChannel - the text kind's label style channel.
 * @param style - the layer's own label style.
 * @param field - the field.
 * @returns the tooltip words, or undefined.
 */
export function labelDimOf(
    ctx: RowContext,
    styleChannel: Channel,
    style: Readonly<LabelStyle>,
    field: keyof LabelStyle,
): string | undefined {
    const beneath = ctx.beneath(styleChannel).value;
    const below = typeof beneath === "object" && beneath !== null ? (beneath as Readonly<Record<string, unknown>>) : {};
    const read = (other: keyof LabelStyle): unknown =>
        (style as Readonly<Record<string, unknown>>)[other] ?? below[other];
    const found = labelFieldDrawn(field, read, viewOf(ctx.session));
    if (found.drawn) {
        return undefined;
    }
    const name =
        "field" in found.unmet ? (labelFieldDescriptor(found.unmet.field)?.plainName ?? found.unmet.field) : "";
    return unmetWords(found.unmet, name);
}

/**
 * Why a channel draws nothing in the view shown now, from graphty-element's view fact alone (a "+" item for a
 * thing not added yet: Lift in 2D), or undefined.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns "2D only", "3D only", or undefined.
 */
export function viewDim(ctx: Pick<RowContext, "session">, channel: Channel): string | undefined {
    const other = channelDescriptor(channel)?.drawnWhen?.find(
        (condition) => "dimension" in condition && condition.dimension !== viewOf(ctx.session),
    );
    return other === undefined ? undefined : unmetWords(other, "");
}

/**
 * Why a shader draws nothing in the view shown now, from the views its catalog entry declares, or undefined.
 * @param session - the element's session.
 * @param views - the shader's declared views; unset is both.
 * @returns "2D only", "3D only", or undefined.
 */
export function shaderViewDim(session: GraphSession, views: readonly ("2d" | "3d")[] | undefined): string | undefined {
    if (views === undefined || views.includes(viewOf(session))) {
        return undefined;
    }
    return views.includes("2d") ? "2D only" : "3D only";
}
