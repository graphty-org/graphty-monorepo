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
import type { Channel, ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer, LegendBlock } from "@graphty/graphty-element/session";
import { ActionIcon, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useLayoutEffect, useRef, useState } from "react";

import { factSentence, swatchName } from "../canvas/legendWords";
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
    partlySet,
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
    bindLabel,
    channelWord,
    COMBINE_WORDS,
    enumWords,
    fieldName,
    GLYPH_TABLES,
    hexOf,
    isPercent,
    listWords,
    paletteWord,
    SCALE_WORDS,
    takesBinding,
    TWO_WORDS,
    valueWords,
} from "./words";

/** The width of a field's pop-outs (the vary list, a binding, a row's settings): 240 px at every window size. */
const POPOUT_WIDTH = 240;

/** The first choice of a vary list that keeps the field's own value. */
const FIXED_LABELS: Partial<Record<Channel, string>> = { "node.size": "Fixed size", "node.tooltip": "Fixed text" };

/**
 * What the layers beneath a row paint for one channel, when they paint one plain value on all of
 * its elements. Never shown: "+" starts a property from it.
 */
export interface BeneathValue {
    readonly value?: unknown;
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
    /** What the layers beneath the row paint for a channel, for "+" to start from. */
    readonly beneath: (channel: Channel) => BeneathValue;
    /** The colors the document already uses, offered in the color picker. */
    readonly documentColors: readonly string[];
    /** Several rows edited together: what they share, and writes that reach every one of them. */
    readonly many?: ManyRows;
    /** Which of the row's fields a layer above covers, where the row is a tree row. */
    readonly paintedOver?: (channel: Channel) => PaintedOver | undefined;
}

