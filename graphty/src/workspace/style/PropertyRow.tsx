import {
    ComboInput,
    CompactColorInput,
    Popout,
    PopoutButton,
    StyleSelect,
    type StyleSelectOption,
    VariablePill,
} from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, CombineMode, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Input, Stack, Text, TextInput, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { findTreeRow } from "../graph-place/rows";
import { useWorkspace } from "../state/WorkspaceContext";
import { BindingPopover } from "./BindingPopover";
import {
    type DataBinding,
    type DataChoice,
    type Line,
    lineOf,
    type LiteralWrite,
    type NewLayer,
    propose,
    readsNothing,
    removeLine,
    sourceName,
    startingValue,
    type Target,
    writeLine,
} from "./row";
import { focusLineNext, listOpensNext, openListNext } from "./useFocusLine";
import { ValuePicker } from "./ValuePicker";
import {
    type Beneath,
    bindLabel,
    channelWord,
    clearWords,
    COMBINE_WORDS,
    enumWords,
    fieldName,
    fieldStateName,
    followsWords,
    GLYPH_TABLES,
    hexOf,
    OPACITY_OF,
    paletteWord,
    type PropertyRowSpec,
    takesBinding,
    TWO_WORDS,
    valueWords,
} from "./words";

/** The width of a field's pop-outs (the vary list, a binding, a row's settings), as wide as the panel's rows. */
const POPOUT_WIDTH = 248;

/** The first choice of a vary list that keeps the field's own value. */
const FIXED_LABELS: Partial<Record<Channel, string>> = { "node.size": "Fixed size", "node.tooltip": "Fixed text" };

/** What the layers beneath a row give one channel: the raw value for a placeholder, and the words. */
export interface BeneathValue {
    /** The value they paint, when they agree on one; absent when mixed or nothing paints it. */
    readonly value?: unknown;
    /** The same in words, with where it comes from. */
    readonly words?: Beneath;
}

/** Everything a field of one row needs: the row, where it writes, and what lies beneath it. */
export interface RowContext {
    readonly session: GraphSession;
    /** The row's layers. */
    readonly row: readonly LayerId[];
    /** Nodes or edges. */
    readonly side: Target;
    /** The row's layers on this side, bottom first. */
    readonly layers: readonly Layer[];
    /** The layer the row's first edit adds, when the row adds one. */
    readonly fresh?: NewLayer;
    /** What the layers beneath the row give a channel. */
    readonly beneath: (channel: Channel) => BeneathValue;
    /** The colors the document already uses, offered in the color picker. */
    readonly documentColors: readonly string[];
    /** Several rows edited together: what they share, and writes that reach every one of them. */
    readonly many?: ManyRows;
}

/** Several rows edited as one (tier3 design, section 2.2): each write reaches every row, one undo step. */
export interface ManyRows {
    /** The line every row writes alike, or undefined when none writes it or they differ. */
    readonly line: (channel: Channel) => Line | undefined;
    /** Writes one value or binding to every row. */
    readonly write: (channel: Channel, write: LiteralWrite | { readonly binding: DataBinding }) => Promise<unknown>;
    /** Takes the channel off every row. */
    readonly clear: (channel: Channel) => Promise<unknown>;
}

/**
 * What a row writes for a channel: the line several rows share, or the row's own topmost.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns the line, or undefined.
 */
function lineIn(ctx: RowContext, channel: Channel): Line | undefined {
    return ctx.many === undefined ? lineOf(ctx.layers, channel) : ctx.many.line(channel);
}

/**
 * A select's choices: a glyph per choice where the element's catalog draws one.
 * @param descriptor - the channel.
 * @returns the options.
 */
