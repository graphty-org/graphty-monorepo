import { Box, Checkbox, Switch } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import type { ChangeHandler } from "../../types/events";
import { useDevWarning } from "../../utils/dev-warning";
import { TrailingSlot } from "./TrailingSlot";

// Accessibility: the APG "Checkbox" pattern for the checkbox form and the APG
// "Switch" pattern for the switch form, both in their native-HTML spelling --
// a real <input type="checkbox">, with role="switch" added by Mantine for the
// switch. Tab reaches it, Space toggles it, the label element names it, and
// the checked and disabled states are exposed by the input itself rather than
// by the ink of the word beside it.
//   https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/
//   https://www.w3.org/WAI/ARIA/apg/patterns/switch/
//
// ToggleRowGroup follows the grouping advice of the same pattern: a set of
// related checkboxes is wrapped in role="group", named by aria-labelledby
// pointing at the heading already on the screen, or by aria-label when there
// is none.
//
// Nothing here sets aria-label on the control itself. The name comes from the
// <label> element beside it, so the word a person reads and the word a screen
// reader says are the same string, and an ellipsis shortens only the drawn one.
//
// Internationalization: this row writes no string of its own -- every word on
// it is the caller's `label` -- so there is nothing here to move into the label
// set. What it does write is measurements, and each of those names an
// inline-axis side rather than a physical one, so the row mirrors under
// dir="rtl" without a direction hook.

// Mantine's own offset between a control and its label is
// --mantine-spacing-sm, which is 6px in the compact theme; RT-5 is drawn at
// 4px, so the label's inline padding is overridden rather than inherited.

/**
 * The gap between the control and the one word beside it.
 *
 * Set as an inline-start padding rather than a left one, so the word stays on
 * the far side of the control when text runs right to left.
 */
const INLINE_GAP = 4;

// WCAG 2.2 target size (2.5.8): the word is drawn at 11px, but its clickable
// box is stretched to the full 24px row, so the pointer target for the word is
// 24px tall rather than the 13px a 1.2 line height would give it. The word is
// centred with the line box rather than with flex, because text-overflow does
// not apply to the anonymous item a flex container makes of its text.
//
// A checkbox and its label are one target, because clicking either activates
// the control, so the target here is the 16px box plus the word beside it: 24px
// tall and at least 20px wider than the word is. Measured in a browser at 24 x
// 56 for the word "Labels". That clears the 24x24 minimum outright, and the row
// never has to fall back on the spacing exception a bare 16px control would
// need.

/**
 * The line height that both centres the label word on the row and gives it a
 * pointer target as tall as the row.
 */
const LABEL_LINE_HEIGHT = `${String(PANEL_GRID.TOGGLE_PITCH)}px`;

// The rule is about the design rather than the runtime, so it is enforced with
// a development warning where the design is edited and never at the user's
// expense: the rows render either way.

/**
 * The smallest number of rows a toggle group is meant to hold.
 *
 * Below this the group is a design error rather than a layout: a lone boolean
 * belongs in the trailing slot of the row it modifies.
 */
const MIN_TOGGLE_ROWS = 2;

/**
 * Props for the ToggleRow component.
 */
