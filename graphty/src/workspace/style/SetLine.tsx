import { ColorPickerPanel, ComboInput, QuickActions, VariablePill } from "@graphty/compact-mantine";
import { type ChannelDescriptor, toColorValue } from "@graphty/graphty-element/catalog";
import type { ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import { ActionIcon, Button, Checkbox, ColorSwatch, Group, Popover, Select, Text, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { Link2, Minus } from "lucide-react";
import React, { useState } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { BindingPopover } from "./BindingPopover";
import { FromDataList } from "./FromDataList";
import { type DataBinding, type DataChoice, type Line, propose, removeLine, sourceName, writeLine } from "./row";
import { bindLabel, bindsAtRest, enumWords } from "./words";

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
}

/**
 * The line's color as the Color popover edits it: `#RRGGBBAA`, and its opacity as a percent.
 * @param value - the value the layer holds.
 * @returns the hex and the percent, or null when it is not a color.
 */
function colorOf(value: ChannelValue | undefined): { hexa: string; hex: string; percent: number } | null {
    const color = typeof value === "string" || (typeof value === "object" && "r" in value) ? toColorValue(value) : null;
    if (color === null) {
        return null;
    }
    const hex = color.hex.slice(0, 7).toUpperCase();
    const alpha = Math.round(color.a * 255)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
    return { hexa: `${hex}${alpha}`, hex, percent: Math.round(color.a * 100) };
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
 * @returns The line
 */
export function SetLine({ descriptor, line, row, documentColors }: SetLineProps): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    const [binding, setBinding] = useState(false);
    if (session === null) {
        return null;
    }
    const { channel, shortName, target } = descriptor;
    const fail = (): void => {
        store.set({ notice: { message: `${shortName} could not be changed` } });
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
                    message: `Removed ${shortName}`,
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

    return (
        <Group gap={4} h={24} wrap="nowrap" data-line={channel}>
            <Text size="xs" w={88} truncate style={{ flexShrink: 0 }}>
                {shortName}
            </Text>
            <div style={{ flex: 1, minWidth: 0 }}>
                {line.binding === undefined ? (
                    <ValueEditor descriptor={descriptor} value={line.value} documentColors={documentColors} write={write} />
                ) : (
                    <BoundValue
                        descriptor={descriptor}
                        binding={line.binding}
                        write={write}
                        bind={bind}
                    />
                )}
            </div>
            {bindsAtRest(descriptor) && line.binding === undefined ? (
                <Popover opened={binding} onChange={setBinding} position="left-start" trapFocus>
                    <Popover.Target>
                        <Tooltip label={bindLabel(descriptor)}>
                            <ActionIcon
                                variant="subtle"
                                size="sm"
                                aria-label={bindLabel(descriptor)}
                                aria-pressed={false}
                                onClick={() => {
                                    setBinding(!binding);
                                }}
                            >
                                <Link2 size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    </Popover.Target>
                    <Popover.Dropdown p={0}>
                        <FromDataList
                            target={target}
                            channel={channel}
                            onPick={(choice) => {
                                setBinding(false);
                                bind(choice);
                            }}
                            onClose={() => {
                                setBinding(false);
                            }}
                        />
                    </Popover.Dropdown>
                </Popover>
            ) : null}
            {line.layer.locked ? null : (
                <Tooltip label={`Remove ${shortName}`}>
                    <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${shortName}`} onClick={remove}>
                        <Minus size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            )}
        </Group>
    );
}

/**
 * A bound value: what it reads and its range or palette, as a variable pill that opens the
 * Binding popover and detaches.
 * @param props - Component props
 * @param props.descriptor - the property
 * @param props.binding - the binding
 * @param props.write - writes the line
 * @param props.bind - binds the line to another attribute or result
 * @returns The pill and its popover
 */
function BoundValue({
    descriptor,
    binding,
    write,
    bind,
}: {
    descriptor: ChannelDescriptor;
    binding: DataBinding;
    write: (next: { value: ChannelValue } | { binding: DataBinding }) => void;
    bind: (choice: DataChoice) => void;
}): React.JSX.Element | null {
    const { session } = useWorkspace();
    const [open, setOpen] = useState(false);
    if (session === null) {
        return null;
    }
    const source = sourceName(session, binding);
    const palette =
        binding.palette === undefined ? undefined : session.catalog.palettes().find((p) => p.id === binding.palette);
    // Never empty, so two lines reading one source never share an accessible name.
    let detail = palette?.plainName ?? descriptor.shortName;
    if (source === null) {
        detail = "reads nothing";
    } else if (binding.range !== undefined) {
        detail = `${String(binding.range[0])} to ${String(binding.range[1])}`;
    }
    let swatch: string | undefined;
    if (descriptor.accepts === "color") {
        swatch =
            palette === undefined
                ? "var(--mantine-color-gray-5)"
                : `linear-gradient(to right, ${palette.colors.join(", ")})`;
    }
    const detach = (): void => {
        setOpen(false);
        write({ value: descriptor.default ?? (descriptor.accepts === "color" ? "#808080" : 1) });
    };

    return (
        <Popover opened={open} onChange={setOpen} position="left-start" trapFocus closeOnEscape>
            <Popover.Target>
                <div>
                    <VariablePill
                        name={source ?? binding.by}
                        value={detail}
                        swatch={swatch}
                        width="100%"
                        detachLabel={`Detach ${descriptor.shortName}`}
                        onDetach={detach}
                        onClick={() => {
                            setOpen(true);
                        }}
                    />
                </div>
            </Popover.Target>
            <Popover.Dropdown>
                <BindingPopover
                    descriptor={descriptor}
                    binding={binding}
                    source={source ?? binding.by}
                    onChange={(next) => {
                        write({ binding: next });
                    }}
                    onSource={bind}
                    onDetach={detach}
                    onClose={() => {
                        setOpen(false);
                    }}
                />
            </Popover.Dropdown>
        </Popover>
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
}: {
    descriptor: ChannelDescriptor;
    value: ChannelValue | undefined;
    documentColors: readonly string[];
    write: (next: { value: ChannelValue }) => void;
}): React.JSX.Element {
    const { shortName } = descriptor;
    switch (descriptor.accepts) {
        case "color":
            return <ColorValue name={shortName} value={value} documentColors={documentColors} write={write} />;
        case "enum":
            return descriptor.channel === "node.shape" ? (
                <ShapeValue descriptor={descriptor} value={value} write={write} />
            ) : (
                <Select
                    size="xs"
                    aria-label={shortName}
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
                    label={shortName}
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
                    aria-label={shortName}
                    checked={value === true}
                    onChange={(event) => {
                        write({ value: event.currentTarget.checked });
                    }}
                />
            );
        default:
            return (
                <TextInput
                    size="xs"
                    aria-label={shortName}
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
 * A color line's value: swatch, hex and opacity percent; clicking it opens the Color popover
 * (hex, opacity, the document's colors), which applies as the reader drags.
 * @param props - Component props
 * @param props.name - the property's name
 * @param props.value - the value
 * @param props.documentColors - colors the document uses
 * @param props.write - writes the line
 * @returns The value and its popover
 */
function ColorValue({
    name,
    value,
    documentColors,
    write,
}: {
    name: string;
    value: ChannelValue | undefined;
    documentColors: readonly string[];
    write: (next: { value: ChannelValue }) => void;
}): React.JSX.Element {
    const color = colorOf(value) ?? { hexa: "#000000FF", hex: "#000000", percent: 100 };
    const [draft, setDraft] = useState<string | null>(null);
    // ponytail: one write per pause while dragging, so a drag is a few undo steps, not hundreds.
    const commit = useDebouncedCallback((hexa: string) => {
        write({ value: hexa });
    }, 150);
    return (
        <Popover position="left-start" trapFocus onClose={() => { setDraft(null); }}>
            <Popover.Target>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    color="dark"
                    aria-label={`${name} ${color.hex} ${String(color.percent)}%`}
                    leftSection={<ColorSwatch color={color.hexa} size={12} />}
                >
                    {color.hex} {color.percent}%
                </Button>
            </Popover.Target>
            <Popover.Dropdown>
                <ColorPickerPanel
                    value={draft ?? color.hexa}
                    swatches={documentColors}
                    onChange={(hexa) => {
                        setDraft(hexa);
                        commit(hexa);
                    }}
                />
            </Popover.Dropdown>
        </Popover>
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
}: {
    descriptor: ChannelDescriptor;
    value: ChannelValue | undefined;
    write: (next: { value: ChannelValue }) => void;
}): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const current = typeof value === "string" ? value : "";
    return (
        <Popover opened={open} onChange={setOpen} position="left-start" trapFocus>
            <Popover.Target>
                <Button
                    size="compact-xs"
                    variant="subtle"
                    color="dark"
                    aria-label={`${descriptor.shortName} ${enumWords(current)}`}
                    onClick={() => {
                        setOpen(!open);
                    }}
                >
                    {enumWords(current)}
                </Button>
            </Popover.Target>
            <Popover.Dropdown p={0}>
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
            </Popover.Dropdown>
        </Popover>
    );
}