function optionsOf(descriptor: ChannelDescriptor): StyleSelectOption[] {
    const two = TWO_WORDS[descriptor.channel];
    if (two !== undefined) {
        return two.map(([value, word]) => ({ value: String(value), label: word }));
    }
    const glyphs = GLYPH_TABLES[descriptor.channel];
    return (descriptor.values ?? []).map((value) => {
        const glyph = glyphs?.find((g) => g.id === value);
        return {
            value,
            label: glyph?.plainName ?? enumWords(value),
            // The catalog's own static SVG, drawn in currentColor; the app keeps no picture of its own.
            glyph:
                glyph === undefined ? undefined : (
                    <span dangerouslySetInnerHTML={{ __html: glyph.glyph }} style={{ display: "inline-flex" }} />
                ),
        };
    });
}

/**
 * The first control in a field, where focus goes after a clear.
 * @param box - the field's box.
 * @returns the control, or null.
 */
function firstControl(box: HTMLElement | null): HTMLElement | null {
    return box?.querySelector<HTMLElement>("input:not([type=hidden]), button") ?? null;
}

/** Props for Field. */
interface FieldProps {
    /** The row the field belongs to. */
    readonly ctx: RowContext;
    /** The property. */
    readonly descriptor: ChannelDescriptor;
    /** Whether the field draws its own name above it (off inside a popover that names it). */
    readonly named?: boolean;
}

/**
 * One property's field in its three states (tier3 design, decision 1.1): not set (empty, the
 * value beneath as its placeholder, no minus), set (the value, and a minus), set to nothing
 * ("None", "Hidden": a value like any other). Clear is the minus, empty-and-Enter in a typed
 * field, or Delete / Backspace on a closed select or color chit; focus then lands in the field,
 * and one Undo puts the value back. The accessible name states the state.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.named - whether to draw the field's name above it
 * @returns The field
 */
