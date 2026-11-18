/**
 * Style panel v2's line writes (design/ui/style-panel-v2/design.md, sections 2.6 and 5.2): which
 * rule a line follows, unsetting lines in one undo step, and moving a value between units.
 */

import type { Channel, ChannelDescriptor, ChannelValue } from "@graphty/graphty-element/catalog";

import type { RowContext } from "../PropertyRow";
import { lineIn, removeLine, writeIn } from "../row";
import { channelWord } from "../words";
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
        return "R8";
    }
    if (line.rule !== undefined) {
        return line.rule;
    }
    const kinds: Partial<Record<ChannelDescriptor["accepts"], Rule>> = { color: "R1", number: "R5", boolean: "R7" };
    return kinds[descriptor.accepts] ?? "field";
}

/**
 * Takes channels off the row, one undo step.
 * @param ctx - the row.
 * @param channels - the channels.
 * @returns when it is done.
 */
export async function unsetIn(ctx: RowContext, channels: readonly Channel[]): Promise<unknown> {
    const { many, session } = ctx;
    if (many !== undefined) {
        const [first, ...more] = channels.filter((channel) => many.count(channel) > 0);
        return first === undefined ? undefined : many.clear(first, ...more);
    }
    const held = channels.filter((channel) => setOn(ctx, channel));
    if (held.length === 0) {
        return undefined;
    }
    return session.transaction(`removing ${channelWord(held[0]).toLowerCase()}`, async (tx) => {
        for (const layer of ctx.layers.filter((each) => !each.locked)) {
            const own = tx.styles.get(layer.id);
            const mine = held.filter((c) => own?.set?.[c] !== undefined || own?.encode?.[c] !== undefined);
            if (own !== undefined && mine.length > 0) {
                await removeLine(tx, own, ...mine);
            }
        }
    });
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
    if (ctx.many !== undefined || line === undefined) {
        return unsetIn(
            ctx,
            from.filter((c) => c !== to),
        ).then(() => writeIn(ctx, to, { value }));
    }
    const { layer } = line;
    const others = new Set(from.filter((c) => c !== to));
    const strip = <T>(record: Readonly<Partial<Record<Channel, T>>> | undefined): Partial<Record<Channel, T>> =>
        Object.fromEntries(Object.entries(record ?? {}).filter(([c]) => !others.has(c as Channel)));
    return ctx.session.transaction(`changing ${channelWord(to).toLowerCase()}'s unit`, async (tx) => {
        await tx.styles.update(layer.id, { set: { ...strip(layer.set), [to]: value }, encode: strip(layer.encode) });
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
