import { Box, type ComboboxData, Select, TextInput } from "@mantine/core";
import { useElementSize, useMediaQuery, useUncontrolled } from "@mantine/hooks";
import React, { forwardRef } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { usePanelLabels } from "../../context/PanelLabelsContext";
import { type CompactMantineLabels, useLabels, useNumberParser } from "../../i18n";
import { FieldGlyph, type FieldGlyphName, type FieldLetter, isFieldGlyphName, isFieldLetter } from "../../icons";
import type {
    ActivationHandler,
    ChangeHandler,
    GestureChangeHandler,
    GestureEndHandler,
    GestureStartHandler,
} from "../../types/events";
import { useControlAnnotation } from "../../utils/control-annotation";
import { isRtl, useDirection } from "../../utils/rtl";
import { discardNoteContainer } from "../inputs/discard-note-container";
import { FieldCaret, ListboxCheck } from "../inputs/listbox";
import { useNumberField } from "../inputs/useNumberField";
import { useScrub } from "../inputs/useScrub";

// RT-2 in VOCAB section 11, rebased onto Mantine per section 4 of the hardening
// contract. What used to be a Box with role="button" and a text node for a value
// is now a real TextInput / NumberInput / Select, which is what makes the field
// typable and what puts its value in the accessibility tree.
//
// Verified against @mantine/core 8.3.10: `[data-with-left-section]` sets
// `--input-padding-inline-start: var(--input-left-section-size)`, and
// `--input-left-section-size` falls back to `--input-left-section-width`, which
// is exactly the `leftSectionWidth` prop. So one number sets both the slot's
// width and the inset of the value ink, in a logical property that flips itself
// under dir="rtl".

/**
 * The padding before the glyph slot.
 *
 * Derived, not typed: the 24px glyph slot plus this padding is exactly
 * `PANEL_GRID.VALUE_INSET`, which is the promise the whole panel is aligned on
 * -- the value begins 24px from every field's leading edge. On Figma's grid the
 * slot is the whole inset, so this is 0.
 */
const FIELD_PADDING_X = PANEL_GRID.VALUE_INSET - PANEL_GRID.GLYPH_SLOT;

/**
 * The value's inline-end padding: the text stops 8px before the field's end
 * (Figma's number input, design/figma-spec.md 6.1).
 */
const VALUE_END_PAD = 8;

/** What a number field says about its arrow keys, after its name and value. */
const DEFAULT_STEP_HINT = "Use arrow keys to change the value";

/**
 * The gap between a glyph and a word, or a value and its suffix, inside one
 * control.
 */
const INLINE_GAP = 4;

/**
 * The side of the accent square that marks a pending value in the slot's
 * lower corner.
 */
const PENDING_MARK = 4;

/**
 * Where the value begins when the field also draws its label word.
 *
 * The word takes a fixed column rather than its natural width, so that every
 * field in a panel still starts its value at the same place when the
 * `showLabels` preference is on.
 */
const LABELLED_VALUE_INSET = PANEL_GRID.VALUE_INSET + PANEL_GRID.LABEL_COLUMN;

// Hides an element from sight while leaving it in the accessibility tree. The
// same recipe as Mantine's own VisuallyHidden, written here as a style object
// because it is handed to the Styles API rather than rendered as an element.
const VISUALLY_HIDDEN: React.CSSProperties = {
    position: "absolute",
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    border: 0,
};

/**
 * What a field holds, and therefore which control it draws.
 *
 * - `"text"` -- a text box. The default.
 * - `"number"` -- Figma's scrubbable number box. Typing applies nothing until
 *   Enter, Tab or blur, and may be arithmetic (`40*2`); anything that does not
 *   evaluate reverts. Up and down arrows step the value at once (Shift: ten
 *   steps). Dragging the glyph slot scrubs the value at half a unit per pixel
 *   and commits once on release. Digits and the decimal separator follow the
 *   reader's locale.
 * - `"select"` -- a drop-down, drawn as Figma's outlined select trigger. Pass
 *   `data` with the choices to get a real drop-down list, which opens over the
 *   field with the current choice on top of it; with no `data` the field draws
 *   the caret but opens nothing of its own, which is what you want when
 *   `onClick` opens a panel you have built yourself.
 */
export type PanelFieldKind = "text" | "number" | "select";

/**
 * Props for the PanelField component.
 *
 * Every standard `input` prop is accepted as well and is forwarded to the
 * field's own input element, so `id`, `name`, `autoFocus`, `maxLength`,
 * `onFocus`, `onBlur`, `aria-*` and data attributes all work. `className` and
 * `style` go to the field's outer element, as they do on every Mantine input.
 */