export function Field({ ctx, descriptor, named = true }: Readonly<FieldProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const tipId = useId();
    const { session, row, side, fresh } = ctx;
    const { channel } = descriptor;
    const line = lineIn(ctx, channel);
    // A line on a locked layer (the element's own base layers) is beneath, not this row's to clear.
    const own = line !== undefined && !line.layer.locked ? line : undefined;
    // A color's opacity is its percent box; a varied opacity is drawn as a row of its own instead.
    const opacity = opacityOf(ctx, descriptor);
    const ownOpacity = opacity?.own?.binding === undefined ? opacity?.own : undefined;
    // What Clear takes away: the value and, on a color, its opacity.
    const cleared = [
        ...(own === undefined ? [] : [{ layer: own.layer, channel }]),
        ...(ownOpacity === undefined || opacity === undefined
            ? []
            : [{ layer: ownOpacity.layer, channel: opacity.descriptor.channel }]),
    ];
    const beneath = ctx.beneath(channel);
    const setWords = own === undefined ? undefined : setWordsOf(session, descriptor, own);
    const mixed = beneath.words !== undefined && "mixed" in beneath.words ? beneath.words.mixed : undefined;
    const stateName =
        ctx.many !== undefined && own === undefined && mixed !== undefined
            ? `${fieldName(channel)}, mixed: ${mixed.join(", ")}`
            : fieldStateName(channel, setWords, own === undefined ? beneath.words : undefined);
    let placeholder: string | undefined;
    if (beneath.words !== undefined) {
        placeholder = "mixed" in beneath.words ? "Mixed" : beneath.words.value;
    }
    const fail = (): void => {
        store.set({ notice: { message: `${channelWord(channel)} could not be changed` } });
    };
    const writeTo = (to: Channel, next: LiteralWrite | { binding: DataBinding }): Promise<unknown> =>
        ctx.many === undefined ? writeLine(session, row, side, to, next, fresh) : ctx.many.write(to, next);
    const write = (next: LiteralWrite | { binding: DataBinding }): void => {
        writeTo(channel, next).catch(fail);
    };
    const valueWrite = (value: ChannelValue): LiteralWrite =>
        own?.combine === undefined ? { value } : { value, combine: own.combine };
    const writeValue = (value: ChannelValue): void => {
        write(valueWrite(value));
    };
    const clear = (): void => {
        if (cleared.length === 0) {
            return;
        }
        // Focus goes to the field before its minus goes away, so it never falls to the page.
        firstControl(box.current)?.focus();
        const { many } = ctx;
        if (many !== undefined) {
            Promise.all(cleared.map((c) => many.clear(c.channel))).catch(fail);
            return;
        }
        // One step, named so Undo reads "Undid clearing node size on Key people".
        session
            .transaction(
                `clearing ${fieldName(channel).toLowerCase()} on ${layerName(session, cleared[0].layer)}`,
                async (tx) => {
                    for (const c of cleared) {
                        const layer = tx.styles.get(c.layer.id);
                        if (layer !== undefined) {
                            await removeLine(tx, layer, c.channel);
                        }
                    }
                },
            )
            .catch(fail);
    };
    const bind = (choice: DataChoice): void => {
        const proposal = propose(session, choice, channel);
        if (proposal.ok) {
            write({ binding: proposal.binding });
        }
    };

    // "=" in a field opens the value picker, as Figma's "apply variable" does (a typed text keeps
    // its "="). A Tooltip entry just added opens it at once: an empty tooltip says nothing.
    const varies = takesBinding(descriptor) && own?.binding === undefined;
    const [varyOpen, setVaryOpen] = useState(() => listOpensNext(channel));
    // The keyboard's Clear: empty a typed field and press Enter, or Delete / Backspace on a closed
    // select or a color chit.
    const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const target = event.target as HTMLElement;
        if (event.key === "=" && varies && descriptor.accepts !== "text" && target instanceof HTMLInputElement) {
            event.preventDefault();
            event.stopPropagation();
            setVaryOpen(true);
            return;
        }
        if (cleared.length === 0) {
            return;
        }
        const typed = target instanceof HTMLInputElement && !target.readOnly;
        const closed = target.getAttribute("aria-expanded") !== "true";
        if (event.key === "Enter" && typed && target.value.trim() === "") {
            event.preventDefault();
            event.stopPropagation();
            clear();
        } else if ((event.key === "Delete" || event.key === "Backspace") && !typed && closed) {
            event.preventDefault();
            event.stopPropagation();
            clear();
        }
    };

    let control: React.ReactNode;
    if (own?.binding !== undefined) {
        control = (
            <BoundValue
                ctx={ctx}
                descriptor={descriptor}
                layer={own.layer}
                binding={own.binding}
                write={write}
                bind={bind}
            />
        );
    } else if (descriptor.accepts === "color") {
        const hex = own === undefined ? null : hexOf(own.value);
        const defaultOpacity = percentOf(opacity?.beneath) ?? percentOf(opacity?.descriptor.default) ?? 100;
        // The percent the box shows; a gesture that leaves it there writes no opacity.
        const shownOpacity = percentOf(ownOpacity?.value) ?? defaultOpacity;
        control = (
            <div // NOSONAR(S6819): an ARIA group naming the paint field's controls; a fieldset would draw its own border and legend
                role="group"
                aria-label={stateName}
            >
                <CompactColorInput
                    aria-label={fieldName(channel)}
                    width="100%"
                    color={hex ?? undefined}
                    defaultColor={hexOf(beneath.value) ?? hexOf(descriptor.default) ?? "#000000"}
                    emptyText={emptyColorWords(descriptor, beneath.words)}
                    mixed={mixed !== undefined}
                    showOpacity={opacity !== undefined && opacity.own?.binding === undefined}
                    opacity={percentOf(ownOpacity?.value)}
                    defaultOpacity={defaultOpacity}
                    showReset={false}
                    swatches={ctx.documentColors}
                    onChangeEnd={(next, nextOpacity) => {
                        // One write per half that moved, in turn, so a row's first edit adds one layer.
                        void (async () => {
                            if (next !== undefined && next.toUpperCase() !== hex) {
                                await writeTo(channel, valueWrite(next.toUpperCase()));
                            }
                            if (opacity !== undefined && nextOpacity !== undefined && nextOpacity !== shownOpacity) {
                                await writeTo(opacity.descriptor.channel, { value: nextOpacity / 100 });
                            }
                        })().catch(fail);
                    }}
                />
            </div>
        );
    } else if (descriptor.accepts === "enum" || descriptor.accepts === "boolean") {
        // The field draws the name, as for every other kind, so paired names share one baseline.
        const grid = GLYPH_TABLES[channel] !== undefined;
        control = (
            <StyleSelect
                label=""
                aria-label={stateName}
                value={
                    typeof own?.value === "string" || typeof own?.value === "boolean" ? String(own.value) : undefined
                }
                defaultValue=""
                placeholder={placeholder ?? ""}
                showReset={false}
                options={optionsOf(descriptor)}
                layout={grid ? "grid" : "list"}
                columns={4}
                onChange={(next) => {
                    if (next !== undefined) {
                        writeValue(descriptor.accepts === "boolean" ? next === "true" : next);
                    }
                }}
            />
        );
    } else if (descriptor.accepts === "number") {
        const prefix = own?.combine === undefined ? undefined : COMBINE_WORDS[own.combine].prefix;
        control = (
            <ComboInput
                label={stateName}
                width="100%"
                numeric
                variant="outlined"
                options={[]}
                value={typeof own?.value === "number" ? own.value : ""}
                placeholder={placeholder}
                glyph={prefix === undefined ? undefined : <Text size="xs">{prefix}</Text>}
                min={descriptor.min}
                max={descriptor.max}
                step={descriptor.max !== undefined && descriptor.max <= 1 ? 0.1 : 1}
                onChange={(next) => {
                    if (typeof next === "number") {
                        writeValue(next);
                    }
                }}
            />
        );
    } else {
        const text = typeof own?.value === "string" ? own.value : "";
        control = (
            <TextInput
                // Keyed by the value, so Undo, Redo or another edit shows the new text.
                key={text}
                size="xs"
                variant="outlined"
                aria-label={stateName}
                placeholder={placeholder}
                defaultValue={text}
                // The not-set look every style field shares, while the box shows what lies beneath.
                data-is-default={text === "" ? "true" : "false"}
                onBlur={(event) => {
                    const next = event.currentTarget.value;
                    if (next !== "" && next !== text) {
                        writeValue(next);
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && event.currentTarget.value !== "") {
                        event.currentTarget.blur();
                    }
                }}
            />
        );
    }

    const tip = clearWords(beneath.words);
    return (
        <div
            ref={box}
            className="ws-field ws-varies"
            data-line={channel}
            data-set={cleared.length === 0 ? undefined : ""}
            data-accepts={descriptor.accepts}
            data-bound={own?.binding === undefined ? undefined : ""}
            onKeyDownCapture={onKeyDownCapture}
        >
            {named && (
                <Input.Label size="xs" component="div" aria-hidden>
                    {channelWord(channel)}
                </Input.Label>
            )}
            {/* The field, then two reserved 24 px columns, vary and Clear, drawn or not, so the
                field keeps its width when it is set, cleared or focused (Figma's icon column). */}
            <div className="ws-field-line">
                <div className="ws-field-control">{control}</div>
                <span className="ws-slot ws-vary">
                    {varies && (
                        <VaryButton
                            ctx={ctx}
                            descriptor={descriptor}
                            onPick={bind}
                            open={varyOpen}
                            onOpenChange={setVaryOpen}
                        />
                    )}
                </span>
                <span className="ws-slot">
                    {cleared.length > 0 && (
                        <>
                            <Tooltip label={tip}>
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    aria-label={`Clear ${fieldName(channel)}`}
                                    aria-describedby={tipId}
                                    onClick={clear}
                                >
                                    <GLYPHS.remove size={14} aria-hidden />
                                </ActionIcon>
                            </Tooltip>
                            <VisuallyHidden id={tipId}>{tip}</VisuallyHidden>
                        </>
                    )}
                </span>
            </div>
        </div>
    );
}

