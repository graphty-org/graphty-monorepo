/**
 * One line of a label in Style panel v2 (design/ui/style-panel-v2/design.md, sections 7.3 and
 * 10.1): it edits one field of the layer's label style object (`node.labelStyle`,
 * `node.xlabelStyle`, `node.tooltipStyle`), adding the key, and its minus takes the key off; the
 * element stacks the layers' objects field by field (`mergeLabelStyle`). A field the layer writes
 * through its own channel instead (`node.labelColor`, a value, or one varying by data) is drawn as
 * that channel's field in the line's place, so it shows once, where it belongs.
 */

import { AlignmentMatrix, type AlignmentMatrixValue, PanelField, ToggleIconButton } from "@graphty/compact-mantine";
import {
    type Channel,
    type ChannelDescriptor,
    LABEL_LOCATION_PLACES,
    LABEL_LOOKS,
    type LabelFieldAddress,
    type LabelLocation,
    type LabelLocationPlace,
} from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import { Checkbox, Group, Stack } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { ImageField } from "../ImageField";
import { shownChannel } from "../offered";
import { GradientBar } from "../parts/GradientRow";
import { BoundValue, Field, type RowContext, StopVarying, type VaryTarget } from "../PropertyRow";
import { lineIn, propose, removeLine, startingValue, writeIn } from "../row";
import { ValueField } from "../ValueField";
import { enumWords, failureWords, positionWord } from "../words";
import { labelDimOf } from "./drawn";
import {
    flatOf,
    LABEL_OPTION_NAMES,
    type LabelField,
    labelFieldDescriptor,
    labelLineFields,
    type LabelLineSpec,
    linkedFields,
    type TextThing,
} from "./labelRubric";
import { rangeOf } from "./lineWrites";
import { segmentOptions } from "./rubric";
import {
    ByDataLink,
    FontSelect,
    LineFrame,
    NumberLine,
    PresetLine,
    SegmentsLine,
    SeparateSidesLine,
} from "./RubricLine";
import { setOn } from "./things";

/** A write to a label style: each field's new value, undefined taking the field off. */
export type LabelPatch = Partial<Record<LabelField, unknown>>;

/** What every label line needs. */
export interface LabelLineContext {
    readonly ctx: RowContext;
    readonly kind: TextThing;
    /** The thing's name with its kind ("Node label"), the start of every control's name. */
    readonly title: string;
    /** The layer's label style object as written. */
    readonly style: Readonly<LabelStyle>;
    /** Writes fields of the style; `drop` channels of the thing are taken off in the same step. */
    readonly write: (patch: LabelPatch, drop?: readonly Channel[]) => void;
    /** What its lines' `data-line` starts with, when not its style channel (a further label's `node.labels.<id>`). */
    readonly address?: string;
}

/**
 * A label style field described as a channel, for the controls that draw a channel's value.
 * @param label - the line's context.
 * @param field - the field.
 * @returns the descriptor, or undefined for a field the element does not describe.
 */
function describedField(label: LabelLineContext, field: LabelField): ChannelDescriptor | undefined {
    const found = labelFieldDescriptor(field);
    if (found === undefined) {
        return undefined;
    }
    const { plainName, accepts, values, min, max, integer, angle } = found;
    return {
        channel: label.kind.style,
        target: label.ctx.side,
        plainName,
        shortName: plainName,
        group: "text",
        stylePath: "",
        renderable: true,
        accepts: accepts === "colors" ? "text" : accepts,
        ...(values === undefined ? {} : { values }),
        ...(min === undefined ? {} : { min }),
        ...(max === undefined ? {} : { max }),
        ...(integer === undefined ? {} : { integer }),
        ...(angle === undefined ? {} : { angle }),
    };
}

/**
 * An option's name: the panel's own word, else the look's catalog name, the location's words or
 * the value spelled out.
 * @param field - the field.
 * @param value - the option.
 * @returns its name.
 */
function optionWord(field: LabelField, value: string): string {
    const named = LABEL_OPTION_NAMES[field]?.[value]?.name;
    if (named !== undefined) {
        return named;
    }
    if (field === "look") {
        return LABEL_LOOKS.find((look) => look.id === value)?.plainName ?? enumWords(value);
    }
    return field === "location" ? positionWord(value as LabelLocation) : enumWords(value);
}

