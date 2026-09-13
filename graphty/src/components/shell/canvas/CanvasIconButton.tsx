/**
 * The icon-only control every canvas overlay draws, with 6.8's four obligations wired
 * in one place: an `aria-label` equal to the tooltip minus the key chip, an
 * `aria-hidden` glyph, a tooltip at the 150 ms dwell, and a 24 x 24 hit area (32 x 32
 * below 1280 where the icon is the sole path to a capability).
 *
 * A disabled control states its reason IN THE TOOLTIP (floor item 4), which is why it
 * carries `aria-disabled` rather than the `disabled` attribute: a `disabled` button
 * takes no pointer events, so its reason would be unreadable by the pointer that
 * needs it. Activation is refused in the handler instead.
 *
 * Build spec 04 sections 8.1 to 8.3.
 */

import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Tooltip } from "@mantine/core";
import React, { useCallback } from "react";

import { TOOLTIP_DELAY_MS } from "../constants";
import { CANVAS_SPACE } from "./canvasLayout";

/**
 * Props of a canvas overlay's icon-only control.
 * @public
 */
export interface CanvasIconButtonProps {
    /**
     * The control's name, which is its accessible name: the tooltip text with the key
     * chip removed (6.8 obligation 1).
     */
    readonly label: string;
    /**
     * The key chip, from `keyChipFor`. Drawn after the label in the tooltip and never
     * in the accessible name. A control's tooltip is one of the four sanctioned
     * places a binding may appear (10.3).
     */
    readonly chip?: string | null;
    /** The glyph, which the button marks `aria-hidden`. */
    readonly glyph: React.ReactNode;
    /** What the control does. */
    readonly onClick: () => void;
    /** Whether the control is drawn inoperable. */
    readonly disabled?: boolean;
    /** Why it is inoperable. Appended to the tooltip; floor item 4 requires it. */
    readonly disabledReason?: string;
    /** Whether the control is drawn lit, e.g. a gear whose pop-out is open. */
    readonly active?: boolean;
    /** The hit box, square. Defaults to the 24 px panel control height. */
    readonly size?: number;
}

/**
 * The tooltip text a control prints: the verb, then the disabled reason when there is
 * one, then the key chip.
 *
 * Public because every canvas overlay composes its titles this way, not only the buttons
 * declared here.
 * @param label - the control's name.
 * @param chip - the key chip, or null when the action carries none.
 * @param disabledReason - the reason the control is inoperable, when it is.
 * @returns the tooltip text.
 * @public
 */
export function canvasTooltipText(label: string, chip?: string | null, disabledReason?: string): string {
    const withChip = chip === undefined || chip === null || chip === "" ? label : `${label} (${chip})`;

    return disabledReason === undefined || disabledReason === "" ? withChip : `${withChip}. ${disabledReason}`;
}

/**
 * Draws one icon-only canvas control.
 * @param props - the label, the glyph, the chip and the handler.
 * @returns the control element.
 */
export function CanvasIconButton(props: CanvasIconButtonProps): React.JSX.Element {
    const { active = false, chip, disabled = false, disabledReason, glyph, label, onClick, size } = props;
    const box = size ?? PANEL_GRID.CONTROL_HEIGHT;

    const handleClick = useCallback(() => {
        if (disabled) {
            return;
        }

        onClick();
    }, [disabled, onClick]);

    let ink: string = PANEL_INK.CHROME;

    if (disabled) {
        ink = PANEL_INK.DISABLED;
    } else if (active) {
        ink = PANEL_INK.VALUE;
    }

    return (
        <Tooltip
            label={canvasTooltipText(label, chip, disabled ? disabledReason : undefined)}
            openDelay={TOOLTIP_DELAY_MS}
            position="top"
        >
            <button
                type="button"
                aria-label={label}
                aria-disabled={disabled ? true : undefined}
                data-active={active ? "true" : undefined}
                onClick={handleClick}
                style={{
                    width: box,
                    height: box,
                    flex: `0 0 ${String(box)}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    borderRadius: "var(--mantine-radius-sm)",
                    border: `${String(CANVAS_SPACE.HAIRLINE)}px solid transparent`,
                    background: active ? PANEL_INK.RAISED : "transparent",
                    color: ink,
                    cursor: disabled ? "default" : "pointer",
                    boxSizing: "border-box",
                }}
            >
                <span aria-hidden="true" style={{ display: "flex" }}>
                    {glyph}
                </span>
            </button>
        </Tooltip>
    );
}
