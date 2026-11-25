/**
 * Style panel v2's line writes (design/ui/style-panel-v2/design.md, sections 2.6 and 5.2): which
 * rule a line follows, unsetting lines in one undo step, and moving a value between units.
 */

import type { Channel, ChannelDescriptor, ChannelValue, ShaderUse } from "@graphty/graphty-element/catalog";
import type { Layer } from "@graphty/graphty-element/session";

import type { RowContext } from "../PropertyRow";
import { layerWord, lineIn, removeLine, writeIn } from "../row";
import { channelWord, isPercent } from "../words";
import { replaces } from "./families";
import { lineChannels, type LineSpec, type Rule, type SubGroup } from "./rubric";
import { setOn } from "./things";

/**
 * The rule a line follows: the one it names, else its channel's kind's.
 * @param line - the line.
 * @param descriptor - its channel.
 * @returns the rule.
 */
export function ruleOf(line: LineSpec, descriptor: ChannelDescriptor): Rule {
    if (line.unit !== undefined) {
        // A Unit line is a strip of units, or a checkbox moving the value to its second unit.
        return line.rule === "R7" ? "R7" : "R8";
    }
    if (line.rule !== undefined) {
        return line.rule;
    }
    const kinds: Partial<Record<ChannelDescriptor["accepts"], Rule>> = { color: "R1", number: "R5", boolean: "R7" };
    return kinds[descriptor.accepts] ?? "field";
}

/**
 * Takes channels off the row, one undo step; for the whole Shape thing, the shader drawn in the
 * shapes' place too (design 4.1), on one row or several alike.
 * @param ctx - the row.
 * @param channels - the channels.
 * @param thing - the whole thing being removed, when it is: its name for the step, and whether it is the Shape.
 * @param thing.name - its name.
 * @param thing.shape - whether it is the Shape thing.
 * @returns when it is done.
 */
export async function unsetIn(
    ctx: RowContext,
    channels: readonly Channel[],
    thing?: { readonly name: string; readonly shape: boolean },
): Promise<unknown> {
    const { many, session } = ctx;
    const shape = thing?.shape === true;
    if (many !== undefined && !shape) {
        const counted = channels.filter((channel) => many.count(channel) > 0);
        const [first, more] = [counted.at(0), counted.slice(1)];
        return first === undefined ? undefined : many.clear(first, ...more);
    }
    const layers = ctx.layers.filter((each) => !each.locked);
    const held = channels.filter((channel) => layers.some((layer) => holds(layer, channel)));
    const replaced = shape ? layers.filter((layer) => replaceIn(ctx, layer.set) !== undefined) : [];
    if (held.length === 0 && replaced.length === 0) {
        return undefined;
    }
    const label =
        thing === undefined
            ? `removing ${channelWord(held[0] ?? channels[0]).toLowerCase()}`
            : `removing ${thing.name.toLowerCase()} from ${(layers.length === 0 ? undefined : layerWord(session, layers[0].id)) ?? "the default"}`;
    return session.transaction(label, async (tx) => {
        for (const { id } of layers) {
            const own = tx.styles.get(id);
            const mine = held.filter((channel) => own !== undefined && holds(own, channel));
            if (own !== undefined && mine.length > 0) {
                await removeLine(tx, own, ...mine);
            }
            const after = tx.styles.get(id);
            const kept = shape ? replaceIn(ctx, after?.set) : undefined;
            if (after !== undefined && kept !== undefined) {
                const set: Record<string, unknown> = { ...after.set };
                if (kept.length > 0) {
                    set["node.shaders"] = kept;
                } else {
                    Reflect.deleteProperty(set, "node.shaders");
                }
                await tx.styles.update(id, { set }, { keepEmpty: true });
            }
        }
    });
}

/**
 * Whether a layer sets or binds a channel.
 * @param layer - the layer.
 * @param channel - the channel.
 * @returns true when it does.
 */
