/**
 * One thing's row in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.4): its name
 * (none where its section names it), its main control, its settings button and a minus that takes
 * the whole thing off the layer in one undo step.
 */

import { type Channel, type ChannelDescriptor, LABEL_LOOKS } from "@graphty/graphty-element/catalog";
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
import { dimOf } from "./drawn";
import { familyOf, pickReplace, replaceUse } from "./families";
import { ItemListEditor } from "./ItemListEditor";
import { kindGroupOf, type KindMember, PLAIN_LOOK } from "./kindGroups";
import { entryLook, removeEntry } from "./labelEntries";
import { LabelRow } from "./LabelRow";
import { TEXT_THINGS, type TextThing } from "./labelRubric";
import { unsetIn } from "./lineWrites";
import { firstItemWords, ITEM_LISTS, listOf } from "./lists";
import { EntryLookMenu, KindMenu, MemberMenu, ReplaceGallery } from "./MemberMenu";
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
            unsetRemoves
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
 * A row's name and its name with its kind. A kind's row is named by its kind ("Glyph", "Target") everywhere, its
 * buttons too; a Label's look by its look ("Card", as "+" adds it, E196), its Text look keeping the thing's name; a
 * tooltip's or an external label's look keeps the thing's name. A further label is numbered, so each row's controls
 * have names of their own ("Node label 2 source").
 * @param ctx - the row.
 * @param thing - the thing.
 * @param kind - the kind it draws, if any.
 * @param entry - its further label, if any.
 * @param entry.id - the further label's id.
 * @param entry.n - its place among the labels.
 * @returns the name ("Card") and the title ("Node card").
 */
function rowNames(
    ctx: RowContext,
    thing: ThingSpec,
    kind: KindMember | undefined,
    entry: { readonly id: string; readonly n: number } | undefined,
): { readonly name: string; readonly title: string } {
    const entryLooks = entry === undefined ? undefined : entryLook(ctx, entry.id);
    const lookName = LABEL_LOOKS.find((each) => each.id === entryLooks && each.id !== PLAIN_LOOK)?.plainName;
    const named = kind !== undefined && kind.id !== "text" && (kind.look === undefined || thing.id === "label");
    const base = lookName ?? (named ? kind.plainName : thing.name);
    const kindWord = ctx.side === "node" ? "Node" : "Edge";
    const number = entry === undefined ? "" : ` ${String(entry.n)}`;
    // A further label's number is in its visible name, so two labels never read the same (E263).
    return { name: `${base}${number}`, title: `${kindWord} ${base.toLowerCase()}${number}` };
}

/**
 * A row's Switch to: its graphty-element family's members, or its kind group's kinds.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param title - its name with its kind ("Node fill").
 * @param kind - the kind the row draws, for a kind group's row.
 * @returns the menu, or nothing for a thing with neither.
 */
function switchTo(ctx: RowContext, thing: ThingSpec, title: string, kind: KindMember | undefined): React.ReactNode {
    const family = familyOf(ctx.side, thing.id);
    if (family !== undefined) {
        return <MemberMenu ctx={ctx} family={family} title={title} />;
    }
    const kinds = kindGroupOf(ctx.side, thing.id);
    return kinds === undefined || kind === undefined ? undefined : (
        <KindMenu ctx={ctx} group={kinds} now={kind} title={title} />
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
    // A kind group's row (a Label of kind Text or Glyph) edits its kind's main channel.
    const main = mainOf(ctx, kind === undefined ? thing : { ...thing, main: [kind.head], start: kind.head }, channels);
    if (main === undefined) {
        return null;
    }
    const text = textThingOf(ctx, thing, kind, main.channel);
    const { name, title } = rowNames(ctx, thing, kind, entry);
    const member =
        entry === undefined ? (
            switchTo(ctx, thing, title, kind)
        ) : (
            <EntryLookMenu ctx={ctx} entry={entry.id} title={title} />
        );
    const list = listOf(ctx.side, thing.id, main.channel);
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
    // A label row (its Glyph kind here) always draws its Size and Color lines (ia-design 2).
    const setLines = setLinesOf(ctx, rubric, main.channel, thing.id === "label");
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
                    title={title}
                    rubric={rubric}
                    others={others}
                    first={
                        <>
                            {member}
                            <FirstLines ctx={ctx} main={main} />
                        </>
                    }
                    head={rubric.row ?? { channel: main.channel }}
                    extra={replacing === undefined ? undefined : <ReplaceParams ctx={ctx} />}
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
    // A basic shape's row has no settings pop-over (owner, 2026-11-23): its drop-down picks the shape, its Kind
    // line is drawn under it, and the lines a layer sets (Rotation, Corners, Custom shape) under that.
    const plainShape = thing.id === "shape" && replacing === undefined && main.channel === "node.shape";
    const slots: RowSlots = plainShape
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
            {picker}
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
            {/* With no pop-over, a basic shape's Kind (Basic shape, Model, a shader) is the line under its row. */}
            {plainShape && member}
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
