import { ActionIcon, Box } from "@mantine/core";
import React, { forwardRef } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
import type { ActivationHandler } from "../../types/events";

/**
 * Whether a row was handed a trailing control at all.
 *
 * `undefined`, `null` and `false` are the three ways a caller says "nothing
 * here", and the third is the common one, because a conditional trailing
 * control is written `trailing={changed && <AdvancedButton ... />}`. Every row
 * type asks the question the same way, so the same expression puts the same
 * thing in every row's slot.
 * @param trailing - The row's `trailing` prop, as it was given
 * @returns True when the slot has something to hold
 */
export function holdsSomething(trailing: React.ReactNode): boolean {
    return trailing !== undefined && trailing !== null && trailing !== false;
}

/**
 * Props for the trailing slot at the end of a panel row.
 */
export interface TrailingSlotProps {
    /**
     * The row's occasional control: an advanced settings button, a control that
     * resets the row, a checkbox, or nothing at all.
     */
    children?: React.ReactNode;
}

// Accessibility: no ARIA pattern applies. This is a layout box with no role,
// no name and no keyboard behaviour of its own; whatever a caller puts inside
// it carries all three. Giving the box a role would put a stop in the reading
// order for something that is, when empty, deliberately nothing.
//
// Internationalization: the box writes no physical property -- no left, no
// right, no margin -- so it needs no logical rewrite and no direction hook. Its
// position in the row comes from the flex order of the row around it, which
// reverses on its own under `dir="rtl"`.

/**
 * The fixed 24px slot every panel row ends with.
 *
 * It keeps its width whether or not it holds anything, so that the last control
 * of every row lines up in one column down the panel. An empty slot is correct
 * and common: it is what makes a row with no extra control end level with a row
 * that has one.
 *
 * The panel this library lays out is 280px wide and spends it as
 * `16 + 108 + 8 + 108 + 8 + 24 + 8`: leading padding, two fields with a gutter
 * between them, a gap, this slot, and trailing padding. Dropping the slot when
 * it is empty is what breaks that.
 * @param props - Component props
 * @param props.children - The row's occasional control, or nothing
 * @returns The trailing slot
 * @example
 * ```tsx
 * <TrailingSlot>
 *     <AdvancedButton label="Range and scale" onClick={openRangePanel} />
 * </TrailingSlot>
 * ```
 */
