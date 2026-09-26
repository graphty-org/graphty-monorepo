import { ActionIcon, Group, Select } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { useControlAnnotation, VISUALLY_HIDDEN_STYLE } from "../utils/control-annotation";

// One of the "style" trio (StyleSelect, StyleNumberInput, CompactColorInput):
// the older half of the library, brought to the same standard as the row types.
// Contract sections 1, 2.1, 2.3, 3 and 7 were applied here: the event model,
// the strings, the logical properties, the ARIA and the user-facing docs.
//
// Accessibility: the APG "Combobox" pattern. Mantine's Select renders a read-only
// text box with aria-haspopup, aria-controls and aria-activedescendant; the theme
// adds role="combobox" and aria-expanded (src/theme/components/inputs.ts) and
// letter type-ahead in the open list (ensureListboxKeyboard).

/**
 * The gap between the control and the reset button beside it: the panel
 * grid's trailing gap, so the reset sits in the row's trailing slot
 * (design/figma-spec.md 6.1, "reset button stays ... in the trailing slot").
 */
const CONTROL_GAP = PANEL_GRID.TRAIL_GAP;

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
    /** What is shown while the reader has chosen nothing of their own. */
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
    /**
     * One sentence saying why the control is off, shown only while `disabled`
     * is true.
     *
     * It is appended to the control's own name after a full stop and drawn as
     * the tooltip -- "Fill. Load data first" -- and it also joins the control's
     * accessible description, so a screen reader reads the reason out instead
     * of announcing an unexplained unavailable control.
     *
     * Write it as a whole sentence naming what would make the control usable
     * again, not as a restatement that it is off.
     */
    disabledReason?: string;
    /** Called when the control takes focus. Forwarded unchanged. */
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    /** Called when the control loses focus. Forwarded unchanged. */
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * A dropdown that says whether the reader chose its value or inherited it.
 *
 * It is drawn as Figma's outlined select trigger (the theme's Select), and its
 * list is the dark listbox, opening over the trigger with the current choice
 * on top of it (design/figma-spec.md 6.4, 6.5).
 *
 * It is a Mantine `Select` with one idea added: `undefined` means "nothing has
 * been chosen here", so the control shows `defaultValue` and offers no reset.
 * As soon as the reader picks something a reset button appears beside it, and pressing that reset reports `undefined`
 * again. A panel built from these reads at a glance as a list of what has been
 * customized and what has not.
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
 * @param props.disabledReason - One sentence saying why the control is off, drawn only while it is off
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
    disabledReason,
    onFocus,
    onBlur,
}: StyleSelectProps): React.JSX.Element {
    const labels = useLabels();

    // The reason is carried to a pointer user as a tooltip and to a screen
    // reader as the field's description. It goes through Mantine's own
    // `description` prop rather than through `aria-describedby`, because
    // Input.Wrapper computes its own `aria-describedby` and overwrites anything
    // passed in -- measured against @mantine/core 8.3.10, not assumed -- and
    // the description element is then styled out of sight, exactly as
    // PanelField does it.
    const annotation = useControlAnnotation({name: label, disabled, disabledReason});

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
     * @param event - The click, or the click a browser synthesizes from Enter or Space
     */
    const handleReset = (event: React.MouseEvent<HTMLButtonElement>): void => {
        setSelected(undefined, event);
    };

    return (
        <Group
            data-testid="style-select"
            gap={CONTROL_GAP}
            wrap="nowrap"
            align="flex-end"
            title={annotation.title}
            data-disabled={disabled ? "true" : undefined}
        >
            <Select
                data-testid="style-select-field"
                label={label}
                description={annotation.description}
                value={displayValue}
                onChange={handleSelectChange}
                onFocus={onFocus}
                onBlur={onBlur}
                data={options}
                disabled={disabled}
                data-is-default={isDefault ? "true" : "false"}
                allowDeselect={false}
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
                    data-testid="style-select-reset"
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
