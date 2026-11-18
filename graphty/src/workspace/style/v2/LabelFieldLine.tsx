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
    type LabelLocation,
    type LabelLocationPlace,
} from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import { Checkbox, Group, Stack } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../../glyphs";
import { shownChannel } from "../offered";
import { GradientBar } from "../parts/GradientRow";
import { Field, type RowContext } from "../PropertyRow";
import { ValueField } from "../ValueField";
import { enumWords, positionWord } from "../words";
import {
    flatOf,
    LABEL_OPTION_NAMES,
    type LabelField,
    labelFieldDescriptor,
    labelLineFields,
    type LabelLineSpec,
    type TextThing,
} from "./labelRubric";
import { segmentOptions } from "./rubric";
import { FontSelect, LineFrame, NumberLine, PresetLine, SegmentsLine } from "./RubricLine";
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
    const { plainName, accepts, values, min, max, integer } = found;
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
 * A number, or a pair of numbers with their letters (R5).
 * @param args - the line.
 * @param args.label - the line's label
 * @param args.line - the line's line
 * @param args.field - the line's field
 * @param args.descriptor - the line's descriptor
 * @param args.name - the line's name
 * @returns The control
 */
function numberControl({ label, line, field, descriptor, name }: LineControlArgs): React.ReactNode {
    const percent = field.endsWith("pacity");
    const one = (which: LabelField, glyph: React.ReactNode, words: string): React.JSX.Element => (
        <NumberLine
            descriptor={describedField(label, which) ?? descriptor}
            label={words}
            percent={percent}
            value={valueOf(label.style, which)}
            glyph={glyph}
            onWrite={(next) => {
                label.write({ [which]: next });
            }}
        />
    );
    if (line.pair === undefined) {
        const Glyph = line.glyph === undefined ? undefined : GLYPHS[line.glyph];
        return one(field, Glyph === undefined ? undefined : <Glyph size={12} aria-hidden />, name);
    }
    const [a, b] = line.letters ?? ["", ""];
    const second = labelFieldDescriptor(line.pair)?.plainName ?? line.pair;
    return (
        <Group grow gap={4} wrap="nowrap">
            {one(field, a === "" ? undefined : a, name)}
            {one(line.pair, b === "" ? undefined : b, `${label.title} ${second.toLowerCase()}`)}
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
            label={`${name} unit`}
            options={units.map((unit) => ({ value: unit.field, name: unit.name }))}
            value={held?.field ?? ""}
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
    const value = valueOf(label.style, field);
    return (
        <PanelField
            label={name}
            kind="select"
            width="fill"
            data={(descriptor.values ?? []).map((each) => ({ value: each, label: optionWord(field, each) }))}
            value={typeof value === "string" ? value : null}
            onChange={(next) => {
                label.write({ [field]: String(next) });
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
    const value = valueOf(label.style, field);
    const place = LABEL_LOCATION_PLACES.find((each) => each.id === value);
    const grid = place === undefined ? undefined : gridOf(place);
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
        <Stack gap={4}>
            <SegmentsLine
                label={name}
                options={grids.map((each) => ({ value: each, name: GRID_WORDS[each] }))}
                value={grid ?? ""}
                onPick={(picked) => {
                    const next =
                        picked === "auto" ? "automatic" : placeAt(picked === "inside" ? "inside" : "outside", cell);
                    if (next !== undefined) {
                        label.write({ [field]: next });
                    }
                }}
            />
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
        </Stack>
    );
}

/**
 * The control a line's rule picks.
 * @param args - the line.
 * @param rule - its rule.
 * @returns The control
 */
function controlOf(args: LineControlArgs, rule: string): React.ReactNode {
    const { label, line, field, descriptor, name, set } = args;
    const value = valueOf(label.style, field);
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
        case "R7":
            return (
                <Checkbox
                    size="xs"
                    label={line.name ?? descriptor.plainName}
                    checked={value === true}
                    onChange={(event) => {
                        write(event.currentTarget.checked);
                    }}
                />
            );
        case "R8":
        case "R8f": {
            const values = descriptor.accepts === "boolean" ? ["true", "false"] : (descriptor.values ?? []);
            return (
                <SegmentsLine
                    label={name}
                    options={segmentOptions({ channel: field }, values, LABEL_OPTION_NAMES) ?? []}
                    value={typeof value === "string" || typeof value === "boolean" ? String(value) : ""}
                    onPick={(picked) => {
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
                    value={value}
                    shown={undefined}
                    waiting={!set}
                    swatches={label.ctx.documentColors}
                    onChange={write}
                />
            );
    }
}

/** The rule a field's kind gives a line that names none. */
const RULE_OF_KIND: Readonly<Record<string, string>> = {
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
    const flat = [line.field, ...(line.units ?? [])]
        .map((field) => flatOf(ctx.side, kind.style, field))
        .find((channel): channel is Channel => channel !== undefined && setOn(ctx, channel));
    return flat === undefined ? undefined : shownChannel(ctx.session, ctx.side, flat, true);
}

/**
 * One label line: see the file header.
 * @param props - Component props
 * @param props.label - the label it belongs to
 * @param props.line - the line
 * @returns The line, or nothing for a field the element does not describe
 */
export function LabelFieldLine({
    label,
    line,
}: Readonly<{ label: LabelLineContext; line: LabelLineSpec }>): React.JSX.Element | null {
    const flat = flatHeld(label, line);
    if (flat !== undefined) {
        return <Field ctx={label.ctx} descriptor={flat} word={line.name ?? undefined} />;
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
    const name = `${title} ${shownName.toLowerCase()}`;
    const rule = line.unit === undefined ? (line.rule ?? RULE_OF_KIND[descriptor.accepts] ?? "R14") : "R8";
    const args: LineControlArgs = { label, line, field, descriptor, name, set };
    const control = line.unit === undefined ? controlOf(args, rule) : unitControl(args);
    const Toggle = GLYPHS[line.toggleGlyph ?? "lock"];
    const { toggle } = line;
    const toggleWord = toggle === undefined ? "" : (labelFieldDescriptor(toggle)?.plainName ?? toggle);
    const modifier =
        toggle === undefined ? null : (
            <ToggleIconButton
                size="sm"
                label={toggleWord}
                icon={<Toggle size={14} aria-hidden />}
                checked={valueOf(style, toggle) === true}
                onChange={(on) => {
                    write({ [toggle]: on });
                }}
            />
        );
    const named = rule !== "R7" && rule !== "R8f" && rule !== "R2" && line.name !== null;
    return (
        <LineFrame
            line={`${label.kind.style}.${line.unit === undefined ? field : "unit"}`}
            name={named ? shownName : null}
            set={set}
            rule={rule}
            control={control}
            modifier={modifier}
            removeName={set ? `Remove ${shownName.toLowerCase()}` : undefined}
            onRemove={() => {
                write(Object.fromEntries(fields.map((each) => [each, undefined])));
            }}
        />
    );
}
