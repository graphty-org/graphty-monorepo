import { ActionIcon, Group, NumberInput } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels, useLocale, useNumberParser } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";

// One of the "style" trio (StyleSelect, StyleNumberInput, CompactColorInput):
// the older half of the library, brought to the same standard as the row types.
// Contract sections 1, 2.1, 2.2, 2.3, 3 and 7 were applied here.
//
// Accessibility: the APG "Spinbutton" pattern when the steppers are shown --
// Mantine's NumberInput draws them as two buttons and handles ArrowUp,
// ArrowDown, PageUp, PageDown, Home and End itself -- and a plain labelled text
// box with inputMode="numeric" when `hideControls` leaves them out, which is
// this library's default. The name comes from the visible label element rather
// than from an aria-label, so the label is not replaced by a duplicate of
// itself.

/**
 * The gap between the control and the reset button beside it.
 *
 * Narrower than the panel grid's own trailing gap: these two controls are laid
 * out as one unit rather than as a row with a trailing slot.
 */
const CONTROL_GAP = 4;

/**
 * How far the reset button is lifted off the baseline so its glyph sits level
 * with the text in the control beside it, which carries a label above it.
 */
const RESET_BASELINE_LIFT = 2;

/**
 * A number with a fraction, used only to read a locale's decimal separator off
 * `Intl`.
 */
const DECIMAL_SAMPLE = 1.1;

/**
 * The character the active locale writes between a whole number and its
 * fraction.
 *
 * A comma in most of Europe, a period in English and Japanese. Mantine's
 * `NumberInput` accepts only the separator it is told about, so without this it
 * silently refuses the key half the world reaches for.
 * @returns The decimal separator for the active locale
 */
function useDecimalSeparator(): string {
    const locale = useLocale();

    return useMemo(() => {
        const parts = new Intl.NumberFormat(locale).formatToParts(DECIMAL_SAMPLE);
        return parts.find((part) => part.type === "decimal")?.value ?? ".";
    }, [locale]);
}

/**
 * Props for the StyleNumberInput component.
 */