/**
 * What an empty color field says when nothing beneath sets it and it follows another channel (an
 * arrowhead's "Line color"), else nothing (the swatch shows). Mixed beneath is the field's own
 * `mixed` state, which draws no swatch.
 * @param descriptor - the channel.
 * @param beneath - what lies beneath, in words.
 * @returns the words, or undefined.
 */
function emptyColorWords(descriptor: ChannelDescriptor, beneath: Beneath | undefined): string | undefined {
    if (beneath !== undefined && "mixed" in beneath) {
        return undefined;
    }
    return descriptor.follows !== undefined && beneath !== undefined && beneath.from === undefined
        ? followsWords(descriptor.follows)
        : undefined;
}

/**
 * A color field's opacity: the element's opacity channel for it, what the row writes for it and
 * what the layers beneath give.
 * @param ctx - the row.
 * @param descriptor - the color channel.
 * @returns the opacity, or undefined on a channel with no opacity of its own.
 */
function opacityOf(
    ctx: RowContext,
    descriptor: ChannelDescriptor,
): { descriptor: ChannelDescriptor; own: Line | undefined; beneath: unknown } | undefined {
    const channel = OPACITY_OF[descriptor.channel];
    const found = channel === undefined ? undefined : channelsFor(ctx.side).find((d) => d.channel === channel);
    if (found === undefined) {
        return undefined;
    }
    const line = lineIn(ctx, found.channel);
    return {
        descriptor: found,
        own: line !== undefined && !line.layer.locked ? line : undefined,
        beneath: ctx.beneath(found.channel).value,
    };
}