export interface PanelFieldProps extends Omit<
    React.ComponentPropsWithoutRef<"input">,
    | "children"
    | "color"
    | "defaultValue"
    | "height"
    | "max"
    | "min"
    | "onChange"
    | "onClick"
    | "placeholder"
    | "size"
    | "step"
    | "type"
    | "value"
    | "width"
> {
    /**
     * The name of the value the field holds, such as "Smallest node size".
     *
     * It is the field's accessible name and its tooltip, and it is the word the
     * glyph stands in for. It is drawn beside the glyph only when the
     * `showLabels` preference is switched on with `PanelLabelsProvider`.
     */
    label: string;
    /**
     * A small drawing that stands in for the label word, shown in the field's
     * 16px slot.
     *
     * Pass the name of one of the built-in field glyphs, one of the five
     * capital letters `N`, `E`, `W`, `D` or `K`, or your own node such as a
     * color swatch. A bare string is deliberately not accepted: the slot holds
     * a drawing, not a word.
     */
    glyph?: FieldGlyphName | FieldLetter | Exclude<React.ReactNode, string>;
    /**
     * What the field holds, and therefore which control it draws. Defaults to a
     * text box, or to a drop-down when `data` is given.
     */
    kind?: PanelFieldKind;
    /**
     * The value the field shows. Supply it to drive the field from your own
     * state, together with `onChange`.
     *
     * Leave it out and pass `defaultValue` instead to let the field keep its own
     * value. A field given a `value` but no `onChange` is read-only, which is
     * how a field that only reports a number behaves.
     */
    value?: string | number | null;
    /** The value the field starts with when it keeps its own state. */
    defaultValue?: string | number;
    /**
     * Called when the value changes, with the new value first and the event that
     * caused it second where there is one.
     *
     * A text field reports every keystroke and a drop-down each choice, as a
     * string. A number field reports a number once per commit: Enter, Tab or
     * blur after typing, each arrow step, and the release of a scrub.
     */
    onChange?: ChangeHandler<string | number>;
    /**
     * The choices a drop-down offers, in Mantine's own `Select` shape: a list of
     * strings, a list of `{value, label}` objects, or groups of either.
     *
     * Giving this makes the field a drop-down. Leave it out on a field whose
     * choices you present yourself, and use `onClick` to open your own panel.
     */
    data?: ComboboxData;
    /**
     * A small picture for each choice in `data`, keyed by the choice's value, drawn before its
     * name in the open list. A 16 x 16 drawing in `currentColor` fits best. It is decoration:
     * the choice is still named by its label. To show the chosen one in the closed field too,
     * pass it as `glyph`.
     */
    optionGlyphs?: Readonly<Record<string, React.ReactNode>>;
    /**
     * A short unit shown after the value, in the secondary text color, at the
     * end of the same box -- "%", "px" per second, a count of links.
     */
    unit?: string;
    /**
     * How wide the field is: 88 for one of a pair, 184 for a field that spans
     * the body of a row, or `"fill"` to take whatever width its container gives
     * it.
     */
    width?: typeof PANEL_GRID.FIELD | typeof PANEL_GRID.BODY | "fill";
    /**
     * Whether the value comes from a data attribute rather than being typed in
     * once.
     *
     * The glyph draws filled instead of hollow, which is how a panel says "this
     * size follows the Age attribute" without spending a row on a
     * fixed-or-by-attribute switch.
     */
    bound?: boolean;
    /**
     * Whether the things being edited disagree about this value.
     *
     * The field shows the word for a disagreement -- "Mixed" in English, and
     * whatever `LabelsProvider` was given otherwise -- in place of a value, and
     * stays editable: typing sets every selected item at once.
     */
    mixed?: boolean;
    /**
     * The text shown in an empty field, in the placeholder color.
     *
     * Passing `true` instead of a string is the older spelling: it moves
     * whatever is in `value` into the placeholder, which is what a field
     * standing in for an unset value used to do. Prefer passing the text.
     */
    placeholder?: boolean | string;
    /**
     * Whether the value has been set but has not taken effect yet -- a layout
     * that only runs when the graph is re-laid out, say.
     *
     * A small accent square is drawn in the corner of the glyph slot, and the
     * state is announced with `pendingDescription`.
     */
    pending?: boolean;
    /** The smallest value a number field accepts. */
    min?: number;
    /** The largest value a number field accepts. */
    max?: number;
    /** How much one press of an arrow key changes a number field. Shift moves ten. */
    step?: number;
    /**
     * How many digits after the decimal separator a number field keeps. A
     * committed value is rounded to it, so `0` makes an integer field.
     */
    decimalScale?: number;
    /**
     * What a number field says about its arrow keys, after its name and value,
     * as its `aria-description`. Pass an empty string to say nothing.
     * @default "Use arrow keys to change the value"
     */
    stepHint?: string;
    /**
     * Called once when a drag of the glyph slot begins, on the first movement
     * rather than on the press.
     *
     * Open an undo transaction here, and close it in `onScrubEnd`, so that a
     * drag across a hundred pixels is one entry in the undo history rather than
     * a hundred.
     */
    onScrubStart?: GestureStartHandler;
    /**
     * Called repeatedly while the glyph slot is dragged, with how far the
     * pointer has moved since the previous call.
     *
     * The distance is positive when the pointer moves in the direction the text
     * runs -- to the right in English, to the left in Arabic or Hebrew -- so
     * dragging forwards always raises the value.
     *
     * A number field scrubs on its own (half a unit per pixel, one `onChange`
     * on release). Pass `onScrub` to take the value over yourself: the field
     * then reports the distances and changes nothing.
     */
    onScrub?: GestureChangeHandler;
    /** Called once when a drag of the glyph slot finishes or is canceled. Close the undo transaction here. */
    onScrubEnd?: GestureEndHandler;
    /**
     * Called when the field is activated by a click or by pressing Enter.
     *
     * The event is passed so you can read modifier keys, call `preventDefault`,
     * or find the element. Use it to open a panel of your own from a field whose
     * choices are too rich for a drop-down.
     */
    onClick?: ActivationHandler;
    /**
     * Whether the field cannot be used at all. It is skipped by the Tab key and
     * announced as unavailable.
     */
    disabled?: boolean;
    /**
     * One sentence saying why the field is off, used only while `disabled` is
     * true.
     *
     * It is appended to the field's name after a full stop in the tooltip --
     * "Size. Load data first" -- and joins the field's accessible description,
     * so a screen reader reads the reason instead of announcing an unexplained
     * unavailable field.
     */
    disabledReason?: string;
    /**
     * Whether the value can be read but not changed.
     *
     * Defaults to true for a field that is given a `value` and no `onChange`,
     * since such a field has nowhere to put an edit. A read-only field still
     * takes focus, so its value can be read with a screen reader.
     */
    readOnly?: boolean;
    /**
     * What a screen reader says about a field whose value comes from a data
     * attribute. Only used when `bound` is set.
     *
     * Defaults to the `fieldBound` string, so translating it once through
     * `LabelsProvider` covers every field. Pass it here only to say something
     * more specific about one field, and pass an empty string to say nothing.
     */
    boundDescription?: string;
    /**
     * What a screen reader says about a value that has been set but has not
     * taken effect yet. Only used when `pending` is set.
     *
     * Defaults to the `fieldPending` string, so translating it once through
     * `LabelsProvider` covers every field. Pass it here only to say something
     * more specific about one field, and pass an empty string to say nothing.
     */
    pendingDescription?: string;
}

