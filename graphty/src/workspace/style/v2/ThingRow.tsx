/**
 * One thing's row in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.4): its name
 * (none where its section names it), its main control, its settings button and a minus that takes
 * the whole thing off the layer in one undo step.
 */

import type { Channel, ChannelDescriptor } from "@graphty/graphty-element/catalog";
import { TextInput } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../../glyphs";
import { SettingsPopout } from "../../options/SettingsPopout";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { GradientButton } from "../parts/GradientRow";
import { Field, type RowContext } from "../PropertyRow";
import { layerWord, removeLine } from "../row";
import { ShaderParams } from "../ShaderParams";
import { bindingsOf, paramsOf, placeOf, shaderEntries, shadersChannel, unbindParam, writeParam } from "../shaderSlots";
import { failureWords, takesBinding } from "../words";
import { dropReplace, familyOf, replaceUse } from "./families";
import { LabelRow } from "./LabelRow";
import { TEXT_THINGS, type TextThing } from "./labelRubric";
import { type LineSpec, rubricChannels, rubricOf, SHAPE_REPLACE_RUBRIC, type ThingRubric } from "./rubric";
import { LineFrame, type RowSlots, RubricLine } from "./RubricLine";
import { FirstLines, ThingPopover } from "./ThingPopover";
import { mainOf, setOn, type ThingSpec } from "./things";

/**
 * Takes every channel of a thing off the row's layers, one undo step.
 * @param ctx - the row.
 * @param name - the thing's name, for the step.
 * @param channels - the thing's channels.
 * @param shape - whether it is the Shape thing, whose shader in the shapes' place goes too.
 * @returns when it is done.
 */
async function removeThing(
    ctx: RowContext,
    name: string,
    channels: readonly Channel[],
    shape: boolean,
): Promise<unknown> {
    const { many, session } = ctx;
    if (many !== undefined) {
        const [first, ...more] = channels.filter((channel) => many.count(channel) > 0);
        return first === undefined ? undefined : many.clear(first, ...more);
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
            // A shader drawn in the shapes' place is the Shape thing's too (design 4.1).
            const after = tx.styles.get(id);
            if (shape && after?.set !== undefined) {
                const set: Record<string, unknown> = { ...after.set };
                dropReplace(ctx, set);
                if (set["node.shaders"] !== after.set["node.shaders"]) {
                    await tx.styles.update(id, { set }, { keepEmpty: true });
                }
            }
        }
    });
}

/**
 * Whether a thing's pop-over would hold nothing (Visibility: no settings, no By data), so its row
 * draws no settings button at all.
 * @param rubric - the thing's rubric.
 * @param others - how many set lines its rubric has no line for.
 * @param family - whether it is a family, with a Switch to.
 * @param main - its main value.
 * @returns true when it would be empty.
 */
function emptyPopover(
    rubric: ThingRubric | undefined,
    others: number,
    family: boolean,
    main: ChannelDescriptor,
): boolean {
    if (rubric === undefined || others > 0 || family || takesBinding(main) || main.accepts === "number") {
        return false;
    }
    return rubric.main.length === 0 && (rubric.groups ?? []).length === 0;
}

/**
 * The parameters of the shader drawn in the shapes' place, in the Shape pop-over's Main (design 7.1).
 * @param props - Component props
 * @param props.ctx - the row
 * @returns The parameters, or nothing for a shader the catalog does not know
 */
