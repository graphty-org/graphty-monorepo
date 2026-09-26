import { Box, Checkbox, VisuallyHidden } from "@mantine/core";
import { useUncontrolled } from "@mantine/hooks";
import React, { useId } from "react";

import { PANEL_GRID, PANEL_INK } from "../constants/panel";
import { useLabels } from "../i18n";
import { FieldGlyph } from "../icons";
import type { ChangeHandler } from "../types/events";
import { useControlAnnotation } from "../utils/control-annotation";

// Contract sections 1.1, 1.5, 2.3, 3 and 7 were applied to this file: the
// value-first change handler with the event second, the forwarded focus and
// blur, the logical properties, the ARIA and the user-facing documentation.
//
// Kept rather than deprecated in favour of ToggleRow, and the reasoning is
// worth recording: ToggleRow is one boolean on one row and has nowhere to put
// dependent controls. Reveal is the whole of this component, so ToggleRow does
// not replace it. What ToggleRow *does* replace is a bare checkbox row with
// nothing underneath it, and the documentation below says so.
//
// It is not built out of ToggleRow either, for one concrete reason: the
// checkbox has to carry aria-expanded and aria-controls to say that it opens
// something, and ToggleRow forwards neither to its input. Both components
// therefore render Mantine's own Checkbox, which is the shared primitive.

/**
 * The 4px this library puts between the parts of one control: here, between
 * the checkbox row and the controls it reveals, and between those controls.
 */
const INLINE_GAP = 4;

/**
 * The label's line height, which also gives the word a pointer target as tall
 * as the row.
 *
 * WCAG 2.2 target size (2.5.8): the word is drawn at 11px, and stretching its
 * line box to the row pitch makes the clickable area 24px tall rather than the
 * 13px a 1.2 line height would give it.
 */
const LABEL_LINE_HEIGHT = `${String(PANEL_GRID.TOGGLE_PITCH)}px`;

/**
 * Props for the ToggleWithContent component.
 */
export interface ToggleWithContentProps {
    /**
     * One to three words, sentence case, **with the verb deleted**.
     *
     * The checkbox already says "enable", so the word beside it is spent on
     * what is enabled: `Glow`, not `Enable glow`. The word is also the
     * control's accessible name, and is read out in full even when the row is
     * too narrow to draw all of it.
     */
    label: string;
    /** Whether the toggle is on. Supply this to drive it from your own state. */
    checked?: boolean;
    /** Whether the toggle starts on, when the component keeps its own state. */
    defaultChecked?: boolean;
    /**
     * Called when the toggle changes, with the new state first and the event
     * that caused it second.
     *
     * The event is optional, so a change made in code is expressible as
     * `onChange(true)`, and it is the event the browser fired, so reading a
     * modifier key or calling `preventDefault` is done from the outside.
     * @example
     * ```tsx
     * <ToggleWithContent label="Glow" onChange={(next) => { setGlow(next); }}>
     *     <StyleNumberInput label="Radius" defaultValue={4} />
     * </ToggleWithContent>
     * ```
     */
    onChange?: ChangeHandler<boolean>;
    /**
     * Whether the toggle can be changed.
     *
     * A disabled toggle keeps its place and its word, drops to the dimmed text
     * colour Mantine's own disabled controls use, and is announced as
     * unavailable rather than merely looking it. Controls already revealed stay
     * revealed; disable them yourself if they should not be touched either.
     */
    disabled?: boolean;
    /**
     * One sentence saying why the toggle is off, shown only while `disabled` is
     * true.
     *
     * It is appended to the toggle's own word after a full stop and becomes its
     * tooltip -- "Glow. Glow is not drawn yet" -- and it joins the control's
     * accessible description, so the reason reaches a pointer user and a screen
     * reader user alike.
     *
     * THE DEFECT THIS REPAIRS: a feature that cannot be turned on yet used to
     * be drawn as a dimmed checkbox with nothing to say for itself, which reads
     * as a broken control rather than as an unfinished feature. spec:6641 asks
     * for the one reason to travel with the disabled ink; until now this
     * component had nowhere to put it. The caller supplies the sentence -- only
     * the call site knows what would turn the feature back on.
     */
    disabledReason?: string;
    /**
     * Whether the boolean comes from a data attribute rather than being set by
     * hand.
     *
     * The toggle draws a filled attribute glyph beside its word -- the same
     * filled glyph `PanelField` uses to say the same thing -- so a panel can
     * say "this follows the data" without spending a row on a
     * fixed-or-by-attribute switch. A boolean channel can be bound just as a
     * numeric one can, and until now `PanelField` was the only control in the
     * library able to say so.
     * @default false
     */
    bound?: boolean;
    /**
     * What a screen reader says about a toggle whose value comes from a data
     * attribute. Only used when `bound` is set.
     *
     * Defaults to the `fieldBound` string, so translating it once through
     * `LabelsProvider` covers every bound control in the panel. Pass it here
     * only to say something more specific about one toggle, and pass an empty
     * string to say nothing -- byte for byte the contract `PanelField` already
     * documents.
     */
    boundDescription?: string;
    /** Called when the checkbox takes focus. */
    onFocus?: React.FocusEventHandler<HTMLInputElement>;
    /** Called when the checkbox loses focus. */
    onBlur?: React.FocusEventHandler<HTMLInputElement>;
    /**
     * The controls that belong to the feature, shown only while it is on.
     *
     * They are indented from the checkbox and stacked 4px apart, and they are
     * taken out of the document entirely when the toggle is off, so nothing
     * hidden can be reached by Tab or read out by a screen reader.
     */
    children: React.ReactNode;
}