/** What a line's control is drawn from. */
interface LineControlArgs {
    readonly label: LabelLineContext;
    readonly line: LabelLineSpec;
    readonly field: LabelField;
    readonly descriptor: ChannelDescriptor;
    readonly name: string;
    readonly set: boolean;
    /** R6 sides: drawn split into its sides. */
    readonly split: boolean;
}

/**
 * The value a field holds, for a control.
 * @param style - the label style.
 * @param field - the field.
 * @returns the value.
 */
function valueOf(style: Readonly<LabelStyle>, field: LabelField): unknown {
    return (style as Readonly<Record<string, unknown>>)[field];
}

/**
 * The value a field's control shows: the one written, else graphty-element's default (design "Input rules":
 * every input has a value).
 * @param style - the label style.
 * @param field - the field.
 * @returns the value shown.
 */
function shownOf(style: Readonly<LabelStyle>, field: LabelField): unknown {
    return valueOf(style, field) ?? labelFieldDescriptor(field)?.default;
}

/**
 * A line's whole name: the label's title, then the line's, a word they share said once ("Node label" and "Label
 * image" make "Node label image").
 * @param title - the label's title ("Node label").
 * @param own - the line's name.
 * @returns the name.
 */
function lineName(title: string, own: string): string {
    const words = own.toLowerCase().split(" ");
    const shared = words.length > 1 && title.toLowerCase().endsWith(` ${words[0]}`);
    return `${title} ${(shared ? words.slice(1) : words).join(" ")}`;
}

/** A drop-down's option for an unset field that draws nothing: never one of the element's values. */
const NONE = "(none)";

/** The weights a weight's words stand for, for its number line. */
const WEIGHT_NUMBERS: Readonly<Record<string, number>> = { normal: 400, bold: 700 };

/**
 * A number line's value: a weight's word as its number.
 * @param style - the label style.
 * @param field - the field.
 * @returns the value shown.
 */
function numberShown(style: Readonly<LabelStyle>, field: LabelField): unknown {
    const value = shownOf(style, field);
    return field === "weight" && typeof value === "string" ? WEIGHT_NUMBERS[value] : value;
}

/**
 * A number, a pair of numbers with their letters (R5), or a number split into its sides (R6 sides).
 * @param args - the line.
 * @param args.label - the line's label
 * @param args.line - the line's line
 * @param args.field - the line's field
 * @param args.descriptor - the line's descriptor
 * @param args.name - the line's name
 * @param args.split - whether its sides are split
 * @returns The control
 */
function numberControl({ label, line, field, descriptor, name, split }: LineControlArgs): React.ReactNode {
    const percent = field.endsWith("pacity");
    const one = (which: LabelField, letter: string | undefined, words: string): React.JSX.Element => (
        <NumberLine
            descriptor={describedField(label, which) ?? descriptor}
            label={words}
            percent={percent}
            value={numberShown(label.style, which)}
            letter={letter}
            onWrite={(next) => {
                label.write({ [which]: next });
            }}
        />
    );
    const { sides } = line;
    if (sides !== undefined) {
        if (!split) {
            return (
                <NumberLine
                    descriptor={descriptor}
                    label={name}
                    value={shownOf(label.style, sides[0])}
                    onWrite={(next) => {
                        label.write(Object.fromEntries(sides.map((each) => [each, next])));
                    }}
                />
            );
        }
        // Top | right, bottom | left, each with its side's initial (R17, E674: a letter, never an icon).
        const [top, right, bottom, left] = sides;
        const sideOf = (which: LabelField, letter: string): React.JSX.Element => {
            const word = labelFieldDescriptor(which)?.plainName ?? which;
            return one(which, letter, `${label.title} ${word.toLowerCase()}`);
        };
        return (
            <Stack gap={4}>
                <Group grow gap={4} wrap="nowrap">
                    {sideOf(top, "T")}
                    {sideOf(right, "R")}
                </Group>
                <Group grow gap={4} wrap="nowrap">
                    {sideOf(bottom, "B")}
                    {sideOf(left, "L")}
                </Group>
            </Stack>
        );
    }
    if (line.pair === undefined) {
        return one(field, undefined, name);
    }
    const [a, b] = line.letters ?? ["", ""];
    // A lettered pair's fields are the line's name and its letter ("Node label pointer size H"); else the second's own.
    const second = labelFieldDescriptor(line.pair)?.plainName ?? line.pair;
    return (
        <Group grow gap={4} wrap="nowrap">
            {one(field, a === "" ? undefined : a, a === "" ? name : `${name} ${a}`)}
            {one(
                line.pair,
                b === "" ? undefined : b,
                b === "" ? `${label.title} ${second.toLowerCase()}` : `${name} ${b}`,
            )}
        </Group>
    );
}

