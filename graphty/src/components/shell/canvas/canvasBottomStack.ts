import { createContext, useContext } from "react";

import type { CanvasBottomStackLayout } from "./canvasLayout";

/**
 * The bottom stack this canvas measured, for the overlays the SHELL passes in as
 * children -- the canvas toolbar above all.
 *
 * The ladder of section 3 is one pure function of state, and only this region knows the
 * live canvas rect it is measured against: the drawer's height is clamped to the canvas
 * it docks into, so a remembered 700 px drawer in a 416 px canvas is 416 px of stack and
 * not 700. A caller that recomputed the offset outside the region would not know that,
 * and would put the bar, the minimap and the legend above the top of the canvas. So the
 * region publishes what it decided and its children read it here instead.
 */
export const CanvasBottomStackContext = createContext<CanvasBottomStackLayout | null>(null);

/**
 * The bottom stack the enclosing canvas region measured.
 * @returns the stack's offsets and visibility decisions, or null outside a canvas region.
 */
export function useCanvasBottomStack(): CanvasBottomStackLayout | null {
    return useContext(CanvasBottomStackContext);
}