/**
 * A checkbox that turns a feature on and reveals the controls that configure
 * it.
 *
 * Reach for it when a setting is a yes or no that brings its own settings with
 * it -- a glow with a radius and a colour, an outline with a width, a legend
 * with a position. Turning the feature off takes its controls off the screen,
 * so a panel shows only what is currently in play.
 *
 * Two rules keep the shape honest:
 *
 * 1. **The verb is deleted from the label.** The checkbox already says
 *    "enable", so `Enable glow` is written `Glow`.
 * 2. **A boolean with nothing underneath it is not this component.** Use
 *    `ToggleRow`, which packs a lone boolean onto a 24px row with a slot at its
 *    end, and use two or more of those inside a `ToggleRowGroup`.
 *
 * The checkbox says out loud that it opens something: it is marked as expanded
 * or collapsed and points at the controls it reveals, so a screen reader
 * announces the relationship rather than leaving the reader to notice new
 * controls appearing. Focus and blur are forwarded, and both a controlled
 * `checked` and an uncontrolled `defaultChecked` are supported.
 * @param props - Component props
 * @param props.label - One to three words, sentence case, with the verb deleted: "Glow", not "Enable glow"
 * @param props.checked - Whether the toggle is on, when driven from your own state
 * @param props.defaultChecked - Whether the toggle starts on, when the component keeps its own state
 * @param props.onChange - Called with the new state first and the event that caused it second
 * @param props.disabled - Whether the toggle can be changed
 * @param props.disabledReason - One sentence saying why the toggle is off, drawn only while it is off
 * @param props.bound - Whether the boolean comes from a data attribute rather than being set by hand
 * @param props.boundDescription - What a screen reader says about a bound toggle, defaulting to `fieldBound`
 * @param props.onFocus - Called when the checkbox takes focus
 * @param props.onBlur - Called when the checkbox loses focus
 * @param props.children - The controls shown only while the feature is on
 * @returns The toggle and, while it is on, the controls it reveals
 * @example
 * ```tsx
 * <ToggleWithContent label="Glow" defaultChecked>
 *     <CompactColorInput label="Color" defaultColor="#5b8ff9" />
 *     <StyleNumberInput label="Radius" defaultValue={4} min={0} max={20} />
 * </ToggleWithContent>
 * ```
 */