/**
 * A Unit line: which unit's field holds the value; picking one moves it there in one write.
 * @param args - the line.
 * @param args.label - the line's label
 * @param args.line - the line's line
 * @param args.name - the line's name
 * @returns The control
 */
function unitControl({ label, line, name }: LineControlArgs): React.ReactNode {
    const units = line.unit ?? [];
    const { style, write } = label;
    const held = units.find((unit) => valueOf(style, unit.field) !== undefined);
    return (
        <SegmentsLine
            label={name}
            options={units.map((unit) => ({ value: unit.field, name: unit.name }))}
            // Unset, the first unit (graphty-element's default: Graph) is the one drawn.
            value={held?.field ?? units.at(0)?.field ?? ""}
            onPick={(to) => {
                const picked = units.find((unit) => unit.field === to);
                if (picked === undefined || picked === held) {
                    return;
                }
                const start = labelFieldDescriptor(picked.field)?.default;
                const fresh = typeof start === "number" ? start : 1;
                const value = held === undefined ? fresh : valueOf(style, held.field);
                const off = Object.fromEntries(
                    units.flatMap((unit) =>
                        [unit.field, ...Object.keys(unit.also ?? {})].map((key) => [key, undefined]),
                    ),
                );
                write({ ...off, [picked.field]: value, ...picked.also });
            }}
        />
    );
}

/**
 * A select of a field's options (R9).
 * @param args - the line.
 * @param args.label - the line's label
 * @param args.field - the line's field
 * @param args.descriptor - the line's descriptor
 * @param args.name - the line's name
 * @returns The control
 */
function selectControl({ label, field, descriptor, name }: LineControlArgs): React.ReactNode {
    const value = shownOf(label.style, field);
    // A field with no default draws nothing while unset: "None", which picking unsets (design "Input rules").
    const none = labelFieldDescriptor(field)?.default === undefined ? [{ value: NONE, label: "None" }] : [];
    return (
        <PanelField
            label={name}
            kind="select"
            width="fill"
            data={[
                ...none,
                ...(descriptor.values ?? []).map((each) => ({ value: each, label: optionWord(field, each) })),
            ]}
            value={typeof value === "string" ? value : NONE}
            onChange={(next) => {
                label.write({ [field]: next === NONE ? undefined : String(next) });
            }}
        />
    );
}

/** A location's grid: beyond the node's outline, within it, or the element's own pick. */
type LocationGrid = "outside" | "inside" | "auto";

/** The grids' words, in the line's order. */
const GRID_WORDS: Readonly<Record<LocationGrid, string>> = { outside: "Outside", inside: "Inside", auto: "Auto" };

/**
 * The grid a location sits in; the middle, which both hold, reads as Outside.
 * @param place - the location.
 * @returns its grid.
 */
function gridOf(place: LabelLocationPlace): LocationGrid {
    if (place.places.length === 0) {
        return "auto";
    }
    return place.places.includes("outside") ? "outside" : "inside";
}

/**
 * The location at a cell of a grid.
 * @param grid - the grid.
 * @param cell - the cell, "top-center" and so on.
 * @returns the location, or undefined.
 */
function placeAt(grid: "outside" | "inside", cell: string): LabelLocation | undefined {
    return LABEL_LOCATION_PLACES.find(
        (place) => place.places.includes(grid) && `${String(place.row)}-${String(place.column)}` === cell,
    )?.id;
}

/**
 * A location (R2): Outside / Inside / Auto, then the grid's cells once written; Auto disables
 * them. The cells are graphty-element's (`LABEL_LOCATION_PLACES`). An edge's label has no inside.
 * @param args - the line.
 * @param args.label - the line's label
 * @param args.field - the line's field
 * @param args.name - the line's name
 * @returns The control
 */
