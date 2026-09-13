/**
 * The two atoms the top bar's controls are assembled from: its 24 x 24 icon button
 * and its key chip.
 *
 * The button obeys spec 04 section 8.2: an `aria-label` equal to the tooltip with the
 * key chip removed, an `aria-hidden` glyph, a tooltip at `TOOLTIP_DELAY_MS`, and a
 * 24 x 24 hit area. A control that cannot act is drawn with `aria-disabled` rather
 * than the `disabled` attribute, so it keeps its tooltip and stays reachable: floor
 * item 4 requires the reason a disabled control is disabled to be readable, and a
 * `disabled` button answers no pointer, so it never opens one.
 *
 * Unknown props are forwarded to the button element, which is what lets the button be
 * a Mantine `Menu.Target` -- the menu's `aria-haspopup`, `aria-expanded`, `id` and
 * `ref` all have to reach the real button.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import { ActionIcon, Tooltip } from "@mantine/core";
import React, { forwardRef } from "react";

import { TOOLTIP_DELAY_MS } from "../constants";
import {
    KEY_CHIP_BORDER_WIDTH,
    KEY_CHIP_FONT_SIZE,
    KEY_CHIP_HEIGHT,
    KEY_CHIP_PADDING_X,
    KEY_CHIP_RADIUS,
    TOP_BAR_GLYPH_SIZE,
    TOP_BAR_ICON_BUTTON,
    TOP_BAR_ICON_RADIUS,
} from "./topBarGeometry";
import { TopBarGlyph, type TopBarGlyphName } from "./topBarGlyphs";

/**
 * Props of the top bar's icon button. Everything a `<button>` accepts is forwarded.
 * @public
 */
export interface TopBarIconButtonProps
    extends Omit<React.ComponentPropsWithoutRef<"button">, "children" | "disabled" | "onClick" | "title"> {
    /** The tooltip, character for character from spec 02 section 2. */
    readonly title: string;
    /** The accessible name: the tooltip with the key chip removed. */
    readonly accessibleName: string;
    /** Which register verb the button draws. */
    readonly glyph: TopBarGlyphName;
    /** The drawn glyph size; 16 px on a 24 x 24 top bar button. */
    readonly glyphSize?: number;
    /** The button's width, where it is not square -- the split button's caret half. */
    readonly width?: number;
    /** The button's radius, where it is not the plain 4 -- a split button's half. */
    readonly radius?: number | string;
    /** Whether the control cannot act; its reason is already in the title and name. */
    readonly disabled?: boolean;
    /** A toggle's state, which it expresses with `aria-pressed` and never by renaming. */
    readonly pressed?: boolean;
    /** Whether the button draws active: a tinted ground and an accent glyph. */
    readonly active?: boolean;
    /**
     * Marks the button as the opener of a pop-out. The pop-out layer treats a
     * mousedown outside every panel and every trigger as a dismissal, so without this
     * mark the button's own mousedown would close the pop-out before its click could
     * toggle it, and the opener could never shut what it opened.
     */
    readonly popoutTrigger?: boolean;
    /** What the button does. */
    readonly onClick?: () => void;
}

/**
 * The top bar's icon button: a real button, 24 x 24, with its tooltip, its accessible
 * name and its `aria-hidden` glyph.
 *
 * Active is drawn with Mantine's `light` variant, which is the theme's own tinted
 * ground and accent ink -- the role the artboards paint as a tint plus an accent
 * glyph. No hex is written here (the authority split, spec 04 section 0).
 * @param props - the button's props.
 * @param ref - forwarded to the button element, so a caller can return focus to it.
 * @returns the button, wrapped in its tooltip.
 */
export const TopBarIconButton = forwardRef<HTMLButtonElement, TopBarIconButtonProps>(
    function TopBarIconButton(props, ref): React.JSX.Element {
        const {
            accessibleName,
            active = false,
            disabled = false,
            glyph,
            glyphSize = TOP_BAR_GLYPH_SIZE,
            onClick,
            popoutTrigger = false,
            pressed,
            radius = TOP_BAR_ICON_RADIUS,
            title,
            width = TOP_BAR_ICON_BUTTON,
            ...rest
        } = props;

        return (
            <Tooltip label={title} openDelay={TOOLTIP_DELAY_MS} withinPortal>
                <ActionIcon
                    {...rest}
                    ref={ref}
                    type="button"
                    variant={active ? "light" : "subtle"}
                    c={active || disabled ? undefined : PANEL_INK.CHROME}
                    w={width}
                    h={TOP_BAR_ICON_BUTTON}
                    miw={width}
                    mih={TOP_BAR_ICON_BUTTON}
                    style={{
                        borderRadius: typeof radius === "number" ? `${radius}px` : radius,
                        // Mantine paints a disabled control a filled grey; in this bar a
                        // control that cannot act is dimmed ink on the bar's own ground.
                        ...(disabled ? { background: "transparent" } : {}),
                    }}
                    aria-label={accessibleName}
                    aria-disabled={disabled || undefined}
                    aria-pressed={pressed}
                    data-disabled={disabled || undefined}
                    data-popout-trigger={popoutTrigger || undefined}
                    onClick={() => {
                        if (disabled) {
                            return;
                        }

                        onClick?.();
                    }}
                >
                    <TopBarGlyph name={glyph} size={glyphSize} />
                </ActionIcon>
            </Tooltip>
        );
    },
);

/**
 * Props of the key chip.
 * @public
 */
export interface TopBarKeyChipProps {
    /** The chord, already resolved for the platform by `keyChipFor`. */
    readonly chord: string;
}

/**
 * The key chip inside the command palette pill.
 *
 * Spec 04 section 10.3 keeps a binding to four places and adds: "Two chips are NOT
 * bindings in disguise and stay: the top bar search pill's `Cmd+K` and the `/` hint
 * inside a search input." This is that chip.
 * @param props - the chip's props.
 * @returns the chip.
 */
export function TopBarKeyChip(props: TopBarKeyChipProps): React.JSX.Element {
    const { chord } = props;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                flex: "0 0 auto",
                height: KEY_CHIP_HEIGHT,
                padding: `0 ${KEY_CHIP_PADDING_X}px`,
                borderRadius: KEY_CHIP_RADIUS,
                border: `${KEY_CHIP_BORDER_WIDTH}px solid ${PANEL_INK.BORDER}`,
                color: PANEL_INK.CHROME,
                fontFamily: "var(--mantine-font-family-monospace)",
                fontSize: KEY_CHIP_FONT_SIZE,
                lineHeight: 1,
                boxSizing: "border-box",
            }}
        >
            {chord}
        </span>
    );
}
