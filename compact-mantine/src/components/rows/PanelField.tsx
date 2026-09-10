import { Box, type ComboboxData, NumberInput, Select, TextInput } from "@mantine/core";
import { useMediaQuery, useUncontrolled } from "@mantine/hooks";
import React, { forwardRef, useRef } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { usePanelLabels } from "../../context/PanelLabelsContext";
import { useLabels } from "../../i18n";
import { FieldGlyph, type FieldGlyphName, type FieldLetter, isFieldGlyphName, isFieldLetter, UiGlyph } from "../../icons";
import type {
    ActivationHandler,
    ChangeHandler,
    GestureChangeHandler,
    GestureEndHandler,
    GestureStartHandler,
} from "../../types/events";
import { isRtl, useDirection } from "../../utils/rtl";

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
 * The horizontal padding inside a field.
 *
 * Derived, not typed: the 16px glyph slot plus this padding is exactly
 * `PANEL_GRID.VALUE_INSET`, which is the promise the whole panel is aligned on
 * -- the value begins 24px from every field's leading edge.
 */
const FIELD_PADDING_X = PANEL_GRID.VALUE_INSET - PANEL_GRID.GLYPH_SLOT;

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
 * - `"number"` -- a number box. Up and down arrows step the value, and the
 *   digits and decimal separator follow the reader's locale.
 * - `"select"` -- a drop-down. Pass `data` with the choices to get a real
 *   drop-down list; with no `data` the field draws the chevron but opens
 *   nothing of its own, which is what you want when `onClick` opens a panel you
 *   have built yourself.
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
export interface PanelFieldProps
    extends Omit<
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
     * colour swatch. A bare string is deliberately not accepted: the slot holds
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
     * A text field and a drop-down report a string. A number field reports a
     * number when what was typed is one, and the raw text while it is still
     * being typed -- which is what Mantine's own number input reports.
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
     * A short unit shown after the value, in the secondary text colour, at the
     * end of the same box -- "%", "px" per second, a count of links.
     */
    unit?: string;
    /**
     * How wide the field is: 108 for one of a pair, 224 for a field that spans
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
     * The text shown in an empty field, in the placeholder colour.
     *
     * Passing `true` instead of a string is the older spelling: it moves
     * whatever is in `value` into the placeholder, which is what a field
     * standing in for an unset value used to do. Prefer passing the text.
     */
    placeholder?: boolean | string;
    /**
     * Whether the field draws a drop-down chevron.
     * @deprecated Pass `kind="select"` instead, which does the same thing and
     * says what the field is rather than what it draws.
     */
    select?: boolean;
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
    /** How much one press of an arrow key changes a number field. */
    step?: number;
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
     */
    onScrub?: GestureChangeHandler;
    /** Called once when a drag of the glyph slot finishes or is cancelled. Close the undo transaction here. */
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