function locationControl({ label, field, name }: LineControlArgs): React.ReactNode {
    const value = shownOf(label.style, field);
    const place = LABEL_LOCATION_PLACES.find((each) => each.id === value);
    // Unset with no default, graphty-element picks the place: Auto.
    const grid = place === undefined ? "auto" : gridOf(place);
    const cell = place?.row === undefined ? "top-center" : `${place.row}-${String(place.column)}`;
    const grids: readonly LocationGrid[] =
        label.ctx.side === "edge" ? ["outside", "auto"] : ["outside", "inside", "auto"];
    const inGrid = grid === "inside" ? "inside" : "outside";
    const cellLabels = Object.fromEntries(
        LABEL_LOCATION_PLACES.filter((each) => each.places.includes(inGrid)).map((each) => [
            `${String(each.row)}-${String(each.column)}`,
            optionWord(field, each.id),
        ]),
    );
    return (
        // The grid beside its Outside / Inside / Auto, stacked, so the two take one row (owner's input rules: at most
        // 6 rows, the grid counting as one).
        <Group gap={8} wrap="nowrap" align="flex-start">
            <div style={{ flex: 1, minWidth: 0 }}>
                <SegmentsLine
                    vertical={place !== undefined}
                    label={name}
                    options={grids.map((each) => ({ value: each, name: GRID_WORDS[each] }))}
                    value={grid}
                    onPick={(picked) => {
                        const next =
                            picked === "auto" ? "automatic" : placeAt(picked === "inside" ? "inside" : "outside", cell);
                        if (next !== undefined) {
                            label.write({ [field]: next });
                        }
                    }}
                />
            </div>
            {place === undefined ? null : (
                <AlignmentMatrix
                    label={`${name} cell`}
                    value={cell as AlignmentMatrixValue}
                    cellLabels={cellLabels}
                    disabled={grid === "auto"}
                    onChange={(picked) => {
                        const next = placeAt(inGrid, picked);
                        if (next !== undefined) {
                            label.write({ [field]: next });
                        }
                    }}
                />
            )}
        </Group>
    );
}

/** A font style toggle's glyph and word, by the field it writes. */
const FONT_TOGGLES: Readonly<Partial<Record<string, { glyph: keyof typeof GLYPHS; word: string }>>> = {
    weight: { glyph: "fontBold", word: "Bold" },
    italic: { glyph: "fontItalic", word: "Italic" },
    underline: { glyph: "fontUnderline", word: "Underline" },
    strikethrough: { glyph: "fontStrikethrough", word: "Strikethrough" },
};

/**
 * R7t: a text editor's font style buttons on one line (owner, 2026-11-23), each pressed while the label draws it
 * (unset, graphty-element's default). Bold reads and writes the weight: pressed at "bold" or 600 and over.
 * @param args - the line.
 * @returns The toggles
 */
function fontToggles(args: LineControlArgs): React.ReactNode {
    const { label, line } = args;
    const fields = [line.field, ...(line.toggles ?? [])];
    return (
        // 8 apart: under a finger each toggle's target is 32 px wide, so 2 apart they would take each other's taps.
        <Group gap={8} wrap="nowrap" data-font-style="">
            {fields.map((field) => {
                const toggle = FONT_TOGGLES[field];
                if (toggle === undefined) {
                    return null;
                }
                const Glyph = GLYPHS[toggle.glyph];
                const value = valueOf(label.style, field) ?? labelFieldDescriptor(field)?.default;
                const on =
                    field === "weight"
                        ? value === "bold" || (typeof value === "number" && value >= 600)
                        : value === true;
                return (
                    <ToggleIconButton
                        key={field}
                        label={toggle.word}
                        icon={<Glyph size={14} aria-hidden />}
                        checked={on}
                        onChange={(next) => {
                            const bold = next ? "bold" : "normal";
                            label.write({ [field]: field === "weight" ? bold : next });
                        }}
                    />
                );
            })}
        </Group>
    );
}

/**
 * The control a line's rule picks.
 * @param args - the line.
 * @param rule - its rule.
 * @returns The control
 */
