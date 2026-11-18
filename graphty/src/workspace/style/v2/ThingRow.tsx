/**
 * One thing's row in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.4): its name
 * (none where its section names it), its main control, its settings button and a minus that takes
 * the whole thing off the layer in one undo step.
 */

import type { Channel, ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { SettingsPopout } from "../../options/SettingsPopout";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { GradientButton } from "../parts/GradientRow";
import { PicturePopover } from "../PicturePopover";
import { Field, type RowContext } from "../PropertyRow";
import { writeIn } from "../row";
import { ShaderParams } from "../ShaderParams";
import { bindingsOf, paramsOf, placeOf, shaderEntries, shadersChannel, unbindParam, writeParam } from "../shaderSlots";
import { failureWords } from "../words";
import { familyOf, replaceUse } from "./families";
import { LabelRow } from "./LabelRow";
import { TEXT_THINGS, type TextThing } from "./labelRubric";
import { unsetIn } from "./lineWrites";
import { ListGroup, SwatchStrip } from "./ListGroup";
import { LISTS } from "./lists";
import { type LineSpec, rubricChannels, rubricOf, SHAPE_REPLACE_RUBRIC } from "./rubric";
import { LineFrame, type RowSlots, RubricLine } from "./RubricLine";
import { SwitchTo } from "./SwitchTo";
import { FirstLines, ThingPopover } from "./ThingPopover";
import { mainOf, setOn, type ThingSpec } from "./things";

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
    pending,
    onCancel,
    slots,
}: Readonly<{
    ctx: RowContext;
    thing: ThingSpec;
    main: ChannelDescriptor;
    row: LineSpec | undefined;
    replacing: string | undefined;
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
    const family = familyOf(ctx.side, thing.id);
    if (replacing !== undefined && family !== undefined) {
        // The shader drawn in the shapes' place is a Shape member: the row's control is Switch to.
        return <SwitchTo ctx={ctx} family={family} row={slots} />;
    }
    if (
        (main.channel === "node.gradientColors" || main.channel === "edge.gradientColors") &&
        setOn(ctx, main.channel)
    ) {
        return frame(main.channel, "R16", <GradientButton ctx={ctx} />);
    }
    const list = ctx.side === "node" ? LISTS[thing.id] : undefined;
    if (main.channel === list?.colors) {
        // A list thing's row (R15r): its swatches, opening its pop-over on the list.
        const strip = (
            <SwatchStrip
                ctx={ctx}
                list={list}
                label={`Edit ${ctx.side} ${thing.name.toLowerCase()}`}
                onOpen={slots.onOpen ?? (() => undefined)}
            />
        );
        return frame(main.channel, "R15r", strip);
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
 * @param props.opening - just added: opens its pop-over on its list, or an Image's picker (design 5.1)
 * @param props.onOpened - told once it has opened
 * @param props.onCancel - takes a waiting thing away again
 * @returns The row, or nothing when the element offers none of its main channels here
 */
export function ThingRow({
    ctx,
    thing,
    channels,
    pending,
    opening = false,
    onOpened,
    onCancel,
}: Readonly<{
    ctx: RowContext;
    thing: ThingSpec;
    channels: readonly Channel[];
    pending: boolean;
    opening?: boolean;
    onOpened?: () => void;
    onCancel: () => void;
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    // Held here, so the pop-over stays open while a switch redraws the row's main control.
    const [open, setOpen] = useState(false);
    const [picking, setPicking] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!opening) {
            return;
        }
        if (thing.id === "image") {
            setPicking(true);
        } else {
            setOpen(true);
        }
        onOpened?.();
    }, [opening, thing.id, onOpened]);
    const main = mainOf(ctx, thing, channels);
    if (main === undefined) {
        return null;
    }
    const kind = ctx.side === "node" ? "Node" : "Edge";
    const title = `${kind} ${thing.name.toLowerCase()}`;
    const family = familyOf(ctx.side, thing.id);
    const list = ctx.side === "node" ? LISTS[thing.id] : undefined;
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
    // Every thing's pop-over holds at least By data (a shown / hidden row's too, design 7.1).
    const settings = (
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
                    after={list === undefined ? undefined : <ListGroup ctx={ctx} list={list} />}
                />
            )}
        </SettingsPopout>
    );
    const remove = (): void => {
        onCancel();
        unsetIn(ctx, all, { name: thing.name, shape: thing.id === "shape" })
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
    const picker =
        thing.id === "image" && picking ? (
            <PicturePopover
                opened
                anchor={box}
                onPick={(ref) => {
                    setPicking(false);
                    writeIn(ctx, "node.image", { value: ref }).catch((error: unknown) => {
                        store.set({ notice: { message: failureWords(thing.name, "added", error), error: true } });
                    });
                }}
                onModel={() => {
                    setPicking(false);
                }}
                onClose={() => {
                    setPicking(false);
                    // Escape before a pick takes the row "+" added back.
                    if (!setOn(ctx, "node.image")) {
                        onCancel();
                    }
                }}
            />
        ) : null;
    const slots: RowSlots = {
        slot: settings,
        removeLabel,
        onRemove: remove,
        onOpen: () => {
            setOpen(true);
        },
    };
    return (
        <div ref={box} data-thing={thing.id}>
            {picker}
            <MainLine
                ctx={ctx}
                thing={thing}
                main={main}
                row={rubric?.row}
                replacing={replacing?.shader}
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