/**
 * The words a field shows while its value is hidden or unset.
 * @param labels - the words
 * @param mixed - whether the selection disagrees
 * @param placeholder - the `placeholder` prop
 * @param valueText - the value, which the boolean `placeholder` moves into the placeholder
 * @returns the placeholder, if any
 */
function placeholderTextOf(
    labels: CompactMantineLabels,
    mixed: boolean,
    placeholder: boolean | string | undefined,
    valueText: string,
): string | undefined {
    if (mixed) {
        return labels.mixed;
    }
    if (placeholder === true) {
        return valueText;
    }
    return typeof placeholder === "string" ? placeholder : undefined;
}

/**
 * The states drawn only as a color or a mark, as words for the field's accessible description.
 * @param labels - the words
 * @param states - the field's states
 * @param states.mixed - whether the selection disagrees
 * @param states.bound - whether the value comes from a data attribute
 * @param states.pending - whether the value has not taken effect yet
 * @param states.boundDescription - the caller's words for a bound value
 * @param states.pendingDescription - the caller's words for a pending value
 * @returns the descriptions
 */
function stateDescriptions(
    labels: CompactMantineLabels,
    states: {
        mixed: boolean;
        bound: boolean;
        pending: boolean;
        boundDescription: string | undefined;
        pendingDescription: string | undefined;
    },
): string[] {
    const descriptions: string[] = [];
    if (states.mixed) {
        descriptions.push(labels.mixed);
    }

    // The per-field props are overrides of the shared strings rather than the
    // only way to set them, so a field that says nothing about its own states
    // still announces them in whatever language LabelsProvider was given.
    const boundText = states.boundDescription ?? labels.fieldBound;
    const pendingText = states.pendingDescription ?? labels.fieldPending;

    if (states.bound && boundText !== "") {
        descriptions.push(boundText);
    }

    if (states.pending && pendingText !== "") {
        descriptions.push(pendingText);
    }
    return descriptions;
}

/**
 * What the glyph slot draws: a field glyph, a letter, or the caller's own node.
 * @param glyph - the `glyph` prop
 * @param bound - whether the value comes from a data attribute, which fills the glyph in
 * @returns the slot's content, or null
 */