function controlOf(args: LineControlArgs, rule: string): React.ReactNode {
    const { label, line, field, descriptor, name } = args;
    const value = shownOf(label.style, field);
    const write = (next: unknown): void => {
        label.write({ [field]: next });
    };
    switch (rule) {
        case "R5":
            return numberControl(args);
        case "R5b":
            return (
                <PresetLine
                    ctx={label.ctx}
                    descriptor={descriptor}
                    label={name}
                    presets={Object.entries(LABEL_OPTION_NAMES[field] ?? {}).map(([id, option]) => ({
                        id,
                        plainName: option.name,
                    }))}
                    value={value}
                    onWrite={write}
                />
            );
        case "R7t":
            return fontToggles(args);
        case "R7":
            return (
                <Checkbox
                    size="xs"
                    label={line.name ?? descriptor.plainName}
                    // Unset, it shows what is drawn (a label with words is shown: `enabled` defaults to true).
                    checked={value === true}
                    onChange={(event) => {
                        write(event.currentTarget.checked);
                    }}
                />
            );
        case "R8":
        case "R8f": {
            // "": the option drawn while nothing is set, which picking unsets (design "Input rules": no empty line).
            const unsetNamed = LABEL_OPTION_NAMES[field]?.[""] !== undefined;
            const values = [
                ...(descriptor.accepts === "boolean" ? ["true", "false"] : (descriptor.values ?? [])),
                ...(unsetNamed ? [""] : []),
            ];
            return (
                <SegmentsLine
                    label={name}
                    options={segmentOptions({ channel: field }, values, LABEL_OPTION_NAMES) ?? []}
                    value={typeof value === "string" || typeof value === "boolean" ? String(value) : ""}
                    onPick={(picked) => {
                        if (picked === "") {
                            write(undefined);
                            return;
                        }
                        write(descriptor.accepts === "boolean" ? picked === "true" : picked);
                    }}
                />
            );
        }
        case "R2":
            return locationControl(args);
        case "R9":
            return selectControl(args);
        case "R13":
            return <FontSelect label={name} value={value} onPick={write} />;
        case "R16":
            return (
                <ImageField
                    label={name}
                    value={
                        typeof valueOf(label.style, field) === "string"
                            ? String(valueOf(label.style, field))
                            : undefined
                    }
                    onPick={write}
                />
            );
        case "field":
            // A list of colors (a background gradient's): the shared gradient editor, spread evenly.
            return (
                <GradientBar
                    label={name}
                    colors={Array.isArray(value) ? value : []}
                    onWrite={(colors) => {
                        write(colors);
                    }}
                />
            );
        default:
            // R1 colors and R14 free text: today's fields.
            return (
                <ValueField
                    descriptor={descriptor}
                    label={name}
                    value={valueOf(label.style, field)}
                    shown={value}
                    swatches={label.ctx.documentColors}
                    onChange={write}
                />
            );
    }
}

/** The rule a field's kind gives a line that names none. */
const RULE_OF_KIND: Readonly<Partial<Record<string, string>>> = {
    color: "R1",
    number: "R5",
    boolean: "R7",
    text: "R14",
    enum: "R9",
    colors: "field",
};

/**
 * The field's own channel the layer sets for a line, if any: drawn in the line's place.
 * @param label - the line's context.
 * @param line - the line.
 * @returns its descriptor, or undefined when the layer writes the line's fields in the style.
 */
function flatHeld(label: LabelLineContext, line: LabelLineSpec): ChannelDescriptor | undefined {
    if (line.unit !== undefined) {
        return undefined;
    }
    const { ctx, kind } = label;
    // A further label's fields vary at their address in the list (`BoundAtLine`), never through the channels,
    // which are the label's own.
    if (label.address !== undefined) {
        return undefined;
    }
    const flat = [line.field, ...(line.units ?? [])]
        .map((field) => flatOf(ctx.side, kind.style, field))
        .find((channel): channel is Channel => channel !== undefined && setOn(ctx, channel));
    return flat === undefined ? undefined : shownChannel(ctx.session, ctx.side, flat, true);
}

/**
 * A label line's by-data link: see `linkedFields`. A further label's field binds at its address in the list
 * (`node.labels.<id>.<field>`), the label's own at its channel.
 * @param label - the line's context.
 * @param line - the line.
 * @param editing - the field the line edits now.
 * @returns the link, or nothing.
 */
