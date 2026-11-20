/**
 * One thing's row in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.4): its name
 * (none where its section names it), its main control, its settings button and a minus that takes
 * the whole thing off the layer in one undo step.
 */

import type { Channel, ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { GradientButton } from "../parts/GradientRow";
import { PicturePopover } from "../PicturePopover";
import { Field, type RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { ShaderParams } from "../ShaderParams";
import {
    bindingsOf,
    paramsOf,
    placeOf,
    shaderEntries,
    type ShaderEntry,
    shadersChannel,
    unbindParam,
    writeParam,
} from "../shaderSlots";
import { failureWords } from "../words";
import { swatchesOf } from "./colorItems";
import { familyOf, pickReplace, replaceUse } from "./families";
import { ItemListEditor } from "./ItemListEditor";
import { LabelRow } from "./LabelRow";
import { TEXT_THINGS, type TextThing } from "./labelRubric";
import { unsetIn } from "./lineWrites";
import { firstItemWords, ITEM_LISTS, LISTS } from "./lists";
import { MemberMenu, ReplaceGallery } from "./MemberMenu";
import { type LineSpec, rubricChannels, rubricOf, SHAPE_REPLACE_RUBRIC } from "./rubric";
import { LineFrame, type RowSlots, RubricLine } from "./RubricLine";
import { RowSettings, ThingLine } from "./ThingLine";
import { FirstLines, ThingPopover } from "./ThingPopover";
import { mainOf, setOn, type ThingSpec } from "./things";
import { ValueButton } from "./ValueButton";

/**
 * A shader use's parameters in Style panel v2 (design 7.1, R16): no Uses or Cost lines, and a
 * parameter the use does not set is empty, its "-" there once it is written.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.entry - the use
 * @returns The parameters, or nothing for a shader the catalog does not know
 */
export function UseParams({ ctx, entry }: Readonly<{ ctx: RowContext; entry: ShaderEntry }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    if (entry.descriptor === undefined) {
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
            unsetEmpty
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
 * The parameters of the shader drawn in the shapes' place, in the Shape pop-over's Main (design 7.1).
 * @param props - Component props
 * @param props.ctx - the row
 * @returns The parameters, or nothing when no shader draws there
 */
function ReplaceParams({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element | null {
    const entry = shaderEntries(ctx).find((each) => placeOf(each) === "replace");
    return entry === undefined ? null : <UseParams ctx={ctx} entry={entry} />;
}

/**
 * The Shape row's control while a shader draws in the shapes' place (design 7.1, "preset R10"):
 * the shader's name, opening the gallery of shaders for that place; a pick draws it instead.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.shader - the shader drawn now
 * @returns The control
 */
function ReplacePreset({ ctx, shader }: Readonly<{ ctx: RowContext; shader: string }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const name = ctx.session.shaders.describe(shader)?.plainName ?? shader;
    const family = familyOf(ctx.side, "shape");
    return (
        <div ref={box}>
            <ValueButton
                label="Node shape"
                words={name}
                opens="dialog"
                expanded={open}
                onClick={() => {
                    setOpen(true);
                }}
            />
            {open && family !== undefined ? (
                <ReplaceGallery
                    ctx={ctx}
                    anchor={box}
                    title="Node shape"
                    onPick={(id) => {
                        setOpen(false);
                        pickReplace(ctx, family, id).catch((error: unknown) => {
                            store.set({ notice: { message: failureWords("Shape", "changed", error), error: true } });
                        });
                    }}
                    onClose={() => {
                        setOpen(false);
                    }}
                />
            ) : null}
        </div>
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
    // A thing its section does not name (Pie, Stripes, Inner lines) keeps its name column (design 2.4).
    const name = thing.unnamed === true ? null : thing.name;
    const frame = (line: string, rule: string, control: React.ReactNode): React.JSX.Element => (
        <LineFrame
            line={line}
            name={name}
            set
            rule={rule}
            control={control}
            modifier={slots.slot}
            removeName={slots.removeLabel}
            onRemove={slots.onRemove}
        />
    );
    if (replacing !== undefined) {
        // The shader drawn in the shapes' place is a Shape member: the row shows its preset, and
        // Switch to stays the pop-over's first line, as in every member (design 5, 7.1).
        return frame("node.shaders:replace", "R10", <ReplacePreset ctx={ctx} shader={replacing} />);
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
            <ValueButton
                label={`Edit ${ctx.side} ${thing.name.toLowerCase()}`}
                swatches={swatchesOf(ctx, list)}
                onClick={slots.onOpen}
            />
        );
        return frame(main.channel, "R15r", strip);
    }
    const items = ITEM_LISTS[main.channel];
    if (items !== undefined && setOn(ctx, main.channel)) {
        // A list thing's row (R15r): its first item, opening its pop-over on the list.
        const strip = (
            <ValueButton
                label={`Edit ${ctx.side} ${thing.name.toLowerCase()}`}
                words={firstItemWords(items, lineIn(ctx, main.channel)?.value)}
                onClick={slots.onOpen}
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
    const items = ITEM_LISTS[main.channel];
    const listed = list ?? items;
    const popoverList =
        listed === undefined ? undefined : (
            <ItemListEditor ctx={ctx} channel={main.channel} list={listed} legend="group" />
        );
    // Every thing's pop-over holds at least By data (a shown / hidden row's too, design 7.1).
    const settings = (
        <RowSettings label={`${title} settings`} title={title} changed={changed} opened={open} onOpenChange={setOpen}>
            {rubric === undefined ? (
                others.map((descriptor) => <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />)
            ) : (
                <ThingPopover
                    ctx={ctx}
                    title={title}
                    rubric={rubric}
                    others={others}
                    first={<FirstLines ctx={ctx} main={main} />}
                    extra={replacing === undefined ? undefined : <ReplaceParams ctx={ctx} />}
                    after={popoverList}
                />
            )}
        </RowSettings>
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
            <ThingLine
                member={family === undefined ? undefined : <MemberMenu ctx={ctx} family={family} title={title} />}
            >
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
            </ThingLine>
            {common.map((line) => (
                <RubricLine key={line.channel} ctx={ctx} line={line} />
            ))}
        </div>
    );
}