function holds(layer: Layer, channel: Channel): boolean {
    return layer.set?.[channel] !== undefined || layer.encode?.[channel] !== undefined;
}

/**
 * A layer's shader uses less the one drawn in the shapes' place, when it holds one.
 * @param ctx - the row.
 * @param set - the layer's `set`.
 * @returns the uses left, or undefined when it draws no shader in the shapes' place.
 */
function replaceIn(ctx: RowContext, set: Layer["set"]): readonly ShaderUse[] | undefined {
    const uses = set?.["node.shaders"];
    if (!Array.isArray(uses)) {
        return undefined;
    }
    const kept = (uses as readonly ShaderUse[]).filter((use) => !replaces(ctx, use));
    return kept.length === uses.length ? undefined : kept;
}

/**
 * Moves a value from one unit's channel to another's, one undo step: writes the new channel and
 * takes the others off (design 5.2, "Unit writes").
 * @param ctx - the row.
 * @param to - the channel of the unit picked.
 * @param from - every unit's channel.
 * @param start - the value to write when no unit holds one.
 * @returns when it is done.
 */
export async function moveUnit(
    ctx: RowContext,
    to: Channel,
    from: readonly Channel[],
    start: ChannelValue | undefined,
): Promise<unknown> {
    const held = from.find((channel) => channel !== to && setOn(ctx, channel));
    const value = held === undefined ? start : lineIn(ctx, held)?.value;
    const line = held === undefined ? undefined : lineIn(ctx, held);
    if (value === undefined) {
        return undefined;
    }
    if (line === undefined) {
        // Nothing to move: the start is written, as any first value is.
        return writeIn(ctx, to, { value });
    }
    const others = new Set(from.filter((c) => c !== to));
    const strip = <T>(record: Readonly<Partial<Record<Channel, T>>> | undefined): Partial<Record<Channel, T>> =>
        Object.fromEntries(Object.entries(record ?? {}).filter(([c]) => !others.has(c as Channel)));
    // One row: the layer that holds the value; several: every layer of theirs holding a unit, each
    // keeping its own value. One undo step either way (design 5.2).
    const layers =
        ctx.many === undefined
            ? [line.layer]
            : ctx.layers.filter((each) => !each.locked && from.some((c) => each.set?.[c] !== undefined));
    return ctx.session.transaction(`changing ${channelWord(to).toLowerCase()}'s unit`, async (tx) => {
        for (const { id } of layers) {
            const own = tx.styles.get(id);
            const unit = from.find((c) => own?.set?.[c] !== undefined && c !== to) ?? to;
            const kept = own?.set?.[unit] ?? value;
            if (own !== undefined) {
                await tx.styles.update(id, { set: { ...strip(own.set), [to]: kept }, encode: strip(own.encode) });
            }
        }
    });
}

/**
 * Whether a sub-group holds a line the row sets.
 * @param ctx - the row.
 * @param group - the sub-group.
 * @returns true when it does.
 */
export function groupSet(ctx: RowContext, group: SubGroup): boolean {
    return group.lines.some((line) => lineChannels(line).some((channel) => setOn(ctx, channel)));
}

/**
 * Whether a number channel reads as a percent: an opacity, or any other fraction from 0 to 1 (a pie's hole).
 * @param descriptor - its channel.
 * @returns whether it does.
 */
export function readsAsPercent(descriptor: ChannelDescriptor): boolean {
    return isPercent(descriptor) || (descriptor.accepts === "number" && descriptor.min === 0 && descriptor.max === 1);
}

/**
 * Whether a number line is a range drawn as a slider: a percent, which has a fixed least and greatest value.
 * @param descriptor - its channel, or a label style field described as one.
 * @param percent - reads as a percent, when not its channel's say.
 * @returns whether it is.
 */
export function rangeOf(descriptor: ChannelDescriptor, percent?: boolean): boolean {
    return (percent ?? readsAsPercent(descriptor)) && descriptor.min !== undefined && descriptor.max !== undefined;
}