function slotContentOf(glyph: PanelFieldProps["glyph"], bound: boolean): React.ReactNode {
    if (isFieldGlyphName(glyph)) {
        return <FieldGlyph name={glyph} filled={bound} />;
    }
    if (isFieldLetter(glyph)) {
        return (
            <Box
                component="span"
                data-letter={glyph}
                style={{
                    fontSize: "var(--mantine-font-size-sm)",
                    lineHeight: 1,
                }}
            >
                {glyph}
            </Box>
        );
    }
    return glyph ?? null;
}

/**
 * The width of the trailing section, which is also the value's inline-end padding, so it allows
 * for everything drawn there plus the gap before it. The unit is measured once it is drawn. Until
 * then (and on the server) it is estimated in `ch`, the width of a digit at the field's own font
 * size -- an estimate only: "%" is wider than a digit, so a long value such as a translated
 * "Mixed" ran into the unit with no gap at all.
 * @param unit - the unit drawn after the value, if any
 * @param unitWidth - the unit's drawn width, 0 until it is measured
 * @param showsChevron - whether the section holds a drop-down's caret
 * @returns the width, or undefined when the section is empty
 */
function trailingWidthOf(
    unit: string | undefined,
    unitWidth: number,
    showsChevron: boolean,
): string | number | undefined {
    let trailingFixed = unit === undefined ? 0 : INLINE_GAP;
    trailingFixed += showsChevron ? PANEL_GRID.GLYPH_SLOT : VALUE_END_PAD;

    if (unit !== undefined && unitWidth > 0) {
        return Math.ceil(unitWidth) + trailingFixed;
    }
    if (unit !== undefined) {
        return `calc(${String(unit.length)}ch + ${String(trailingFixed)}px)`;
    }
    return showsChevron ? trailingFixed : undefined;
}

/**
 * The trailing section: the unit, and a drop-down's caret in its 24px trailing slot. The trailing
 * slot at the end of the row belongs to the row's own control.
 * @param props - Component props
 * @param props.unit - the unit drawn after the value, if any
 * @param props.showsChevron - whether to draw a drop-down's caret
 * @param props.unitRef - the ref that measures the unit
 * @returns the section
 */
function TrailingSection({
    unit,
    showsChevron,
    unitRef,
}: Readonly<{
    unit: string | undefined;
    showsChevron: boolean;
    unitRef: React.Ref<HTMLSpanElement>;
}>): React.JSX.Element {
    return (
        <>
            {unit !== undefined && (
                <Box
                    component="span"
                    data-testid="panel-field-unit"
                    style={{
                        flex: "0 0 auto",
                        lineHeight: 1,
                        paddingInlineEnd: showsChevron ? 0 : VALUE_END_PAD,
                    }}
                >
                    <span ref={unitRef} style={{ display: "inline-block" }}>
                        {unit}
                    </span>
                </Box>
            )}
            {showsChevron && (
                <Box
                    component="span"
                    data-testid="panel-field-chevron"
                    style={{
                        flex: "0 0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: PANEL_GRID.GLYPH_SLOT,
                    }}
                >
                    <FieldCaret />
                </Box>
            )}
        </>
    );
}

/**
 * The 24px slot: the field's label, its drag handle, and the thing that puts the value at
 * PANEL_GRID.VALUE_INSET from the leading edge.
 * @param props - Component props
 * @param props.slotContent - what the slot draws
 * @param props.canScrub - whether the slot is a drag handle
 * @param props.scrubHandlers - the drag's pointer handlers
 * @param props.pending - whether to draw the pending mark
 * @param props.showLabels - whether to draw the field's name beside the slot
 * @param props.label - the field's name
 * @returns the section
 */
