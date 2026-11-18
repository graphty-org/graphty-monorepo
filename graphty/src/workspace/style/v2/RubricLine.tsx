/**
 * One line of Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.2, 2.5, 2.6 and 6):
 * a name, the control its rubric rule picks, a modifier slot and a minus. Unset, the control is
 * drawn empty with no minus; writing a value sets it and shows the minus, which unsets it. A
 * value bound to data, a list, an asset or a text source keeps today's field.
 */

import { ComboInput, PanelField, SegmentedControl, ToggleIconButton } from "@graphty/compact-mantine";
import type { Channel, ChannelDescriptor, ChannelValue } from "@graphty/graphty-element/catalog";
import { ActionIcon, Checkbox, Group, Tooltip, VisuallyHidden } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { ValueListbox } from "../parts/ValueListbox";
import { Field, FieldLine, type RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { ValueField } from "../ValueField";
import { channelWord, failureWords, fieldName, FONTS, isPercent } from "../words";
import { moveUnit, ruleOf, unsetIn } from "./lineWrites";
import { isPictured, type LineSpec, type Rule, segmentOptions } from "./rubric";
import { setOn } from "./things";
import { sectionsOf } from "./valueSections";

/** What a thing row puts in a line drawn as its row: its settings button and its whole-thing minus. */
export interface RowSlots {
    readonly slot: React.ReactNode;
    readonly removeLabel: string;
    readonly onRemove: () => void;
}

/**
 * A number field as the rubric draws one (R5): no caret, empty when unset; clearing it unsets.
 * @param props - Component props
 * @param props.descriptor - its channel, or a label style field described as one
 * @param props.label - its accessible name, when not its channel's
 * @param props.percent - reads and types as a percent, when not its channel's say
 * @param props.value - the value set, if any
 * @param props.glyph - its in-field glyph or letter
 * @param props.onWrite - writes a number, or undefined to unset
 * @returns The field
 */
export function NumberLine({
    descriptor,
    label,
    percent,
    value,
    glyph,
    onWrite,
}: Readonly<{
    descriptor: ChannelDescriptor;
    label?: string;
    percent?: boolean;
    value: unknown;
    glyph?: React.ReactNode;
    onWrite: (value: number | undefined) => void;
}>): React.JSX.Element {
    const scale = (percent ?? isPercent(descriptor)) ? 100 : 1;
    const { min, max } = descriptor;
    return (
        <ComboInput
            label={label ?? fieldName(descriptor.channel)}
            width="100%"
            numeric
            options={[]}
            glyph={glyph}
            value={typeof value === "number" ? Math.round(value * scale * 100) / 100 : ""}
            suffix={scale === 100 ? "%" : undefined}
            min={min === undefined ? undefined : min * scale}
            max={max === undefined ? undefined : max * scale}
            step={descriptor.step ?? (scale === 1 && max !== undefined && max <= 1 ? 0.1 : 1)}
            onChange={(next) => {
                if (typeof next === "number") {
                    onWrite(next / scale);
                } else if (next === "") {
                    onWrite(undefined);
                }
            }}
        />
    );
}

/**
 * A number with named presets (R5b): the element's values as the field's options, or a number.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - its channel
 * @param props.label - its accessible name, when not its channel's
 * @param props.presets - its presets, when not the element's values for its channel
 * @param props.value - the value set, if any
 * @param props.onWrite - writes a value
 * @returns The field
 */
export function PresetLine({
    ctx,
    descriptor,
    label,
    presets,
    value,
    onWrite,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    label?: string;
    presets?: readonly { readonly id: string; readonly plainName: string }[];
    value: unknown;
    onWrite: (value: ChannelValue) => void;
}>): React.JSX.Element {
    const values = presets ?? ctx.session.catalog.channelValues(descriptor.channel);
    const named = values.find((each) => each.id === value)?.plainName;
    return (
        <ComboInput
            label={label ?? fieldName(descriptor.channel)}
            width="100%"
            options={values.map((each) => ({ value: each.id, label: each.plainName }))}
            value={named ?? (typeof value === "number" ? value : "")}
            onChange={(next) => {
                const preset = values.find((each) => each.id === next || each.plainName === next);
                if (preset !== undefined) {
                    onWrite(preset.id);
                } else if (typeof next === "number" || (next !== "" && Number.isFinite(Number(next)))) {
                    onWrite(Number(next));
                }
            }}
        />
    );
}

/**
 * Segments (R8): icons when every option is pictured, else words; nothing selected while unset.
 * @param props - Component props
 * @param props.label - the line's accessible name
 * @param props.options - its options
 * @param props.value - the option set, if any
 * @param props.onPick - writes an option
 * @returns The control
 */
export function SegmentsLine({
    label,
    options,
    value,
    onPick,
}: Readonly<{
    label: string;
    options: readonly {
        readonly value: string;
        readonly name: string;
        readonly glyph?: keyof typeof GLYPHS;
        readonly disabled?: boolean;
    }[];
    value: string;
    onPick: (value: string) => void;
}>): React.JSX.Element {
    const pictured = isPictured(options);
    return (
        <SegmentedControl
            label={label}
            fullWidth
            size="xs"
            value={value}
            onChange={onPick}
            data={options.map((option) => {
                const Glyph = option.glyph === undefined ? undefined : GLYPHS[option.glyph];
                return {
                    value: option.value,
                    disabled: option.disabled,
                    label:
                        pictured && Glyph !== undefined ? (
                            <Tooltip label={option.name}>
                                <span style={{ display: "inline-flex" }}>
                                    <Glyph size={14} aria-hidden />
                                    <VisuallyHidden>{option.name}</VisuallyHidden>
                                </span>
                            </Tooltip>
                        ) : (
                            option.name
                        ),
                };
            })}
        />
    );
}

/** What every control of a line needs. */
interface ControlArgs {
    readonly ctx: RowContext;
    readonly line: LineSpec;
    readonly descriptor: ChannelDescriptor;
    readonly value: ChannelValue | undefined;
    readonly set: boolean;
    readonly label: string;
    readonly write: (to: Channel, value: ChannelValue | undefined) => void;
    readonly fail: (error: unknown) => void;
}

/**
 * A Unit line (R8): which unit's channel holds the value; picking one moves it there.
 * @param args - the line.
 * @returns The control
 */
function unitControl(args: ControlArgs): React.ReactNode {
    const { ctx, line, descriptor, label, fail } = args;
    const units = (line.unit ?? []).map(([, c]) => c);
    return (
        <SegmentsLine
            label={`${label} unit`}
            options={segmentOptions(line, []) ?? []}
            value={units.find((c) => setOn(ctx, c)) ?? ""}
            onPick={(to) => {
                const start = ctx.session.styles.defaultValue(to as Channel) ?? descriptor.default;
                moveUnit(ctx, to as Channel, units, start).catch(fail);
            }}
        />
    );
}

/**
 * Segments (R8, R8f) of an enum's or a boolean's options.
 * @param args - the line.
 * @returns The control
 */
function segmentsControl(args: ControlArgs): React.ReactNode {
    const { line, descriptor, value, label, write } = args;
    const boolean = descriptor.accepts === "boolean";
    const values = boolean ? ["true", "false"] : (descriptor.values ?? []);
    return (
        <SegmentsLine
            label={label}
            options={segmentOptions(line, values) ?? []}
            value={typeof value === "string" || typeof value === "boolean" ? String(value) : ""}
            onPick={(picked) => {
                write(descriptor.channel, boolean ? picked === "true" : picked);
            }}
        />
    );
}

/**
 * A checkbox with its name (R7).
 * @param args - the line.
 * @returns The control
 */
function checkboxControl(args: ControlArgs): React.ReactNode {
    const { line, descriptor, value, write } = args;
    return (
        <Checkbox
            size="xs"
            label={line.name ?? channelWord(descriptor.channel)}
            checked={value === true}
            onChange={(event) => {
                write(descriptor.channel, event.currentTarget.checked);
            }}
        />
    );
}

/**
 * A number (R5), or two related numbers as a pair with their letters.
 * @param args - the line.
 * @returns The control
 */
function numberControl(args: ControlArgs): React.ReactNode {
    const { ctx, line, descriptor, value, set, write } = args;
    const { channel } = descriptor;
    if (line.pair === undefined) {
        const Glyph = line.glyph === undefined ? undefined : GLYPHS[line.glyph];
        return (
            <NumberLine
                descriptor={descriptor}
                value={value}
                glyph={Glyph === undefined ? undefined : <Glyph size={12} aria-hidden />}
                onWrite={(next) => {
                    write(channel, next);
                }}
            />
        );
    }
    const second = shownChannel(ctx.session, ctx.side, line.pair, set);
    const [a, b] = line.letters ?? ["", ""];
    return (
        <Group grow gap={4} wrap="nowrap">
            <NumberLine
                descriptor={descriptor}
                value={value}
                glyph={a === "" ? undefined : a}
                onWrite={(next) => {
                    write(channel, next);
                }}
            />
            {second === undefined ? null : (
                <NumberLine
                    descriptor={second}
                    value={lineIn(ctx, second.channel)?.value}
                    glyph={b === "" ? undefined : b}
                    onWrite={(next) => {
                        write(second.channel, next);
                    }}
                />
            )}
        </Group>
    );
}

/**
 * A number with named presets (R5b).
 * @param args - the line.
 * @returns The control
 */
function presetControl(args: ControlArgs): React.ReactNode {
    const { ctx, descriptor, value, write } = args;
    return (
        <PresetLine
            ctx={ctx}
            descriptor={descriptor}
            value={value}
            onWrite={(next) => {
                write(descriptor.channel, next);
            }}
        />
    );
}

/**
 * Today's list of pictured values (R10), one section at a time for a long list.
 * @param args - the line.
 * @returns The control
 */
function listControl(args: ControlArgs): React.ReactNode {
    const { ctx, descriptor, value, label, write } = args;
    return (
        <ValueListbox
            session={ctx.session}
            descriptor={descriptor}
            label={label}
            value={value}
            shown={undefined}
            sections={sectionsOf(descriptor.channel)}
            onPick={(picked) => {
                write(descriptor.channel, picked);
            }}
        />
    );
}

/**
 * Today's color (R1) and select (R9) fields, empty while unset.
 * @param args - the line.
 * @returns The control
 */
function valueControl(args: ControlArgs): React.ReactNode {
    const { ctx, descriptor, value, set, label, write } = args;
    return (
        <ValueField
            descriptor={descriptor}
            label={label}
            value={value}
            shown={undefined}
            waiting={!set}
            swatches={ctx.documentColors}
            onChange={(next) => {
                write(descriptor.channel, next);
            }}
        />
    );
}

/**
 * A font (R13): today's font list, and the font the layer holds when it is not on the list.
 * @param props - Component props
 * @param props.label - its accessible name
 * @param props.value - the font set, if any
 * @param props.onPick - writes a font
 * @returns The select
 */
export function FontSelect({
    label,
    value,
    onPick,
}: Readonly<{ label: string; value: unknown; onPick: (font: string) => void }>): React.JSX.Element {
    const held = typeof value === "string" && value !== "" ? value : undefined;
    const fonts: readonly (readonly [string, string])[] = FONTS;
    const listed = held === undefined || fonts.some(([font]) => font === held) ? fonts : [...fonts, [held, held]];
    return (
        <PanelField
            label={label}
            kind="select"
            width="fill"
            data={listed.map(([font, word]) => ({ value: font, label: word }))}
            value={held ?? null}
            onChange={(next) => {
                onPick(String(next));
            }}
        />
    );
}

/**
 * A font (R13).
 * @param args - the line.
 * @returns The control
 */
function fontControl(args: ControlArgs): React.ReactNode {
    const { descriptor, value, label, write } = args;
    return (
        <FontSelect
            label={label}
            value={value}
            onPick={(font) => {
                write(descriptor.channel, font);
            }}
        />
    );
}

/** Each rule's control. */
const CONTROLS: Readonly<Record<Exclude<Rule, "field">, (args: ControlArgs) => React.ReactNode>> = {
    R1: valueControl,
    R5: numberControl,
    R5b: presetControl,
    R7: checkboxControl,
    R8: segmentsControl,
    R8f: segmentsControl,
    R9: valueControl,
    R10: listControl,
    R13: fontControl,
    // Free text (R14): today's text field, which commits on Enter or blur.
    R14: valueControl,
};

/**
 * A line's modifier slot: a thing row's settings, else its toggle (R6).
 * @param ctx - the row.
 * @param line - the line.
 * @param write - writes the toggle.
 * @returns The slot's contents
 */
function modifierOf(
    ctx: RowContext,
    line: LineSpec,
    write: (to: Channel, value: ChannelValue | undefined) => void,
): React.ReactNode {
    const toggle = line.toggle === undefined ? undefined : shownChannel(ctx.session, ctx.side, line.toggle, false);
    const Glyph = GLYPHS[line.toggleGlyph ?? "lock"];
    return toggle === undefined ? null : (
        <ToggleIconButton
            size="sm"
            label={channelWord(toggle.channel)}
            icon={<Glyph size={14} aria-hidden />}
            checked={lineIn(ctx, toggle.channel)?.value === true}
            onChange={(on) => {
                write(toggle.channel, on);
            }}
        />
    );
}

/** Props for RubricLine. */
interface RubricLineProps {
    readonly ctx: RowContext;
    readonly line: LineSpec;
    /** Drawn as a thing's row: its settings button and minus in place of the line's. */
    readonly row?: RowSlots;
}

/**
 * One line: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.line - the line
 * @param props.row - drawn as a thing's row
 * @returns The line, or nothing where the element offers none of its channels
 */
export function RubricLine({ ctx, line, row }: RubricLineProps): React.JSX.Element | null {
    const { store } = useWorkspace();
    const { session, side } = ctx;
    // A line standing for several units edits whichever the row sets.
    const channel = [line.channel, ...(line.units ?? [])].find((c) => setOn(ctx, c)) ?? line.channel;
    const own = lineIn(ctx, channel);
    const set = setOn(ctx, channel) || (line.pair !== undefined && setOn(ctx, line.pair));
    const descriptor = shownChannel(session, side, channel, set);
    if (descriptor?.renderable !== true) {
        return null;
    }
    const rule = ruleOf(line, descriptor);
    if (rule === "field" || own?.binding !== undefined || own?.template !== undefined) {
        // Today's field: a list, an asset, a text source, or a value varying by data.
        return (
            <Field
                ctx={ctx}
                descriptor={descriptor}
                pending={!set}
                thing={row === undefined ? undefined : { name: line.name ?? null, ...row }}
            />
        );
    }
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(channelWord(channel), "changed", error), error: true } });
    };
    const write = (to: Channel, value: ChannelValue | undefined): void => {
        const done = value === undefined ? unsetIn(ctx, [to]) : writeIn(ctx, to, { value });
        done.catch(fail);
    };
    const args: ControlArgs = { ctx, line, descriptor, value: own?.value, set, label: fieldName(channel), write, fail };
    const control = line.unit === undefined ? CONTROLS[rule](args) : unitControl(args);
    const channels = [channel, ...(line.pair === undefined ? [] : [line.pair])];
    const removeName = row?.removeLabel ?? `Remove ${(line.name ?? channelWord(channel)).toLowerCase()}`;
    const named = rule !== "R7" && rule !== "R8f" && line.name !== null;
    const onRemove =
        row?.onRemove ??
        ((): void => {
            unsetIn(ctx, channels).catch(fail);
        });
    return (
        <LineFrame
            line={channel}
            name={named ? (line.name ?? channelWord(channel)) : null}
            set={set}
            rule={rule}
            control={control}
            modifier={row?.slot ?? modifierOf(ctx, line, write)}
            removeName={set || row !== undefined ? removeName : undefined}
            onRemove={onRemove}
        />
    );
}

