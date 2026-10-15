/**
 * The canvas toolbar's [2D | 3D] segmented control.
 *
 * It is the bar's FIRST item because the bar is ordered by how long an effect lasts
 * (SPEC:3504-3509): the view mode outlives every zoom. It is also the reason the
 * status bar has no 3D chip -- this control is always visible, so the fact has one
 * region (build spec 01 section 8).
 *
 * The track is the bar's own size, 60 x 28 on the desktop profile and 68 x 32 below
 * 1280 px, read from the profile; nothing here is a literal.
 *
 * It is compact-mantine's themed SegmentedControl: the two halves are native radios, so
 * the arrow keys move and select the choice and the focus ring is the theme's. The shell's
 * key dispatcher leaves an arrow pressed on a radio to the radio (`ownsArrowKeys` in
 * ../useShellKeyBindings.ts), so while this control has focus an arrow is a choice rather
 * than an orbit.
 */

import { SegmentedControl } from "@graphty/compact-mantine";
import React from "react";

import type { CanvasToolbarProfile } from "../constants";
import type { CanvasViewMode } from "../types";

/**
 * The two halves, in drawn order. 2D is first: the pair reads as a ladder of
 * dimension, and 5 toggles between them (build spec 04 section 10).
 */
const VIEW_MODES: readonly { readonly value: CanvasViewMode; readonly label: string }[] = [
    { value: "2d", label: "2D" },
    { value: "3d", label: "3D" },
];

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

    return (
        <SegmentedControl
            aria-label={VIEW_MODE_GROUP_LABEL}
            data={[...VIEW_MODES]}
            value={value}
            onChange={(next) => {
                onChange(next as CanvasViewMode);
            }}
            style={{
                width: profile.segmentedWidth,
                height: profile.itemSize,
                padding: profile.segmentedInnerPadding,
                flex: "0 0 auto",
            }}
            styles={{ label: { height: profile.itemSize - profile.segmentedInnerPadding * 2 } }}
        />
    );
}
