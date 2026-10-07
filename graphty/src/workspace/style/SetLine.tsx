import {
    ComboInput,
    CompactColorInput,
    ControlSubGroup,
    FieldRow,
    opacityToAlphaHex,
    Popout,
    PopoutButton,
    QuickActions,
    VariablePill,
} from "@graphty/compact-mantine";
import { type ChannelDescriptor, toColorValue } from "@graphty/graphty-element/catalog";
import type { ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, ColorSwatch, Select, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { BindingPopover } from "./BindingPopover";
import { FromDataList } from "./FromDataList";
import {
    type DataBinding,
    type DataChoice,
    type Line,
    lineOf,
    propose,
    readsNothing,
    removeLine,
    sourceName,
    startingValue,
    writeLine,
} from "./row";
import { focusLineNext } from "./useFocusLine";
import { bindLabel, bindsAtRest, channelWord, type CompoundLine, enumWords, paletteWord } from "./words";

/** Props for SetLine. */
interface SetLineProps {
    /** The property. */
    descriptor: ChannelDescriptor;
    /** What the row says for it. */
    line: Line;
    /** The row's layers. */
    row: readonly LayerId[];
    /** The colors the document already uses, offered in the Color popover. */
    documentColors: readonly string[];
    /** The line's name, when it is not the channel's own (a part inside a compound line). */
    name?: string;
    /** Whether it is a part inside a compound line's popover, which has no "-" of its own. */
    part?: boolean;
}

/** Figma's paint field beside a row's bind icon and "-": 156 px, so the hex and opacity fit whole. */
const PAINT_FIELD_WIDTH = 156;

/** The width of a line's pop-out (a compound line, the bind list, the Binding and Shape lists), as wide as the panel's own rows. */
const POPOUT_WIDTH = 248;

/**
 * The line's color as the paint field edits it: `#RRGGBB`, and its opacity as a percent.
 * @param value - the value the layer holds.
 * @returns the hex and the percent, or null when it is not a color.
 */
function colorOf(value: ChannelValue | undefined): { hex: string; percent: number } | null {
    const color = typeof value === "string" || (typeof value === "object" && "r" in value) ? toColorValue(value) : null;
    if (color === null) {
        return null;
    }
    return { hex: color.hex.slice(0, 7).toUpperCase(), percent: Math.round(color.a * 100) };
}

/**
 * One set property: one 24 px line of name and value (tier1-design.md section 2.8). Colors show a
 * swatch, the hex and the opacity percent; a bound line shows what it reads and its range or
 * palette, and opens the Binding popover. Color and Size carry the bind icon at rest. "-" removes
 * the line, with Undo. A value is edited in a light popover or in place, and applies live.
 * @param props - Component props
 * @param props.descriptor - the property
 * @param props.line - what the row says for it
 * @param props.row - the row's layers
 * @param props.documentColors - colors the document uses
 * @param props.name - the line's name, when it is not the channel's own
 * @param props.part - whether it is a part inside a compound line's popover
 * @returns The line
 */
export function SetLine({
    descriptor,
    line,
    row,
    documentColors,
    name: partName,
    part = false,
}: Readonly<SetLineProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [binding, setBinding] = useState(false);
    if (session === null) {
        return null;
    }
    const { channel, target } = descriptor;
    const name = partName ?? channelWord(channel);
    const fail = (): void => {
        focusLineNext(null);
        store.set({ notice: { message: `${name} could not be changed` } });
    };
    const write = (next: { value: ChannelValue } | { binding: DataBinding }): void => {
        writeLine(session, row, target, channel, next).catch(fail);
    };
    const bind = (choice: DataChoice): void => {
        const proposal = propose(session, choice, channel);
        if (proposal.ok) {
            write({ binding: proposal.binding });
        }
    };
    const remove = (): void => {
        removeLine(session, line.layer, channel).then(() => {
            store.set({
                notice: {
                    message: `Removed ${name}`,
                    action: {
                        label: "Undo",
                        run: () => {
                            void session.undo();
                        },
                    },
                },
            });
        }, fail);
    };

    const bindIcon =
        bindsAtRest(descriptor) && line.binding === undefined ? (
            <Popout opened={binding} onOpenChange={setBinding}>
                <Popout.Trigger>
                    {/* The Tooltip passes the trigger's click and ref to the button, but not its
                        ARIA, so the button states its own. */}
                    <Tooltip label={bindLabel(descriptor)}>
                        <PopoutButton
                            icon={<GLYPHS.link size={14} aria-hidden />}
                            aria-label={bindLabel(descriptor)}
                            aria-haspopup="dialog"
                            aria-expanded={binding}
                        />
                    </Tooltip>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title: bindLabel(descriptor) }}
                >
                    <FromDataList
                        target={target}
                        channel={channel}
                        onPick={(choice) => {
                            setBinding(false);
                            // The bind removes this icon; focus goes to the bound line instead.
                            focusLineNext(channel, true);
                            bind(choice);
                        }}
                        onClose={() => {
                            setBinding(false);
                        }}
                    />
                </Popout.Panel>
            </Popout>
        ) : null;

    const removeButton =
        part || line.layer.locked ? null : (
            <Tooltip label={`Remove ${name}`}>
                <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${name}`} onClick={remove}>
                    <GLYPHS.remove size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );

    if (descriptor.accepts === "color" && line.binding === undefined) {
        // Figma's paint row: the name as a caption above the field, the bind icon beside it and
        // "-" in the trailing slot, all on the field's line.
        return (
            <FieldRow
                data-line={channel}
                trailing={removeButton}
                style={{ height: "auto", alignItems: "flex-end", paddingBlock: 4 }}
            >
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                    <ColorValue
                        name={name}
                        value={line.value}
                        fallback={descriptor.default}
                        documentColors={documentColors}
                        write={write}
                    />
                    {bindIcon}
                </div>
            </FieldRow>
        );
    }

    // compact-mantine's panel row: the name in the 88 px column, the value beside it, "-" in the
    // trailing slot.
    return (
        <FieldRow
            data-line={channel}
            data-bound={line.binding === undefined ? undefined : true}
            trailing={removeButton}
        >
            <Text size="xs" truncate>
                {name}
            </Text>
            <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", minWidth: 0 }}>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    {line.binding === undefined ? (
                        <ValueEditor
                            descriptor={descriptor}
                            value={line.value}
                            documentColors={documentColors}
                            write={write}
                        />
                    ) : (
                        <BoundValue
                            descriptor={descriptor}
                            layer={line.layer}
                            binding={line.binding}
                            write={write}
                            bind={bind}
                        />
                    )}
                </div>
                {bindIcon}
            </div>
        </FieldRow>
    );
}

/**
 * A bound value: what it reads and its range or palette, as a variable pill that opens the
 * Binding popover and detaches.
 * @param props - Component props
 * @param props.descriptor - the property
 * @param props.layer - the layer that holds the binding
 * @param props.binding - the binding
 * @param props.write - writes the line
 * @param props.bind - binds the line to another attribute or result
 * @returns The pill and its popover
 */
function BoundValue({
    descriptor,
    layer,
    binding,
    write,
    bind,
}: Readonly<{
    descriptor: ChannelDescriptor;
    layer: Line["layer"];
    binding: DataBinding;
    write: (next: { value: ChannelValue } | { binding: DataBinding }) => void;
    bind: (choice: DataChoice) => void;
}>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [open, setOpen] = useState(false);
    const pill = useRef<HTMLDivElement>(null);
    if (session === null) {
        return null;
    }
    const name = channelWord(descriptor.channel);
    // Whether the path answers is graphty-element's call (its validate), not a search of the data.
    const unresolved = readsNothing(session, descriptor.target, descriptor.channel, binding);
    const source = sourceName(session, binding) ?? binding.by;
    const palette =
        binding.palette === undefined ? undefined : session.catalog.palettes().find((p) => p.id === binding.palette);
    // Never empty, so two lines reading one source never share an accessible name.
    let detail = palette === undefined ? name : paletteWord(palette.id);
    if (unresolved) {
        detail = "reads nothing";
    } else if (binding.range !== undefined) {
        detail = `${String(binding.range[0])} to ${String(binding.range[1])}`;
    }
    let swatch: string | undefined;
    if (descriptor.accepts === "color") {
        // The colors the element paints for this line, from its legend; the named palette when it
        // has none to report (a path that reads nothing).
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
        write({ value: startingValue(descriptor) });
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

/**
 * A literal value, edited in a light popover (color, shape) or in place (number, choice, switch,
 * text).
 * @param props - Component props
 * @param props.descriptor - the property
 * @param props.value - the value
 * @param props.documentColors - colors the document uses
 * @param props.write - writes the line
 * @returns The editor
 */
function ValueEditor({
    descriptor,
    value,
    documentColors,
    write,
}: Readonly<{
    descriptor: ChannelDescriptor;
    value: ChannelValue | undefined;
    documentColors: readonly string[];
    write: (next: { value: ChannelValue }) => void;
}>): React.JSX.Element {
    const label = channelWord(descriptor.channel);
    switch (descriptor.accepts) {
        case "color":
            return (
                <ColorValue
                    name={label}
                    value={value}
                    fallback={descriptor.default}
                    documentColors={documentColors}
                    write={write}
                />
            );
        case "enum":
            return descriptor.channel === "node.shape" ? (
                <ShapeValue descriptor={descriptor} value={value} write={write} />
            ) : (
                <Select
                    size="xs"
                    aria-label={label}
                    value={typeof value === "string" ? value : null}
                    data={(descriptor.values ?? []).map((v) => ({ value: v, label: enumWords(v) }))}
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: false }}
                    onChange={(next) => {
                        if (next !== null) {
                            write({ value: next });
                        }
                    }}
                />
            );
        case "number":
            return (
                <ComboInput
                    label={label}
                    width="100%"
                    numeric
                    options={[]}
                    value={typeof value === "number" ? value : undefined}
                    min={descriptor.min}
                    max={descriptor.max}
                    step={descriptor.max !== undefined && descriptor.max <= 1 ? 0.1 : 1}
                    onChange={(next) => {
                        if (typeof next === "number") {
                            write({ value: next });
                        }
                    }}
                />
            );
        case "boolean":
            return (
                <Checkbox
                    size="xs"
                    aria-label={label}
                    checked={value === true}
                    onChange={(event) => {
                        write({ value: event.currentTarget.checked });
                    }}
                />
            );
        default:
            return (
                <TextInput
                    // Keyed by the value, so Undo, Redo or another edit of the line shows the new text.
                    key={typeof value === "string" ? value : ""}
                    size="xs"
                    aria-label={label}
                    defaultValue={typeof value === "string" ? value : ""}
                    onBlur={(event) => {
                        if (event.currentTarget.value !== value) {
                            write({ value: event.currentTarget.value });
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.currentTarget.blur();
                        }
                    }}
                />
            );
    }
}

/**
 * A color line's value: compact-mantine's paint field (swatch, hex, opacity) with the name as its
 * caption. The swatch opens the picker with the document's colors; a drag writes once, on release,
 * so it is one undo step.
 * @param props - Component props
 * @param props.name - the property's name
 * @param props.value - the value
 * @param props.fallback - what the element draws when the value is unset
 * @param props.documentColors - colors the document uses
 * @param props.write - writes the line
 * @returns The paint field
 */
function ColorValue({
    name,
    value,
    fallback,
    documentColors,
    write,
}: Readonly<{
    name: string;
    value: ChannelValue | undefined;
    fallback: ChannelValue | undefined;
    documentColors: readonly string[];
    write: (next: { value: ChannelValue }) => void;
}>): React.JSX.Element {
    const chosen = colorOf(value);
    const color = chosen ?? colorOf(fallback) ?? { hex: "#000000", percent: 100 };
    return (
        <CompactColorInput
            label={name}
            width={PAINT_FIELD_WIDTH}
            // Unset (a glow's color), the field shows what the element draws, as not chosen.
            color={chosen?.hex}
            defaultColor={color.hex}
            opacity={color.percent}
            swatches={documentColors}
            showReset={false}
            onChangeEnd={(hex, percent) => {
                write({ value: `${hex ?? color.hex}${opacityToAlphaHex(percent ?? color.percent)}`.toUpperCase() });
            }}
        />
    );
}

/**
 * A shape line's value; clicking it opens the Shape popover: every shape the element draws, by
 * name, with a filter field.
 * @param props - Component props
 * @param props.descriptor - the shape property
 * @param props.value - the value
 * @param props.write - writes the line
 * @returns The value and its popover
 */
function ShapeValue({
    descriptor,
    value,
    write,
}: Readonly<{
    descriptor: ChannelDescriptor;
    value: ChannelValue | undefined;
    write: (next: { value: ChannelValue }) => void;
}>): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const current = typeof value === "string" ? value : "";
    return (
        <Popout opened={open} onOpenChange={setOpen}>
            <Popout.Trigger>
                {/* A boxed field, as the other values are. */}
                <Button
                    size="compact-xs"
                    variant="default"
                    fullWidth
                    justify="flex-start"
                    aria-label={`${channelWord(descriptor.channel)} ${enumWords(current)}`}
                >
                    {enumWords(current)}
                </Button>
            </Popout.Trigger>
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: channelWord(descriptor.channel) }}
            >
                <QuickActions
                    aria-label="Shapes"
                    placeholder="Filter shapes"
                    width={240}
                    height={320}
                    actions={(descriptor.values ?? []).map((v) => ({ value: v, label: enumWords(v) }))}
                    onRun={(next) => {
                        setOpen(false);
                        write({ value: next });
                    }}
                    onClose={() => {
                        setOpen(false);
                    }}
                />
            </Popout.Panel>
        </Popout>
    );
}

/** Props for CompoundSetLine. */
interface CompoundSetLineProps {
    /** The compound line. */
    compound: CompoundLine;
    /** The element's descriptors of its parts. */
    descriptors: readonly ChannelDescriptor[];
    /** The row's layers on this side, bottom first. */
    layers: readonly Layer[];
    /** The row's layers. */
    row: readonly LayerId[];
    /** The colors the document already uses, offered in the Color popover. */
    documentColors: readonly string[];
}

/**
 * A compound line: one effect that covers several channels (Glow, an arrow, Pattern). At rest it
 * shows a summary; tapping it opens a titled popover with the key options first and the rest
 * behind "More". "-" removes every part in one undo step.
 * @param props - Component props
 * @param props.compound - the compound line
 * @param props.descriptors - the descriptors of its parts
 * @param props.layers - the row's layers on this side
 * @param props.row - the row's layers
 * @param props.documentColors - colors the document uses
 * @returns The line, or nothing when the row sets none of its parts
 */
export function CompoundSetLine({
    compound,
    descriptors,
    layers,
    row,
    documentColors,
}: Readonly<CompoundSetLineProps>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [moreOpen, setMoreOpen] = useState(false);
    const parts = compound.parts.flatMap((part) => {
        const descriptor = descriptors.find((d) => d.channel === part.channel);
        return descriptor === undefined ? [] : [{ part, descriptor, line: lineOf(layers, part.channel) }];
    });
    const held = parts.find((p) => p.line !== undefined)?.line;
    if (session === null || held === undefined) {
        return null;
    }
    const { name } = compound;
    // The reader's layers that set a part; a part on the element's own locked layer stays.
    const holders = [
        ...new Set(parts.flatMap((p) => (p.line === undefined || p.line.layer.locked ? [] : [p.line.layer]))),
    ];
    const remove = (): void => {
        Promise.all(
            holders.map((layer) =>
                removeLine(
                    session,
                    layer,
                    ...parts.filter((p) => p.line?.layer === layer).map((p) => p.descriptor.channel),
                ),
            ),
        ).then(
            () => {
                store.set({
                    notice: {
                        message: `Removed ${name}`,
                        action: {
                            label: "Undo",
                            run: () => {
                                void session.undo();
                            },
                        },
                    },
                });
            },
            () => {
                store.set({ notice: { message: `${name} could not be changed` } });
            },
        );
    };

    // The summary at rest: a color as its swatch, a choice by name, a number as itself.
    const swatches: string[] = [];
    const words: string[] = [];
    for (const { part, descriptor, line } of parts.filter((p) => p.part.atRest === true)) {
        if (line?.binding !== undefined) {
            words.push(sourceName(session, line.binding) ?? line.binding.by);
            continue;
        }
        const value = line?.value ?? descriptor.default;
        if (value === undefined) {
            continue;
        }
        if (descriptor.accepts === "color") {
            const color = colorOf(value);
            if (color !== null) {
                swatches.push(color.hex);
            }
        } else if (descriptor.accepts === "enum") {
            words.push(typeof value === "string" ? enumWords(value) : part.word);
        } else if (typeof value === "number" || typeof value === "string") {
            words.push(String(value));
        } else {
            words.push(part.word);
        }
    }
    const summary = words.join(", ");
    const field = (p: (typeof parts)[number]): React.JSX.Element => (
        <Stack key={p.descriptor.channel} gap={0}>
            <SetLine
                descriptor={p.descriptor}
                // An unset part shows what the element draws for it, where the element says.
                line={p.line ?? { layer: held.layer, value: p.descriptor.default }}
                row={row}
                documentColors={documentColors}
                name={p.part.word}
                part
            />
            {p.part.caveat === true && p.descriptor.caveat !== undefined ? (
                <Text size="xs" c="dimmed" px={4}>
                    {p.descriptor.caveat}
                </Text>
            ) : null}
        </Stack>
    );
    const more = parts.filter((p) => p.part.more === true);

    return (
        <FieldRow
            data-line={compound.adds}
            trailing={
                holders.length === 0 ? null : (
                    <Tooltip label={`Remove ${name}`}>
                        <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${name}`} onClick={remove}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )
            }
        >
            <Text size="xs" truncate>
                {name}
            </Text>
            <Popout>
                <Popout.Trigger>
                    <Button
                        size="compact-xs"
                        variant="default"
                        fullWidth
                        justify="flex-start"
                        aria-label={`${name}: ${summary}`}
                        leftSection={
                            swatches.length === 0
                                ? undefined
                                : swatches.map((hex) => <ColorSwatch key={hex} color={hex} size={12} />)
                        }
                    >
                        {summary}
                    </Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title: name }}
                >
                    <Popout.Content>
                        <Stack gap={4}>
                            {parts.filter((p) => p.part.more !== true).map(field)}
                            {more.length > 0 ? (
                                <ControlSubGroup label="More" opened={moreOpen} onOpenChange={setMoreOpen}>
                                    {moreOpen ? <Stack gap={4}>{more.map(field)}</Stack> : null}
                                </ControlSubGroup>
                            ) : null}
                        </Stack>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </FieldRow>
    );
}