/**
 * An opacity from 0 to 1 as the color field's percent.
 * @param value - the opacity.
 * @returns the percent, or undefined when it is not a number.
 */
function percentOf(value: unknown): number | undefined {
    return typeof value === "number" ? Math.round(value * 100) : undefined;
}

/**
 * A layer as its tree row names it, for the words of an undo step.
 * @param session - the element's session.
 * @param layer - the layer.
 * @returns the row's name, else the layer's.
 */
function layerName(session: GraphSession, layer: Layer): string {
    return findTreeRow(session.styles.tree(), layer.row ?? layer.id)?.row.name ?? layer.name;
}

/**
 * What a set field holds, in words: the value, or what a binding reads.
 * @param session - the element's session.
 * @param descriptor - the channel.
 * @param line - what the row writes.
 * @returns the words.
 */
function setWordsOf(session: GraphSession, descriptor: ChannelDescriptor, line: Line): string {
    if (line.binding !== undefined) {
        return `varies by ${sourceName(session, line.binding) ?? line.binding.by}`;
    }
    const words = valueWords(descriptor, line.value);
    return line.combine === undefined ? words : `${COMBINE_WORDS[line.combine].word.toLowerCase()} by ${words}`;
}

/**
 * The vary glyph in its reserved 24 px column, for a field drawn outside a property row (an effect
 * entry): picking a value binds the channel on the row.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @returns The column, empty when the channel takes no binding
 */
export function VarySlot({
    ctx,
    descriptor,
}: Readonly<{ ctx: RowContext; descriptor: ChannelDescriptor }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const bind = (choice: DataChoice): void => {
        const proposal = propose(ctx.session, choice, descriptor.channel);
        if (!proposal.ok) {
            return;
        }
        const next = { binding: proposal.binding };
        (ctx.many === undefined
            ? writeLine(ctx.session, ctx.row, ctx.side, descriptor.channel, next, ctx.fresh)
            : ctx.many.write(descriptor.channel, next)
        ).catch(() => {
            store.set({ notice: { message: `${channelWord(descriptor.channel)} could not be changed` } });
        });
    };
    return (
        <span className="ws-slot ws-vary">
            {takesBinding(descriptor) && (
                <VaryButton ctx={ctx} descriptor={descriptor} onPick={bind} open={open} onOpenChange={setOpen} />
            )}
        </span>
    );
}

