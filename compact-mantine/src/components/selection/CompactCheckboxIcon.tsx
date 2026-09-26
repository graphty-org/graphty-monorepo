import type { CheckboxIconProps } from "@mantine/core";
import React from "react";

// The tick and the dash the compact Checkbox draws (design/figma-spec.md 5.4), our own drawing
// on Figma's own paths (buttons-and-controls/checkbox-neutral-mixed--default.html): the tick's
// path box is 6.5 x 6 at (5, 5); the dash is drawn with crisp edges, so its round-capped 1.5px
// stroke snaps to a solid 7 x 2 bar instead of two half-covered pixel rows. Figma's path is
// M5 8H11, but in its capture the bar covers face columns 4-10 while the halo reaches column 12;
// our Chromium snaps M5 8H11 to columns 4-11, so the dash's glyph ends half a pixel earlier to
// paint Figma's pixels (checkbox-*-mixed--default.png).
// Each is drawn twice: a wide halo underneath (the blue variant's 4px
// --cm-control-icon-outline; the stylesheet hides it on the neutral variant) and the 1.5px glyph
// on top. Both paths are stroked with a normalized length of 12, so the stylesheet can draw the
// tick in by animating stroke-dashoffset 12 -> 0 when the box is checked (and only then).

const CHECK = "M5 8.5L7.5 11L11.5 5";
const DASH = "M5 8H11";
const DASH_GLYPH = "M5 8H10.5";

/**
 * The glyph inside the compact Checkbox's face. The theme passes it as Checkbox's `icon`, so
 * every Checkbox draws it; Mantine hands it `indeterminate` and the icon class name.
 * @param props - Mantine's icon props
 * @param props.indeterminate - draw the dash instead of the tick
 * @returns the svg
 */
export function CompactCheckboxIcon({ indeterminate, ...others }: CheckboxIconProps): React.JSX.Element {
    const dash = indeterminate === true;
    const d = dash ? DASH : CHECK;
    const shapeRendering = dash ? "crispEdges" : "geometricPrecision";
    return (
        <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            data-glyph={dash ? "dash" : "check"}
            {...others}
        >
            <path className="cm-checkbox-halo" d={d} pathLength={12} strokeLinecap="round" strokeLinejoin="round" shapeRendering={shapeRendering} />
            <path className="cm-checkbox-glyph" d={dash ? DASH_GLYPH : CHECK} pathLength={12} strokeLinecap="round" strokeLinejoin="round" shapeRendering={shapeRendering} />
        </svg>
    );
}
