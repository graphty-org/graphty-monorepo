/**
 * One line of Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.2, 2.5, 2.6 and 6):
 * a name, the control its rubric rule picks, a modifier slot and a minus. Unset, the control is
 * drawn empty with no minus; writing a value sets it and shows the minus, which unsets it. A
 * value bound to data, a list, an asset or a text source keeps today's field.
 */

import { ComboInput, PanelField, SegmentedControl, ToggleIconButton } from "@graphty/compact-mantine";
import {
    type Channel,
    type ChannelDescriptor,
    type ChannelValue,
    readChannelItems,
    writeChannelItems,
} from "@graphty/graphty-element/catalog";
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
import { ItemListEditor, PointPair } from "./ItemList";
import { moveUnit, ruleOf, unsetIn } from "./lineWrites";
import { coordinateDescriptor, ITEM_LISTS } from "./lists";
import { isPictured, type LineSpec, type Rule, segmentOptions, VALUE_GLYPHS } from "./rubric";
import { setOn } from "./things";
import { sectionsOf } from "./valueSections";

/** What a thing row puts in a line drawn as its row: its settings button and its whole-thing minus. */
export interface RowSlots {
    readonly slot: React.ReactNode;
    readonly removeLabel: string;
    readonly onRemove: () => void;
    /** Opens the thing's settings pop-over (a list thing's swatch strip). */
    readonly onOpen?: () => void;
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
    // Emptied and Enter unsets the line (design 2.2): the number field commits no empty text itself.
    const onEmptyEnter = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const input = event.target;
        if (event.key === "Enter" && input instanceof HTMLInputElement && input.value.trim() === "") {
            onWrite(undefined);
        }
    };
    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- only hears Enter bubbling from its own field
        <div style={{ display: "contents" }} onKeyDown={onEmptyEnter}>
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
        </div>
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
    const named = values.find((each) => each.id === String(value))?.plainName;
    // A number's presets (a glyph's weight, 400 or 700) write the number they name.
    const numeric = descriptor.accepts === "number";
    return (
        <ComboInput
            label={label ?? fieldName(descriptor.channel)}
            width="100%"
            options={values.map((each) => ({ value: each.id, label: each.plainName }))}
            value={named ?? (typeof value === "number" ? value : "")}
            onChange={(next) => {
                const preset = values.find((each) => each.id === next || each.plainName === next);
                if (preset !== undefined) {
                    onWrite(numeric && Number.isFinite(Number(preset.id)) ? Number(preset.id) : preset.id);
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
    const { ctx, line, descriptor, value, write } = args;
    return (
        <PresetLine
            ctx={ctx}
            descriptor={descriptor}
            presets={line.presets}
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
    const glyphs = VALUE_GLYPHS[descriptor.channel];
    const icons =
        glyphs === undefined
            ? undefined
            : Object.fromEntries(
                  Object.entries(glyphs).map(([id, glyph]) => {
                      const Glyph = GLYPHS[glyph];
                      return [id, <Glyph key={id} size={14} aria-hidden />];
                  }),
              );
    return (
        <ValueListbox
            session={ctx.session}
            descriptor={descriptor}
            label={label}
            value={value}
            shown={undefined}
            sections={sectionsOf(descriptor.channel)}
            counts={false}
            icons={icons}
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

/**
 * A point held as one `x,y` text (a port): an X | Y pair; emptying both unsets it.
 * @param args - the line.
 * @returns The control
 */
function pointControl(args: ControlArgs): React.ReactNode {
    const { descriptor, value, label, write } = args;
    const port = descriptor.channel as "edge.sourcePort" | "edge.targetPort";
    return (
        <PointPair
            descriptor={coordinateDescriptor(descriptor)}
            label={label}
            point={readChannelItems(port, value)[0]}
            onWrite={(point) => {
                write(descriptor.channel, point === undefined ? undefined : writeChannelItems(port, [point]));
            }}
        />
    );
}

/** A frame's four sides, in the element's order, with their glyphs (R17). */
const SIDES = [
    ["Top", "arrowUpToLine"],
    ["Right", "arrowRightToLine"],
    ["Bottom", "arrowDownToLine"],
    ["Left", "arrowLeftToLine"],
] as const;

/**
 * A set of sides (R17, `node.stripeFrame`: four fractions "top right bottom left"): top | right,
 * then bottom | left, each field with its side's glyph. Emptying all four unsets it.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.line - the line
 * @param props.descriptor - its channel
 * @param props.set - whether the layer sets it
 * @param props.write - writes the sides' text, or undefined to unset
 * @returns The two lines
 */
function SidesLines({
    ctx,
    line,
    descriptor,
    set,
    write,
}: Readonly<{
    ctx: RowContext;
    line: LineSpec;
    descriptor: ChannelDescriptor;
    set: boolean;
    write: (text: string | undefined) => void;
}>): React.JSX.Element {
    const raw = lineIn(ctx, descriptor.channel)?.value;
    const sides = typeof raw === "string" ? raw.trim().split(/\s+/) : [];
    const number = { ...descriptor, accepts: "number" as const, min: 0, max: 1, step: 0.05 };
    const field = (at: number): React.JSX.Element => {
        const [side, glyph] = SIDES[at];
        const Glyph = GLYPHS[glyph];
        const now = Number(sides[at]);
        return (
            <NumberLine
                key={side}
                descriptor={number}
                label={`${line.name ?? channelWord(descriptor.channel)} ${side.toLowerCase()}`}
                percent={false}
                value={sides[at] === undefined || !Number.isFinite(now) ? undefined : now}
                glyph={<Glyph size={12} aria-hidden />}
                onWrite={(next) => {
                    const typed = next === undefined ? "" : String(next);
                    const all = SIDES.map((_, i) => (i === at ? typed : (sides[i] ?? "")));
                    write(
                        all.every((each) => each === "")
                            ? undefined
                            : all.map((each) => (each === "" ? "0" : each)).join(" "),
                    );
                }}
            />
        );
    };
    const pair = (a: number, b: number): React.ReactNode => (
        <Group grow gap={4} wrap="nowrap">
            {field(a)}
            {field(b)}
        </Group>
    );
    const name = line.name ?? channelWord(descriptor.channel);
    return (
        <>
            <LineFrame
                line={descriptor.channel}
                name={name}
                set={set}
                rule="R17"
                control={pair(0, 1)}
                modifier={null}
                removeName={set ? `Remove ${name.toLowerCase()}` : undefined}
                onRemove={() => {
                    write(undefined);
                }}
            />
            <LineFrame
                line={`${descriptor.channel}:bottom`}
                name={null}
                set={set}
                rule="R17"
                control={pair(2, 3)}
                modifier={null}
                removeName={undefined}
                onRemove={() => undefined}
            />
        </>
    );
}

/** Each rule's control. */
const CONTROLS: Readonly<Record<Exclude<Rule, "field" | "R15" | "R17">, (args: ControlArgs) => React.ReactNode>> = {
    R1: valueControl,
    // A location (R2) is a label style field's only: never a channel's line.
    R2: valueControl,
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
    XY: pointControl,
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

/**
 * Whether graphty-element draws a channel with what the row holds now (`appliesWhen`): a gradient's
 * direction only on a linear one, a dash's length only on a dashed or dotted line. An unset line
 * that does nothing is not offered; a set one stays, so it can be taken off.
 * @param ctx - the row.
 * @param descriptor - the channel.
 * @returns true when it is drawn.
 */
function applies(ctx: RowContext, descriptor: ChannelDescriptor): boolean {
    const when = descriptor.appliesWhen;
    if (when === undefined) {
        return true;
    }
    const now = lineIn(ctx, when.channel)?.value ?? ctx.session.styles.defaultValue(when.channel);
    return typeof now === "string" && when.values.includes(now);
}

/**
 * A line drawn by another editor: a structured list (R15), or today's field for a list, an asset, a
 * text source, a value varying by data, or several layers each holding their own value (the
 * "Layer" palette, design 10.4).
 * @param ctx - the row.
 * @param line - the line.
 * @param row - drawn as a thing's row.
 * @param descriptor - its channel.
 * @param rule - its rule.
 * @param set - whether the layer sets it.
 * @returns the line, or undefined when the rubric's own control draws it.
 */
function keptField(
    ctx: RowContext,
    line: LineSpec,
    row: RowSlots | undefined,
    descriptor: ChannelDescriptor,
    rule: Rule,
    set: boolean,
): React.JSX.Element | undefined {
    const { channel } = descriptor;
    const own = lineIn(ctx, channel);
    const spread = set && ctx.many?.plain?.(channel) !== undefined;
    const bound = own?.binding !== undefined || own?.template !== undefined;
    const list = ITEM_LISTS[channel];
    if (rule === "R15" && list !== undefined && !bound && !spread) {
        return <ItemListEditor ctx={ctx} channel={channel} list={list} legend="line" />;
    }
    if (rule !== "field" && rule !== "R15" && !bound && !spread) {
        return undefined;
    }
    return (
        <Field
            ctx={ctx}
            descriptor={descriptor}
            word={row === undefined ? (line.name ?? undefined) : undefined}
            pending={!set}
            unsetLine={!set && row === undefined}
            thing={row === undefined ? undefined : { name: line.name ?? null, ...row }}
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
    if (descriptor?.renderable !== true || (!set && !applies(ctx, descriptor))) {
        return null;
    }
    const rule = ruleOf(line, descriptor);
    const kept = keptField(ctx, line, row, descriptor, rule, set);
    if (kept !== undefined || rule === "field" || rule === "R15") {
        return kept ?? null;
    }
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(channelWord(channel), "changed", error), error: true } });
    };
    const write = (to: Channel, value: ChannelValue | undefined): void => {
        const done = value === undefined ? unsetIn(ctx, [to]) : writeIn(ctx, to, { value });
        done.catch(fail);
    };
    if (rule === "R17") {
        return (
            <SidesLines
                ctx={ctx}
                line={line}
                descriptor={descriptor}
                set={set}
                write={(text) => {
                    write(channel, text);
                }}
            />
        );
    }
    const args: ControlArgs = { ctx, line, descriptor, value: own?.value, set, label: fieldName(channel), write, fail };
    const control = line.unit === undefined ? CONTROLS[rule](args) : unitControl(args);
    const channels = [channel, ...(line.pair === undefined ? [] : [line.pair])];
    // A pair's minus names both its channels, so it is told from its sub-group's ("Remove width and height").
    const removeWords =
        line.pair === undefined
            ? (line.name ?? channelWord(channel))
            : `${channelWord(channel)} and ${channelWord(line.pair)}`;
    const removeName = row?.removeLabel ?? `Remove ${removeWords.toLowerCase()}`;
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