// The same props with no deprecation marker on `select`, so that reading the
// prop inside the component is not itself reported as deprecated usage. The
// marker stays on the public interface, which is where a consumer sees it.
type PanelFieldInternalProps = Omit<PanelFieldProps, "select"> & { select?: boolean };

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
 * The glyph slot is also a drag handle. Give it `onScrubStart`, `onScrub` and
 * `onScrubEnd` and dragging the glyph sideways reports how far the pointer
 * moved, with the start and end marking one interaction so a drag becomes a
 * single undo entry. Dragging is a shortcut, not the only way in: the same value
 * can always be typed.
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
export const PanelField = forwardRef<HTMLInputElement, PanelFieldProps>(function PanelField(
    outerProps,
    ref,
): React.JSX.Element {
    const props: PanelFieldInternalProps = outerProps;
    const {
        label,
        glyph,
        kind: kindProp,
        value,
        defaultValue,
        onChange,
        data,
        unit,
        width = PANEL_GRID.FIELD,
        bound = false,
        mixed = false,
        placeholder,
        select: legacySelect = false,
        pending = false,
        min,
        max,
        step,
        onScrubStart,
        onScrub,
        onScrubEnd,
        onClick,
        disabled = false,
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
    const direction = useDirection();
    // The pointer type is read with a hook because this package ships no
    // stylesheet of its own and so cannot answer it in CSS.
    const coarsePointer = useMediaQuery("(pointer: coarse)");

    const [currentValue, setValue] = useUncontrolled<string | number>({
        value: value === null ? "" : value,
        defaultValue,
        finalValue: "",
        onChange,
    });

    const kind: PanelFieldKind = kindProp ?? (legacySelect || data !== undefined ? "select" : "text");
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

    let placeholderText: string | undefined;
    if (mixed) {
        placeholderText = labels.mixed;
    } else if (valueIsPlaceholder) {
        placeholderText = valueText;
    } else if (typeof placeholder === "string") {
        placeholderText = placeholder;
    }

    // Accessibility: states that are drawn only as a colour or a mark are
    // unavailable to a screen reader, so each one also joins the field's
    // accessible description. This is Mantine's `description` element, hidden
    // from sight but wired to the input with aria-describedby by Input.Wrapper.
    const descriptions: string[] = [];
    if (mixed) {
        descriptions.push(labels.mixed);
    }

    // The per-field props are overrides of the shared strings rather than the
    // only way to set them, so a field that says nothing about its own states
    // still announces them in whatever language LabelsProvider was given.
    const boundText = boundDescription ?? labels.fieldBound;
    const pendingText = pendingDescription ?? labels.fieldPending;

    if (bound && boundText !== "") {
        descriptions.push(boundText);
    }

    if (pending && pendingText !== "") {
        descriptions.push(pendingText);
    }

    const description = descriptions.length > 0 ? descriptions.join(". ") : undefined;

    const wantsScrub = onScrubStart !== undefined || onScrub !== undefined || onScrubEnd !== undefined;
    // A coarse pointer never scrubs: there the glyph is a target, not a handle.
    const canScrub = wantsScrub && !disabled && !coarsePointer;

    // Armed on the press, started on the first movement. Keeping the two apart
    // is what makes a click on the glyph not open an undo transaction.
    const armed = useRef(false);
    const started = useRef(false);
    const lastX = useRef(0);

    /**
     * Arm a scrub on the glyph slot.
     * @param event - The pointerdown event on the slot
     */
    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!canScrub || event.button !== 0) {
            return;
        }

        // Keep the press off the input: the glyph is a handle, not a way in.
        event.preventDefault();
        event.stopPropagation();

        const handle = event.currentTarget;
        // Pointer capture keeps the rest of the drag on this element even when
        // the pointer leaves it, which is what lets the whole gesture be
        // reported as React events instead of window listeners. Guarded because
        // not every test environment implements it.
        if (typeof handle.setPointerCapture === "function") {
            handle.setPointerCapture(event.pointerId);
        }

        armed.current = true;
        started.current = false;
        lastX.current = event.clientX;
    };

    /**
     * Report how far the pointer has travelled since the previous report.
     * @param event - The pointermove event on the slot
     */
    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!armed.current) {
            return;
        }

        const travel = event.clientX - lastX.current;
        if (travel === 0) {
            return;
        }

        lastX.current = event.clientX;

        if (!started.current) {
            started.current = true;
            onScrubStart?.(event);
        }

        // The gesture is reported along the inline axis rather than the screen's
        // x axis, so that dragging in the direction the text runs raises the
        // value in every language.
        onScrub?.(isRtl(direction) ? -travel : travel, event);
    };

    /**
     * Finish a scrub, whether the pointer was released, the gesture was
     * cancelled, or the browser took the capture away.
     * @param event - The event that ended the gesture
     */
    const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (!armed.current) {
            return;
        }

        armed.current = false;

        if (started.current) {
            started.current = false;
            onScrubEnd?.(event);
        }
    };

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

    let slotContent: React.ReactNode = null;
    if (isFieldGlyphName(glyph)) {
        slotContent = <FieldGlyph name={glyph} filled={bound} />;
    } else if (isFieldLetter(glyph)) {
        slotContent = (
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
    } else if (glyph !== undefined && glyph !== null) {
        slotContent = glyph;
    }

    // The 16px slot: the field's label, its drag handle, and the thing that puts
    // the value at PANEL_GRID.VALUE_INSET from the leading edge.
    const leftSection = (
        <>
            <Box
                data-testid="panel-field-slot"
                data-scrub={canScrub ? "true" : undefined}
                onPointerDown={canScrub ? handlePointerDown : undefined}
                onPointerMove={canScrub ? handlePointerMove : undefined}
                onPointerUp={canScrub ? handlePointerEnd : undefined}
                onPointerCancel={canScrub ? handlePointerEnd : undefined}
                onLostPointerCapture={canScrub ? handlePointerEnd : undefined}
                style={{
                    position: "relative",
                    flex: "0 0 auto",
                    width: PANEL_GRID.GLYPH_SLOT,
                    height: PANEL_GRID.GLYPH_SLOT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: PANEL_INK.CHROME,
                    cursor: canScrub ? "ew-resize" : undefined,
                    touchAction: canScrub ? "none" : undefined,
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
                            background: PANEL_INK.ACCENT,
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

    const hasUnit = unit !== undefined;
    // The chevron of a drop-down lives inside the box, after the value. The
    // trailing slot at the end of the row belongs to the row's own control.
    const rightSection =
        hasUnit || showsChevron ? (
            <>
                {hasUnit && (
                    <Box
                        component="span"
                        data-testid="panel-field-unit"
                        style={{ flex: "0 0 auto", lineHeight: 1 }}
                    >
                        {unit}
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
                            marginInlineStart: hasUnit ? INLINE_GAP : 0,
                        }}
                    >
                        <UiGlyph name="chevronDown" size={PANEL_GRID.GLYPH} />
                    </Box>
                )}
            </>
        ) : undefined;

    // The width of the trailing section is also the value's inline-end padding,
    // so it has to allow for everything drawn there plus the gap before it. The
    // unit is measured in `ch`, the width of a digit at the field's own font
    // size, which is the only unit that follows a translated suffix without
    // measuring the page.
    let trailingFixed = FIELD_PADDING_X + INLINE_GAP;
    if (showsChevron) {
        trailingFixed += PANEL_GRID.GLYPH;
    }

    if (showsChevron && hasUnit) {
        trailingFixed += INLINE_GAP;
    }

    const rightSectionWidth =
        rightSection === undefined ? undefined : `calc(${String(unit?.length ?? 0)}ch + ${String(trailingFixed)}px)`;

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
        leftSection,
        leftSectionWidth: showLabels ? LABELLED_VALUE_INSET : PANEL_GRID.VALUE_INSET,
        leftSectionPointerEvents,
        leftSectionProps: {
            style: {
                // Mantine insets a section by 1px and centres its contents; the
                // panel grid wants the slot to start exactly at the field's own
                // padding so that the value lands on 24.
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
                paddingInlineEnd: FIELD_PADDING_X,
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
            input: {
                // A field is borderless, so the only thing drawing its box is a
                // fill one step away from the panel. Mantine's own default is
                // the panel's own white in the light scheme, which would leave
                // every field invisible.
                backgroundColor: PANEL_INK.SURFACE,
                // The compact theme sets its own inline padding, which would
                // win over the padding that leftSectionWidth drives and put the
                // value in the wrong place. Cleared under the same two names
                // the theme writes them in.
                paddingInlineStart: undefined,
                paddingInlineEnd: undefined,
            },
            // The word is either drawn inside the box beside the glyph or not
            // drawn at all, but it is always in the accessibility tree: this is
            // a real label element, so the field's name comes from a label and
            // its value comes from the input, and neither hides the other.
            label: VISUALLY_HIDDEN,
            description: VISUALLY_HIDDEN,
        },
        wrapperProps: {
            // The tooltip sits on the field's outer element rather than on the
            // input, so that hovering the glyph shows it too -- and so that it
            // does not become the input's accessible description, which would
            // make a screen reader read every field's name twice.
            title: title ?? label,
            "data-testid": "panel-field",
            "data-kind": kind,
            "data-bound": bound ? "true" : undefined,
            "data-mixed": mixed ? "true" : undefined,
            "data-pending": pending ? "true" : undefined,
            "data-select": showsChevron ? "true" : undefined,
            "data-disabled": disabled ? "true" : undefined,
        },
        style: {
            flex: width === "fill" ? "1 1 auto" : "0 0 auto",
            width: width === "fill" ? "100%" : width,
            minWidth: 0,
            ...style,
        },
    };

    // Accessibility: a field is a native form control rather than a composite
    // widget, so what applies is the ARIA Authoring Practices guidance on
    // "Providing Accessible Names and Descriptions" -- a real <label> element
    // names it, aria-describedby carries the states that are otherwise only a
    // colour, and the value is the input's own value. That is the fix for the
    // old role="button" with aria-label, which named the field and hid what it
    // said. A field with choices is Mantine's Select, which follows the APG
    // Combobox pattern in its select-only form: aria-haspopup="listbox",
    // aria-expanded, aria-controls and aria-activedescendant on the text box,
    // a listbox popup, and Up/Down/Enter/Escape. Verified against 8.3.10:
    // Mantine does not put role="combobox" on the box, so the box keeps its
    // native textbox role -- worth knowing before writing a getByRole against
    // it.
    if (kind === "number") {
        return (
            <NumberInput
                {...common}
                value={hidesValue ? "" : currentValue}
                onChange={handleChange}
                min={min}
                max={max}
                step={step}
                // No spinner buttons: the box is 24px tall and has a glyph in it
                // already. Up and down arrows still step the value.
                hideControls
            />
        );
    }

    if (offersChoices) {
        return (
            <Select
                {...common}
                data={data}
                value={hidesValue || valueText === "" ? null : valueText}
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
});