/** Several rows edited as one: each write reaches every row, one undo step. */
export interface ManyRows {
    /** The line every row writes alike, or undefined when none writes it or they differ. */
    readonly line: (channel: Channel) => Line | undefined;
    /** How many of the rows write the channel. */
    readonly count: (channel: Channel) => number;
    /** How many rows are edited together. */
    readonly of: number;
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
 * The words under a set field a layer above covers: "Covered by Degree on 77 of 77".
 * @param over - who covers it, and where.
 * @returns the words.
 */
function coveredWords(over: PaintedOver): string {
    return `Covered by ${listWords(over.by)} on ${String(over.count)} of ${String(over.of)}`;
}

/**
 * Hands focus to its section's "+" when a row that holds focus goes away (its minus, Delete, or an
 * Undo of the add), so focus never falls to the page (WCAG 2.4.3).
 * @param box - the row.
 */
function useFocusOnRemoval(box: React.RefObject<HTMLElement | null>): void {
    useLayoutEffect(() => {
        const node = box.current;
        return () => {
            if (node === null || !node.contains(document.activeElement)) {
                return;
            }
            const section = node.closest<HTMLElement>("[data-section]")?.dataset.section;
            requestAnimationFrame(() => {
                if (section !== undefined && (document.activeElement === document.body || !node.isConnected)) {
                    document.querySelector<HTMLElement>(`[data-section="${section}"] [data-plus]`)?.focus();
                }
            });
        };
    }, [box]);
}

/** Props for Field. */
interface FieldProps {
    /** The row the field belongs to. */
    readonly ctx: RowContext;
    /** The property. */
    readonly descriptor: ChannelDescriptor;
    /** The name drawn in the label column, when not the property's own ("Color" in an effect's pop-out). */
    readonly word?: string;
}

/**
 * One property this layer sets (the owner's style panel design, 2026-10-13): its name, its value,
 * the vary glyph, and a minus that removes it so the layers beneath show through. A property the
 * layer does not set has no row at all, so nothing here ever shows a value from beneath. Several
 * rows edited together that do not all set it alike read "Set on 1 of 2" with no value.
 * Delete or Backspace on a closed select or color chit, or Enter in an emptied typed field, removes
 * it too. A layer above that covers it adds a caption: "Covered by Degree on 77 of 77".
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.word - the name drawn in the label column, when not the property's own
 * @returns The row, or nothing when the layer does not set the property
 */
export function Field({ ctx, descriptor, word }: Readonly<FieldProps>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const { session } = ctx;
    const { channel } = descriptor;
    // "=" in a field opens the value picker, as Figma's "apply variable" does (a typed text keeps
    // its "="). A Tooltip just added opens it at once: an empty tooltip says nothing.
    const [varyOpen, setVaryOpen] = useState(() => listOpensNext(channel));
    useFocusOnRemoval(box);
    const line = lineIn(ctx, channel);
    // A line on a locked layer (the element's own base layers) is not this row's.
    const own = line !== undefined && !line.layer.locked ? line : undefined;
    const partly = own === undefined ? partlySet(ctx, channel) : undefined;
    if (own === undefined && partly === undefined) {
        return null;
    }
    const name = fieldName(channel);
    // A layer above covers this row's value on some of its elements (a shown row only).
    const over = own === undefined || !own.layer.enabled ? undefined : ctx.paintedOver?.(channel);
    const fail = (): void => {
        store.set({ notice: { message: `${channelWord(channel)} could not be changed` } });
    };
    const write = (next: LiteralWrite | { binding: DataBinding }): void => {
        writeIn(ctx, channel, next).catch(fail);
    };
    const writeValue = (value: ChannelValue): void => {
        write(own?.combine === undefined ? { value } : { value, combine: own.combine });
    };
    const remove = (): void => {
        store.set({ announcement: `${name} removed` });
        const { many } = ctx;
        if (many !== undefined) {
            many.clear(channel).catch(fail);
            return;
        }
        if (own === undefined) {
            return;
        }
        // One step, named so Undo reads "Undid removing node size from Key people".
        session
            .transaction(
                `removing ${name.toLowerCase()} from ${layerWord(session, own.layer.id) ?? "the default"}`,
                async (tx) => {
                    const layer = tx.styles.get(own.layer.id);
                    if (layer !== undefined) {
                        await removeLine(tx, layer, channel);
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
    const varies = takesBinding(descriptor) && own !== undefined && own.binding === undefined;
    // The keyboard's remove: empty a typed field and press Enter, or Delete / Backspace on a
    // closed select or a color chit.
    const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const target = event.target as HTMLElement;
        if (target.closest(".ws-field-control") === null) {
            return;
        }
        if (event.key === "=" && varies && descriptor.accepts !== "text" && target instanceof HTMLInputElement) {
            event.preventDefault();
            event.stopPropagation();
            setVaryOpen(true);
            return;
        }
        const typed = target instanceof HTMLInputElement && !target.readOnly;
        const closed = target.getAttribute("aria-expanded") !== "true";
        if (
            (event.key === "Enter" && typed && target.value.trim() === "") ||
            ((event.key === "Delete" || event.key === "Backspace") && !typed && closed)
        ) {
            event.preventDefault();
            event.stopPropagation();
            remove();
        }
    };

    let control: React.ReactNode;
    if (own === undefined) {
        // Several rows, only some of which set it (or all differently): no value is borrowed.
        const words =
            partly === undefined || partly.set < partly.of
                ? `Set on ${String(partly?.set ?? 0)} of ${String(partly?.of ?? 0)}`
                : "Mixed";
        control = (
            <Text size="xs" aria-label={`${name}, ${words.toLowerCase()}`}>
                {words}
            </Text>
        );
    } else if (own.binding !== undefined) {
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
        const hex = hexOf(own.value) ?? "#000000";
        control = (
            <CompactColorInput
                aria-label={name}
                width="100%"
                color={hex}
                defaultColor={hex}
                showOpacity={false}
                showReset={false}
                swatches={ctx.documentColors}
                onChangeEnd={(next) => {
                    if (next !== undefined && next.toUpperCase() !== hex) {
                        writeValue(next.toUpperCase());
                    }
                }}
            />
        );
    } else if (descriptor.accepts === "enum" || descriptor.accepts === "boolean") {
        const grid = GLYPH_TABLES[channel] !== undefined;
        const value = typeof own.value === "string" || typeof own.value === "boolean" ? String(own.value) : "";
        control = (
            <StyleSelect
                label=""
                aria-label={name}
                value={value}
                defaultValue={value}
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
        const prefix = own.combine === undefined ? undefined : COMBINE_WORDS[own.combine].prefix;
        // An opacity reads and types as a percent, as a color field's opacity does.
        const percent = isPercent(descriptor);
        const scale = percent ? 100 : 1;
        control = (
            <ComboInput
                label={name}
                width="100%"
                numeric
                variant="outlined"
                options={[]}
                value={typeof own.value === "number" ? Math.round(own.value * scale * 100) / 100 : ""}
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
        const text = typeof own.value === "string" ? own.value : "";
        control = (
            <TextInput
                // Keyed by the value, so Undo, Redo or another edit shows the new text.
                key={text}
                size="xs"
                variant="outlined"
                aria-label={name}
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

    let varySlot: React.ReactNode = null;
    if (own?.binding !== undefined) {
        // A bound field's Stop varying sits where its vary glyph sat (Figma's detach on a variable
        // field). It is the one way back to a single value, so its words say what it does.
        const one = descriptor.accepts === "color" ? "one color" : "one value";
        varySlot = (
            <Tooltip label={`Stop varying by data: use ${one} for all`}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={`Stop varying ${name.toLowerCase()} by data`}
                    onClick={() => {
                        const value = startingValue(descriptor, session, own.layer.selector);
                        // Focus stays on the property: its field, now holding the one value.
                        focusLineNext(channel, "fixed");
                        store.set({
                            announcement: `${name} no longer varies by data, now ${valueWords(descriptor, value)}`,
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
    const removeName =
        ctx.many === undefined ? `Remove ${name.toLowerCase()}` : `Remove ${name.toLowerCase()} from every row`;
    return (
        <div
            ref={box}
            className="ws-row"
            data-line={channel}
            data-set=""
            data-accepts={descriptor.accepts}
            data-bound={own?.binding === undefined ? undefined : ""}
            data-covered={over === undefined ? undefined : ""}
            onKeyDownCapture={onKeyDownCapture}
        >
            {/* One line: the name, the field, then two reserved 24 px columns, vary and minus,
                so the field keeps its width (Figma's property row). */}
            <div className="ws-field ws-varies" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name" title={word ?? channelWord(channel)} aria-hidden>
                        {word ?? channelWord(channel)}
                    </span>
                </span>
                <div className="ws-field-control">{control}</div>
                <span className="ws-slot ws-vary">{varySlot}</span>
                <span className="ws-slot">
                    <Tooltip label={removeName}>
                        <ActionIcon variant="subtle" size="sm" aria-label={removeName} onClick={remove}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
            {over === undefined ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" className="ws-field-covered" data-covered-caption>
                    {coveredWords(over)}
                </Text>
            )}
        </div>
    );
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
            <div ref={pill} className="ws-varied">
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
                <VariedLine
                    block={session.styles
                        .legend()
                        .find((b) => b.layerId === layer.id && b.channel === descriptor.channel)}
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
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/** How many category chits a varied field's second line shows before "+N". */
const MAX_CHITS = 8;

/** The scales a varied field's second line says nothing about: the neutral ones. */
const NEUTRAL_SCALES: ReadonlySet<string> = new Set(["linear", "ordinal", "passthrough"]);

/**
 * A varied field's second line (tier3 design, section 2.2): up to 8 category chits and "+N", a
 * ramp's domain ends, or a number's From / To; then a note for each non-neutral setting ("Log
 * scale", the element's legend facts but the one the field's coverage caption already says), as
 * plain secondary text. All of it from the element's
 * legend block for the field.
 * @param props - Component props
 * @param props.block - the field's legend block, if the element has painted it
 * @returns The line, or nothing before the element has painted the field
 */
function VariedLine({ block }: Readonly<{ block: LegendBlock | undefined }>): React.JSX.Element | null {
    if (block === undefined) {
        return null;
    }
    const notes = [
        ...(block.scale === undefined || NEUTRAL_SCALES.has(block.scale.kind)
            ? []
            : [`${SCALE_WORDS[block.scale.kind] ?? enumWords(block.scale.kind)} scale`]),
        // The field's own coverage caption ("Covered by ... on 77 of 77") says who paints over it.
        ...block.facts.flatMap((fact) => {
            const sentence = fact.code === "legend.painted-over" ? null : factSentence(fact);
            return sentence === null ? [] : [sentence.charAt(0).toUpperCase() + sentence.slice(1)];
        }),
    ];
    let summary: React.ReactNode = null;
    if (block.kind === "categorical") {
        const rows = block.swatches.filter((s) => s.role !== "other");
        const shown = rows.slice(0, MAX_CHITS);
        const more = rows.length - shown.length + (block.overflow?.hidden ?? 0);
        summary = (
            <span className="ws-varied-chits">
                {shown.map((swatch) => (
                    <span
                        key={swatchName(block, swatch)}
                        className="ws-varied-chit"
                        title={swatchName(block, swatch)}
                        style={{ background: swatch.color ?? "var(--mantine-color-gray-5)" }}
                    />
                ))}
                {more > 0 && <Text span size="xs" c="var(--cm-text-secondary)">{`+${String(more)}`}</Text>}
            </span>
        );
    } else if (block.range !== undefined) {
        summary = `From ${String(block.range.min)} to ${String(block.range.max)}`;
    } else if (block.domain !== undefined) {
        const end = (n: number): string => String(Number(n.toPrecision(4)));
        summary = (
            <span className="ws-varied-ends">
                <span>{end(block.domain.min)}</span>
                <span>{end(block.domain.max)}</span>
            </span>
        );
    }
    if (summary === null && notes.length === 0) {
        return null;
    }
    return (
        <div className="ws-varied-line" data-varied-line>
            {summary === null ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" component="div">
                    {summary}
                </Text>
            )}
            {notes.map((note) => (
                <Text key={note} size="xs" c="var(--cm-text-secondary)" data-varied-note>
                    {note}
                </Text>
            ))}
        </div>
    );
}

/** How wide a bound color's swatch is at rest: a ramp strip, or six group chits side by side. */
const SWATCH_STRIP = 20;

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