function labelLink(label: LabelLineContext, line: LabelLineSpec, editing: LabelField): React.JSX.Element | null {
    const { ctx } = label;
    const targets = linkedFields(ctx.side, fieldsStyle(label), line, editing).flatMap(
        ({ field, channel }): VaryTarget[] => {
            const descriptor = shownChannel(ctx.session, ctx.side, channel, setOn(ctx, channel));
            if (descriptor === undefined) {
                return [];
            }
            const letter = line.letters?.[field === line.pair ? 1 : 0];
            const name = letter ?? labelFieldDescriptor(field)?.plainName ?? field;
            const to = label.address === undefined ? undefined : (`${label.address}.${field}` as LabelFieldAddress);
            return [{ name, descriptor, to }];
        },
    );
    return <ByDataLink ctx={ctx} targets={targets} />;
}

/**
 * The label style whose field channels a label's fields bind as: its own, or for a further label (whose kind is
 * its list) its side's label style, as graphty-element's label field addresses bind (`labelFieldChannel`).
 * @param label - the line's context.
 * @returns the label style channel.
 */
function fieldsStyle(label: LabelLineContext): Channel {
    return label.address === undefined ? label.kind.style : (`${label.ctx.side}.labelStyle` as Channel);
}

/**
 * A further label's field bound to data at its address in the list (`node.labels.<id>.<field>`), if any.
 * @param label - the line's context.
 * @param line - the line.
 * @returns the field, its channel and where it is bound, or undefined.
 */
function boundAt(
    label: LabelLineContext,
    line: LabelLineSpec,
): { readonly field: LabelField; readonly channel: Channel; readonly address: LabelFieldAddress } | undefined {
    if (label.address === undefined) {
        return undefined;
    }
    return linkedFields(label.ctx.side, fieldsStyle(label), line)
        .filter(({ field }) => field !== line.pair)
        .map((each) => ({ ...each, address: `${String(label.address)}.${each.field}` as LabelFieldAddress }))
        .find(({ address }) => lineIn(label.ctx, address)?.binding !== undefined);
}

/**
 * A further label's line whose field varies by data: its name, the binding (the column, opening its settings)
 * and its minus, which stops it varying.
 * @param props - Component props
 * @param props.label - the line's context
 * @param props.name - the line's name
 * @param props.bound - the field, its channel and its address
 * @returns The line
 */
function BoundAtLine({
    label,
    name,
    bound,
}: Readonly<{
    label: LabelLineContext;
    name: string;
    bound: { readonly field: LabelField; readonly channel: Channel; readonly address: LabelFieldAddress };
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const { ctx } = label;
    const own = lineIn(ctx, bound.address);
    const descriptor = shownChannel(ctx.session, ctx.side, bound.channel, true);
    if (own?.binding === undefined || descriptor === undefined) {
        return null;
    }
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(name, "changed", error), error: true } });
    };
    const write = (next: Parameters<typeof writeIn>[2]): void => {
        writeIn(ctx, bound.address, next).catch(fail);
    };
    const { layer, binding } = own;
    return (
        <LineFrame
            line={bound.address}
            name={name}
            set
            rule="bound"
            control={
                <BoundValue
                    ctx={ctx}
                    descriptor={descriptor}
                    source={{
                        kind: "data",
                        layer,
                        binding,
                        write,
                        bind: (choice) => {
                            const proposal = propose(ctx.session, choice, bound.address);
                            if (proposal.ok) {
                                write({ binding: proposal.binding });
                            }
                        },
                    }}
                />
            }
            modifier={
                <StopVarying
                    ctx={ctx}
                    descriptor={descriptor}
                    name={name}
                    to={bound.address}
                    onStop={() => {
                        const value = binding.otherwise ?? startingValue(descriptor, ctx.session, layer.selector);
                        write({ value });
                        return value;
                    }}
                />
            }
            removeName={`Remove ${name.toLowerCase()}`}
            onRemove={() => {
                removeLine(ctx.session, layer, bound.address).catch(fail);
            }}
        />
    );
}

/**
 * One label line: see the file header.
 * @param props - Component props
 * @param props.label - the label it belongs to
 * @param props.line - the line
 * @param props.named - always draws its name (a line under a row in the sidebar): an unnamed color is "Color"
 * @returns The line, or nothing for a field the element does not describe
 */