function LeadingSection({
    slotContent,
    canScrub,
    scrubHandlers,
    pending,
    showLabels,
    label,
}: Readonly<{
    slotContent: React.ReactNode;
    canScrub: boolean;
    scrubHandlers: ReturnType<typeof useScrub>;
    pending: boolean;
    showLabels: boolean;
    label: React.ReactNode;
}>): React.JSX.Element {
    return (
        <>
            <Box
                data-testid="panel-field-slot"
                className="cm-scrub-slot"
                data-scrub={canScrub ? "true" : undefined}
                {...scrubHandlers}
                style={{
                    position: "relative",
                    flex: "0 0 auto",
                    width: PANEL_GRID.GLYPH_SLOT,
                    height: PANEL_GRID.GLYPH_SLOT,
                }}
            >
                {slotContent}
                {pending && (
                    <Box
                        data-testid="panel-field-pending"
                        style={{
                            position: "absolute",
                            // Logical, so the mark stays in the leading corner
                            // under dir="rtl" instead of crossing to the other
                            // side of the glyph.
                            insetInlineStart: 0,
                            bottom: 0,
                            width: PENDING_MARK,
                            height: PENDING_MARK,
                            background: PANEL_INK.ACCENT_GRAPHIC,
                        }}
                    />
                )}
            </Box>
            {showLabels && (
                <Box
                    component="span"
                    data-testid="panel-field-label"
                    // The real label element already carries this word as the
                    // field's accessible name, so the drawn copy is hidden from
                    // assistive technology rather than announced twice.
                    aria-hidden="true"
                    style={{
                        flex: "1 1 auto",
                        minWidth: 0,
                        marginInlineStart: INLINE_GAP,
                        fontSize: "var(--mantine-font-size-sm)",
                        lineHeight: 1,
                        color: PANEL_INK.CHROME,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </Box>
            )}
        </>
    );
}

/**
 * The props for the field's outer element. The tooltip sits there rather than on the input, so
 * that hovering the glyph shows it too -- and so that it does not become the input's accessible
 * description, which would make a screen reader read every field's name twice.
 * @param title - the tooltip
 * @param kind - what the field holds
 * @param states - the field's states
 * @param states.bound - whether the value comes from a data attribute
 * @param states.mixed - whether the selection disagrees
 * @param states.pending - whether the value has not taken effect yet
 * @param states.disabled - whether the field cannot be used
 * @returns the props
 */
function fieldWrapperProps(
    title: string | undefined,
    kind: PanelFieldKind,
    states: { bound: boolean; mixed: boolean; pending: boolean; disabled: boolean },
): Record<string, string | undefined> {
    return {
        title,
        "data-testid": "panel-field",
        "data-kind": kind,
        "data-bound": states.bound ? "true" : undefined,
        "data-mixed": states.mixed ? "true" : undefined,
        "data-pending": states.pending ? "true" : undefined,
        "data-disabled": states.disabled ? "true" : undefined,
    };
}

/**
 * The field's outer style: its width, then the caller's own style.
 * @param width - the field's width
 * @param style - the caller's style
 * @returns the style
 */
function fieldStyle(width: PanelFieldProps["width"], style: PanelFieldProps["style"]): React.CSSProperties {
    return {
        flex: width === "fill" ? "1 1 auto" : "0 0 auto",
        width: width === "fill" ? "100%" : width,
        minWidth: 0,
        ...style,
    };
}

/**
 * Which drags the glyph slot answers.
 * @param options - what the field is and who took the drag over
 * @param options.isNumber - whether the field is a number field
 * @param options.wantsScrub - whether the caller asked to hear about drags
 * @param options.takenOver - whether the caller took the drag over with onScrub
 * @param options.isReadOnly - whether the field cannot be changed
 * @param options.disabled - whether the field cannot be used
 * @param options.coarsePointer - whether the pointer is coarse
 * @returns whether the field scrubs its own value, and whether the slot is a drag handle at all
 */
function scrubModes(options: {
    isNumber: boolean;
    wantsScrub: boolean;
    takenOver: boolean;
    isReadOnly: boolean;
    disabled: boolean;
    coarsePointer: boolean;
}): { scrubsValue: boolean; canScrub: boolean } {
    // A number field scrubs its own value unless the caller took the drag
    // over with onScrub.
    const scrubsValue = options.isNumber && !options.takenOver && !options.isReadOnly;
    // A coarse pointer never scrubs: there the glyph is a target, not a handle.
    const canScrub = (options.wantsScrub || scrubsValue) && !options.disabled && !options.coarsePointer;
    return { scrubsValue, canScrub };
}

/**
 * A number field's text and value.
 * @param valueText - the value as text
 * @param hidesValue - whether the value is hidden behind the placeholder
 * @param mixed - whether the selection disagrees
 * @param parse - reads a number in the reader's locale
 * @returns the text the box shows, and the number, or null when there is none
 */
function numberReadingOf(
    valueText: string,
    hidesValue: boolean,
    mixed: boolean,
    parse: (text: string) => number,
): { numberText: string; numberValue: number | null } {
    const numberText = hidesValue ? "" : valueText;
    const parsed = valueText === "" || mixed ? Number.NaN : parse(valueText);
    return { numberText, numberValue: Number.isNaN(parsed) ? null : parsed };
}

/**
 * What Escape says it kept in a number field, or "" when Escape discarded nothing.
 * @param labels - the words
 * @param discarded - whether Escape just discarded an edit
 * @param numberText - the text the box shows
 * @param placeholderText - the placeholder, said in place of an empty value
 * @param unit - the unit drawn after the value, if any
 * @returns the note's words
 */
function discardedTextOf(
    labels: CompactMantineLabels,
    discarded: boolean,
    numberText: string,
    placeholderText: string | undefined,
    unit: string | undefined,
): string {
    if (!discarded) {
        return "";
    }
    return labels.colorEditDiscarded(numberText === "" ? (placeholderText ?? "") : `${numberText}${unit ?? ""}`);
}

/**
 * A drop-down's option renderer that draws each option's glyph, or undefined for Mantine's own.
 * @param optionGlyphs - the glyph of each option, by value
 * @returns the renderer
 */
function optionRenderer(
    optionGlyphs: PanelFieldProps["optionGlyphs"],
): ((item: { option: { value: string; label: string } }) => React.JSX.Element) | undefined {
    if (optionGlyphs === undefined) {
        return undefined;
    }
    return function GlyphOption({ option }: { option: { value: string; label: string } }): React.JSX.Element {
        return (
            <span className="cm-listbox-option-content" title={option.label}>
                <ListboxCheck />
                {optionGlyphs[option.value] !== undefined && (
                    <span className="cm-listbox-glyph" aria-hidden="true">
                        {optionGlyphs[option.value]}
                    </span>
                )}
                <span className="cm-listbox-label">{option.label}</span>
            </span>
        );
    };
}

/**
 * What a field holds: the `kind` given, else a drop-down when it has choices, else text.
 * @param kind - the `kind` prop
 * @param data - the choices, if any
 * @returns the kind
 */
function kindOf(kind: PanelFieldKind | undefined, data: ComboboxData | undefined): PanelFieldKind {
    return kind ?? (data !== undefined ? "select" : "text");
}

/**
 * A drop-down's value: none while the value is hidden or empty.
 * @param hidesValue - whether the value is hidden behind the placeholder
 * @param valueText - the value as text
 * @returns the value, or null
 */
function selectValueOf(hidesValue: boolean, valueText: string): string | null {
    return hidesValue || valueText === "" ? null : valueText;
}

/**
 * A compact field for one changeable value, with a glyph in place of a caption.
 *
 * This is the control a dense property panel is mostly made of. Instead of
 * stacking a caption above an input, the caption becomes a small drawing inside
 * the input's own box, which halves the height of the panel. The drawing sits in
 * a 16px slot, and that slot is what holds the value at exactly 24px from the
 * field's leading edge in every field of every row.
 *
 * It is a real form control: a text box, a number box or a drop-down, depending
 * on `kind`. It can be typed into, it announces its own value to a screen
 * reader, and it works with `value`/`onChange` or on its own with
 * `defaultValue`. A field given a `value` and no `onChange` is read-only.
 *
 * The states are the reason it is one component rather than several: a value can
 * come from a data attribute (`bound`, which fills the glyph in), be disagreed
 * about across a multiple selection (`mixed`), stand in for an unset value
 * (`placeholder`), offer a list of choices (`kind="select"`), or have been set
 * without taking effect yet (`pending`).
 *
 * The glyph slot is also a drag handle. A number field scrubs itself: dragging
 * the glyph sideways moves the value half a unit per pixel, with the page
 * cursor held at `ew-resize`, and commits once on release. Give any field
 * `onScrubStart`, `onScrub` and `onScrubEnd` and the drag reports how far the
 * pointer moved instead, with the start and end marking one interaction so a
 * drag becomes a single undo entry. Dragging is a shortcut, not the only way
 * in: the same value can always be typed.
 * @example
 * ```tsx
 * const [size, setSize] = useState("1.0");
 *
 * <PanelField
 *     label="Smallest node size"
 *     glyph="sizeSmallest"
 *     kind="number"
 *     value={size}
 *     onChange={(next) => { setSize(String(next)); }}
 *     onScrubStart={() => { history.begin(); }}
 *     onScrub={(delta) => { setSize((current) => String(Number(current) + delta / 20)); }}
 *     onScrubEnd={() => { history.commit(); }}
 * />
 * ```
 */
export const PanelField = forwardRef<HTMLInputElement, PanelFieldProps>(
    function PanelField(props, ref): React.JSX.Element {
        const {
            label,
            glyph,
            kind: kindProp,
            value,
            defaultValue,
            onChange,
            data,
            optionGlyphs,
            unit,
            width = PANEL_GRID.FIELD,
            bound = false,
            mixed = false,
            placeholder,
            pending = false,
            min,
            max,
            step,
            decimalScale,
            stepHint = DEFAULT_STEP_HINT,
            onScrubStart,
            onScrub,
            onScrubEnd,
            onClick,
            disabled = false,
            disabledReason,
            readOnly,
            boundDescription,
            pendingDescription,
            title,
            style,
            className,
            onKeyDown,
            ...rest
        } = props;

        const showLabels = usePanelLabels();
        const labels = useLabels();
        const parseNumber = useNumberParser();
        const direction = useDirection();
        // Read with a hook rather than a media query in the stylesheet because it
        // decides whether the scrub handlers are attached at all.
        const coarsePointer = useMediaQuery("(pointer: coarse)");
        // The unit's drawn width, so the value stops INLINE_GAP before it whatever the suffix is.
        const { ref: unitRef, width: unitWidth } = useElementSize<HTMLSpanElement>();

        const [currentValue, setValue] = useUncontrolled<string | number>({
            value: value === null ? "" : value,
            defaultValue,
            finalValue: "",
            onChange,
        });

        const kind = kindOf(kindProp, data);
        const showsChevron = kind === "select";
        const offersChoices = kind === "select" && data !== undefined;

        // A field with a value and nowhere to send an edit is read-only rather than
        // a controlled input with no handler, which React warns about and which
        // would let a person type into a field that silently discards what they
        // typed.
        const isReadOnly = readOnly ?? (onChange === undefined && defaultValue === undefined);

        const valueText = String(currentValue);
        // The older boolean spelling of `placeholder` means "what is in `value` is
        // not really set", so the value moves into the placeholder and the field is
        // left empty -- which is both what it looked like before and what it now
        // means to a screen reader.
        const valueIsPlaceholder = placeholder === true;
        const hidesValue = mixed || valueIsPlaceholder;

        const placeholderText = placeholderTextOf(labels, mixed, placeholder, valueText);

        // Accessibility: states that are drawn only as a color or a mark are
        // unavailable to a screen reader, so each one also joins the field's
        // accessible description. This is Mantine's `description` element, hidden
        // from sight but wired to the input with aria-describedby by Input.Wrapper.
        const descriptions = stateDescriptions(labels, { mixed, bound, pending, boundDescription, pendingDescription });

        const annotation = useControlAnnotation({
            name: label,
            enabledTitle: title ?? label,
            disabled,
            disabledReason,
            extraDescriptions: descriptions,
        });
        const { description } = annotation;

        const isNumber = kind === "number";
        const wantsScrub = onScrubStart !== undefined || onScrub !== undefined || onScrubEnd !== undefined;
        const { scrubsValue, canScrub } = scrubModes({
            isNumber,
            wantsScrub,
            takenOver: onScrub !== undefined,
            isReadOnly,
            disabled,
            coarsePointer,
        });

        const { numberText, numberValue } = numberReadingOf(valueText, hidesValue, mixed, parseNumber);
        const numberField = useNumberField({
            value: numberValue,
            display: numberText,
            onCommit: (next, event) => {
                setValue(next, event);
            },
            parse: parseNumber,
            min,
            max,
            step,
            decimalScale,
            locked: disabled || isReadOnly,
        });

        const scrubHandlers = useScrub(canScrub, isRtl(direction), {
            onStart: (event) => {
                onScrubStart?.(event);
                if (scrubsValue) {
                    numberField.scrub.onStart?.(event);
                }
            },
            onMove: (delta, total, event) => {
                onScrub?.(delta, event);
                if (scrubsValue) {
                    numberField.scrub.onMove?.(delta, total, event);
                }
            },
            onEnd: (event) => {
                if (scrubsValue) {
                    numberField.scrub.onEnd?.(event);
                }
                onScrubEnd?.(event);
            },
        });

        /**
         * Activate the field from a click.
         * @param event - The click event on the input
         */
        const handleClick = (event: React.MouseEvent<HTMLInputElement>): void => {
            if (!disabled) {
                onClick?.(event);
            }
        };

        /**
         * Forward the caller's own key handler, then activate the field from the
         * keyboard.
         * @param event - The keydown event on the input
         */
        const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
            onKeyDown?.(event);

            if (onClick === undefined || disabled || event.defaultPrevented) {
                return;
            }

            // A drop-down that owns a list of its own answers Enter itself, so the
            // field does not take it away. Space activates only a field that cannot
            // be typed into, where it is not a character.
            if (offersChoices) {
                return;
            }

            if (event.key === "Enter" || (event.key === " " && isReadOnly)) {
                event.preventDefault();
                onClick(event);
            }
        };

        /**
         * Record a new value and tell the caller about it.
         * @param next - The value the control now holds
         * @param event - The event that changed it, where there is one
         */
        const handleChange = (next: string | number, event?: React.SyntheticEvent): void => {
            setValue(next, event);
        };

        const slotContent = slotContentOf(glyph, bound);

        // The 24px slot: the field's label, its drag handle, and the thing that puts the value at
        // PANEL_GRID.VALUE_INSET from the leading edge.
        const leftSection = (
            <LeadingSection
                slotContent={slotContent}
                canScrub={canScrub}
                scrubHandlers={scrubHandlers}
                pending={pending}
                showLabels={showLabels}
                label={label}
            />
        );

        const bareTrigger = showsChevron && slotContent === null && !pending && !showLabels;
        // The caret of a drop-down lives inside the box, in its 24px trailing slot.
        const rightSection =
            unit !== undefined || showsChevron ? (
                <TrailingSection unit={unit} showsChevron={showsChevron} unitRef={unitRef} />
            ) : undefined;
        const rightSectionWidth = trailingWidthOf(unit, unitWidth, showsChevron);

        const leftSectionPointerEvents: React.CSSProperties["pointerEvents"] = canScrub ? "auto" : "none";
        const rightSectionPointerEvents: React.CSSProperties["pointerEvents"] = "none";

        const common = {
            // Before the spread, so that a caller who supplies their own test id on
            // the input wins.
            "data-testid": "panel-field-value",
            ...rest,
            ref,
            className,
            label,
            description,
            placeholder: placeholderText,
            disabled,
            readOnly: isReadOnly,
            onClick: handleClick,
            onKeyDown: handleKeyDown,
            // A drop-down is Figma's outlined select trigger; every other field is
            // the filled field.
            variant: showsChevron ? "outlined" : "filled",
            // A drop-down with nothing in its slot is Figma's plain select trigger, its text 9px in;
            // every other field keeps the 24px slot so its value lands on PANEL_GRID.VALUE_INSET.
            leftSection: bareTrigger ? undefined : leftSection,
            leftSectionWidth: showLabels ? LABELLED_VALUE_INSET : PANEL_GRID.VALUE_INSET,
            leftSectionPointerEvents,
            leftSectionProps: {
                style: {
                    // The slot starts exactly at the field's own padding so that
                    // the value lands on 24.
                    insetInlineStart: 0,
                    justifyContent: "flex-start",
                    paddingInlineStart: FIELD_PADDING_X,
                },
            },
            rightSection,
            rightSectionWidth,
            rightSectionPointerEvents,
            rightSectionProps: {
                style: {
                    insetInlineEnd: 0,
                    justifyContent: "flex-end",
                    // `ch` in the width above and in the padding it drives have to
                    // resolve against the same font, so the section is pinned to the
                    // field's own size.
                    fontSize: "var(--mantine-font-size-sm)",
                    color: PANEL_INK.CHROME,
                },
            },
            styles: {
                wrapper: {
                    // A hidden description still makes Mantine reserve room above
                    // the input; the field is exactly one 24px row and reserves
                    // none.
                    marginTop: 0,
                    marginBottom: 0,
                    // A disagreement reads at full strength, because it is the
                    // answer rather than a hint about one.
                    "--input-placeholder-color": mixed ? PANEL_INK.VALUE : PANEL_INK.PLACEHOLDER,
                },
                // The word is either drawn inside the box beside the glyph or not
                // drawn at all, but it is always in the accessibility tree: this is
                // a real label element, so the field's name comes from a label and
                // its value comes from the input, and neither hides the other.
                label: VISUALLY_HIDDEN,
                description: VISUALLY_HIDDEN,
            },
            wrapperProps: fieldWrapperProps(annotation.title, kind, { bound, mixed, pending, disabled }),
            style: fieldStyle(width, style),
        };

        // Accessibility: a field is a native form control rather than a composite
        // widget, so what applies is the ARIA Authoring Practices guidance on
        // "Providing Accessible Names and Descriptions" -- a real <label> element
        // names it, aria-describedby carries the states that are otherwise only a
        // color, and the value is the input's own value. A number field is a text
        // input with role="spinbutton" and aria-valuenow (it has to accept
        // arithmetic, which a numeric input refuses). A field with choices is
        // Mantine's Select, which follows the APG Combobox pattern in its
        // select-only form: aria-haspopup="listbox", aria-controls and
        // aria-activedescendant on the text box, a listbox popup, and
        // Up/Down/Enter/Space/Escape.
        if (isNumber) {
            const hint = stepHint === "" ? {} : { "aria-description": stepHint };
            const discardedText = discardedTextOf(labels, numberField.discarded, numberText, placeholderText, unit);
            return (
                <TextInput
                    {...common}
                    {...numberField.inputProps}
                    {...hint}
                    onKeyDown={numberField.inputProps.onKeyDown}
                    classNames={{ wrapper: "cm-number-field" }}
                    // Escape takes the typing back and says so, as every number field does.
                    inputContainer={discardNoteContainer(discardedText)}
                />
            );
        }

        if (offersChoices) {
            return (
                <Select
                    {...common}
                    data={data}
                    renderOption={optionRenderer(optionGlyphs)}
                    value={selectValueOf(hidesValue, valueText)}
                    onChange={(next) => {
                        handleChange(next ?? "");
                    }}
                />
            );
        }

        return (
            <TextInput
                {...common}
                value={hidesValue ? "" : valueText}
                onChange={(event) => {
                    handleChange(event.currentTarget.value, event);
                }}
            />
        );
    },
);