export function ToggleWithContent({
    label,
    checked,
    defaultChecked,
    onChange,
    disabled = false,
    disabledReason,
    bound = false,
    boundDescription,
    onFocus,
    onBlur,
    children,
}: ToggleWithContentProps): React.JSX.Element {
    const contentId = useId();
    const labels = useLabels();

    // Controlled and uncontrolled, the way every state-holding component in
    // this package works.
    const [isChecked, setChecked] = useUncontrolled<boolean>({
        value: checked,
        defaultValue: defaultChecked,
        finalValue: false,
        onChange,
    });

    /**
     * Reports the checkbox's new state, and the event that produced it, to the
     * caller.
     * @param event - The change event from the checkbox
     */
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        setChecked(event.currentTarget.checked, event);
    };

    // The minimum widths of zero are what let a label longer than the panel
    // shrink and ellipsise rather than pushing the row wider, which is what a
    // translation of a short English word usually does.
    const controlStyles: Record<"root" | "body" | "labelWrapper" | "label", React.CSSProperties> = {
        root: { minWidth: 0 },
        body: { alignItems: "center", minWidth: 0 },
        labelWrapper: { minWidth: 0 },
        label: {
            display: "block",
            height: PANEL_GRID.TOGGLE_PITCH,
            // Logical, so the word sits after the box in both directions.
            paddingInlineStart: PANEL_GRID.GUTTER,
            // The theme pads a label 4px above and below to make a 24 row; this
            // one is already the full row tall.
            paddingBlock: 0,
            fontSize: "var(--mantine-font-size-sm)",
            lineHeight: LABEL_LINE_HEIGHT,
            color: disabled ? PANEL_INK.DISABLED : PANEL_INK.VALUE,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        },
    };

    // The per-toggle string is an override of the shared one rather than the
    // only way to set it, so a toggle that says nothing about its own bound
    // state still announces it in whatever language LabelsProvider was given.
    // An empty string is the caller saying "announce nothing", and is honoured.
    const boundText = boundDescription ?? labels.fieldBound;

    // Unlike the Input.Wrapper controls in this library, a Mantine Checkbox DOES
    // forward `aria-describedby` through to its input (measured against
    // @mantine/core 8.3.10), so the sentence is rendered into a hidden element
    // of this component's own and pointed at from the control.
    const annotation = useControlAnnotation({
        name: label,
        enabledTitle: label,
        disabled,
        disabledReason,
        extraDescriptions: bound ? [boundText] : undefined,
    });

    // Accessibility: the APG "Disclosure (Show/Hide)" pattern, carried by a
    // checkbox rather than by a plain button, because the control both records
    // a setting and reveals its settings. aria-expanded is a supported property
    // of role="checkbox" in ARIA 1.2, so the two states -- checked and expanded
    // -- are both exposed on the one control.
    //   https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
    //
    // aria-controls is written only while the controls are on screen: they are
    // unmounted when the toggle is off, and a reference to an id that is not in
    // the document is worse than no reference at all.
    const checkbox = (
        <Checkbox
            variant="neutral"
            data-testid="toggle-with-content-checkbox"
            label={label}
            checked={isChecked}
            disabled={disabled}
            aria-expanded={isChecked}
            aria-controls={isChecked ? contentId : undefined}
            aria-describedby={annotation.describedBy}
            onChange={handleInputChange}
            onFocus={onFocus}
            onBlur={onBlur}
            // The whole word is the accessible name whether or not it fits,
            // because an ellipsis shortens what is drawn and not what is read
            // out. The title repeats it for a sighted pointer user, who has
            // neither the accessible name nor the room -- and, once the toggle
            // is disabled with a reason, carries that reason after a full stop.
            wrapperProps={{ title: annotation.title }}
            styles={controlStyles}
        />
    );

    return (
        <Box
            data-testid="toggle-with-content"
            data-checked={isChecked ? "true" : "false"}
            data-disabled={disabled ? "true" : undefined}
            data-bound={bound ? "true" : undefined}
            style={{ display: "flex", flexDirection: "column", gap: INLINE_GAP }}
        >
            {/* The row wrapper is added only when there is a marker to sit
                beside the checkbox, so an ordinary toggle keeps the exact DOM
                it has always had and no existing layout or snapshot moves. */}
            {bound
                ? (
                    <Box
                        data-testid="toggle-with-content-row"
                        style={{ display: "flex", alignItems: "center", gap: INLINE_GAP }}
                    >
                        {checkbox}
                        {/* The filled glyph is the whole of the visible bound
                            marker, and it is deliberately the same drawing
                            PanelField fills in: one convention for "this value
                            follows the data" across every control that can say
                            it. It is aria-hidden, so the meaning travels in the
                            description rather than in a picture. */}
                        <Box
                            component="span"
                            data-testid="toggle-with-content-bound"
                            style={{
                                flex: "0 0 auto",
                                display: "inline-flex",
                                alignItems: "center",
                                color: PANEL_INK.CHROME,
                            }}
                        >
                            <FieldGlyph name="attribute" filled />
                        </Box>
                    </Box>
                )
                : checkbox}

            {annotation.description !== undefined && (
                <VisuallyHidden id={annotation.describedBy}>{annotation.description}</VisuallyHidden>
            )}

            {isChecked && (
                <Box
                    id={contentId}
                    data-testid="toggle-with-content-children"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: INLINE_GAP,
                        // Logical, so the revealed controls indent from the
                        // edge the reader starts at in both directions.
                        paddingInlineStart: PANEL_GRID.GUTTER,
                    }}
                >
                    {children}
                </Box>
            )}
        </Box>
    );
}
