/**
 * One thing's row in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.4): its name
 * (none where its section names it), its main control, its settings button and a minus that takes
 * the whole thing off the layer in one undo step.
 */

import type { Channel } from "@graphty/graphty-element/catalog";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { SettingsPopout } from "../../options/SettingsPopout";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { Field, type RowContext } from "../PropertyRow";
import { layerWord, removeLine } from "../row";
import { failureWords } from "../words";
import { LabelRow } from "./LabelRow";
import { TEXT_THINGS } from "./labelRubric";
import { rubricChannels, rubricOf } from "./rubric";
import { RubricLine } from "./RubricLine";
import { ThingPopover } from "./ThingPopover";
import { mainOf, setOn, type ThingSpec } from "./things";

/**
 * Takes every channel of a thing off the row's layers, one undo step.
 * @param ctx - the row.
 * @param name - the thing's name, for the step.
 * @param channels - the thing's channels.
 * @returns when it is done.
 */
async function removeThing(ctx: RowContext, name: string, channels: readonly Channel[]): Promise<unknown> {
    const { many, session } = ctx;
    if (many !== undefined) {
        // ponytail: several rows clear one channel at a time, one undo step each (Style panel v2, chunk 6).
        return channels
            .filter((channel) => many.count(channel) > 0)
            .reduce<Promise<unknown>>((done, channel) => done.then(() => many.clear(channel)), Promise.resolve());
    }
    const layers = ctx.layers.filter((layer) => !layer.locked);
    const where = layers[0] === undefined ? undefined : layerWord(session, layers[0].id);
    return session.transaction(`removing ${name.toLowerCase()} from ${where ?? "the default"}`, async (tx) => {
        for (const { id } of layers) {
            const layer = tx.styles.get(id);
            const held = channels.filter((c) => layer?.set?.[c] !== undefined || layer?.encode?.[c] !== undefined);
            if (layer !== undefined && held.length > 0) {
                await removeLine(tx, layer, ...held);
            }
        }
    });
}

/**
 * One thing's row: see the file header.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.thing - the thing
 * @param props.channels - every channel the thing holds
 * @param props.pending - added with "+" and waiting for its first value
 * @param props.onCancel - takes a waiting thing away again
 * @returns The row, or nothing when the element offers none of its main channels here
 */
export function ThingRow({
    ctx,
    thing,
    channels,
    pending,
    onCancel,
}: Readonly<{
    ctx: RowContext;
    thing: ThingSpec;
    channels: readonly Channel[];
    pending: boolean;
    onCancel: () => void;
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const main = mainOf(ctx, thing, channels);
    if (main === undefined) {
        return null;
    }
    const kind = ctx.side === "node" ? "Node" : "Edge";
    const title = `${kind} ${thing.name.toLowerCase()}`;
    const rubric = rubricOf(ctx.side, thing.id, main.channel);
    const covered = new Set(rubric === undefined ? [] : rubricChannels(rubric));
    // Every channel the minus takes off: the thing's own and every line of its rubric.
    const all = [...new Set([...channels, ...covered])];
    // The thing's set lines its rubric has no line for (or, with no rubric yet, every other set line).
    const others = channels.flatMap((channel) => {
        const descriptor =
            channel === main.channel || covered.has(channel) || !setOn(ctx, channel)
                ? undefined
                : shownChannel(ctx.session, ctx.side, channel, true);
        return descriptor?.renderable === true ? [descriptor] : [];
    });
    const common = rubric?.common ?? [];
    const commonChannels = new Set(common.flatMap((line) => [line.channel, ...(line.units ?? [])]));
    const changed =
        others.length > 0 ||
        [...covered].some((channel) => channel !== main.channel && !commonChannels.has(channel) && setOn(ctx, channel));
    const settings = (
        <SettingsPopout
            label={`${title} settings`}
            title={title}
            changed={changed}
            icon={<GLYPHS.sliders size={14} aria-hidden />}
        >
            {rubric === undefined ? (
                others.map((descriptor) => <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />)
            ) : (
                <ThingPopover ctx={ctx} title={title} rubric={rubric} others={others} />
            )}
        </SettingsPopout>
    );
    const remove = (): void => {
        onCancel();
        removeThing(ctx, thing.name, all)
            .then(() => {
                store.set({ announcement: `${thing.name} removed` });
            })
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords(thing.name, "removed", error), error: true } });
            });
    };
    const removeLabel = `Remove ${title.toLowerCase()}`;
    const text = ctx.side === "node" ? TEXT_THINGS[thing.id] : undefined;
    if (text !== undefined) {
        return (
            <div data-thing={thing.id}>
                <LabelRow
                    ctx={ctx}
                    kind={text}
                    name={thing.name}
                    title={title}
                    channels={channels}
                    pending={pending}
                    removeLabel={removeLabel}
                    onRemove={remove}
                />
            </div>
        );
    }
    return (
        <div data-thing={thing.id}>
            {rubric?.row === undefined ? (
                <Field
                    ctx={ctx}
                    descriptor={main}
                    pending={pending || !setOn(ctx, main.channel)}
                    onCancel={onCancel}
                    thing={{
                        name: thing.unnamed === true ? null : thing.name,
                        slot: settings,
                        removeLabel,
                        onRemove: remove,
                    }}
                />
            ) : (
                <RubricLine ctx={ctx} line={rubric.row} row={{ slot: settings, removeLabel, onRemove: remove }} />
            )}
            {common.map((line) => (
                <RubricLine key={line.channel} ctx={ctx} line={line} />
            ))}
        </div>
    );
}
