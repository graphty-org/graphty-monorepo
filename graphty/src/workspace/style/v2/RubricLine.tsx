/**
 * One line of Style panel v2 (design/ui/style-panel-v2/design.md, sections 2.2, 2.5, 2.6 and 6):
 * a name, the control its rubric rule picks, a modifier slot and a minus. Unset, the control shows the
 * value drawn (design "Input rules") with no minus; writing a value sets it and shows the minus, which unsets it. A
 * value bound to data, a list, an asset or a text source keeps today's field.
 */

import { ComboInput, PanelField, SegmentedControl, Slider, ToggleIconButton } from "@graphty/compact-mantine";
import {
    type Channel,
    type ChannelDescriptor,
    type ChannelValue,
    listItemAddress,
    readChannelItems,
    readChannelList,
    writeChannelItems,
    writeChannelList,
} from "@graphty/graphty-element/catalog";
import { ActionIcon, Checkbox, Group, Tooltip, VisuallyHidden } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import { ValueListbox } from "../parts/ValueListbox";
import { PictureLine } from "../PicturePopover";
import { Field, FieldLine, type RowContext, VarySlot, type VaryTarget } from "../PropertyRow";
import { lineIn, needsFor, writeIn } from "../row";
import { ValueField } from "../ValueField";
import { channelWord, failureWords, fieldName, FONTS, isPercent, scrubLetter, takesBinding } from "../words";
import { dimOf, drawnValue, valueDimOf } from "./drawn";
import { PointPair } from "./ItemFields";
import { ItemListEditor } from "./ItemListEditor";
import { moveUnit, rangeOf, ruleOf, unsetIn } from "./lineWrites";
import { coordinateDescriptor, ITEM_LISTS } from "./lists";
import {
    isPictured,
    lineChannels,
    type LineSpec,
    OPTION_NAMES,
    type Rule,
    segmentOptions,
    VALUE_GLYPHS,
} from "./rubric";
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

/** What an unset number shows where graphty-element names no one value: it picks one for each element. */
const AUTO = "Auto";

/**
 * A number field as the rubric draws one (R5), Figma's number input (design/ui/figma, "Scrubbable number
 * input"): its slot at the left -- a letter, as Figma's "W" and "X", never an icon (E674: no line carries a glyph
 * the others lack) -- is the scrub handle, the arrow
 * keys step by 1 and Shift by 10, typing applies on Enter, Tab or blur; no caret, no stepper buttons; unset, it
 * shows the value drawn, or "Auto" where graphty-element picks one for each element (design "Input rules": no
 * input is empty); clearing it unsets.
 * @param props - Component props
 * @param props.descriptor - its channel, or a label style field described as one
 * @param props.label - its accessible name, when not its channel's
 * @param props.percent - reads and types as a percent, when not its channel's say
 * @param props.value - the value set, if any
 * @param props.letter - its slot's letter (a pair's "X" or "W"), else its name's initial
 * @param props.slider - whether a percent draws its slider (false where several share a line, a list item's)
 * @param props.onWrite - writes a number, or undefined to unset
 * @returns The field
 */
export function NumberLine({
    descriptor,
    label,
    percent,
    value,
    letter,
    slider = true,
    onWrite,
}: Readonly<{
    descriptor: ChannelDescriptor;
    label?: string;
    percent?: boolean;
    value: unknown;
    letter?: string;
    slider?: boolean;
    onWrite: (value: number | undefined) => void;
}>): React.JSX.Element {
    const scale = (percent ?? isPercent(descriptor)) ? 100 : 1;
    const { min, max } = descriptor;
    const name = label ?? fieldName(descriptor.channel);
    // Emptied and Enter unsets the line (design 2.2): the number field commits no empty text itself.
    const onEmptyEnter = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const input = event.target;
        if (event.key === "Enter" && input instanceof HTMLInputElement && input.value.trim() === "") {
            onWrite(undefined);
        }
    };
    const field = (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- only hears Enter bubbling from its own field
        <div style={{ display: "contents" }} onKeyDown={onEmptyEnter}>
            <ComboInput
                label={name}
                width="100%"
                numeric
                options={[]}
                glyph={letter ?? scrubLetter(name)}
                value={typeof value === "number" ? Math.round(value * scale * 100) / 100 : AUTO}
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
    // A percent has a fixed range: a slider (owner's input rules: a range of inputs is a slider), its number
    // field beside it, so its value is read and typed.
    if (!slider || !rangeOf(descriptor, percent)) {
        return field;
    }
    return (
        <Group gap={4} wrap="nowrap" className="ws-percent">
            <PercentSlider label={name} value={value} min={min ?? 0} max={max ?? 1} onWrite={onWrite} />
            <div style={{ flex: "0 0 64px", minWidth: 0 }}>{field}</div>
        </Group>
    );
}

