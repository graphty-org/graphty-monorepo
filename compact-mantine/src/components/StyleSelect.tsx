import { ActionIcon, Group, Select, Tooltip } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { useControlAnnotation, VISUALLY_HIDDEN_STYLE } from "../utils/control-annotation";
import { ListboxCheck, walkHighlight } from "./inputs/listbox";

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

/** The chosen option's glyph in the closed control: 16px, the field's own ink. */
const GLYPH_STYLE: React.CSSProperties = { display: "inline-flex", width: 16, height: 16 };

/**
 * One choice in a {@link StyleSelect}.
 */
export interface StyleSelectOption {
    /** What is stored when this choice is picked. */
    value: string;
    /** The words drawn for this choice, in the reader's own language. */
    label: string;
    /**
     * A small picture of this choice, drawn before its name in the list, in a grid cell above
     * its name, and in the closed control while it is the chosen one. A 24 x 24 SVG drawn in
     * `currentColor` fits best. It is decoration: the choice is still named by `label`.
     */
    glyph?: React.ReactNode;
}

/**
 * Props for the StyleSelect component.
 */
export interface StyleSelectProps {
    /** The control's name, drawn above it and read out as its accessible name. */
    label: string;
    /**
     * A fuller accessible name, when the drawn label is short for its context: a column
     * named "km" whose box picks its role reads out "Role of km". Include the drawn label
     * in it, so a voice user can say what they see (WCAG 2.5.3).
     */
    "aria-label"?: string;
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
    /**
     * How the open list is laid out. `"grid"` puts the choices in rows of `columns` cells, each
     * a glyph over its name, for many look-alike choices (shapes, arrowheads, line patterns).
     * The arrow keys then move in two dimensions: left and right by one cell, up and down by a
     * row. Type-ahead, Home, End, Enter and Escape work as in the list.
     * @default "list"
     */
    layout?: "list" | "grid";
    /**
     * How many cells a row of the grid holds. Read only when `layout` is `"grid"`.
     * @default 5
     */
    columns?: number;
    /**
     * Words shown, in the placeholder ink, while the reader has chosen nothing. Given, an
     * unchosen control is drawn empty with these words instead of showing `defaultValue` as if
     * it were chosen: what lies beneath in a stack of layers, or "Mixed".
     */
    placeholder?: string;
    /**
     * Whether to offer the reset button once something is chosen. Turn it off when the caller
     * draws its own way back to "nothing chosen" beside the control.
     * @default true
     */
    showReset?: boolean;
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
 * @param props."aria-label" - A fuller accessible name than the drawn label, when it is short for its context
 * @param props.value - The chosen value, when you drive the control from your own state
 * @param props.defaultValue - What is shown while the reader has chosen nothing of their own
 * @param props.options - The choices offered
 * @param props.onChange - Called with the new choice, or with `undefined` when the control is reset
 * @param props.disabled - Whether the control cannot be used at all
 * @param props.disabledReason - One sentence saying why the control is off, drawn only while it is off
 * @param props.layout - Whether the open list is a list or a grid of glyphs
 * @param props.columns - How many cells a row of the grid holds
 * @param props.placeholder - Words shown while nothing is chosen, instead of `defaultValue`
 * @param props.showReset - Whether to offer the reset button once something is chosen
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
    "aria-label": ariaLabel,
    value,
    defaultValue,
    options,
    onChange,
    disabled = false,
    disabledReason,
    layout = "list",
    columns = 5,
    placeholder,
    showReset = true,
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
    const annotation = useControlAnnotation({ name: label, disabled, disabledReason });

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
    const displayValue = selected ?? (placeholder === undefined ? defaultValue : null);
    const grid = layout === "grid";
    const glyphs = new Map(options.map((option) => [option.value, option.glyph]));
    const hasGlyphs = options.some((option) => option.glyph !== undefined);
    const shownGlyph = displayValue === null ? undefined : glyphs.get(displayValue);

