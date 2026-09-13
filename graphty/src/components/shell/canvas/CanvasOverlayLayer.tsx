/**
 * The canvas overlay layer: the wrapper every canvas overlay is drawn inside.
 *
 * It draws nothing of its own. `display: contents` means it has no box at all, so
 * each overlay positions against the canvas element itself (the artboards' own
 * coordinate space) and no invisible full-size sheet sits between the pointer and the
 * graph. What the wrapper is FOR is the DOM ancestry: every overlay is a descendant of
 * one node carrying `data-canvas-overlay`, which is how the canvas tells a tap on the
 * graph from a tap on an overlay (build spec 01 section 7 item 5 -- a tap on the
 * canvas TOOLBAR is not a tap on the canvas).
 */

import React from "react";

/**
 * Props of the canvas overlay layer.
 * @public
 */
export interface CanvasOverlayLayerProps {
    /**
     * Whether the two-line rule has fired. Published as `data-reflowed` so the whole
     * stack can be read in one assertion and so a test never has to infer it from a
     * computed offset.
     */
    readonly reflowed: boolean;
    /** The overlays, in the DOM order build spec 01 section 2 fixes. */
    readonly children: React.ReactNode;
}

/**
 * Wraps the canvas overlays without drawing a box of its own.
 * @param props - the reflow state and the overlays.
 * @returns the overlay layer element.
 */
export function CanvasOverlayLayer(props: CanvasOverlayLayerProps): React.JSX.Element {
    const { children, reflowed } = props;

    return (
        <div data-canvas-overlay="layer" data-reflowed={reflowed ? "true" : "false"} style={{ display: "contents" }}>
            {children}
        </div>
    );
}