/**
 * A minus with its tooltip.
 * @param props - Component props
 * @param props.label - its name ("Remove width")
 * @param props.onClick - what it removes
 * @returns The button
 */
export function RemoveButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>): React.JSX.Element {
    return (
        <Tooltip label={label}>
            <ActionIcon variant="subtle" size="sm" aria-label={label} onClick={onClick}>
                <GLYPHS.remove size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );
}

/**
 * One line's frame (design 2.2): its name, its control, its modifier slot and its minus.
 * @param props - Component props
 * @param props.line - what the line edits, for `data-line`
 * @param props.name - its name, or null for none
 * @param props.set - whether the layer sets it
 * @param props.rule - its rubric rule
 * @param props.control - its control
 * @param props.modifier - its modifier slot's contents
 * @param props.removeName - its minus's name; none draws no minus
 * @param props.onRemove - what its minus does
 * @returns The line
 */
export function LineFrame({
    line,
    name,
    set,
    rule,
    control,
    modifier,
    removeName,
    onRemove,
}: Readonly<{
    line: string;
    name: string | null;
    set: boolean;
    rule: string;
    control: React.ReactNode;
    modifier: React.ReactNode;
    removeName: string | undefined;
    onRemove: () => void;
}>): React.JSX.Element {
    return (
        <div className="ws-row" data-line={line} data-set={set ? "" : undefined} data-rule={rule}>
            <FieldLine name={name} settings={null}>
                <div className="ws-field-control">{control}</div>
                <span className="ws-slot ws-vary">{modifier}</span>
                <span className="ws-slot">
                    {removeName === undefined ? null : <RemoveButton label={removeName} onClick={onRemove} />}
                </span>
            </FieldLine>
        </div>
    );
}