    /**
     * Draw one option: the theme's check column, then the glyph and the name; in a grid, the
     * glyph over the name. Used only when there are glyphs or a grid, so every other select
     * keeps the theme's own renderer.
     * @param input - Mantine's option
     * @param input.option - the option
     * @param input.option.value - what the option stores
     * @param input.option.label - the option's name
     * @returns the option's content
     */
    const renderOption = ({ option }: { option: { value: string; label: string } }): React.ReactNode => {
        const glyph = glyphs.get(option.value);
        return (
            <>
                {!grid && <ListboxCheck />}
                {glyph !== undefined && (
                    <span className="cm-listbox-glyph" aria-hidden="true">
                        {glyph}
                    </span>
                )}
                <span className="cm-listbox-label">{option.label}</span>
            </>
        );
    };

    /**
     * The grid's arrow keys. Mantine's list moves one option per arrow; in a grid, up and down
     * move a row and left and right one cell (mirrored right to left). The highlight is walked
     * there with Mantine's own arrows, so its store, `aria-activedescendant` and Enter stay in
     * step. A move off the grid's edge stays put. A closed list opens as usual.
     * @param event - a key pressed inside the control
     */
    const handleGridKeys = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const input = event.target;
        // The walk's own presses are untrusted; they go to Mantine untouched.
        if (!grid || !event.nativeEvent.isTrusted || !(input instanceof HTMLInputElement)) {
            return;
        }
        const listId = input.getAttribute("aria-controls");
        const list = input.hasAttribute("data-expanded") && listId ? document.getElementById(listId) : null;
        const rtl = getComputedStyle(input).direction === "rtl";
        const across = rtl ? -1 : 1;
        const steps: Record<string, number> = {
            ArrowRight: across,
            ArrowLeft: -across,
            ArrowDown: columns,
            ArrowUp: -columns,
        };
        const step = steps[event.key];
        if (list === null || step === undefined) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const items = [...list.querySelectorAll<HTMLElement>("[data-combobox-option]")];
        const at = items.findIndex((item) => item.hasAttribute("data-combobox-selected"));
        const from = at === -1 ? items.findIndex((item) => item.hasAttribute("data-checked")) : at;
        const next = from === -1 ? 0 : from + step;
        const sameRow = Math.floor(next / columns) === Math.floor(from / columns);
        const target = items.at(next);
        if (next < 0 || target === undefined || (Math.abs(step) === 1 && from !== -1 && !sameRow)) {
            return;
        }
        if (!target.hasAttribute("data-combobox-disabled")) {
            walkHighlight(input, list, target);
        }
    };

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
            onKeyDownCapture={grid ? handleGridKeys : undefined}
        >
            <Select
                data-testid="style-select-field"
                label={label}
                aria-label={ariaLabel}
                description={annotation.description}
                value={displayValue}
                placeholder={placeholder}
                onChange={handleSelectChange}
                onFocus={onFocus}
                onBlur={onBlur}
                data={options.map((option) => ({ value: option.value, label: option.label }))}
                renderOption={hasGlyphs || grid ? renderOption : undefined}
                leftSection={
                    shownGlyph === undefined ? undefined : (
                        <span className="cm-style-select-glyph" aria-hidden="true" style={GLYPH_STYLE}>
                            {shownGlyph}
                        </span>
                    )
                }
                classNames={grid ? { options: "cm-listbox-grid" } : undefined}
                disabled={disabled}
                data-is-default={isDefault ? "true" : "false"}
                allowDeselect={false}
                styles={{
                    // Present in the accessibility tree, absent from the
                    // layout: a visible description would push every row in a
                    // panel of these out of the 32px pitch the grid is built
                    // on.
                    description: VISUALLY_HIDDEN_STYLE,
                    ...(grid ? { options: { gridTemplateColumns: `repeat(${String(columns)}, auto)` } } : {}),
                }}
                style={{ flex: 1 }}
            />
            {/* The reset is drawn only once there is something to undo, so a
                panel of untouched controls stays quiet. Its 24px box is the
                WCAG 2.2 (2.5.8) target-size minimum, and the same height as
                the field, so bottom alignment puts the two level. */}
            {showReset && !isDefault && (
                // An icon-only button says what it does on hover, not only to a screen reader.
                <Tooltip label={labels.resetToDefault(label)}>
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
                </Tooltip>
            )}
        </Group>
    );
}