export function LabelFieldLine({
    label,
    line,
    named: alwaysNamed = false,
}: Readonly<{ label: LabelLineContext; line: LabelLineSpec; named?: boolean }>): React.JSX.Element | null {
    // R6 sides: split by its Separate sides line, or because the sides already differ.
    // on reload: fresh: request: a one-time split request
    const [splitAsked, setSplit] = React.useState(false);
    // A pair one of whose values is the field's own channel's (varying by data) is two lines, each value's own.
    const { pair } = line;
    const held = (field: LabelField): boolean =>
        flatHeld(label, { field }) !== undefined || boundAt(label, { field }) !== undefined;
    if (pair !== undefined && [line.field, pair].some((each) => held(each))) {
        const half = (field: LabelField, letter: string | undefined): LabelLineSpec => ({
            field,
            name:
                letter === undefined || line.name === undefined
                    ? (labelFieldDescriptor(field)?.plainName ?? field)
                    : `${line.name} ${letter}`,
            ...(line.under === undefined ? {} : { under: line.under }),
        });
        return (
            <>
                <LabelFieldLine label={label} line={half(line.field, line.letters?.[0])} named={alwaysNamed} />
                <LabelFieldLine label={label} line={half(pair, line.letters?.[1])} named={alwaysNamed} />
            </>
        );
    }
    const at = boundAt(label, line);
    if (at !== undefined) {
        return (
            <BoundAtLine
                label={label}
                name={line.name ?? labelFieldDescriptor(at.field)?.plainName ?? at.field}
                bound={at}
            />
        );
    }
    const flat = flatHeld(label, line);
    if (flat !== undefined) {
        const word =
            line.name ?? (alwaysNamed ? (labelFieldDescriptor(line.field)?.plainName ?? undefined) : undefined);
        return <Field ctx={label.ctx} descriptor={flat} word={word} />;
    }
    const { style, write, title } = label;
    const field = [line.field, ...(line.units ?? [])].find((each) => valueOf(style, each) !== undefined) ?? line.field;
    const descriptor = describedField(label, field);
    if (descriptor === undefined) {
        return null;
    }
    const fields = labelLineFields(line);
    const set = line.unit === undefined ? fields.some((each) => valueOf(style, each) !== undefined) : false;
    const shownName = line.name ?? descriptor.plainName;
    const name = lineName(title, line.fullName ?? shownName);
    // The field's own kind: a list of colors (a gradient's) is described to the controls as text, but draws the
    // gradient editor.
    const kind = labelFieldDescriptor(field)?.accepts ?? descriptor.accepts;
    const rule = line.unit === undefined ? (line.rule ?? RULE_OF_KIND[kind] ?? "R14") : (line.rule ?? "R8");
    const sideValues = line.sides?.map((each) => valueOf(style, each)) ?? [];
    const split = splitAsked || new Set(sideValues).size > 1;
    const args: LineControlArgs = { label, line, field, descriptor, name, set, split };
    const control = line.unit === undefined ? controlOf(args, rule) : unitControl(args);
    const { sides } = line;
    // A Unit line's address names its field: Main's size unit and Background's padding unit are two lines.
    const own = line.unit === undefined ? field : `${line.field}:unit`;
    const address = `${label.address ?? label.kind.style}.${own}`;
    // Every line draws its name (E674); a switch's is its checkbox's. A full-width line (R8f, R2) draws its name
    // above its control (style.css).
    const named = rule !== "R7";
    const frame = (
        <LineFrame
            line={address}
            name={named ? shownName : null}
            set={set}
            rule={rule}
            control={control}
            modifier={labelLink(label, line, field)}
            removeName={set ? `Remove ${(line.fullName ?? shownName).toLowerCase()}` : undefined}
            onRemove={() => {
                write(Object.fromEntries(fields.map((each) => [each, undefined])));
            }}
            dimmed={labelDimOf(label.ctx, label.kind.style, style, field)}
            under={line.under}
            wide={line.pair !== undefined || rangeOf(descriptor, field.endsWith("pacity"))}
        />
    );
    return sides === undefined ? (
        frame
    ) : (
        <>
            {frame}
            <SeparateSidesLine
                line={address}
                split={split}
                onChange={(on) => {
                    setSplit(on);
                    // Joined again, every side takes the top's value.
                    if (!on && new Set(sideValues).size > 1) {
                        write(Object.fromEntries(sides.map((each) => [each, sideValues[0]])));
                    }
                }}
            />
        </>
    );
}