/**
 * Whether a line draws its name above and its control across the line: two inputs (a pair not joined as one
 * number), or a slider with its number.
 * @param line - the line.
 * @param descriptor - its channel.
 * @param split - whether its sides are split.
 * @returns whether it does.
 */
function wideLine(line: LineSpec, descriptor: ChannelDescriptor, split: boolean): boolean {
    return (line.pair !== undefined && (line.sides !== true || split)) || rangeOf(descriptor);
}

/**
 * A percent as compact-mantine's Slider, the arrow keys stepping 1%. It writes once a drag or a key ends, one undo
 * step each.
 * @param props - Component props
 * @param props.label - its accessible name
 * @param props.value - the value shown (set, or drawn), a fraction
 * @param props.min - its least fraction
 * @param props.max - its greatest fraction
 * @param props.onWrite - writes a fraction
 * @returns The slider
 */
function PercentSlider({
    label,
    value,
    min,
    max,
    onWrite,
}: Readonly<{
    label: string;
    value: unknown;
    min: number;
    max: number;
    onWrite: (value: number) => void;
}>): React.JSX.Element {
    const given = typeof value === "number" ? Math.round(value * 100) : max * 100;
    // The thumb follows a drag before it is written.
    const [moving, setMoving] = React.useState<number | null>(null);
    const shown = moving ?? given;
    return (
        <Slider
            size="xs"
            style={{ flex: 1, minWidth: 0 }}
            min={min * 100}
            max={max * 100}
            step={1}
            value={shown}
            label={null}
            thumbLabel={label}
            thumbProps={{ "aria-valuetext": `${String(shown)}%` }}
            onChange={setMoving}
            onChangeEnd={(next) => {
                setMoving(null);
                if (next !== given) {
                    onWrite(next / 100);
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
 * @param props.vertical - its segments stacked
 * @returns The control
 */
export function SegmentsLine({
    label,
    options,
    value,
    onPick,
    vertical = false,
}: Readonly<{
    label: string;
    options: readonly {
        readonly value: string;
        readonly name: string;
        readonly glyph?: keyof typeof GLYPHS;
        readonly disabled?: boolean;
        /** Why graphty-element draws nothing for the option in this view: dimmed, its tooltip saying why. */
        readonly dimmed?: string;
        /** A word option's hover tooltip, when its short word needs its long one ("Extend the palette"). */
        readonly tip?: string;
        /** Its word drawn beside its glyph. */
        readonly worded?: true;
    }[];
    value: string;
    onPick: (value: string) => void;
    /** Its segments stacked, one under another (a Location's beside its grid). */
    vertical?: boolean;
}>): React.JSX.Element {
    const pictured = isPictured(options);
    const dim = (option: (typeof options)[number], label: React.ReactNode): React.ReactNode =>
        option.dimmed === undefined ? (
            label
        ) : (
            <span className="ws-dim" data-dimmed="" title={option.dimmed}>
                {label}
            </span>
        );
    return (
        <SegmentedControl
            label={label}
            fullWidth
            size="xs"
            orientation={vertical ? "vertical" : undefined}
            value={value}
            onChange={onPick}
            data={options.map((option) => {
                const Glyph = option.glyph === undefined ? undefined : GLYPHS[option.glyph];
                return {
                    value: option.value,
                    disabled: option.disabled,
                    label: dim(option, pictured && Glyph !== undefined ? segmentGlyph(option, Glyph) : wordsOf(option)),
                };
            })}
        />
    );
}

/**
 * A pictured option's label: its glyph with its word beside it (a worded option), else its glyph with its word as
 * its tooltip.
 * @param option - the option.
 * @param option.name - its word.
 * @param option.worded - its word drawn beside its glyph.
 * @param Glyph - its glyph.
 * @returns the label.
 */
function segmentGlyph(
    option: Readonly<{ name: string; worded?: true }>,
    Glyph: (typeof GLYPHS)[keyof typeof GLYPHS],
): React.ReactNode {
    return option.worded === true ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Glyph size={14} aria-hidden />
            {option.name}
        </span>
    ) : (
        <Tooltip label={option.name}>
            <span style={{ display: "inline-flex" }}>
                <Glyph size={14} aria-hidden />
                <VisuallyHidden>{option.name}</VisuallyHidden>
            </span>
        </Tooltip>
    );
}

/**
 * A word option's label: its word, with its long words as its hover tooltip where it has them.
 * @param option - the option.
 * @param option.name - its word.
 * @param option.tip - its long words.
 * @returns the label.
 */
function wordsOf(option: Readonly<{ name: string; tip?: string }>): React.ReactNode {
    return option.tip === undefined ? (
        option.name
    ) : (
        <Tooltip label={option.tip}>
            <span>{option.name}</span>
        </Tooltip>
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
    /** R6 sides: a pair drawn split into its two numbers. */
    readonly split: boolean;
}

/**
 * A Unit line (R8): which unit's channel holds the value; picking one moves it there.
 * @param args - the line.
 * @returns The control
 */
function unitControl(args: ControlArgs): React.ReactNode {
    const { ctx, line, descriptor, label, fail } = args;
    const units = (line.unit ?? []).map(([, c]) => c);
    const [off, on] = [units.at(0), units.at(1)];
    if (line.rule === "R7" && off !== undefined && on !== undefined) {
        return (
            <Checkbox
                size="xs"
                label={line.name ?? label}
                checked={setOn(ctx, on)}
                onChange={(event) => {
                    moveUnit(ctx, event.currentTarget.checked ? on : off, units, undefined).catch(fail);
                }}
            />
        );
    }
    return (
        <SegmentsLine
            label={`${label} unit`}
            options={segmentOptions(line, []) ?? []}
            // Unset, the first unit (graphty-element's default: Graph) is the one drawn.
            value={units.find((c) => setOn(ctx, c)) ?? units.at(0) ?? ""}
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
    const { ctx, line, descriptor, value, label, write } = args;
    const boolean = descriptor.accepts === "boolean";
    // An option named "" is what is drawn while nothing is set: shown then, and picking it unsets.
    const unsetNamed = OPTION_NAMES[descriptor.channel]?.[""] !== undefined;
    const values = [...(boolean ? ["true", "false"] : (descriptor.values ?? [])), ...(unsetNamed ? [""] : [])];
    // Unset, the segment drawn now is shown: what the layers beneath paint, else graphty-element's default (E495:
    // picking the value already drawn is never mistaken for an option that does nothing).
    const shown = value ?? drawnValue(ctx, descriptor.channel);
    // A value graphty-element draws only in the other view (`valueViews`: a node size's Pivot in 2D) is dimmed.
    const options = (segmentOptions(line, values) ?? []).map((option) => {
        const dimmed = valueDimOf(ctx, descriptor, option.value);
        return dimmed === undefined ? option : { ...option, dimmed };
    });
    return (
        <SegmentsLine
            label={label}
            options={options}
            value={typeof shown === "string" || typeof shown === "boolean" ? String(shown) : ""}
            onPick={(picked) => {
                if (picked === "") {
                    write(descriptor.channel, undefined);
                    return;
                }
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
    const { ctx, line, descriptor, value, write } = args;
    return (
        <Checkbox
            size="xs"
            label={line.name ?? channelWord(descriptor.channel)}
            checked={(value ?? drawnValue(ctx, descriptor.channel)) === true}
            onChange={(event) => {
                write(descriptor.channel, event.currentTarget.checked);
            }}
        />
    );
}

/**
 * Bold (R7t) on a weight channel (a glyph's): a text editor's toggle, pressed from 600, writing 700 or 400; the
 * number itself is the Advanced dialog's.
 * @param args - the line.
 * @returns The toggle
 */
function boldControl(args: ControlArgs): React.ReactNode {
    const { ctx, descriptor, value, write } = args;
    const weight = value ?? drawnValue(ctx, descriptor.channel);
    return (
        <ToggleIconButton
            label="Bold"
            icon={<GLYPHS.fontBold size={14} aria-hidden />}
            checked={typeof weight === "number" && weight >= 600}
            onChange={(on) => {
                write(descriptor.channel, on ? 700 : 400);
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
    const { ctx, line, descriptor, value, set, write, split, fail } = args;
    const { channel } = descriptor;
    const { pair } = line;
    if (line.sides === true && pair !== undefined && !split) {
        // One number for both sides, one undo step.
        return (
            <NumberLine
                descriptor={descriptor}
                value={value ?? drawnValue(ctx, channel)}
                onWrite={(next) => {
                    const done =
                        next === undefined
                            ? unsetIn(ctx, [channel, pair])
                            : writeIn(ctx, channel, { value: next }, { [pair]: next }, true);
                    done.catch(fail);
                }}
            />
        );
    }
    if (line.pair === undefined) {
        return (
            <NumberLine
                descriptor={descriptor}
                value={value ?? drawnValue(ctx, channel)}
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
                value={value ?? drawnValue(ctx, channel)}
                letter={a === "" ? undefined : a}
                onWrite={(next) => {
                    write(channel, next);
                }}
            />
            {second === undefined ? null : (
                <NumberLine
                    descriptor={second}
                    value={lineIn(ctx, second.channel)?.value ?? drawnValue(ctx, second.channel)}
                    letter={b === "" ? undefined : b}
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
            value={value ?? drawnValue(ctx, descriptor.channel)}
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
            shown={drawnValue(ctx, descriptor.channel)}
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
 * Today's color (R1) and select (R9) fields; unset, they show the value drawn.
 * @param args - the line.
 * @returns The control
 */
function valueControl(args: ControlArgs): React.ReactNode {
    const { ctx, descriptor, value, label, write } = args;
    const shown = drawnValue(ctx, descriptor.channel);
    return (
        <ValueField
            descriptor={descriptor}
            label={label}
            // Unset, the value drawn there (else the element's default) is its value, never a placeholder (design
            // "Input rules": every input has a value); the minus still shows only once the layer sets it.
            value={value ?? shown}
            shown={shown}
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
    // A font stack ("Verdana, sans-serif") reads as its first family, so it fits the line.
    const first = held
        ?.split(",")[0]
        ?.trim()
        .replaceAll(/^["']|["']$/g, "");
    const listed =
        held === undefined || fonts.some(([font]) => font === held) ? fonts : [...fonts, [held, first ?? held]];
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
 * A picture (R16): the Picture field, "None" with no picture.
 * @param args - the line.
 * @returns The control
 */
function pictureControl(args: ControlArgs): React.ReactNode {
    const { descriptor, value, label, write } = args;
    return (
        <PictureLine
            label={label}
            value={value}
            onPick={(ref) => {
                write(descriptor.channel, ref);
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
    const { ctx, descriptor, value, label, write } = args;
    return (
        <FontSelect
            label={label}
            value={value ?? drawnValue(ctx, descriptor.channel)}
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

/** A frame's four sides, in the element's order (R17). */
const SIDES = ["Top", "Right", "Bottom", "Left"] as const;

/** The rim Rim writes at once, every side a tenth deep, so a rim shows the moment it is picked. */
const FIRST_RIM = "0.1 0.1 0.1 0.1";

/**
 * A band frame (R17, `node.stripeFrame`, stripes design 5): Whole / Rim grouped buttons, then with Rim one line per
 * side, a slider and its number, each writing its own item (`node.stripeFrame.0` to `.3`) with its own link and "-".
 * A side is capped at the whole less the opposite side, so the strips never overlap. Unsetting the last set side
 * unsets the frame.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.line - the line
 * @param props.descriptor - its channel
 * @param props.write - writes the frame's text, or undefined to unset it
 * @returns The lines
 */
function SidesLines({
    ctx,
    line,
    descriptor,
    write,
}: Readonly<{
    ctx: RowContext;
    line: LineSpec;
    descriptor: ChannelDescriptor;
    write: (text: string | undefined) => void;
}>): React.JSX.Element {
    const { channel } = descriptor;
    const own = lineIn(ctx, channel)?.value;
    const raw = own ?? drawnValue(ctx, channel);
    const items = readChannelList(channel, raw, { keepPlace: true });
    const sides = SIDES.map((_, at) => {
        const item = lineIn(ctx, listItemAddress(channel, at))?.value ?? items[at];
        return typeof item === "number" ? item : Number(item);
    });
    const rim = sides.some((side) => Number.isFinite(side) && side > 0) || (typeof own === "string" && own !== "");
    const name = line.name ?? channelWord(channel);
    const writeSide = (at: number, value: number | undefined): void => {
        const held = sides.map((side) => (Number.isFinite(side) ? side : undefined));
        const next = held.map((side, i) => (i === at ? value : side));
        if (next.every((each) => each === undefined)) {
            write(undefined);
            return;
        }
        while (next.length > 0 && next.at(-1) === undefined) {
            next.pop();
        }
        write(writeChannelList(channel, next));
    };
    return (
        <>
            <LineFrame
                line={channel}
                name={name}
                set={rim}
                rule="R8"
                control={
                    <SegmentsLine
                        label={name}
                        value={rim ? "rim" : "whole"}
                        options={[
                            { value: "whole", name: "Whole" },
                            { value: "rim", name: "Rim" },
                        ]}
                        onPick={(picked) => {
                            write(picked === "rim" ? FIRST_RIM : undefined);
                        }}
                    />
                }
                modifier={null}
                removeName={undefined}
                onRemove={() => undefined}
            />
            {rim
                ? SIDES.map((side, at) => {
                      const value = Number.isFinite(sides[at]) ? sides[at] : 0;
                      const opposite = sides[(at + 2) % 4];
                      const max = 1 - (Number.isFinite(opposite) ? opposite : 0);
                      const set = Number.isFinite(sides[at]);
                      const item = { ...descriptor, accepts: "number" as const, min: 0, max, step: 0.01 };
                      return (
                          <LineFrame
                              key={side}
                              line={`${channel}:${String(at)}`}
                              name={side}
                              set={set}
                              rule="R5"
                              control={
                                  <NumberLine
                                      descriptor={item}
                                      label={`${name} ${side.toLowerCase()}`}
                                      percent
                                      value={value}
                                      onWrite={(next) => {
                                          writeSide(at, next === undefined ? undefined : Math.min(max, next));
                                      }}
                                  />
                              }
                              modifier={
                                  <ByDataLink
                                      ctx={ctx}
                                      targets={[{ name: side, descriptor: item, to: listItemAddress(channel, at) }]}
                                  />
                              }
                              removeName={set ? `Remove ${side.toLowerCase()} side` : undefined}
                              onRemove={() => {
                                  writeSide(at, undefined);
                              }}
                          />
                      );
                  })
                : null}
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
    // Font style toggles (R7t): a number channel's is Bold (a glyph's weight); a flag stays a checkbox.
    R7t: (args) => (args.descriptor.accepts === "number" ? boldControl(args) : checkboxControl(args)),
    R8: segmentsControl,
    R8f: segmentsControl,
    R9: valueControl,
    R10: listControl,
    R13: fontControl,
    // Free text (R14): today's text field, which commits on Enter or blur.
    R14: valueControl,
    // A picture (R16): the app's Picture field and pop-over.
    R16: pictureControl,
    XY: pointControl,
};

/**
 * The R6 sides' own checkbox line (design 2.6, E674: a modifier is a line of its own, never a toggle beside a
 * line): splits a padding into its sides, or joins them again.
 * @param props - Component props
 * @param props.line - what the padding line edits, for `data-line` (this line's is it with ":sides")
 * @param props.split - whether the sides are split
 * @param props.onChange - splits or joins them
 * @returns The line
 */
export function SeparateSidesLine({
    line,
    split,
    onChange,
}: Readonly<{ line: string; split: boolean; onChange: (on: boolean) => void }>): React.JSX.Element {
    return (
        <LineFrame
            line={`${line}:sides`}
            name={null}
            // View state, never a written value: nothing to remove, so no "-" (E674).
            set={false}
            rule="R7"
            control={
                <Checkbox
                    size="xs"
                    label="Separate sides"
                    checked={split}
                    onChange={(event) => {
                        onChange(event.currentTarget.checked);
                    }}
                />
            }
            modifier={null}
            removeName={undefined}
            onRemove={() => undefined}
        />
    );
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

/**
 * A line's by-data link in its second trailing slot (design 2.6, E551): binds the line's value to data. A line
 * of two values (a pair) binds either, from the list's choice of which. Graphty-element binds a color, number,
 * choice, words or switch; a line of nothing it binds draws an empty slot.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.targets - each value of the line
 * @returns The link, or nothing
 */
export function ByDataLink({
    ctx,
    targets,
}: Readonly<{ ctx: RowContext; targets: readonly VaryTarget[] }>): React.JSX.Element | null {
    const bindable = targets.filter(
        ({ descriptor }) => takesBinding(descriptor) || (descriptor.renderable && descriptor.accepts === "boolean"),
    );
    const first = bindable.at(0);
    if (first === undefined) {
        return null;
    }
    return (
        <VarySlot
            ctx={ctx}
            descriptor={first.descriptor}
            to={first.to}
            anyKind
            which={bindable.length > 1 ? bindable : undefined}
        />
    );
}

/**
 * A line's second trailing slot: a thing row's settings "...", else its by-data link.
 * @param ctx - the row.
 * @param line - the line.
 * @param row - drawn as a thing's row.
 * @param channel - the channel it edits.
 * @returns the slot's contents.
 */
function slotOf(ctx: RowContext, line: LineSpec, row: RowSlots | undefined, channel: Channel): React.ReactNode {
    return row?.slot ?? <ByDataLink ctx={ctx} targets={linkTargets(ctx, line, channel)} />;
}

/**
 * Each value of a line, for its by-data link: its channel, and its pair's with their letters ("X", "Y").
 * @param ctx - the row.
 * @param line - the line.
 * @param channel - the channel it edits (one of its units).
 * @returns the values.
 */
function linkTargets(ctx: RowContext, line: LineSpec, channel: Channel): readonly VaryTarget[] {
    // A Unit line picks which unit a number is in: no value of its own to bind.
    if (line.unit !== undefined) {
        return [];
    }
    const [a, b] = line.letters ?? [channelWord(channel), line.pair === undefined ? "" : channelWord(line.pair)];
    return [
        [channel, a],
        [line.pair, b],
    ].flatMap(([each, name]) => {
        const descriptor =
            each === undefined
                ? undefined
                : shownChannel(ctx.session, ctx.side, each as Channel, setOn(ctx, each as Channel));
        return descriptor === undefined ? [] : [{ name: name ?? "", descriptor }];
    });
}

/**
 * Whether the row binds a channel to data.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns whether it varies by data.
 */
function boundIn(ctx: RowContext, channel: Channel): boolean {
    const own = lineIn(ctx, channel);
    return own?.binding !== undefined || own?.template !== undefined;
}

/**
 * A pair one of whose values varies by data, as two lines, each value's own (its bound field, or its number).
 * @param ctx - the row.
 * @param line - the line.
 * @param row - drawn as a thing's row, which is never split.
 * @param named - always draws its names.
 * @returns the two lines, or undefined for a line that is no such pair.
 */
function boundPair(
    ctx: RowContext,
    line: LineSpec,
    row: RowSlots | undefined,
    named: boolean,
): React.JSX.Element | undefined {
    const { pair } = line;
    if (row !== undefined || pair === undefined || ![line.channel, pair].some((each) => boundIn(ctx, each))) {
        return undefined;
    }
    const [a, b] = line.letters ?? [undefined, undefined];
    const half = (channel: Channel, letter: string | undefined): LineSpec => ({
        channel,
        name: letter === undefined || typeof line.name !== "string" ? channelWord(channel) : `${line.name} ${letter}`,
    });
    return (
        <>
            <RubricLine ctx={ctx} line={half(line.channel, a)} named={named} />
            <RubricLine ctx={ctx} line={half(pair, b)} named={named} />
        </>
    );
}

/** Props for RubricLine. */
interface RubricLineProps {
    readonly ctx: RowContext;
    readonly line: LineSpec;
    /** Drawn as a thing's row: its settings button and minus in place of the line's. */
    readonly row?: RowSlots;
    /** Always draws its name (a line under a row in the sidebar, design 2.5): an unnamed color is "Color". */
    readonly named?: boolean;
}

/**
 * One line: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.line - the line
 * @param props.row - drawn as a thing's row
 * @param props.named - always draws its name
 * @returns The line, or nothing where the element offers none of its channels
 */
export function RubricLine(props: RubricLineProps): React.JSX.Element | null {
    if (props.line.choices !== undefined) {
        return <ChoiceLine {...props} />;
    }
    return boundPair(props.ctx, props.line, props.row, props.named === true) ?? <OneLine {...props} />;
}

/**
 * A line of one channel (or a pair, or its units): see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.line - the line
 * @param props.row - drawn as a thing's row
 * @param props.named - always draws its name
 * @returns The line, or nothing where the element offers none of its channels
 */
function OneLine({ ctx, line, row, named: alwaysNamed = false }: RubricLineProps): React.JSX.Element | null {
    const { store } = useWorkspace();
    // R6 sides: split by its Separate sides line, or because the two sides already differ.
    const [splitAsked, setSplit] = React.useState(false);
    const { session, side } = ctx;
    // A line standing for several units edits whichever the row sets.
    const channel = [line.channel, ...(line.units ?? [])].find((c) => setOn(ctx, c)) ?? line.channel;
    const own = lineIn(ctx, channel);
    const set = setOn(ctx, channel) || (line.pair !== undefined && setOn(ctx, line.pair));
    const descriptor = shownChannel(session, side, channel, set);
    // A Unit line needs every unit offered (Wrap around shape needs `node.texture`, the node-models experiment's).
    const units = (line.unit ?? []).every(([, c]) => shownChannel(session, side, c, setOn(ctx, c)) !== undefined);
    if (descriptor?.renderable !== true || !units) {
        return null;
    }
    // A line graphty-element draws nothing for now (a 3D-only line in 2D) is dimmed, never hidden.
    const dimmed = dimOf(ctx, channel);
    const rule = ruleOf(line, descriptor);
    const kept = keptField(ctx, line, row, descriptor, rule, set);
    if (kept !== undefined || rule === "field" || rule === "R15") {
        return kept === undefined ? null : (
            <div className="ws-dim" data-dimmed={dimmed === undefined ? undefined : ""} title={dimmed}>
                {kept}
            </div>
        );
    }
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(channelWord(channel), "changed", error), error: true } });
    };
    const write = (to: Channel, value: ChannelValue | undefined): void => {
        // With what graphty-element says the value needs to draw (a wireframe's low mesh detail).
        const done = value === undefined ? unsetIn(ctx, [to]) : writeIn(ctx, to, { value }, needsFor(ctx, to, value));
        done.catch(fail);
    };
    if (rule === "R17") {
        return (
            <SidesLines
                ctx={ctx}
                line={line}
                descriptor={descriptor}
                write={(text) => {
                    write(channel, text);
                }}
            />
        );
    }
    const pairValue = line.pair === undefined ? undefined : lineIn(ctx, line.pair)?.value;
    const split = splitAsked || (line.sides === true && pairValue !== own?.value);
    const args: ControlArgs = {
        ctx,
        line,
        descriptor,
        value: own?.value,
        set,
        label: fieldName(channel),
        write,
        fail,
        split,
    };
    const control = withUnitBeside(
        line.unit === undefined ? CONTROLS[rule](args) : unitControl(args),
        args,
        alwaysNamed,
    );
    const channels = [channel, ...(line.pair === undefined ? [] : [line.pair])];
    // A pair's minus names both its channels, so it is told from its sub-group's ("Remove width and height").
    const removeWords =
        line.pair === undefined
            ? (line.name ?? channelWord(channel))
            : `${channelWord(channel)} and ${channelWord(line.pair)}`;
    const removeName = row?.removeLabel ?? `Remove ${removeWords.toLowerCase()}`;
    const onRemove =
        row?.onRemove ??
        ((): void => {
            unsetIn(ctx, channels).catch(fail);
        });
    const frame = (
        <LineFrame
            line={channel}
            name={lineName(line, descriptor, rule, alwaysNamed)}
            set={set}
            rule={frameRule(line, rule)}
            control={control}
            modifier={slotOf(ctx, line, row, channel)}
            removeName={set || row !== undefined ? removeName : undefined}
            onRemove={onRemove}
            dimmed={dimmed}
            wide={wideLine(line, descriptor, split)}
        />
    );
    return withSides(frame, line, channel, split, (on) => {
        setSplit(on);
        // Joined again, both sides take the first one's value.
        if (!on && line.pair !== undefined && pairValue !== own?.value) {
            write(line.pair, own?.value);
        }
    });
}

/**
 * A number's control with its unit's segments beside it (`unitBeside`), in a pop-over; under a row the number is
 * alone, as its Unit line is not drawn there either.
 * @param alone - the number's control.
 * @param args - the line.
 * @param underRow - drawn under a row.
 * @returns The control
 */
function withUnitBeside(alone: React.ReactNode, args: ControlArgs, underRow: boolean): React.ReactNode {
    const { line } = args;
    if (line.unitBeside === undefined || underRow) {
        return alone;
    }
    return (
        <Group gap={8} wrap="nowrap">
            <div style={{ flex: 1, minWidth: 0 }}>{alone}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                {unitControl({ ...args, line: { ...line, unit: line.unitBeside } })}
            </div>
        </Group>
    );
}

/**
 * A line, and after it its Separate sides line when it is an R6 sides pair.
 * @param frame - the line.
 * @param line - its spec.
 * @param address - what it edits, for `data-line`.
 * @param split - whether its sides are split.
 * @param onSplit - splits or joins them.
 * @returns The line or lines
 */
function withSides(
    frame: React.JSX.Element,
    line: LineSpec,
    address: string,
    split: boolean,
    onSplit: (on: boolean) => void,
): React.JSX.Element {
    return line.sides === true && line.pair !== undefined ? (
        <>
            {frame}
            <SeparateSidesLine line={address} split={split} onChange={onSplit} />
        </>
    ) : (
        frame
    );
}

/**
 * A value list over several channels (a Finish's Shading): the choice whose values the row holds is shown, and
 * picking one writes all of its values in one step.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.line - the line
 * @param props.row - drawn as a thing's row
 * @returns The line, or nothing where the element offers not all of its channels
 */
function ChoiceLine({ ctx, line, row }: RubricLineProps): React.JSX.Element | null {
    const { store } = useWorkspace();
    const choices = line.choices ?? [];
    const channels = lineChannels(line);
    const offered = channels.every(
        (channel) => shownChannel(ctx.session, ctx.side, channel, setOn(ctx, channel))?.renderable === true,
    );
    if (!offered) {
        return null;
    }
    const name = line.name ?? channelWord(line.channel);
    const valueOf = (channel: Channel): unknown => lineIn(ctx, channel)?.value ?? ctx.beneath(channel).value ?? false;
    const now = choices.find((choice) =>
        Object.entries(choice.writes).every(([channel, value]) => valueOf(channel as Channel) === value),
    );
    const set = channels.some((channel) => setOn(ctx, channel));
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(name, "changed", error), error: true } });
    };
    const control = (
        <PanelField
            label={name}
            kind="select"
            width="fill"
            data={choices.map((choice) => ({ value: choice.name, label: choice.name }))}
            value={now?.name ?? null}
            onChange={(next) => {
                const writes = Object.entries(choices.find((choice) => choice.name === next)?.writes ?? {}) as [
                    Channel,
                    ChannelValue,
                ][];
                const [first, rest] = [writes.at(0), writes.slice(1)];
                if (first !== undefined) {
                    writeIn(ctx, first[0], { value: first[1] }, Object.fromEntries(rest), true).catch(fail);
                }
            }}
        />
    );
    return (
        <LineFrame
            line={line.channel}
            name={name}
            set={set}
            rule={line.rule ?? "R9"}
            control={control}
            modifier={row?.slot ?? null}
            removeName={row?.removeLabel ?? (set ? `Remove ${name.toLowerCase()}` : undefined)}
            onRemove={
                row?.onRemove ??
                ((): void => {
                    unsetIn(ctx, channels).catch(fail);
                })
            }
            dimmed={dimOf(ctx, line.channel)}
        />
    );
}

/**
 * The name a line draws in its name column, or null for none: a checkbox carries its own; a line the rubric
 * leaves unnamed draws none, unless it must ("Color" for a color).
 * @param line - the line.
 * @param descriptor - its channel.
 * @param rule - its rule.
 * @param always - whether it must draw a name (a line under a row in the sidebar).
 * @returns the name, or null.
 */
function lineName(line: LineSpec, descriptor: ChannelDescriptor, rule: Rule, always: boolean): string | null {
    // A full-width segment line (R8f) is named too: its name is the small label above its segments (owner's
    // input rules: every input is self describing), as words alone ("Graph | Pivot | Screen") say nothing.
    if (rule === "R7" || (!always && line.name === null)) {
        return null;
    }
    return line.name ?? (descriptor.accepts === "color" ? "Color" : channelWord(descriptor.channel));
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
 * The rule a line's frame names: its own, but a Unit line's is a strip of units (R8), whatever its channel holds.
 * @param line - the line.
 * @param rule - the rule its control follows.
 * @returns the rule.
 */
function frameRule(line: LineSpec, rule: string): string {
    return line.unit === undefined || rule === "R7" ? rule : "R8";
}

/**
 * The name a line draws above its control, or null: none where the control already says it (design "Input rules"):
 * the font style toggles, each with its tooltip (R7t), and a color swatch named only "Color". A color with a name of
 * its own ("Highlight", "Letter outline") keeps it: a swatch says it is a color, not which.
 * @param name - the line's name.
 * @param rule - its rubric rule.
 * @returns the name above it, or null.
 */
function shownName(name: string | null, rule: string): string | null {
    return rule === "R7t" || (rule === "R1" && name === "Color") ? null : name;
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
 * @param props.dimmed - why graphty-element draws nothing for it now, for its dimmed look and tooltip
 * @param props.under - drawn under the switch line above it, its name indented
 * @param props.wide - two inputs on the line (or a slider and its number): its name above them
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
    dimmed,
    under,
    wide,
}: Readonly<{
    line: string;
    name: string | null;
    set: boolean;
    rule: string;
    control: React.ReactNode;
    modifier: React.ReactNode;
    removeName: string | undefined;
    onRemove: () => void;
    /** Why graphty-element draws nothing for it now ("2D only"): the line is dimmed, with these words as its tooltip. */
    dimmed?: string;
    /** Drawn under the switch line above it ("Opacity" under Letter outline): its name is indented. */
    under?: boolean;
    /**
     * Two inputs on the line (an X | Y pair, a slider and its number): its name above them and they across the line
     * (style.css), so neither number is cut ("0.1" read as "0", "Auto" as "A...").
     */
    wide?: boolean;
}>): React.JSX.Element {
    return (
        <div
            className="ws-row"
            data-line={line}
            data-set={set ? "" : undefined}
            data-rule={rule}
            data-dimmed={dimmed === undefined ? undefined : ""}
            data-under={under === true ? "" : undefined}
            data-wide={wide === true ? "" : undefined}
            title={dimmed}
        >
            <FieldLine name={shownName(name, rule)} settings={null} above>
                <div className="ws-field-control">{control}</div>
                {/* `[link or ...] [-]`: the link or settings button right after its control, the minus right-most
                    (owner's input rules, design "Input rules"). */}
                <span className="ws-slot ws-vary">{modifier}</span>
                <span className="ws-slot">
                    {removeName === undefined ? null : <RemoveButton label={removeName} onClick={onRemove} />}
                </span>
            </FieldLine>
        </div>
    );
}
