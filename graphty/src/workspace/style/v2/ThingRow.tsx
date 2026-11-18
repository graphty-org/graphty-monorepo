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
    // The thing's other set lines, until its settings pop-over has its own sub-groups.
    const others = channels.flatMap((channel) => {
        const descriptor =
            channel === main.channel || !setOn(ctx, channel)
                ? undefined
                : shownChannel(ctx.session, ctx.side, channel, true);
        return descriptor?.renderable === true ? [descriptor] : [];
    });
    const settings = (
        <SettingsPopout
            label={`${title} settings`}
            title={title}
            changed={others.length > 0}
            icon={<GLYPHS.sliders size={14} aria-hidden />}
        >
            {others.map((descriptor) => (
                <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />
            ))}
        </SettingsPopout>
    );
    const remove = (): void => {
        onCancel();
        removeThing(ctx, thing.name, channels)
            .then(() => {
                store.set({ announcement: `${thing.name} removed` });
            })
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords(thing.name, "removed", error), error: true } });
            });
    };
    return (
        <div data-thing={thing.id}>
            <Field
                ctx={ctx}
                descriptor={main}
                pending={pending || !setOn(ctx, main.channel)}
                onCancel={onCancel}
                thing={{
                    name: thing.unnamed === true ? null : thing.name,
                    slot: settings,
                    removeLabel: `Remove ${title.toLowerCase()}`,
                    onRemove: remove,
                }}
            />
        </div>
    );
}
