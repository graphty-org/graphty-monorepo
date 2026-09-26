import { ActionIcon, Group, TextInput } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useMemo } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels, useLocale, useNumberParser } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { useControlAnnotation, VISUALLY_HIDDEN_STYLE } from "../utils/control-annotation";
import { useNumberField } from "./inputs/useNumberField";

// One of the "style" trio (StyleSelect, StyleNumberInput, CompactColorInput):
// the older half of the library, brought to the same standard as the row types.
// Contract sections 1, 2.1, 2.2, 2.3, 3 and 7 were applied here.
//
// Accessibility: the APG "Spinbutton" pattern without stepper buttons -- a
// text input with role="spinbutton", aria-valuenow / min / max, and ArrowUp /
// ArrowDown stepping (Shift: ten steps). It is a text input rather than a
// numeric one because it accepts arithmetic (`40*2`), which a numeric input
// refuses. The name comes from the visible label element rather than from an
// aria-label, so the label is not replaced by a duplicate of itself.

/**
 * The gap between the control and the reset button beside it: the panel
 * grid's trailing gap, so the reset sits in the row's trailing slot
 * (design/figma-spec.md 6.1, "reset button stays ... in the trailing slot").
 */
const CONTROL_GAP = PANEL_GRID.TRAIL_GAP;

/** The most fraction digits a number is written with when `decimalScale` does not say. */
const MAX_FRACTION_DIGITS = 10;

/**
 * Write a number the way the active locale does -- `3,5` in German -- without
 * digit grouping, so what is shown can be typed back in.
 * @param decimalScale - fraction digits to keep, when fixed
 * @returns The formatter for the active locale
 */
function useNumberWriter(decimalScale: number | undefined): (value: number) => string {
    const locale = useLocale();

    return useMemo(() => {
        const format = new Intl.NumberFormat(locale, {
            useGrouping: false,
            maximumFractionDigits: decimalScale ?? MAX_FRACTION_DIGITS,
        });
        return (value: number): string => format.format(value);
    }, [locale, decimalScale]);
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
    /** What is shown while the reader has entered nothing of their own. */
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
    /** How far the arrow keys move the number each time. Shift moves ten. */
    step?: number;
    /** How many digits after the decimal separator to keep. */
    decimalScale?: number;
    /** A unit written after the number, such as `"%"` or `"px"`. */
    suffix?: string;
    /**
     * Kept so existing callers still compile; it no longer changes anything.
     *
     * Figma's number fields never draw up and down steppers, so neither does
     * this one; the arrow keys step the number instead.
     * @deprecated The steppers are gone at either value.
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
    /**
     * One sentence saying why the control is off, shown only while `disabled`
     * is true.
     *
     * It is appended to the control's own name after a full stop and drawn as
     * the tooltip -- "Width. Load data first" -- and it also joins the
     * control's accessible description, so a screen reader reads the reason out
     * instead of announcing an unexplained unavailable control.
     *
     * Write it as a whole sentence naming what would make the control usable
     * again.
     */
    disabledReason?: string;
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
 * has been entered here", so the control shows `defaultValue` and offers no
 * reset. As soon as the reader commits a number of their own a reset button
 * appears beside it, and pressing that reset
 * reports `undefined` again. A panel built from these reads at a glance as a
 * list of what has been customised and what has not.
 *
 * The number is committed on Enter, Tab or blur, not on every keystroke, so
 * what the reader is part-way through typing is never sent anywhere and the
 * control never takes the caret away mid-word. What is typed may be arithmetic
 * (`40*2` commits 80); text that is not a number reverts. On commit the number
 * is pulled into `min`..`max` and the box is redrawn showing what was actually
 * kept. ArrowUp and ArrowDown step it at once (Shift: ten steps), Escape
 * abandons what was typed.
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
 * @param props.step - How far the arrow keys move the number
 * @param props.decimalScale - How many digits after the decimal separator to keep
 * @param props.suffix - A unit written after the number
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.disabledReason - One sentence saying why the control is off, drawn only while it is off
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
    disabled = false,
    disabledReason,
    onFocus,
    onBlur,
}: StyleNumberInputProps): React.JSX.Element {
    const labels = useLabels();

    // The reason reaches a pointer user as a tooltip and a screen reader as the
    // field's description. It travels through Mantine's own `description` prop
    // rather than through `aria-describedby`, because Input.Wrapper computes
    // its own `aria-describedby` and overwrites anything passed in -- measured
    // against @mantine/core 8.3.10 -- and the description element is then
    // styled out of sight, exactly as PanelField does it.
    const annotation = useControlAnnotation({name: label, disabled, disabledReason});
    const parseNumber = useNumberParser();
    const writeNumber = useNumberWriter(decimalScale);

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

    const field = useNumberField({
        value: displayValue,
        display: writeNumber(displayValue) + (suffix ?? ""),
        onCommit: (next, event) => {
            setCommitted(next, event);
        },
        parse: parseNumber,
        suffix,
        min,
        max,
        step,
        decimalScale,
        locked: disabled,
        onFocus,
        onBlur,
    });

    /**
     * Give the control back to its default.
     * @param event - The click, or the click a browser synthesises from Enter or Space
     */
    const handleReset = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setCommitted(undefined, event);
    };

    return (
        <Group
            data-testid="style-number-input"
            gap={CONTROL_GAP}
            wrap="nowrap"
            align="flex-end"
            title={annotation.title}
            data-disabled={disabled ? "true" : undefined}
        >
            <TextInput
                data-testid="style-number-input-field"
                label={label}
                description={annotation.description}
                {...field.inputProps}
                disabled={disabled}
                data-is-default={isDefault ? "true" : "false"}
                styles={{
                    // Present in the accessibility tree, absent from the
                    // layout: a visible description would push every row in a
                    // panel of these out of the 32px pitch the grid is built
                    // on.
                    description: VISUALLY_HIDDEN_STYLE,
                }}
                style={{ flex: 1 }}
            />
            {/* The reset is drawn only once there is something to undo, so a
                panel of untouched controls stays quiet. Its 24px box is the
                WCAG 2.2 (2.5.8) target-size minimum, and the same height as
                the field, so bottom alignment puts the two level. */}
            {!isDefault && (
                <ActionIcon
                    variant="subtle"
                    size={PANEL_GRID.TRAIL}
                    c={PANEL_INK.CHROME}
                    data-testid="style-number-input-reset"
                    disabled={disabled}
                    aria-label={labels.resetToDefault(label)}
                    onClick={handleReset}
                >
                    <UiGlyph name="reset" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
            )}
        </Group>
    );
}
