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
import { ActionIcon, Input, Stack, Text, TextInput, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { BindingPopover } from "./BindingPopover";
import { FromDataList } from "./FromDataList";
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
import {
    type Beneath,
    bindLabel,
    bindsAtRest,
    channelWord,
    clearWords,
    COMBINE_WORDS,
    enumWords,
    fieldName,
    fieldStateName,
    followsWords,
    GLYPH_TABLES,
    hexOf,
    paletteWord,
    type PropertyRowSpec,
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
    const write = (next: LiteralWrite | { binding: DataBinding }): void => {
        (ctx.many === undefined
            ? writeLine(session, row, side, channel, next, fresh)
            : ctx.many.write(channel, next)
        ).catch(fail);
    };
    const writeValue = (value: ChannelValue): void => {
        write(own?.combine === undefined ? { value } : { value, combine: own.combine });
    };
    const clear = (): void => {
        if (own === undefined) {
            return;
        }
        // Focus goes to the field before its minus goes away, so it never falls to the page.
        firstControl(box.current)?.focus();
        (ctx.many === undefined ? removeLine(session, own.layer, channel) : ctx.many.clear(channel)).catch(fail);
    };
    const bind = (choice: DataChoice): void => {
        const proposal = propose(session, choice, channel);
        if (proposal.ok) {
            write({ binding: proposal.binding });
        }
    };

    // The keyboard's Clear: empty a typed field and press Enter, or Delete / Backspace on a closed
    // select or a color chit.
    const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (own === undefined) {
            return;
        }
        const target = event.target as HTMLElement;
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
    let drawsName = named;
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
                    showOpacity={false}
                    showReset={false}
                    swatches={ctx.documentColors}
                    onChangeEnd={(next) => {
                        if (next !== undefined) {
                            writeValue(next.toUpperCase());
                        }
                    }}
                />
            </div>
        );
    } else if (descriptor.accepts === "enum" || descriptor.accepts === "boolean") {
        // StyleSelect draws the field's name itself, as Mantine draws every input's label.
        drawsName = false;
        const grid = GLYPH_TABLES[channel] !== undefined;
        control = (
            <StyleSelect
                label={named ? channelWord(channel) : ""}
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
                aria-label={stateName}
                placeholder={placeholder}
                defaultValue={text}
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
            className="ws-field"
            data-line={channel}
            data-set={own === undefined ? undefined : ""}
            data-bound={own?.binding === undefined ? undefined : ""}
            onKeyDownCapture={onKeyDownCapture}
        >
            {drawsName && (
                <Input.Label size="xs" component="div" aria-hidden>
                    {channelWord(channel)}
                </Input.Label>
            )}
            <div className="ws-field-line">
                <div className="ws-field-control">{control}</div>
                {bindsAtRest(descriptor) && own?.binding === undefined && (
                    // On hover and focus only, as Figma's "Apply variable" (always on touch): at rest
                    // the field keeps its width for the value.
                    <span className="ws-vary">
                        <VaryButton ctx={ctx} descriptor={descriptor} onPick={bind} />
                    </span>
                )}
                {own !== undefined && (
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
            </div>
        </div>
    );
}

/**
 * What an empty color field says: "Mixed" when the elements beneath differ, the color it follows
 * when nothing beneath sets it (an arrowhead's "Line color"), else nothing (the swatch shows).
 * @param descriptor - the channel.
 * @param beneath - what lies beneath, in words.
 * @returns the words, or undefined.
 */
function emptyColorWords(descriptor: ChannelDescriptor, beneath: Beneath | undefined): string | undefined {
    if (beneath !== undefined && "mixed" in beneath) {
        return "Mixed";
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
 * The vary glyph: opens the list of values the property can follow.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.onPick - binds the property to the picked value
 * @returns The button and its pop-out
 */
function VaryButton({
    ctx,
    descriptor,
    onPick,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    onPick: (choice: DataChoice) => void;
}>): React.JSX.Element {
    const { channel } = descriptor;
    // A Tooltip entry just added asks at once what it reads: an empty tooltip says nothing.
    const [open, setOpen] = useState(() => listOpensNext(channel));
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
                <FromDataList
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
        const painted = session.styles
            .legend()
            .find((block) => block.layerId === layer.id && block.channel === descriptor.channel)
            ?.swatches.flatMap((s) => (s.color === undefined ? [] : [s.color]));
        const colors = painted !== undefined && painted.length > 0 ? painted : palette?.colors;
        swatch =
            colors === undefined ? "var(--mantine-color-gray-5)" : `linear-gradient(to right, ${colors.join(", ")})`;
    }
    const detach = (): void => {
        setOpen(false);
        write({ value: startingValue(descriptor, session, layer.selector) });
    };

    return (
        // No Popout.Trigger: its click would also fire for the pill's detach button inside it, so
        // the pill opens the panel itself and the panel docks to it.
        <Popout opened={open} onOpenChange={setOpen}>
            <div ref={pill}>
                <VariablePill
                    name={source}
                    value={detail}
                    swatch={swatch}
                    width="100%"
                    detachLabel={`Detach ${name}`}
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
                anchorX={pill}
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
                        onDetach={detach}
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
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
    const written = settings.filter((d) => {
        const line = lineIn(ctx, d.channel);
        return line !== undefined && !line.layer.locked;
    });
    return (
        <Stack gap={2} data-row={spec.id}>
            <div className="ws-property-row">
                {settings.length > 0 || fields.some((d) => d.accepts === "number") ? (
                    <RowSettings ctx={ctx} spec={spec} fields={fields} settings={settings} />
                ) : (
                    <span className="ws-property-row-gap" />
                )}
                {fields.map((d) => (
                    <Field key={d.channel} ctx={ctx} descriptor={d} />
                ))}
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