export function TrailingSlot({ children }: TrailingSlotProps): React.JSX.Element {
    return (
        <Box
            data-testid="trailing-slot"
            style={{
                flex: "0 0 auto",
                width: PANEL_GRID.TRAIL,
                height: PANEL_GRID.CONTROL_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {children}
        </Box>
    );
}

/**
 * Props for the advanced settings button.
 */
export interface AdvancedButtonProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color" | "onClick" | "type"> {
    /**
     * Names the settings the button opens, such as `"Image export options"`.
     *
     * It becomes both the button's tooltip and the name a screen reader
     * announces, so write it as a phrase a person would recognise rather than
     * as the word "settings". When `changed` is true the name also states that,
     * so there is no need to spell the change into this string yourself.
     */
    label: string;
    /**
     * Whether any setting behind the button has been changed from its default.
     *
     * The button hides its own contents, so this is the only thing that tells a
     * reader something back there is no longer standard. Pass it from the same
     * state the panel behind the button edits; a button that forgets it tells
     * the reader that a changed setting is unchanged.
     *
     * A changed button draws in the primary text colour instead of the
     * secondary one, and says so in its accessible name as well, so the signal
     * survives for a reader who cannot see the difference in colour.
     * @default false
     */
    changed?: boolean;
    /**
     * The glyph drawn on the button.
     * @default a gear
     */
    icon?: React.ReactNode;
    /**
     * Called when the button is activated, by a click or from the keyboard.
     *
     * The event is passed on so that you can read modifier keys, call
     * `preventDefault`, or find the element that was activated. It is optional
     * because a button placed inside a pop-out's trigger is given its handler
     * by that trigger.
     */
    onClick?: ActivationHandler;
    /**
     * Whether the button cannot be used.
     *
     * A disabled button is drawn in the same dimmed colour as any other
     * disabled control, refuses activation, and is skipped by the Tab key.
     * @default false
     */
    disabled?: boolean;
    /**
     * Whether what is behind the button is still being worked out.
     *
     * Draws a spinner in place of the glyph, refuses activation, and marks the
     * button busy for a screen reader. Use it while a background job decides
     * what the settings are.
     * @default false
     */
    loading?: boolean;
}

// Accessibility: the APG "Button" pattern -- a plain command button, not a
// toggle, because what it opens is a panel of its own rather than a section of
// this one. Mantine's ActionIcon renders a real <button>, which brings Enter and
// Space activation, focus order and the disabled semantics with it; nothing here
// re-implements them, and nothing here suppresses the theme's focus ring.
//
// The changed state is exposed two ways on purpose. Colour alone would fail
// WCAG 1.4.1 (Use of Colour), so the state is written into the accessible name
// as well. The sentence is the same one the section header's configured dot
// uses, so one condition is stated one way across the library (WCAG 3.2.4,
// Consistent Identification).
//
// aria-label rather than name-from-content is right here and only here: the
// button's visible content is a glyph, so there is no text for a name to come
// from. Never copy this onto a control whose value is drawn inside it.
//
// The button is exactly 24x24 CSS pixels, which is the minimum WCAG 2.2 (2.5.8,
// Target Size) allows. Do not shrink it.
//
// The ink is set through ActionIcon's own --ai-color variable rather than the
// `c` style prop. A `c` lands as an inline color, which outranks the stylesheet
// rule that dims a disabled control, so a disabled button would have kept its
// live ink. Through the variable, the disabled and hover rules still win where
// they should, and the spinner -- which Mantine draws in var(--ai-color) --
// comes out in the same ink as the glyph it replaces.

/**
 * A small button that opens the advanced settings for a row or a section.
 *
 * A panel row shows the one or two controls that are adjusted often; everything
 * rarer goes behind this button, which opens a pop-out holding the rest. That
 * is what keeps a row down to a single line without losing the rest of the
 * control. Put it in the row's {@link TrailingSlot}, or in a section header's
 * actions.
 *
 * Always give it something to sit beside. A section whose only content is this
 * button hides everything it does, which leaves a reader nothing to read.
 *
 * Set `changed` whenever something behind the button is no longer at its
 * default. Because the button hides its contents, that flag is the only signal
 * a reader gets, and it is announced as well as drawn.
 *
 * Anything else you pass -- `id`, `className`, `onFocus`, `onBlur`, `onKeyDown`,
 * a `data-` attribute -- reaches the underlying `<button>` untouched, and a
 * `style` of your own is merged over the two properties the slot needs. The
 * button's `title` and its accessible name are both built from `label`, so pass
 * the wording you want there rather than an `aria-label` of your own.
 * @param props - Component props
 * @param props.label - Names the settings the button opens, and becomes its tooltip and accessible name
 * @param props.changed - Whether anything behind the button has been changed from its default
 * @param props.icon - The glyph to draw, which defaults to a gear
 * @param props.onClick - Called when the button is activated, with the event that activated it
 * @param props.disabled - Whether the button cannot be used
 * @param props.loading - Whether what is behind the button is still being worked out
 * @param props.style - Extra styles, merged over the ones the slot needs to hold its column
 * @returns The advanced settings button
 * @example
 * ```tsx
 * <TrailingSlot>
 *     <AdvancedButton
 *         label="Range and scale"
 *         changed={domain !== defaultDomain}
 *         onClick={(event) => { openRangePanel(event); }}
 *     />
 * </TrailingSlot>
 * ```
 */
export const AdvancedButton = forwardRef<HTMLButtonElement, AdvancedButtonProps>(
    function AdvancedButton(props, ref): React.JSX.Element {
        const {
            label,
            changed = false,
            icon,
            onClick,
            disabled = false,
            loading = false,
            style,
            ...rest
        } = props;

        const labels = useLabels();

        const name = changed ? labels.sectionHasConfiguredValues(label) : label;
        const ink = changed ? PANEL_INK.VALUE : PANEL_INK.CHROME;

        return (
            <ActionIcon
                {...rest}
                ref={ref}
                type="button"
                variant="subtle"
                // A neutral hover wash rather than the theme's accent one: the
                // ink of this button carries meaning, so nothing else about it
                // should change colour under the pointer.
                color="gray"
                // Stated rather than inherited from the theme, so the button is
                // still 24px for a consumer who uses the components without the
                // compact theme.
                size={PANEL_GRID.TRAIL}
                radius="sm"
                vars={() => ({ root: { "--ai-color": ink } })}
                title={name}
                aria-label={name}
                aria-busy={loading}
                disabled={disabled}
                loading={loading}
                // The test hook is the component's own name in kebab case,
                // which is the rule every component in this package follows.
                data-testid="advanced-button"
                data-changed={changed ? "true" : "false"}
                onClick={onClick}
                style={{ flex: "0 0 auto", ...style }}
            >
                {icon ?? <UiGlyph name="gear" size={PANEL_GRID.GLYPH} />}
            </ActionIcon>
        );
    },
);