function ReplaceParams({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const entry = shaderEntries(ctx).find((each) => placeOf(each) === "replace");
    if (entry?.descriptor === undefined) {
        return null;
    }
    const fail = (error: unknown): void => {
        store.set({
            notice: { message: failureWords(entry.descriptor?.plainName ?? "Shader", "changed", error), error: true },
        });
    };
    return (
        <ShaderParams
            ctx={ctx}
            descriptor={entry.descriptor}
            channel={shadersChannel(ctx.side)}
            values={paramsOf(entry)}
            bindings={bindingsOf(ctx, entry)}
            facts={false}
            onChange={(param, value) => {
                writeParam(ctx, entry, param, value).catch(fail);
            }}
            onUnbind={(param) => {
                unbindParam(ctx, entry, param).catch(fail);
            }}
        />
    );
}

/**
 * A thing row's main line: a shader drawn in the shapes' place, a gradient Fill's bar (today's
 * gradient editor, design 7.1), the rubric's own line for the row, else today's field.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.thing - the thing
 * @param props.main - its main value
 * @param props.row - its rubric's line for the row, if any
 * @param props.replacing - the shader drawn in the shapes' place, if any
 * @param props.title - the thing's name with its kind
 * @param props.pending - added with "+" and waiting for its first value
 * @param props.onCancel - takes a waiting thing away again
 * @param props.slots - its settings button and whole-thing minus
 * @returns The line
 */
function MainLine({
    ctx,
    thing,
    main,
    row,
    replacing,
    title,
    pending,
    onCancel,
    slots,
}: Readonly<{
    ctx: RowContext;
    thing: ThingSpec;
    main: ChannelDescriptor;
    row: LineSpec | undefined;
    replacing: string | undefined;
    title: string;
    pending: boolean;
    onCancel: () => void;
    slots: RowSlots;
}>): React.JSX.Element {
    const frame = (line: string, rule: string, control: React.ReactNode): React.JSX.Element => (
        <LineFrame
            line={line}
            name={null}
            set
            rule={rule}
            control={control}
            modifier={slots.slot}
            removeName={slots.removeLabel}
            onRemove={slots.onRemove}
        />
    );
    if (replacing !== undefined) {
        const name = ctx.session.shaders.describe(replacing)?.plainName ?? replacing;
        return frame("node.shaders:replace", "R10", <TextInput size="xs" readOnly aria-label={title} value={name} />);
    }
    if (main.channel === "node.gradientColors" && setOn(ctx, main.channel)) {
        return frame(main.channel, "R16", <GradientButton ctx={ctx} />);
    }
    if (row !== undefined) {
        return <RubricLine ctx={ctx} line={row} row={slots} />;
    }
    return (
        <Field
            ctx={ctx}
            descriptor={main}
            pending={pending || !setOn(ctx, main.channel)}
            onCancel={onCancel}
            thing={{ name: thing.unnamed === true ? null : thing.name, ...slots }}
        />
    );
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
    // Held here, so the pop-over stays open while a switch redraws the row's main control.
    const [open, setOpen] = useState(false);
    const main = mainOf(ctx, thing, channels);
    if (main === undefined) {
        return null;
    }
    const kind = ctx.side === "node" ? "Node" : "Edge";
    const title = `${kind} ${thing.name.toLowerCase()}`;
    const family = familyOf(ctx.side, thing.id);
    // A shader drawn in the shapes' place is the Shape row's member (design 5): its row names it.
    const replacing = thing.id === "shape" ? replaceUse(ctx) : undefined;
    const rubric = replacing === undefined ? rubricOf(ctx.side, thing.id, main.channel) : SHAPE_REPLACE_RUBRIC;
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
    const settings = emptyPopover(rubric, others.length, family !== undefined, main) ? null : (
        <SettingsPopout
            label={`${title} settings`}
            title={title}
            changed={changed}
            opened={open}
            onOpenChange={setOpen}
            icon={<GLYPHS.sliders size={14} aria-hidden />}
        >
            {rubric === undefined ? (
                others.map((descriptor) => <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />)
            ) : (
                <ThingPopover
                    ctx={ctx}
                    title={title}
                    rubric={rubric}
                    others={others}
                    first={<FirstLines ctx={ctx} main={main} family={family} />}
                    extra={replacing === undefined ? undefined : <ReplaceParams ctx={ctx} />}
                />
            )}
        </SettingsPopout>
    );
    const remove = (): void => {
        onCancel();
        removeThing(ctx, thing.name, all, thing.id === "shape")
            .then(() => {
                store.set({ announcement: `${thing.name} removed` });
            })
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords(thing.name, "removed", error), error: true } });
            });
    };
    const removeLabel = `Remove ${title.toLowerCase()}`;
    const text = TEXT_THINGS[ctx.side][thing.id] as TextThing | undefined;
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
    const slots: RowSlots = { slot: settings, removeLabel, onRemove: remove };
    return (
        <div data-thing={thing.id}>
            <MainLine
                ctx={ctx}
                thing={thing}
                main={main}
                row={rubric?.row}
                replacing={replacing?.shader}
                title={title}
                pending={pending}
                onCancel={onCancel}
                slots={slots}
            />
            {common.map((line) => (
                <RubricLine key={line.channel} ctx={ctx} line={line} />
            ))}
        </div>
    );
}