export interface ToggleRowProps {
    /**
     * One to three words, sentence case, **with the verb deleted**.
     *
     * The label is the only word on the row, so it carries no instruction:
     * `Show labels` is written `Labels`, `Animate transitions` is written
     * `Transitions`, `Enable clustering` is written `Clustering`. The verb is
     * already spelled by the checkbox itself, and repeating it spends the one
     * word the row has on a word the control has already said.
     *
     * The word is also the control's accessible name. A word too long for the
     * row is shortened with an ellipsis and repeated as a tooltip, and is read
     * out in full either way, so a translation that runs longer than the
     * English stays reachable.
     */
    label: string;
    /** Whether the toggle is on. Supply this to drive the row from your own state. */
    checked?: boolean;
    /** Whether the toggle starts on, when the row keeps its own state. */
    defaultChecked?: boolean;
    /**
     * Called when the toggle changes, with the new state first and the event
     * that caused it second.
     *
     * The event is optional so that a change made in code is expressible as
     * `onChange(true)`, and it is the event the browser fired, so reading
     * `event.nativeEvent.shiftKey` to toggle a whole group at once, or calling
     * `event.preventDefault()`, is done from the outside.
     * @example
     * ```tsx
     * <ToggleRow label="Labels" onChange={(next, event) => {
     *     setLabels(next);
     *     if (event?.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey) {
     *         setEveryLabelOption(next);
     *     }
     * }} />
     * ```
     */
    onChange?: ChangeHandler<boolean>;
    /**
     * Which control to draw.
     *
     * A checkbox is for an option -- something that will be true the next time
     * the view is drawn. A switch is for a live mode -- something that is on or
     * off right now, such as a simulation that is running. A boolean that reads
     * the same in the past tense is a checkbox.
     * @default "checkbox"
     */
    control?: "checkbox" | "switch";
    /**
     * The fixed 24px slot at the end of the row: an advanced settings button, a
     * control that returns the setting to its default, or nothing at all.
     *
     * The slot is drawn whether or not it holds anything, so every row in a
     * panel ends at the same place.
     */
    trailing?: React.ReactNode;
    /**
     * Whether the toggle can be changed.
     *
     * A disabled row keeps its place and its word, drops to the dimmed text
     * colour that Mantine's own disabled controls use, and is announced as
     * unavailable rather than merely looking it.
     */
    disabled?: boolean;
    /** Called when the control takes focus. */
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    /** Called when the control loses focus. */
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * A single boolean on a row of its own, packed tighter than every other row
 * type.
 *
 * Reach for it when a setting is a plain yes or no that no icon or value could
 * stand for: whether labels are drawn, whether transitions animate, whether
 * isolated nodes are included. Two rules make it the shape it is:
 *
 * 1. **The label is the only word on the row, and the verb is deleted from
 *    it.** `Show labels` is `Labels`; `Animate transitions` is `Transitions`.
 *    The checkbox already says "show", so the word is spent on what is shown.
 * 2. **Toggles pack tighter than everything else**, at a 24px pitch rather than
 *    the 32px every other row uses, because a 16px control needs no air around
 *    it to stay legible.
 *
 * The control is a Mantine `Checkbox` at 16px, or a Mantine `Switch` at 28x16
 * when the boolean is a live mode rather than an option. Both are real inputs,
 * so Tab reaches them, Space toggles them, and a screen reader reads the state
 * out; clicking the word works as well as clicking the box.
 *
 * Use two or more together inside a `ToggleRowGroup` -- a lone boolean belongs
 * in the trailing slot of the row it modifies.
 * @param props - Component props
 * @param props.label - One to three words, sentence case, with the verb deleted: "Labels", not "Show labels"
 * @param props.checked - Whether the toggle is on, when driven from your own state
 * @param props.defaultChecked - Whether the toggle starts on, when the row keeps its own state
 * @param props.onChange - Called with the new state first and the event that caused it second
 * @param props.control - Which control to draw: a 16px checkbox, or a 28x16 switch for a live mode
 * @param props.trailing - What to put in the fixed 24px slot at the end of the row
 * @param props.disabled - Whether the toggle can be changed
 * @param props.onFocus - Called when the control takes focus
 * @param props.onBlur - Called when the control loses focus
 * @returns The toggle row
 * @example
 * ```tsx
 * <ToggleRowGroup label="Label options">
 *     <ToggleRow label="Labels" defaultChecked onChange={setLabels} />
 *     <ToggleRow label="Transitions" onChange={setTransitions} />
 * </ToggleRowGroup>
 * ```
 */
export function ToggleRow({
    label,
    checked,
    defaultChecked,
    onChange,
    control = "checkbox",
    trailing,
    disabled = false,
    onFocus,
    onBlur,
}: ToggleRowProps): React.JSX.Element {
    // Controlled and uncontrolled, exactly as StyleSelect and ToggleWithContent.
    const [isChecked, setChecked] = useUncontrolled<boolean>({
        value: checked,
        defaultValue: defaultChecked,
        finalValue: false,
        onChange,
    });

    /**
     * Reports the input's new state, and the event that produced it, to the
     * caller.
     * @param event - The change event from the checkbox or the switch
     */
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setChecked(event.currentTarget.checked, event);
    };