export interface StyleNumberInputProps {
    /** The control's name, drawn above it and read out as its accessible name. */
    label: string;
    /**
     * The number, when you drive the control from your own state.
     *
     * `undefined` does not mean "empty" here: it means the reader has typed
     * nothing and the control is showing `defaultValue`.
     */
    value?: number | undefined;
    /** What is shown, in italics, while the reader has entered nothing of their own. */
    defaultValue: number;
    /**
     * Called when the reader commits a number, and with `undefined` when they
     * reset the control to its default.
     *
     * A number is committed when the control loses focus rather than on every
     * keystroke, so a half-typed "1" on the way to "12" is never reported. The
     * event that caused the change is passed second.
     */
    onChange?: ChangeHandler<number | undefined>;
    /** The smallest number accepted. Anything lower is pulled up to it on commit. */
    min?: number;
    /** The largest number accepted. Anything higher is pulled down to it on commit. */
    max?: number;
    /** How far the steppers and the arrow keys move the number each time. */
    step?: number;
    /** How many digits after the decimal separator to keep. */
    decimalScale?: number;
    /** A unit written after the number, such as `"%"` or `"px"`. */
    suffix?: string;
    /**
     * Whether to leave out the up and down steppers.
     *
     * They are left out by default, because a 24px panel row has no room for
     * them; the arrow keys still work either way.
     * @default true
     */
    hideControls?: boolean;
    /**
     * Whether the control cannot be used at all.
     *
     * A disabled control is drawn in the same dimmed ink as every other
     * disabled control in the library, is skipped by the Tab key, and is
     * announced as unavailable. Its reset button is disabled with it, so the
     * value cannot be changed by any route.
     * @default false
     */
    disabled?: boolean;
    /** Called when the control takes focus. Forwarded unchanged. */
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    /**
     * Called when the control loses focus.
     *
     * Forwarded after the number has been committed, so reading the state you
     * keep for this control inside the handler sees the new value.
     */
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * A number box that says whether the reader typed its value or inherited it.
 *
 * It is a Mantine `NumberInput` with one idea added: `undefined` means "nothing
 * has been entered here", so the control shows `defaultValue` in italics and
 * offers no reset. As soon as the reader commits a number of their own the text
 * turns upright and a reset button appears beside it, and pressing that reset
 * reports `undefined` again. A panel built from these reads at a glance as a
 * list of what has been customised and what has not.
 *
 * The number is committed when the control loses focus, not on every keystroke,
 * so what the reader is part-way through typing is never sent anywhere and the
 * control never takes the caret away mid-word. On commit the number is pulled
 * into `min`..`max` and the box is redrawn showing what was actually kept.
 *
 * What the reader types is read in their own locale, so `3,14` is 3.14 wherever
 * the comma is the decimal separator, and the locale's own digits are numbers
 * rather than nonsense. The locale comes from `LabelsProvider`, then from the
 * document, then from the browser.
 *
 * Reach for Mantine's own `NumberInput` for an ordinary form. Reach for this
 * one where a value has a sensible default that the reader is overriding rather
 * than filling in.
 * @param props - Component props
 * @param props.label - The control's name, drawn above it
 * @param props.value - The number, when you drive the control from your own state
 * @param props.defaultValue - What is shown while the reader has entered nothing of their own
 * @param props.onChange - Called with the committed number, or with `undefined` when the control is reset
 * @param props.min - The smallest number accepted
 * @param props.max - The largest number accepted
 * @param props.step - How far the steppers and the arrow keys move the number
 * @param props.decimalScale - How many digits after the decimal separator to keep
 * @param props.suffix - A unit written after the number
 * @param props.hideControls - Whether to leave out the up and down steppers, which are left out by default
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.onFocus - Called when the control takes focus
 * @param props.onBlur - Called when the control loses focus, after the number has been committed
 * @returns The number box, and its reset button when a number has been entered
 * @example
 * ```tsx
 * const [size, setSize] = useState<number | undefined>(undefined);
 *
 * <StyleNumberInput
 *     label="Size"
 *     value={size}
 *     defaultValue={10}
 *     min={1}
 *     max={100}
 *     suffix="px"
 *     onChange={setSize}
 * />
 * ```
 */
export function StyleNumberInput({
    label,
    value,
    defaultValue,
    onChange,
    min,
    max,
    step,
    decimalScale,
    suffix,
    hideControls = true,
    disabled = false,
    onFocus,
    onBlur,
}: StyleNumberInputProps): React.JSX.Element {
    const labels = useLabels();
    const parseNumber = useNumberParser();
    const decimalSeparator = useDecimalSeparator();

    // Controlled and uncontrolled, the way every state-holding component in
    // this package works. The uncontrolled state starts at undefined, which is
    // this component's word for "the reader has entered nothing".
    const [committed, setCommitted] = useUncontrolled<number | undefined>({
        value,
        defaultValue: undefined,
        finalValue: undefined,
        onChange,
    });

    const isDefault = committed === undefined;
    const displayValue = committed ?? defaultValue;

    // What the box is showing, which is not the committed value while the
    // reader is part-way through typing.
    const [draft, setDraft] = useState<string | number>(displayValue);

    // True for the render that follows a keystroke, so the effect below can
    // tell a value arriving from outside from the one the reader is typing and
    // does not pull the caret back to a number they have moved on from.
    const isTypingRef = useRef(false);

    useEffect(() => {
        if (!isTypingRef.current) {
            setDraft(committed ?? defaultValue);
        }

        isTypingRef.current = false;
    }, [committed, defaultValue]);

    /**
     * Record a keystroke without committing it.
     * @param next - What the box now holds, as Mantine reports it
     */
    const handleInputChange = (next: string | number): void => {
        isTypingRef.current = true;
        setDraft(next);
    };

    /**
     * Commit what was typed, pulled into range, and hand the blur on.
     *
     * What the reader typed is read in their own locale rather than with
     * `parseFloat`, which understands only a period and only ASCII digits.
     * Text that holds no number at all leaves the committed value alone and
     * redraws the box from it.
     * @param event - The blur that ended the edit
     */
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
        const typed = typeof draft === "string" ? parseNumber(draft) : draft;

        if (Number.isNaN(typed)) {
            setDraft(committed ?? defaultValue);
            onBlur?.(event);
            return;
        }

        let clamped = typed;
        if (min !== undefined && clamped < min) {
            clamped = min;
        }
        if (max !== undefined && clamped > max) {
            clamped = max;
        }

        if (clamped !== committed) {
            setCommitted(clamped, event);
        }

        // Redraw from what was kept, so a number pulled into range does not
        // stay on screen at the value that was refused.
        setDraft(clamped);
        onBlur?.(event);
    };

    /**
     * Give the control back to its default.
     * @param event - The click, or the click a browser synthesises from Enter or Space
     */
    const handleReset = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setCommitted(undefined, event);
    };

    return (
        <Group data-testid="style-number-input" gap={CONTROL_GAP} wrap="nowrap" align="flex-end">
            <NumberInput
                data-testid="style-number-input-field"
                label={label}
                value={draft}
                onChange={handleInputChange}
                onFocus={onFocus}
                onBlur={handleBlur}
                min={min}
                max={max}
                step={step}
                decimalScale={decimalScale}
                decimalSeparator={decimalSeparator}
                suffix={suffix}
                hideControls={hideControls}
                disabled={disabled}
                data-is-default={isDefault ? "true" : "false"}
                styles={{
                    input: isDefault
                        ? {
                              fontStyle: "italic",
                              color: PANEL_INK.CHROME,
                          }
                        : undefined,
                }}
                style={{ flex: 1 }}
            />
            {/* The reset is drawn only once there is something to undo, so a
                panel of untouched controls stays quiet. Its 24px box is the
                WCAG 2.2 (2.5.8) target-size minimum, which the 18px "xs"
                ActionIcon it used to be did not meet. */}
            {!isDefault && (
                <ActionIcon
                    variant="subtle"
                    size={PANEL_GRID.TRAIL}
                    c={PANEL_INK.CHROME}
                    data-testid="style-number-input-reset"
                    disabled={disabled}
                    aria-label={labels.resetToDefault(label)}
                    onClick={handleReset}
                    style={{ marginBlockEnd: RESET_BASELINE_LIFT }}
                >
                    <UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
            )}
        </Group>
    );
}
