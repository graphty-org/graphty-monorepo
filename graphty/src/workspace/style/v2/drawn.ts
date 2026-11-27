/**
 * Style panel v2's hidden and dimmed lines and "+" items (design/ui/style-panel-v2/design.md, "Input rules"): a
 * setting graphty-element draws only in the other view is hidden (`inOtherView` and its callers), and one that
 * draws nothing for any other reason with what the row holds now is dimmed, with the tooltip words saying why, all
 * read from the element's own facts (`drawnWhen`, `channelDrawn`, `valueDrawn`, `labelFieldDrawn`, a shader's
 * `views`). A pop-over line ruled out by another setting of the row (`ruledOut`) is not drawn until it applies
 * (design "Input rules", "Tabs").
 */

import {
    type Channel,
    type ChannelCondition,
    type ChannelDescriptor,
    channelDescriptor,
    channelDrawn,
    type LabelFieldCondition,
    labelFieldDrawn,
    labelFieldOf,
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
 * node size's Focus draws only in 3D, its Uniform what Scale draws for an icosphere), or undefined when it does.
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
        channelDescriptor(channel)?.default ??
        labelFieldDefault(channel)
    );
}

/**
 * A label field channel's default (`node.labelFont`): it carries none of its own, its field in the label style does.
 * @param channel - the channel.
 * @returns the field's default, or undefined for a channel that is not a label field.
 */
function labelFieldDefault(channel: Channel): unknown {
    const field = labelFieldOf(channel)?.field;
    return field === undefined ? undefined : labelFieldDescriptor(field)?.default;
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
    // A value the row writes that a layer above draws over on every one of its elements draws nothing.
    const own = lineIn(ctx, channel);
    const over = own?.layer.enabled === true ? ctx.paintedOverBy?.(channel) : undefined;
    if (over !== undefined) {
        return `${over} draws over it`;
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
 * What a label style holds for a field: the layer's own, else what the layers beneath give.
 * @param ctx - the row.
 * @param styleChannel - the text kind's label style channel.
 * @param style - the layer's own label style.
 * @returns the reader.
 */
function labelReader(
    ctx: RowContext,
    styleChannel: Channel,
    style: Readonly<LabelStyle>,
): (field: keyof LabelStyle) => unknown {
    const beneath = ctx.beneath(styleChannel).value;
    const below = typeof beneath === "object" && beneath !== null ? (beneath as Readonly<Record<string, unknown>>) : {};
    return (other) => (style as Readonly<Record<string, unknown>>)[other] ?? below[other];
}

/**
 * Whether a pop-over line is ruled out by another setting of the row (a wave's size on a solid border), not by the
 * view: such a line is drawn only once it applies, or while the layer sets it (design "Input rules", "Tabs").
 * @param ctx - the row.
 * @param channel - the line's channel.
 * @param own - the channels of the thing's pop-over.
 * @returns true when another setting rules it out.
 */
export function ruledOut(ctx: RowContext, channel: Channel, own: readonly Channel[]): boolean {
    if (channelDescriptor(channel) === undefined) {
        return false;
    }
    const found = channelDrawn(channel, rowReader(ctx), ctx.session.layout);
    // Only a setting of the same pop-over: what another thing rules out (a fit to a label the node lacks) stays dimmed.
    return !found.drawn && "channel" in found.unmet && own.includes(found.unmet.channel);
}

/**
 * Whether a label style field is ruled out by another field of the style, not by the view (see `ruledOut`), and not
 * by a partner it writes itself unless that partner is a line beside it.
 * @param ctx - the row.
 * @param styleChannel - the text kind's label style channel.
 * @param style - the layer's own label style.
 * @param field - the field.
 * @param same - the other fields of the same line (a pair's second number), which never rule it out.
 * @param beside - the fields of the lines drawn with it: a switch among them rules it out until it is on (Depth fade,
 * Pointer), as a line that depends on a one-of in the same pop-over is drawn once it applies (design "Input rules").
 * @returns true when another field rules it out.
 */
export function labelRuledOut(
    ctx: RowContext,
    styleChannel: Channel,
    style: Readonly<LabelStyle>,
    field: keyof LabelStyle,
    same: readonly (keyof LabelStyle)[] = [],
    beside: readonly (keyof LabelStyle)[] = [],
): boolean {
    const read = labelReader(ctx, styleChannel, style);
    const found = labelFieldDrawn(field, read, viewOf(ctx.session));
    if (found.drawn || !("field" in found.unmet)) {
        return false;
    }
    // A partner the line writes itself from the reader's one click (graphty-element's `needs`: a look's switch) does
    // not rule it out.
    const { field: partner } = found.unmet;
    return (
        !same.includes(partner) &&
        (beside.includes(partner) ||
            labelFieldDescriptor(field)?.needs?.some((need) => need.field === partner) !== true)
    );
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
    const read = labelReader(ctx, styleChannel, style);
    const found = labelFieldDrawn(field, read, viewOf(ctx.session));
    if (found.drawn) {
        return undefined;
    }
    const name =
        "field" in found.unmet ? (labelFieldDescriptor(found.unmet.field)?.plainName ?? found.unmet.field) : "";
    return unmetWords(found.unmet, name);
}

/**
 * Whether graphty-element draws a setting only in the other view: one of its conditions names a view, and it is not
 * the view shown now. Such a setting is hidden, not dimmed (owner, 2026-11-27); a value the layer holds for it stays.
 * @param session - the element's session.
 * @param conditions - the setting's conditions (a channel's `drawnWhen`, a value's, a label field's).
 * @returns true when it is drawn only in the other view.
 */
function inOtherView(
    session: GraphSession,
    conditions: readonly (ChannelCondition | LabelFieldCondition)[] | undefined,
): boolean {
    const view = viewOf(session);
    return conditions?.some((condition) => "dimension" in condition && condition.dimension !== view) === true;
}

/**
 * Whether a channel is hidden in the view shown now: graphty-element draws it only in the other view (Lift in 2D,
 * a raised edge or a plate in 3D).
 * @param session - the element's session.
 * @param channel - the channel.
 * @returns true when it is hidden.
 */
export function channelHidden(session: GraphSession, channel: Channel): boolean {
    return inOtherView(session, channelDescriptor(channel)?.drawnWhen);
}

/**
 * Whether one value of a channel is hidden in the view shown now (`valueViews`: a node size's Pivot in 2D).
 * @param session - the element's session.
 * @param descriptor - the channel's descriptor.
 * @param value - the value.
 * @returns true when it is hidden.
 */
export function valueHidden(session: GraphSession, descriptor: ChannelDescriptor, value: string): boolean {
    const views = descriptor.valueViews?.[value];
    const view: ChannelCondition[] = views?.length === 1 ? [{ dimension: views[0] }] : [];
    return inOtherView(session, [...view, ...(descriptor.valueDrawnWhen?.[value] ?? [])]);
}

/**
 * Whether a label style field is hidden in the view shown now: graphty-element draws it only in the other view.
 * @param session - the element's session.
 * @param field - the field.
 * @returns true when it is hidden.
 */
export function labelFieldHidden(session: GraphSession, field: keyof LabelStyle): boolean {
    return inOtherView(session, labelFieldDescriptor(field)?.drawnWhen);
}

/**
 * Whether a shader is hidden in the view shown now, from the views its catalog entry declares.
 * @param session - the element's session.
 * @param views - the shader's declared views; unset is both.
 * @returns true when it is hidden.
 */
export function shaderHidden(session: GraphSession, views: readonly ("2d" | "3d")[] | undefined): boolean {
    return views !== undefined && !views.includes(viewOf(session));
}