/**
 * The vary glyph: opens the list of values the property can follow.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.onPick - binds the property to the picked value
 * @param props.open - whether the picker is open
 * @param props.onOpenChange - opens or closes it
 * @returns The button and its pop-out
 */
function VaryButton({
    ctx,
    descriptor,
    onPick,
    open,
    onOpenChange: setOpen,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    onPick: (choice: DataChoice) => void;
    /** Whether the picker is open; the field opens it on "=" too. */
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>): React.JSX.Element {
    const { channel } = descriptor;
    const openList = (next: boolean): void => {
        if (!next) {
            openListNext(null);
        }
        setOpen(next);
    };
    const label = bindLabel(descriptor);
    return (
        <Popout opened={open} onOpenChange={openList}>
            <Popout.Trigger>
                {/* The Tooltip passes the trigger's click and ref to the button, but not its ARIA,
                    so the button states its own. */}
                <Tooltip label={label}>
                    <PopoutButton
                        icon={<GLYPHS.link size={14} aria-hidden />}
                        aria-label={`${fieldName(channel)} by attribute`}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                    />
                </Tooltip>
            </Popout.Trigger>
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: label }}
            >
                <ValuePicker
                    title={label}
                    target={ctx.side}
                    channel={channel}
                    fixedLabel={FIXED_LABELS[channel]}
                    onFixed={() => {
                        openList(false);
                        // The field keeps its value; focus goes to it to change it.
                        focusLineNext(channel);
                    }}
                    onPick={(choice) => {
                        openList(false);
                        focusLineNext(channel, true);
                        onPick(choice);
                    }}
                    onClose={() => {
                        openList(false);
                    }}
                />
            </Popout.Panel>
        </Popout>
    );
}

/**
 * A varied value: what it reads and its range or palette, as a value pill that opens the binding
 * popover and fixes it at a value.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.layer - the layer that holds the binding
 * @param props.binding - the binding
 * @param props.write - writes the field
 * @param props.bind - binds the field to another value
 * @returns The pill and its popover
 */
