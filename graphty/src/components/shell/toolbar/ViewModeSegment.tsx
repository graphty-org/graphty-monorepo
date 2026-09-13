/**
 * The canvas toolbar's [2D | 3D] segmented control.
 *
 * It is the bar's FIRST item because the bar is ordered by how long an effect lasts
 * (SPEC:3504-3509): the view mode outlives every zoom. It is also the reason the
 * status bar has no 3D chip -- this control is always visible, so the fact has one
 * region (build spec 01 section 8).
 *
 * It is deliberately NOT `IconGroupRow`: that is a panel row type at panel scale
 * (24 px tall inside a 280 px column), and this is the bar's own part at 60 x 28 on
 * the desktop profile and 68 x 32 below 1280 px. Everything it draws comes from the
 * profile; nothing here is a literal.
 *
 * The two halves are radios rather than toggles: they are one choice with two values,
 * exactly one of which is true, so the group carries `role="radiogroup"`, each half
 * carries `role="radio"` with `aria-checked`, and focus moves between them with the
 * arrow keys under a roving tab stop. The arrow keys are consumed here, because while
 * this control has focus an arrow is a choice rather than an orbit -- the shell's one
 * dispatcher never sees the press.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import { UnstyledButton } from "@mantine/core";
import React, { useRef } from "react";

import type { CanvasToolbarProfile } from "../constants";
import type { CanvasViewMode } from "../types";
import { SEGMENT_FONT_SIZE, SEGMENT_FONT_WEIGHT } from "./toolbarMetrics";

/**
 * The two halves, in drawn order. 2D is first: the pair reads as a ladder of
 * dimension, and 5 toggles between them (build spec 04 section 10).
 */
const VIEW_MODES: readonly { readonly value: CanvasViewMode; readonly label: string }[] = [
    { value: "2d", label: "2D" },
    { value: "3d", label: "3D" },
];

/**
 * Which way each arrow key moves the choice. A radio group is one control, so both
 * axes move it -- the group is horizontal, but a reader who presses Down expects the
 * next value rather than nothing.
 */
const ARROW_DELTAS: Readonly<Record<string, number | undefined>> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
};

/**
 * The group's accessible name. The control has no visible label on the bar -- its two
 * halves are its own words -- so the group needs one of its own.
 */
export const VIEW_MODE_GROUP_LABEL = "View mode";

/**
 * Props of {@link ViewModeSegment}.
 * @public
 */
export interface ViewModeSegmentProps {
    /** The mode currently drawn checked. */
    readonly value: CanvasViewMode;
    /** The size profile in force. */
    readonly profile: CanvasToolbarProfile;
    /** Called with the mode the reader chose. */
    readonly onChange: (mode: CanvasViewMode) => void;
}

/**
 * The 2D / 3D segmented control.
 * @param props - the checked mode, the size profile and the change handler.
 * @returns the segmented control.
 */
export function ViewModeSegment(props: ViewModeSegmentProps): React.JSX.Element {
    const { value, profile, onChange } = props;
    const groupRef = useRef<HTMLDivElement>(null);
    const halfHeight = profile.itemSize - profile.segmentedInnerPadding * 2;

    const move = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const delta = ARROW_DELTAS[event.key];

        if (delta === undefined) {
            return;
        }

        // The dispatcher owns the arrows globally (pan in 2D, orbit in 3D). While the
        // choice has focus this press belongs to the choice, so it stops here.
        event.preventDefault();
        event.stopPropagation();

        const index = VIEW_MODES.findIndex((mode) => mode.value === value);
        const next = VIEW_MODES[(index + delta + VIEW_MODES.length) % VIEW_MODES.length];

        onChange(next.value);

        const buttons = groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]');
        const target = buttons?.item(VIEW_MODES.indexOf(next));

        target?.focus();
    };

    return (
        <div
            ref={groupRef}
            role="radiogroup"
            aria-label={VIEW_MODE_GROUP_LABEL}
            onKeyDown={move}
            style={{
                display: "flex",
                alignItems: "center",
                width: profile.segmentedWidth,
                height: profile.itemSize,
                padding: profile.segmentedInnerPadding,
                borderRadius: profile.itemRadius,
                background: PANEL_INK.SURFACE,
                flex: "0 0 auto",
                boxSizing: "border-box",
            }}
        >
            {VIEW_MODES.map((mode) => {
                const checked = mode.value === value;

                return (
                    <UnstyledButton
                        key={mode.value}
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => {
                            onChange(mode.value);
                        }}
                        style={{
                            flex: "1 1 0",
                            minWidth: 0,
                            height: halfHeight,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: profile.segmentedHalfRadius,
                            background: checked ? PANEL_INK.SELECTED : "transparent",
                            color: checked ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME,
                            fontSize: SEGMENT_FONT_SIZE,
                            fontWeight: SEGMENT_FONT_WEIGHT,
                            lineHeight: 1,
                            boxSizing: "border-box",
                        }}
                    >
                        {mode.label}
                    </UnstyledButton>
                );
            })}
        </div>
    );
}
