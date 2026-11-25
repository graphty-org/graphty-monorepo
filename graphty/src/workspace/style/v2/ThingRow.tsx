/**
 * One thing's row in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.4): its name
 * (none where its section names it), its main control, its settings button and a minus that takes
 * the whole thing off the layer in one undo step.
 */

import { type Channel, type ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { ImageField } from "../ImageField";
import { shownChannel } from "../offered";
import { GradientButton } from "../parts/GradientRow";
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
import { dataChannelOf } from "./dataEntries";
import { DataRow } from "./DataRow";
import { dimOf } from "./drawn";
import { familyOf, pickReplace, replaceUse } from "./families";
import { ItemListEditor } from "./ItemListEditor";
import { kindGroupOf, type KindMember } from "./kindGroups";
import { removeEntry } from "./labelEntries";
import { LabelRow } from "./LabelRow";
import { TEXT_THINGS, type TextThing } from "./labelRubric";
import { unsetIn } from "./lineWrites";
import { firstItemWords, ITEM_LISTS, listOf } from "./lists";
import { EntryLookMenu, KindMenu, MemberMenu, ReplaceGallery } from "./MemberMenu";
import { takeReopening } from "./reopening";
import { rowNames } from "./rowNames";
import {
    lineChannels,
    type LineSpec,
    rubricChannels,
    rubricOf,
    SHAPE_REPLACE_RUBRIC,
    type ThingRubric,
} from "./rubric";
import { LineFrame, type RowSlots, RubricLine } from "./RubricLine";
import { RowSettings } from "./ThingLine";
import { type ExtraGroup, FirstLines, ThingPopover } from "./ThingPopover";
import { mainOf, setOn, type ThingSpec } from "./things";
import { ValueButton } from "./ValueButton";

/**
 * A shader use's parameters in Style panel v2 (design 7.1, R16): no Uses or Cost lines, and a
 * parameter the use does not set is empty, its "-" there once it is written.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.entry - the use
 * @param props.only - the parameters drawn; every one when left out
 * @returns The parameters, or nothing for a shader the catalog does not know
 */
export function UseParams({
    ctx,
    entry,
    only,
}: Readonly<{ ctx: RowContext; entry: ShaderEntry; only?: readonly string[] }>): React.JSX.Element | null {
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
            unsetRemoves
            only={only}
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
 * How many of the shapes'-place shader's parameters the Shape pop-over's main lines hold: under its tab strip, Shape
 * and Rotation lines, so the pop-over stays 6 rows tall (owner's input rules).
 */
const REPLACE_MAIN_PARAMS = 3;

/** The most lines a group pop-over holds (owner's input rules). */
const GROUP_LINES = 6;

/**
 * The parameters of the shader drawn in the shapes' place (design 7.1): the first few in the Shape pop-over's main
 * lines, the rest in groups of its "..." menu, at most 6 each; a single one left over stays in the main lines, as a
 * group of one line joins them (owner's input rules, 2026-11-24).
 * @param ctx - the row.
 * @param replacing - the shader use drawn in the shapes' place, if any.
 * @returns the main lines, and the groups; nothing with no shader there.
 */
function replaceParams(
    ctx: RowContext,
    replacing: unknown,
): { main: React.ReactNode; groups: readonly ExtraGroup[] } | undefined {
    if (replacing === undefined) {
        return undefined;
    }
    const entry = shaderEntries(ctx).find((each) => placeOf(each) === "replace");
    const names = entry?.descriptor?.params.map((param) => param.name) ?? [];
    if (entry === undefined) {
        return { main: undefined, groups: [] };
    }
    const kept = names.length - REPLACE_MAIN_PARAMS === 1 ? names.length : REPLACE_MAIN_PARAMS;
    const rest = names.slice(kept);
    const values = paramsOf(entry);
    const groups: ExtraGroup[] = [];
    for (let at = 0; at < rest.length; at += GROUP_LINES) {
        const only = rest.slice(at, at + GROUP_LINES);
        groups.push({
            name: at === 0 ? "More parameters" : `More parameters ${String(at / GROUP_LINES + 1)}`,
            node: <UseParams ctx={ctx} entry={entry} only={only} />,
            set: only.some((name) => name in values),
            // One parameter at a time: each write reads the use the one before it left.
            unset: () =>
                only.reduce<Promise<void>>(
                    (done, name) => done.then(() => writeParam(ctx, entry, name, undefined)),
                    Promise.resolve(),
                ),
        });
    }
    return { main: <UseParams ctx={ctx} entry={entry} only={names.slice(0, kept)} />, groups };
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
 * The rubric's lines the layer sets, but the row's own, in the pop-over's order, each once: the lines a
 * row draws under it in the sidebar (design 2.5).
 * @param ctx - the row.
 * @param rubric - the thing's rubric, if any.
 * @param main - the row's main channel.
 * @param always - its common lines are drawn set or not (a label row's Size and Color, ia-design 2).
 * @returns the lines.
 */
function setLinesOf(
    ctx: RowContext,
    rubric: ThingRubric | undefined,
    main: Channel,
    always = false,
): readonly LineSpec[] {
    if (rubric === undefined) {
        return [];
    }
    const seen = new Set<Channel>([main, ...(rubric.row === undefined ? [] : lineChannels(rubric.row))]);
    return [...(rubric.common ?? []), ...rubric.main, ...(rubric.groups ?? []).flatMap((group) => group.lines)].filter(
        (line) => {
            const channels = lineChannels(line);
            if (
                line.unit !== undefined ||
                channels.some((channel) => seen.has(channel)) ||
                (!channels.some((channel) => setOn(ctx, channel)) &&
                    !(always && rubric.common?.includes(line) === true))
            ) {
                return false;
            }
            channels.forEach((channel) => seen.add(channel));
            return true;
        },
    );
}

/**
 * The pop-over's first main line, the row's main value's: none where a list (strands, stripes, a record's fields)
 * edits it, as the list is its one editor (owner, 2026-11-24).
 * @param rubric - the thing's rubric.
 * @param main - the row's main channel.
 * @param listed - whether the pop-over draws a list of it.
 * @returns the line, if any.
 */
function popoverHead(rubric: ThingRubric, main: Channel, listed: boolean): LineSpec | undefined {
    if (rubric.row !== undefined) {
        return rubric.row;
    }
    // A gradient's colors are edited by the row's gradient bar alone (design 2.6): no line in the pop-over.
    if (main === "node.gradientColors" || main === "edge.gradientColors") {
        return undefined;
    }
    return listed ? undefined : { channel: main };
}

/** What a thing row's main line is drawn from: see `MainLine`. */
interface MainLineProps {
    ctx: RowContext;
    thing: ThingSpec;
    main: ChannelDescriptor;
    row: LineSpec | undefined;
    replacing: string | undefined;
    pending: boolean;
    onCancel: () => void;
    slots: RowSlots;
    hint?: string;
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
 * @param props.hint - what its control takes, as its tooltip, for a kind's row
 * @returns The line
 */
function MainLine(props: Readonly<MainLineProps>): React.JSX.Element {
    // A row graphty-element draws nothing for now (Order in 3D) is dimmed, its tooltip saying why.
    // A rubric line drawing the row dims itself.
    const dimmed =
        props.replacing === undefined && props.row === undefined ? dimOf(props.ctx, props.main.channel) : undefined;
    return dimmed === undefined ? (
        <MainControl {...props} />
    ) : (
        <div className="ws-dim" data-dimmed="" title={dimmed}>
            <MainControl {...props} />
        </div>
    );
}

/**
 * A thing row's main line's control and frame: see `MainLine`.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.thing - the thing
 * @param props.main - its main value
 * @param props.row - its rubric's line for the row, if any
 * @param props.replacing - the shader drawn in the shapes' place, if any
 * @param props.pending - added with "+" and waiting for its first value
 * @param props.onCancel - takes a waiting thing away again
 * @param props.slots - its settings button and whole-thing minus
 * @param props.hint - what its control takes, as its tooltip, for a kind's row
 * @returns The line
 */
function MainControl({
    ctx,
    thing,
    main,
    row,
    replacing,
    pending,
    onCancel,
    slots,
    hint,
}: Readonly<MainLineProps>): React.JSX.Element {
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
    const list = listOf(ctx.side, thing.id, main.channel);
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
            thing={{ name: thing.unnamed === true ? null : thing.name, hint, ...slots }}
        />
    );
}

/**
 * The text thing a row edits the label style of: its thing's, or for a kind's row the one whose words are its main
 * channel (an End caption's Target is the target end's caption, kindGroups.ts).
 * @param ctx - the row.
 * @param thing - the thing.
 * @param kind - the kind the row draws, if any.
 * @param main - the row's main channel.
 * @returns the text thing, or undefined.
 */
function textThingOf(
    ctx: RowContext,
    thing: ThingSpec,
    kind: KindMember | undefined,
    main: Channel,
): TextThing | undefined {
    const own = TEXT_THINGS[ctx.side][thing.id] as TextThing | undefined;
    if (own !== undefined || kind === undefined) {
        return own;
    }
    return Object.values(TEXT_THINGS[ctx.side]).find((each) => each.words === main);
}

/**
 * A row's Switch to: its graphty-element family's members, or its kind group's kinds.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param kind - the kind the row draws, for a kind group's row.
 * @param inRow - drawn under the row (a basic shape's, with no pop-over), not as a pop-over's tabs.
 * @returns the menu, or nothing for a thing with neither.
 */
function switchTo(ctx: RowContext, thing: ThingSpec, kind: KindMember | undefined, inRow: boolean): React.ReactNode {
    const family = familyOf(ctx.side, thing.id);
    if (family !== undefined) {
        return <MemberMenu ctx={ctx} family={family} inRow={inRow} />;
    }
    const kinds = kindGroupOf(ctx.side, thing.id);
    return kinds === undefined || kind === undefined ? undefined : <KindMenu ctx={ctx} group={kinds} now={kind} />;
}

/**
 * A thing's rubric: the Shape's while a shader draws in the shapes' place, else its own for its main channel.
 * @param ctx - the row.
 * @param thing - the thing's id.
 * @param main - its main channel.
 * @param replacing - whether a shader draws in the shapes' place.
 * @returns the rubric, or undefined.
 */
function rubricFor(ctx: RowContext, thing: string, main: Channel, replacing: boolean): ThingRubric | undefined {
    return replacing ? SHAPE_REPLACE_RUBRIC : rubricOf(ctx.side, thing, main);
}

/**
 * A thing's set lines its rubric has no line for (or, with no rubric yet, every other set line).
 * @param ctx - the row.
 * @param channels - every channel the thing holds.
 * @param main - its main channel.
 * @param covered - the channels its rubric has lines for.
 * @returns their descriptors.
 */
function othersOf(
    ctx: RowContext,
    channels: readonly Channel[],
    main: Channel,
    covered: ReadonlySet<Channel>,
): ChannelDescriptor[] {
    return channels.flatMap((channel) => {
        const descriptor =
            channel === main || covered.has(channel) || !setOn(ctx, channel)
                ? undefined
                : shownChannel(ctx.session, ctx.side, channel, true);
        return descriptor?.renderable === true ? [descriptor] : [];
    });
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
 * @param props.kind - the kind it draws, for a kind group's row (its channels are that kind's)
 * @param props.entry - a further label's row (labelEntries.ts): its id and its place among the labels, 2 on
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
    kind,
    entry,
}: Readonly<{
    ctx: RowContext;
    thing: ThingSpec;
    channels: readonly Channel[];
    pending: boolean;
    kind?: KindMember;
    opening?: boolean;
    onOpened?: () => void;
    onCancel: () => void;
    entry?: { readonly id: string; readonly n: number };
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    // Held here, so the pop-over stays open while a switch redraws the row's main control.
    const [open, setOpen] = useState(false);
    const [picking, setPicking] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    // A Pie, Chart or Record opens its data picker instead (DataRow).
    const fromData = dataChannelOf(ctx, thing.id, entry?.id) !== undefined;
    useEffect(() => {
        if (!opening) {
            return;
        }
        if (thing.id === "image") {
            setPicking(true);
        } else if (!fromData) {
            setOpen(true);
        }
        onOpened?.();
    }, [opening, thing.id, onOpened, fromData]);
    // A row drawn for the kind its pop-over just switched to opens that pop-over again.
    useEffect(() => {
        if (kind !== undefined && takeReopening(`${ctx.side}:${kind.id}`)) {
            setOpen(true);
        }
    }, [ctx.side, kind]);
    // A kind group's row (a Label of kind Text or Glyph) edits its kind's main channel.
    const main = mainOf(ctx, kind === undefined ? thing : { ...thing, main: [kind.head], start: kind.head }, channels);
    if (main === undefined) {
        return null;
    }
    const text = textThingOf(ctx, thing, kind, main.channel);
    const { name, title } = rowNames(ctx, thing, kind, entry);
    const member =
        entry === undefined ? switchTo(ctx, thing, kind, false) : <EntryLookMenu ctx={ctx} entry={entry.id} />;
    const list = listOf(ctx.side, thing.id, main.channel);
    // A shader drawn in the shapes' place is the Shape row's member (design 5): its row names it.
    const replacing = thing.id === "shape" ? replaceUse(ctx) : undefined;
    const rubric = rubricFor(ctx, thing.id, main.channel, replacing !== undefined);
    const params = replaceParams(ctx, replacing);
    const covered = new Set(rubric === undefined ? [] : rubricChannels(rubric));
    // Every channel the minus takes off: the thing's own and every line of its rubric.
    const all = [...new Set([...channels, ...covered])];
    // The thing's set lines its rubric has no line for (or, with no rubric yet, every other set line).
    const others = othersOf(ctx, channels, main.channel, covered);
    const common = rubric?.common ?? [];
    // A label row (its Glyph kind here) always draws its Size and Color lines (ia-design 2).
    const setLines = setLinesOf(ctx, rubric, main.channel, thing.id === "label");
    const commonChannels = new Set(common.flatMap((line) => [line.channel, ...(line.units ?? [])]));
    const changed =
        others.length > 0 ||
        [...covered].some((channel) => channel !== main.channel && !commonChannels.has(channel) && setOn(ctx, channel));
    const items = ITEM_LISTS[main.channel];
    const listed = list ?? items;
    const popoverList =
        listed === undefined ? undefined : <ItemListEditor ctx={ctx} channel={main.channel} list={listed} />;
    // Every thing's pop-over holds at least its main value's line, which varies by data (design 2.6, 7.1).
    const settings = (
        <RowSettings label={`${title} settings`} title={title} changed={changed} opened={open} onOpenChange={setOpen}>
            {rubric === undefined ? (
                <>
                    {member}
                    {others.map((descriptor) => (
                        <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />
                    ))}
                </>
            ) : (
                <ThingPopover
                    ctx={ctx}
                    rubric={rubric}
                    others={others}
                    first={
                        <>
                            {member}
                            <FirstLines ctx={ctx} main={main} />
                        </>
                    }
                    head={popoverHead(rubric, main.channel, popoverList !== undefined)}
                    extra={params?.main}
                    moreGroups={params?.groups}
                    after={popoverList}
                />
            )}
        </RowSettings>
    );
    const remove = (): void => {
        onCancel();
        (entry === undefined ? unsetIn(ctx, all, { name, shape: thing.id === "shape" }) : removeEntry(ctx, entry.id))
            .then(() => {
                store.set({ announcement: `${name} removed` });
            })
            .catch((error: unknown) => {
                store.set({ notice: { message: failureWords(name, "removed", error), error: true } });
            });
    };
    const removeLabel = `Remove ${title.toLowerCase()}`;
    // A node's Pie, Chart or Record: its row picks data entries or Fixed, and draws its entries under it.
    const data = dataChannelOf(ctx, thing.id, entry?.id);
    if (data !== undefined) {
        return (
            <div ref={box} data-thing={thing.id}>
                <DataRow
                    ctx={ctx}
                    // Just added: its data picker opens at once, as a Pie's from Fill's "+" (design 5.1).
                    picking={opening}
                    thing={thing.id}
                    start={thing.start ?? main.channel}
                    channel={data}
                    name={name}
                    title={title}
                    fixedSettings={settings}
                    removeLabel={removeLabel}
                    onRemove={remove}
                    fixedLines={setLines.map((line) => (
                        <RubricLine key={line.channel} ctx={ctx} line={line} named />
                    ))}
                />
            </div>
        );
    }
    if (text?.words === main.channel) {
        return (
            <div data-thing={thing.id} data-label-entry={entry?.id}>
                <LabelRow
                    ctx={ctx}
                    kind={text}
                    name={name}
                    title={title}
                    channels={channels}
                    pending={pending}
                    member={member}
                    removeLabel={removeLabel}
                    onRemove={remove}
                    entry={entry?.id}
                    open={open}
                    onOpenChange={setOpen}
                />
            </div>
        );
    }
    const picker =
        thing.id === "image" && picking ? (
            // The row "+" added, its picture picker open at once: compact-mantine's ImagePicker.
            <LineFrame
                line="node.image:pick"
                name={name}
                set={false}
                rule="R16"
                control={
                    <ImageField
                        label={name}
                        value={undefined}
                        defaultOpened
                        onPick={(ref) => {
                            setPicking(false);
                            writeIn(ctx, "node.image", { value: ref }).catch((error: unknown) => {
                                store.set({
                                    notice: { message: failureWords(thing.name, "added", error), error: true },
                                });
                            });
                        }}
                        onDismiss={() => {
                            setPicking(false);
                            // Escape before a pick takes the row "+" added back.
                            if (!setOn(ctx, "node.image")) {
                                onCancel();
                            }
                        }}
                    />
                }
                modifier={null}
                removeName={undefined}
                onRemove={() => undefined}
            />
        ) : null;
    // A basic shape's row has no settings pop-over (owner, 2026-11-23): its drop-down picks the shape, its Kind
    // line is drawn under it, and the lines a layer sets (Rotation, Corners, Custom shape) under that.
    const plainShape = thing.id === "shape" && replacing === undefined && main.channel === "node.shape";
    // A row whose value list spans channels (a Finish's Shading) has no data link, so with no other lines its
    // pop-over would only repeat the row: no "..." then.
    const bare =
        rubric?.row?.choices !== undefined &&
        rubric.main.length === 0 &&
        common.length === 0 &&
        (rubric.groups ?? []).length === 0 &&
        rubric.strip === undefined &&
        others.length === 0;
    const slots: RowSlots =
        plainShape || bare
            ? { slot: null, removeLabel, onRemove: remove }
            : {
                  slot: settings,
                  removeLabel,
                  onRemove: remove,
                  onOpen: () => {
                      setOpen(true);
                  },
              };
    return (
        <div ref={box} data-thing={thing.id}>
            {picker ?? (
                <MainLine
                    ctx={ctx}
                    thing={{ ...thing, name }}
                    hint={kind?.hint}
                    main={main}
                    row={rubric?.row}
                    replacing={replacing?.shader}
                    pending={pending}
                    onCancel={onCancel}
                    slots={slots}
                />
            )}
            {/* With no pop-over, a basic shape's Kind (Basic shape, Model, a shader) is the line under its row. */}
            {plainShape && switchTo(ctx, thing, kind, true)}
            {/* Every line of the thing the layer sets, in the pop-over's order, named, each with its minus (design 2.5). */}
            {setLines.map((line) => (
                <RubricLine key={line.channel} ctx={ctx} line={line} named />
            ))}
            {others.map((descriptor) => (
                <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />
            ))}
        </div>
    );
}