function BoundValue({
    ctx,
    descriptor,
    layer,
    binding,
    write,
    bind,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    layer: Layer;
    binding: DataBinding;
    write: (next: LiteralWrite | { binding: DataBinding }) => void;
    bind: (choice: DataChoice) => void;
}>): React.JSX.Element {
    const { session } = ctx;
    const [open, setOpen] = useState(false);
    const pill = useRef<HTMLDivElement>(null);
    const name = channelWord(descriptor.channel);
    // Whether the path answers is graphty-element's call (its validate), not a search of the data.
    const unresolved = readsNothing(session, descriptor.target, descriptor.channel, binding);
    const source = sourceName(session, binding) ?? binding.by;
    const palette =
        binding.palette === undefined ? undefined : session.catalog.palettes().find((p) => p.id === binding.palette);
    // Never empty, so two fields reading one source never share an accessible name -- except a
    // text field (Tooltip), whose words are the source's own values: it shows the source.
    let detail: string | undefined = palette === undefined ? name : paletteWord(palette.id);
    if (descriptor.accepts === "text") {
        detail = undefined;
    }
    if (unresolved) {
        detail = "reads nothing";
    } else if (binding.range !== undefined) {
        detail = `${String(binding.range[0])} to ${String(binding.range[1])}`;
    }
    let swatch: string | undefined;
    if (descriptor.accepts === "color") {
        // The colors the element paints for this field, from its legend; the named palette when
        // it has none to report (a path that reads nothing).
        const block = session.styles.legend().find((b) => b.layerId === layer.id && b.channel === descriptor.channel);
        const painted = block?.swatches.flatMap((s) => (s.color === undefined ? [] : [s.color]));
        const colors = painted !== undefined && painted.length > 0 ? painted : palette?.colors;
        // At rest a ramp is a strip and categories are chits side by side (hard stops).
        swatch =
            colors === undefined
                ? "var(--mantine-color-gray-5)"
                : `linear-gradient(to right, ${(block?.kind === "categorical" ? chits(colors) : colors).join(", ")})`;
    }
    // What the pill says to a screen reader after the field's name: the source, then its range or
    // palette by name ("Node size: Degree rank, 1 to 3").
    const spoken = detail === undefined || detail === name ? source : `${source}, ${detail}`;
    const detach = (): void => {
        setOpen(false);
        write({ value: startingValue(descriptor, session, layer.selector) });
    };
    // The pill opens the popover itself (no Popout.Trigger), so it takes focus back itself: on
    // Escape or Done, while focus is still in the popover, never after a click elsewhere took it.
    const openChange = (next: boolean): void => {
        const inside = document.activeElement?.closest("[role=dialog]") !== null;
        setOpen(next);
        if (!next && inside) {
            pill.current?.querySelector<HTMLElement>("button")?.focus();
        }
    };

    return (
        // No Popout.Trigger: its click would also fire for the pill's detach button inside it, so
        // the pill opens the panel itself and the panel docks to it.
        <Popout opened={open} onOpenChange={openChange}>
            <div ref={pill}>
                <VariablePill
                    name={source}
                    value={detail}
                    swatch={swatch}
                    width="100%"
                    aria-label={`${fieldName(descriptor.channel)}: ${spoken}`}
                    detachLabel={`Detach ${fieldName(descriptor.channel).toLowerCase()}`}
                    onDetach={detach}
                    onClick={() => {
                        setOpen(true);
                    }}
                />
            </div>
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                anchorY={pill}
                header={{ variant: "title", title: `${name} from data` }}
            >
                <Popout.Content>
                    <BindingPopover
                        descriptor={descriptor}
                        layerId={layer.id}
                        binding={binding}
                        source={source}
                        onChange={(next) => {
                            write({ binding: next });
                        }}
                        onSource={bind}
                        onFix={(value) => {
                            setOpen(false);
                            write({ value });
                        }}
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * Category colors as hard gradient stops, so each reads as its own chit: at most eight.
 * @param colors - the colors.
 * @returns the stops.
 */
function chits(colors: readonly string[]): string[] {
    const shown = colors.slice(0, 8);
    const step = 100 / shown.length;
    return shown.map((c, i) => `${c} ${String(i * step)}% ${String((i + 1) * step)}%`);
}

/** Props for PropertyRow. */
interface PropertyRowProps {
    /** The row the fields belong to. */
    readonly ctx: RowContext;
    /** Which fields and settings. */
    readonly spec: PropertyRowSpec;
    /** The element's descriptors for this side. */
    readonly descriptors: readonly ChannelDescriptor[];
}

/**
 * One row of core properties: the settings button at its start where it has rare properties, its
 * fields side by side, and under it a row for each rare property this layer sets, with its minus,
 * so nothing a layer writes is hidden (tier3 design, decision 1.1).
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.spec - its fields and settings
 * @param props.descriptors - the element's descriptors for this side
 * @returns The row and its set rare properties
 */
export function PropertyRow({ ctx, spec, descriptors }: Readonly<PropertyRowProps>): React.JSX.Element {
    const describe = (channels: readonly Channel[]): ChannelDescriptor[] =>
        channels.flatMap((c) => descriptors.filter((d) => d.channel === c && d.renderable));
    const fields = describe(spec.fields);
    const settings = describe(spec.settings);
    // A varied opacity has no percent box to show in: it gets a row of its own, as a set rare property.
    const opacities = describe(
        [...spec.fields, ...spec.settings].flatMap((c) => {
            const o = OPACITY_OF[c];
            return o === undefined || lineIn(ctx, o)?.binding === undefined ? [] : [o];
        }),
    );
    const written = [...settings, ...opacities].filter((d) => {
        const line = lineIn(ctx, d.channel);
        return line !== undefined && !line.layer.locked;
    });
    return (
        <Stack gap={2} data-row={spec.id}>
            <div className="ws-property-row ws-property-row-core">
                {/* The settings button sits level with the first field's control, under a label's
                    height, however the fields wrap. */}
                <span className="ws-property-row-gap ws-property-row-lead">
                    <Input.Label size="xs" component="div" aria-hidden>
                        {"\u00a0"}
                    </Input.Label>
                    {settings.length > 0 || fields.some((d) => d.accepts === "number") ? (
                        <RowSettings ctx={ctx} spec={spec} fields={fields} settings={settings} />
                    ) : null}
                </span>
                {/* Paired fields wrap onto a line each when the panel is too narrow for both whole. */}
                <div className="ws-property-fields">
                    {fields.map((d) => (
                        <Field key={d.channel} ctx={ctx} descriptor={d} />
                    ))}
                </div>
            </div>
            {written.map((d) => (
                <div key={d.channel} className="ws-property-row ws-property-row-rare">
                    <span className="ws-property-row-gap" />
                    <Field ctx={ctx} descriptor={d} />
                </div>
            ))}
        </Stack>
    );
}

/**
 * A row's settings button and pop-out: its rare properties, each a field with its own state, and
 * how each number field meets what lies beneath (Replace, Multiply, Add).
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.spec - the row
 * @param props.fields - its core fields
 * @param props.settings - its rare properties
 * @returns The button and its pop-out
 */
function RowSettings({
    ctx,
    spec,
    fields,
    settings,
}: Readonly<{
    ctx: RowContext;
    spec: PropertyRowSpec;
    fields: readonly ChannelDescriptor[];
    settings: readonly ChannelDescriptor[];
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const title = `${spec.title} settings`;
    const numbers = fields.filter((d) => d.accepts === "number");
    const combine = (d: ChannelDescriptor, mode: CombineMode): void => {
        const line = lineIn(ctx, d.channel);
        if (line?.value === undefined) {
            return;
        }
        const next = { value: line.value, combine: mode };
        (ctx.many === undefined
            ? writeLine(ctx.session, ctx.row, ctx.side, d.channel, next, ctx.fresh)
            : ctx.many.write(d.channel, next)
        ).catch(() => {
            store.set({ notice: { message: `${channelWord(d.channel)} could not be changed` } });
        });
    };
    return (
        <Popout opened={open} onOpenChange={setOpen}>
            <Popout.Trigger>
                <Tooltip label={title}>
                    <PopoutButton
                        icon={<GLYPHS.settings size={14} aria-hidden />}
                        aria-label={`${ctx.side === "node" ? "Node" : "Edge"} ${title.toLowerCase()}`}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                    />
                </Tooltip>
            </Popout.Trigger>
            <Popout.Panel width={POPOUT_WIDTH} placement="left" alignment="start" header={{ variant: "title", title }}>
                <Popout.Content>
                    <Stack gap={6}>
                        {settings.map((d) => (
                            <Field key={d.channel} ctx={ctx} descriptor={d} />
                        ))}
                        {numbers.map((d) => {
                            const line = lineIn(ctx, d.channel);
                            const set = line !== undefined && !line.layer.locked && line.binding === undefined;
                            return (
                                <StyleSelect
                                    key={d.channel}
                                    label={`${channelWord(d.channel)} combines`}
                                    aria-label={`How ${fieldName(d.channel).toLowerCase()} meets the layers beneath`}
                                    value={set ? (line.combine ?? "replace") : undefined}
                                    defaultValue="replace"
                                    showReset={false}
                                    disabled={!set}
                                    disabledReason={`Set ${channelWord(d.channel).toLowerCase()} first`}
                                    options={(["replace", "multiply", "add"] as const).map((mode) => ({
                                        value: mode,
                                        label: COMBINE_WORDS[mode].word,
                                    }))}
                                    onChange={(mode) => {
                                        if (mode === "replace" || mode === "multiply" || mode === "add") {
                                            combine(d, mode);
                                        }
                                    }}
                                />
                            );
                        })}
                    </Stack>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}