    // The control grows so the trailing slot stays pinned to the row's end. The
    // minimum widths of zero are what let a label longer than the row shrink
    // and ellipsise instead of pushing the slot out of the panel, which is what
    // a translation of an English word usually does.
    const controlStyles: Record<"root" | "body" | "labelWrapper" | "label", React.CSSProperties> = {
        root: { flex: "1 1 auto", minWidth: 0 },
        body: { alignItems: "center", minWidth: 0 },
        labelWrapper: { minWidth: 0 },
        label: {
            display: "block",
            height: PANEL_GRID.TOGGLE_PITCH,
            // Logical, so the word sits after the control in both directions.
            paddingInlineStart: INLINE_GAP,
            fontSize: "var(--mantine-font-size-sm)",
            lineHeight: LABEL_LINE_HEIGHT,
            color: disabled ? PANEL_INK.DISABLED : PANEL_INK.VALUE,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
    };

    // The whole word is the accessible name whether or not it fits, because an
    // ellipsis shortens what is drawn and not what is read out. The title
    // repeats it for a sighted pointer user, who has neither the accessible
    // name nor the room.
    const wrapperProps = { title: label };

    return (
        <Box
            data-testid="toggle-row"
            data-control={control}
            data-checked={isChecked ? "true" : "false"}
            data-disabled={disabled ? "true" : undefined}
            style={{
                display: "flex",
                alignItems: "center",
                boxSizing: "border-box",
                // The same 8px every other row type keeps between its body and
                // its trailing slot, which is what ends the control at x 240
                // and holds the slot at x 248..272. A flex gap follows the
                // writing direction, so nothing here needs mirroring.
                gap: PANEL_GRID.TRAIL_GAP,
                // Toggles are the one row type that packs tighter than 32.
                height: PANEL_GRID.TOGGLE_PITCH,
            }}
        >
            {control === "switch" ? (
                <Switch
                    data-testid="toggle-row-control"
                    label={label}
                    checked={isChecked}
                    disabled={disabled}
                    onChange={handleInputChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    wrapperProps={wrapperProps}
                    styles={controlStyles}
                />
            ) : (
                <Checkbox
                    data-testid="toggle-row-control"
                    label={label}
                    checked={isChecked}
                    disabled={disabled}
                    onChange={handleInputChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    wrapperProps={wrapperProps}
                    styles={controlStyles}
                />
            )}
            <TrailingSlot>{trailing}</TrailingSlot>
        </Box>
    );
}

/**
 * Props for the ToggleRowGroup component.
 */
export interface ToggleRowGroupProps {
    /** Two or more `ToggleRow` children. One is a design error, not a layout. */
    children: React.ReactNode;
    /**
     * Names the set of toggles for a screen reader when nothing on the screen
     * already does.
     *
     * Use it only when the group has no visible heading; when it has one, point
     * `labelledBy` at that heading instead so the two names cannot drift apart.
     */
    label?: string;
    /**
     * The `id` of the element that names the set of toggles -- usually the
     * heading of the section they sit under.
     *
     * Preferred over `label`: it reuses the name already on the screen rather
     * than restating it, which is what keeps the spoken name and the written
     * one the same.
     */
    labelledBy?: string;
}

/**
 * The column two or more toggle rows are packed into.
 *
 * The group exists to enforce the half of the rule a single row cannot: **a
 * lone boolean is not a row.** A checkbox by itself between other rows is a
 * horizontal rule made of one word -- it interrupts the panel's rhythm to say
 * one bit. So it becomes the trailing 24px slot of the row it modifies, or one
 * tile of a group of icon buttons, and only two or more booleans that belong
 * together earn rows of their own.
 *
 * That is a rule about the design rather than about the runtime, so the group
 * holds the line where the design is edited: it warns on the console in a
 * development build when it is given fewer than two children, and renders them
 * anyway. The pitch needs no gap -- each row is exactly 24px tall, so a plain
 * column is already the 24px pitch.
 *
 * The rows are wrapped in a group so a screen reader announces them as one set
 * rather than as loose checkboxes. Name it: point `labelledBy` at the heading
 * above it, or pass `label` when there is no heading.
 * @param props - Component props
 * @param props.children - Two or more `ToggleRow` children
 * @param props.label - Names the set for a screen reader when nothing on the screen does
 * @param props.labelledBy - The id of the element that names the set, such as the heading above it
 * @returns The toggle row group
 * @example
 * ```tsx
 * <ToggleRowGroup labelledBy="render-options-heading">
 *     <ToggleRow label="Labels" defaultChecked />
 *     <ToggleRow label="Arrows" />
 * </ToggleRowGroup>
 * ```
 */
export function ToggleRowGroup({ children, label, labelledBy }: ToggleRowGroupProps): React.JSX.Element {
    const count = React.Children.toArray(children).length;

    // The message names the fix rather than the rule it comes from: a consumer
    // reads it in their own devtools, with none of this library's reasoning in
    // front of them.
    useDevWarning(
        count < MIN_TOGGLE_ROWS
            ? `ToggleRowGroup was given ${String(count)} ${count === 1 ? "row" : "rows"}, and it holds two or ` +
                  "more. A single checkbox on a row of its own interrupts a column of rows to say one bit: put " +
                  "it in the trailing slot of the row it modifies, or make it one tile of a group of icon " +
                  "buttons. Rendering it anyway."
            : undefined,
    );

    return (
        <Box
            role="group"
            aria-label={labelledBy === undefined ? label : undefined}
            aria-labelledby={labelledBy}
            data-testid="toggle-row-group"
            data-rows={count}
            style={{
                display: "flex",
                flexDirection: "column",
            }}
        >
            {children}
        </Box>
    );
}
