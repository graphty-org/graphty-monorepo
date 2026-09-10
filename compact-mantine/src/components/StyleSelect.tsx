import { ActionIcon, Group, Select } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";

// One of the "style" trio (StyleSelect, StyleNumberInput, CompactColorInput):
// the older half of the library, brought to the same standard as the row types.
// Contract sections 1, 2.1, 2.3, 3 and 7 were applied here: the event model,
// the strings, the logical properties, the ARIA and the user-facing docs.
//
// Accessibility: the APG "Combobox" pattern, as far as Mantine implements it.
// Verified against @mantine/core 8.3.10: Select renders a read-only text box
// carrying aria-haspopup="listbox", aria-controls and aria-activedescendant,
// but it neither sets role="combobox" nor emits aria-expanded --
// ComboboxTarget defaults withExpandedAttribute to false and Select does not
// override it, and the undefined it then clones over the input strips any
// aria-expanded passed in from outside. Adding the role alone would leave a
// combobox missing the state ARIA requires of it, so the control is left as
// Mantine ships it and the gap is upstream.

/**
 * The gap between the control and the reset button beside it.
 *
 * Narrower than the panel grid's own trailing gap: these three controls are
 * laid out as one unit rather than as a row with a trailing slot.
 */
const CONTROL_GAP = 4;

/**
 * How far the reset button is lifted off the baseline so its glyph sits level
 * with the text in the control beside it, which carries a label above it.
 */
const RESET_BASELINE_LIFT = 2;

/**
 * One choice in a {@link StyleSelect}.
 */
export interface StyleSelectOption {
    /** What is stored when this choice is picked. */
    value: string;
    /** The words drawn for this choice, in the reader's own language. */
    label: string;
}

/**
 * Props for the StyleSelect component.
 */
export interface StyleSelectProps {
    /** The control's name, drawn above it and read out as its accessible name. */
    label: string;
    /**
     * The chosen value, when you drive the control from your own state.
     *
     * `undefined` does not mean "empty" here: it means the reader has not
     * chosen anything and the control is showing `defaultValue`.
     */
    value?: string | undefined;
    /** What is shown, in italics, while the reader has chosen nothing of their own. */
    defaultValue: string;
    /** The choices offered, in the order they should be listed. */
    options: StyleSelectOption[];
    /**
     * Called when the reader picks a choice, and with `undefined` when they
     * reset the control to its default.
     *
     * The value comes first; Mantine's own dropdown reports no event for a
     * choice, so the second argument is present only for the reset.
     */
    onChange?: ChangeHandler<string | undefined>;
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
    /** Called when the control loses focus. Forwarded unchanged. */
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * A dropdown that says whether the reader chose its value or inherited it.
 *
 * It is a Mantine `Select` with one idea added: `undefined` means "nothing has
 * been chosen here", so the control shows `defaultValue` in italics and offers
 * no reset. As soon as the reader picks something the text turns upright and a
 * reset button appears beside it, and pressing that reset reports `undefined`
 * again. A panel built from these reads at a glance as a list of what has been
 * customised and what has not.
 *
 * Reach for Mantine's own `Select` for an ordinary form. Reach for this one
 * where a value has a sensible default that the reader is overriding rather
 * than filling in.
 * @param props - Component props
 * @param props.label - The control's name, drawn above it
 * @param props.value - The chosen value, when you drive the control from your own state
 * @param props.defaultValue - What is shown while the reader has chosen nothing of their own
 * @param props.options - The choices offered
 * @param props.onChange - Called with the new choice, or with `undefined` when the control is reset
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.onFocus - Called when the control takes focus
 * @param props.onBlur - Called when the control loses focus
 * @returns The dropdown, and its reset button when a choice has been made
 * @example
 * ```tsx
 * const [shape, setShape] = useState<string | undefined>(undefined);
 *
 * <StyleSelect
 *     label="Shape"
 *     value={shape}
 *     defaultValue="circle"
 *     options={[
 *         {value: "circle", label: "Circle"},
 *         {value: "square", label: "Square"},
 *     ]}
 *     onChange={setShape}
 * />
 * ```
 */
export function StyleSelect({
    label,
    value,
    defaultValue,
    options,
    onChange,
    disabled = false,
    onFocus,
    onBlur,
}: StyleSelectProps): React.JSX.Element {
    const labels = useLabels();

    // Controlled and uncontrolled, the way every state-holding component in
    // this package works. The uncontrolled state starts at undefined, which is
    // this component's word for "the reader has chosen nothing".
    const [selected, setSelected] = useUncontrolled<string | undefined>({
        value,
        defaultValue: undefined,
        finalValue: undefined,
        onChange,
    });

    const isDefault = selected === undefined;
    const displayValue = selected ?? defaultValue;

    /**
     * Record the reader's choice.
     *
     * Mantine reports `null` for a cleared value; deselection is switched off,
     * so that only reaches us from a programmatic clear and is ignored.
     * @param next - The value Mantine reports for the chosen option
     */
    const handleSelectChange = (next: string | null): void => {
        if (next !== null) {
            setSelected(next);
        }
    };

    /**
     * Give the control back to its default.
     * @param event - The click, or the click a browser synthesises from Enter or Space
     */
    const handleReset = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setSelected(undefined, event);
    };

    return (
        <Group data-testid="style-select" gap={CONTROL_GAP} wrap="nowrap" align="flex-end">
            <Select
                data-testid="style-select-field"
                label={label}
                value={displayValue}
                onChange={handleSelectChange}
                onFocus={onFocus}
                onBlur={onBlur}
                data={options}
                rightSection={<UiGlyph name="chevronDown" size={PANEL_GRID.GLYPH} />}
                rightSectionPointerEvents="none"
                disabled={disabled}
                data-is-default={isDefault ? "true" : "false"}
                allowDeselect={false}
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
                    data-testid="style-select-reset"
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
