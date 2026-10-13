import {
    ComboInput,
    CompactColorInput,
    Popout,
    PopoutButton,
    StyleSelect,
    type StyleSelectOption,
    VariablePill,
} from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, CombineMode, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Stack, Text, TextInput, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { BindingPopover } from "./BindingPopover";
import {
    type DataBinding,
    type DataChoice,
    layerWord,
    type Line,
    lineIn,
    type LiteralWrite,
    type NewLayer,
    type PaintedOver,
    propose,
    readsNothing,
    removeLine,
    sourceName,
    startingValue,
    type Target,
    writeIn,
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
    isPercent,
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
    /** Which of the row's fields a layer above paints over, where the row is a tree row. */
    readonly paintedOver?: (channel: Channel) => PaintedOver | undefined;
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
 * The first control in a field's control column, where focus goes after a clear or a detach.
 * @param box - the field's box.
 * @returns the control, or null.
 */
function firstControl(box: HTMLElement | null): HTMLElement | null {
    return box?.querySelector<HTMLElement>(".ws-field-control :is(input:not([type=hidden]), button)") ?? null;
}

/**
 * The words for a field a layer above paints over: "Painted over by Degree on 11 of 11 nodes".
 * @param channel - the field's channel.
 * @param over - who paints over it, and where.
 * @returns the words.
 */
function paintedOverWords(channel: Channel, over: PaintedOver): string {
    const kind = channel.startsWith("node.") ? "node" : "edge";
    const by = over.by.length === 1 ? over.by[0] : `${over.by.slice(0, -1).join(", ")} and ${String(over.by.at(-1))}`;
    return `Painted over by ${by} on ${String(over.count)} of ${String(over.of)} ${kind}${over.of === 1 ? "" : "s"}`;
}

/** Props for Field. */
interface FieldProps {
    /** The row the field belongs to. */
    readonly ctx: RowContext;
    /** The property. */
    readonly descriptor: ChannelDescriptor;
    /** Whether the field draws its name in the label column (off where its row names it). */
    readonly named?: boolean;
    /** What the label column holds after the name: the row's settings button on its first field. */
    readonly lead?: React.ReactNode;
    /** The name drawn in the label column, where the line's list already says whose it is ("Size"). */
    readonly word?: string;
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
 * @param props.named - whether to draw the field's name in the label column
 * @param props.lead - what the label column holds after the name
 * @param props.word - the name drawn in the label column, when not the property's own
 * @returns The field
 */
export function Field({ ctx, descriptor, named = true, lead, word }: Readonly<FieldProps>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const tipId = useId();
    const { session } = ctx;
    const { channel } = descriptor;
    const line = lineIn(ctx, channel);
    // A line on a locked layer (the element's own base layers) is beneath, not this row's to clear.
    const own = line !== undefined && !line.layer.locked ? line : undefined;
    // What Clear takes away: the value.
    const cleared = own === undefined ? [] : [{ layer: own.layer, channel }];
    const beneath = ctx.beneath(channel);
    const setWords = own === undefined ? undefined : setWordsOf(session, descriptor, own);
    // "Mixed": several selected rows disagree. "Varies": the layers beneath give this row's
    // elements different values.
    const mixed = beneath.words !== undefined && "mixed" in beneath.words;
    const stateName = fieldStateName(channel, setWords, own === undefined ? beneath.words : undefined);
    let placeholder: string | undefined;
    if (beneath.words !== undefined) {
        if ("mixed" in beneath.words) {
            placeholder = "Mixed";
        } else if ("varies" in beneath.words) {
            placeholder = "Varies";
        } else {
            placeholder = beneath.words.value;
        }
    }
    // A layer above paints over this row's value on some of its elements (a shown row only).
    const over = own === undefined || !own.layer.enabled ? undefined : ctx.paintedOver?.(channel);
    const fail = (): void => {
        store.set({ notice: { message: `${channelWord(channel)} could not be changed` } });
    };
    const writeTo = (to: Channel, next: LiteralWrite | { binding: DataBinding }): Promise<unknown> =>
        writeIn(ctx, to, next);
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
                `clearing ${fieldName(channel).toLowerCase()} on ${layerWord(session, cleared[0].layer.id) ?? "the default"}`,
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
        // The label column's settings button keeps its own keys.
        if (target.closest(".ws-field-control") === null) {
            return;
        }
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
                    mixed={mixed}
                    showOpacity={false}
                    showReset={false}
                    swatches={ctx.documentColors}
                    onChangeEnd={(next) => {
                        if (next !== undefined && next.toUpperCase() !== hex) {
                            writeTo(channel, valueWrite(next.toUpperCase())).catch(fail);
                        }
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
        // An opacity reads and types as a percent, as a color field's opacity does.
        const percent = isPercent(descriptor);
        const scale = percent ? 100 : 1;
        control = (
            <ComboInput
                label={stateName}
                width="100%"
                numeric
                variant="outlined"
                options={[]}
                value={typeof own?.value === "number" ? Math.round(own.value * scale * 100) / 100 : ""}
                placeholder={percent ? placeholder?.replace(" %", "") : placeholder}
                suffix={percent ? "%" : undefined}
                glyph={prefix === undefined ? undefined : <Text size="xs">{prefix}</Text>}
                min={descriptor.min === undefined ? undefined : descriptor.min * scale}
                max={descriptor.max === undefined ? undefined : descriptor.max * scale}
                step={!percent && descriptor.max !== undefined && descriptor.max <= 1 ? 0.1 : 1}
                onChange={(next) => {
                    if (typeof next === "number") {
                        writeValue(next / scale);
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
    const overWords = over === undefined ? undefined : paintedOverWords(channel, over);
    let varySlot: React.ReactNode = null;
    if (own?.binding !== undefined) {
        // A bound field's Detach sits where its vary glyph sat (Figma's variable field), so the
        // pill keeps one width whether its popover is open or not.
        varySlot = (
            <Tooltip label="Detach: use one value">
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={`Detach ${fieldName(channel).toLowerCase()}`}
                    onClick={() => {
                        const value = startingValue(descriptor, session, own.layer.selector);
                        // Focus stays on the property: its field, now holding the one value.
                        focusLineNext(channel, "fixed");
                        store.set({
                            announcement: `${fieldName(channel)} detached, now ${valueWords(descriptor, value)}`,
                        });
                        write({ value });
                    }}
                >
                    <GLYPHS.unlink size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    } else if (varies) {
        varySlot = (
            <VaryButton ctx={ctx} descriptor={descriptor} onPick={bind} open={varyOpen} onOpenChange={setVaryOpen} />
        );
    }
    return (
        <div
            ref={box}
            className="ws-field ws-varies"
            data-line={channel}
            data-named={named ? "" : undefined}
            data-set={cleared.length === 0 ? undefined : ""}
            data-accepts={descriptor.accepts}
            data-bound={own?.binding === undefined ? undefined : ""}
            data-painted-over={over === undefined ? undefined : ""}
            onKeyDownCapture={onKeyDownCapture}
        >
            {/* One line: the name in the label column, the field, then two reserved 24 px
                columns, vary and Clear, drawn or not, so the field keeps its width when it is
                set, cleared or focused (Figma's property row). */}
            {named && (
                <span className="ws-field-label">
                    <span className="ws-field-name" title={word ?? channelWord(channel)} aria-hidden>
                        {word ?? channelWord(channel)}
                    </span>
                    {overWords !== undefined && (
                        <Tooltip label={overWords}>
                            <span role="img" aria-label={overWords} className="ws-field-over">
                                <GLYPHS.paintedOver size={12} aria-hidden />
                            </span>
                        </Tooltip>
                    )}
                    {lead}
                </span>
            )}
            <div className="ws-field-control">{control}</div>
            <span className="ws-slot ws-vary">{varySlot}</span>
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
    );
}

/**
 * What an empty color field says: "Varies" when the layers beneath give the row's elements
 * different colors (the chit shows the color most of them get), "Line color" when nothing beneath
 * sets it and it follows another channel, else nothing (the swatch shows). Mixed, several rows
 * that disagree, is the field's own `mixed` state, which draws no swatch.
 * @param descriptor - the channel.
 * @param beneath - what lies beneath, in words.
 * @returns the words, or undefined.
 */
function emptyColorWords(descriptor: ChannelDescriptor, beneath: Beneath | undefined): string | undefined {
    if (beneath !== undefined && "mixed" in beneath) {
        return undefined;
    }
    if (beneath !== undefined && "varies" in beneath) {
        return "Varies";
    }
    return descriptor.follows !== undefined && beneath !== undefined && beneath.from === undefined
        ? followsWords(descriptor.follows)
        : undefined;
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
        writeIn(ctx, descriptor.channel, { binding: proposal.binding }).catch(() => {
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
                    swatchWidth={swatch === undefined ? undefined : SWATCH_STRIP}
                    width="100%"
                    aria-label={`${fieldName(descriptor.channel)}: ${spoken}`}
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

/** How wide a bound color's swatch is at rest: a ramp strip, or six group chits side by side. */
const SWATCH_STRIP = 36;

/**
 * Category colors as hard gradient stops, so each reads as its own chit: at most six.
 * @param colors - the colors.
 * @returns the stops.
 */
function chits(colors: readonly string[]): string[] {
    const shown = colors.slice(0, 6);
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
 * A group of core properties, one line each (Figma's property rows): its settings button sits in
 * the label column of its first line where it has rare properties, and under its lines a line for
 * each rare property this layer sets, with its minus, so nothing a layer writes is hidden (tier3
 * design, decision 1.1).
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.spec - its fields and settings
 * @param props.descriptors - the element's descriptors for this side
 * @returns The lines
 */
export function PropertyRow({ ctx, spec, descriptors }: Readonly<PropertyRowProps>): React.JSX.Element {
    const describe = (channels: readonly Channel[]): ChannelDescriptor[] =>
        channels.flatMap((c) => descriptors.filter((d) => d.channel === c && d.renderable));
    const fields = describe(spec.fields);
    const settings = describe(spec.settings);
    const written = settings.filter((d) => {
        const line = lineIn(ctx, d.channel);
        return line !== undefined && !line.layer.locked;
    });
    const hasSettings = settings.length > 0 || fields.some((d) => d.accepts === "number");
    return (
        <div className="ws-property-row" data-row={spec.id}>
            {fields.map((d, i) => (
                <Field
                    key={d.channel}
                    ctx={ctx}
                    descriptor={d}
                    lead={
                        i === 0 && hasSettings ? (
                            <RowSettings ctx={ctx} spec={spec} fields={fields} settings={settings} />
                        ) : undefined
                    }
                />
            ))}
            {written.map((d) => (
                <Field key={d.channel} ctx={ctx} descriptor={d} />
            ))}
        </div>
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
        writeIn(ctx, d.channel, { value: line.value, combine: mode }).catch(() => {
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
                    <Stack gap={0}>
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
