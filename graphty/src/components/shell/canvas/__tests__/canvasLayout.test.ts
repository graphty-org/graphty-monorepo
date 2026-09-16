import { describe, expect, it } from "vitest";

import { CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_NARROW, type CanvasBottomStackState, DATA_DRAWER_DEFAULT_HEIGHT, LEGEND_MAX_HEIGHT, LEGEND_MIN_HEIGHT, OVERLAY_REFLOW_RISE } from "../../constants";
import {
    canvasBottomStack,
    clampDataDrawerHeight,
    DATA_DRAWER_MIN_HEIGHT,
    dockedHeight,
    heatmapCellOpacity,
    isLegendCompact,
    isLegendDrawn,
    isMinimapDrawn,
    legendMaxHeight,
    overlayBaselineOffset,
    pointerFractionWithin,
    timeSliderBottomOffset,
} from "../canvasLayout";

const NOTHING: CanvasBottomStackState = {
    drawerOpen: false,
    drawerHeight: DATA_DRAWER_DEFAULT_HEIGHT,
    drawerMaximised: false,
    timeSliderOn: false,
};

const SLIDER: CanvasBottomStackState = { ...NOTHING, timeSliderOn: true };
const DRAWER: CanvasBottomStackState = { ...NOTHING, drawerOpen: true };
const DRAWER_AND_SLIDER: CanvasBottomStackState = { ...NOTHING, drawerOpen: true, timeSliderOn: true };
const MAXIMISED: CanvasBottomStackState = { ...DRAWER, drawerMaximised: true };

const CANVAS_HEIGHT = 836;
const WIDE_CANVAS = 832;
const NARROW_CANVAS = 600;

function stackAt(state: CanvasBottomStackState, canvasWidth = WIDE_CANVAS): ReturnType<typeof canvasBottomStack> {
    return canvasBottomStack({
        stack: state,
        canvasWidth,
        canvasHeight: CANVAS_HEIGHT,
        profile: CANVAS_TOOLBAR_DESKTOP,
        minimapVisible: true,
        legendVisible: true,
        encodedChannelCount: 1,
    });
}

describe("canvasLayout", () => {
    describe("the toolbar offset ladder", () => {
        it("rides 12 above the canvas floor with nothing else on", () => {
            expect(stackAt(NOTHING).toolbarBottom).toBe(12);
        });

        it("rides 82 with the time slider on", () => {
            expect(stackAt(SLIDER).toolbarBottom).toBe(82);
        });

        it("rides 272 with the data table drawer open", () => {
            expect(stackAt(DRAWER).toolbarBottom).toBe(272);
        });

        it("rides 342 with the drawer open and the slider docked to it", () => {
            expect(stackAt(DRAWER_AND_SLIDER).toolbarBottom).toBe(342);
        });

        it("is not drawn at all when the drawer is maximised", () => {
            expect(stackAt(MAXIMISED).toolbarBottom).toBeNull();
        });

        it("follows a dragged drawer rather than its default height", () => {
            expect(stackAt({ ...DRAWER, drawerHeight: 400 }).toolbarBottom).toBe(412);
        });
    });

    describe("the shared baseline", () => {
        it("puts the minimap and the legend on the toolbar's own offset", () => {
            for (const state of [NOTHING, SLIDER, DRAWER, DRAWER_AND_SLIDER]) {
                const layout = stackAt(state);

                expect(layout.overlayBottom).toBe(layout.toolbarBottom);
            }
        });

        it("raises them by 48 when the two-line rule fires", () => {
            expect(overlayBaselineOffset(NOTHING, true)).toBe(12 + OVERLAY_REFLOW_RISE);
            expect(overlayBaselineOffset(DRAWER_AND_SLIDER, true)).toBe(342 + OVERLAY_REFLOW_RISE);
        });

        it("takes them with the toolbar when the drawer is maximised", () => {
            expect(overlayBaselineOffset(MAXIMISED, false)).toBeNull();
            expect(overlayBaselineOffset(MAXIMISED, true)).toBeNull();
        });
    });

    /*
     * THE REFLOW LADDER, RESTATED RATHER THAN NUDGED.
     *
     * Every width below is a LIVE canvas rect -- the strip of graph the reader can see
     * -- and that has to be said out loud, because for one release the number fed to
     * `hasOverlayReflowed` was the canvas ELEMENT's width and the two differed by up to
     * 560 px. Below 1280 px the activity panel and the inspector became 280 px
     * absolutely positioned overlays over a canvas that spec 01 section 7 item 7
     * deliberately did not resize under them, so at a 1200 px window the element
     * measured 1152 while 592 px of graph was visible: the ladder took its two-line
     * decision over 1152, the reader saw 592, and the minimap and legend stayed on one
     * line inside a strip half that wide.
     *
     * The sub-1280 layout was deleted whole on 2026-09-14 (product owner: "there will be
     * no more auto-hide. below 1280 should just say 'screen too small' or something
     * similar"), so both sidebars are docked flex columns and the element rect IS the
     * live rect. THE NUMBERS BELOW THEREFORE DID NOT MOVE -- and that is the point. They
     * were always meant to describe the visible strip; what changed is that the shell
     * now hands over a width that means what these rows say it means. A row adjusted
     * until it passed would have hidden exactly that.
     *
     * WHAT IS REACHABLE IN THE SHIPPED SHELL, worked out rather than assumed:
     * - 622 (desktop bar) IS reachable. The canvas floor is CANVAS_MIN_WIDTH = 520, and
     *   `maxActivityPanelWidth` / `maxInspectorWidth` let a reader drag the sidebars out
     *   until the canvas hits it, so widths from 520 up cross this threshold on any
     *   window the shell lays out at.
     * - 650 (narrow bar) is NOT reachable. `canvasToolbarProfile` picks the narrow
     *   profile only below a 1280 px VIEWPORT, which is exactly where the shell now
     *   renders "screen too small" instead of a canvas. The row below therefore pins the
     *   pure function's contract, not a state a reader can get into; it is kept because
     *   `canvasBottomStack` takes the profile as a parameter and must keep honouring it,
     *   and it is labelled so nobody reads it as evidence that a narrow bar still ships.
     */
    describe("the two-line reflow", () => {
        it("does not fire at the reference canvas of 832, the live strip at 1440 with both sidebars docked", () => {
            expect(stackAt(NOTHING, 832).reflowed).toBe(false);
        });

        it("does not fire at 672, the live strip at 1280 with both sidebars docked", () => {
            expect(stackAt(NOTHING, 672).reflowed).toBe(false);
        });

        it("fires below 622 of LIVE canvas with the desktop bar, which a sidebar drag can reach", () => {
            expect(stackAt(NOTHING, 621).reflowed).toBe(true);
            expect(stackAt(NOTHING, 622).reflowed).toBe(false);
        });

        it("fires below 650 with the narrow bar, a profile no width the shell lays out at selects", () => {
            const narrow = (width: number): boolean =>
                canvasBottomStack({
                    stack: NOTHING,
                    canvasWidth: width,
                    canvasHeight: CANVAS_HEIGHT,
                    profile: CANVAS_TOOLBAR_NARROW,
                    minimapVisible: true,
                    legendVisible: true,
                    encodedChannelCount: 1,
                }).reflowed;

            expect(narrow(649)).toBe(true);
            expect(narrow(650)).toBe(false);
        });

        it("treats an unmeasured canvas as not reflowed", () => {
            expect(stackAt(NOTHING, 0).reflowed).toBe(false);
        });

        it("hides neither the minimap nor the legend when it fires", () => {
            const layout = stackAt(NOTHING, NARROW_CANVAS);

            expect(layout.reflowed).toBe(true);
            expect(layout.minimapDrawn).toBe(true);
            expect(layout.legendDrawn).toBe(true);
            expect(layout.overlayBottom).toBe(12 + OVERLAY_REFLOW_RISE);
        });
    });

    describe("the time slider", () => {
        it("is not drawn when it is off", () => {
            expect(timeSliderBottomOffset(NOTHING)).toBeNull();
        });

        it("sits on the canvas floor when the drawer is closed", () => {
            expect(timeSliderBottomOffset(SLIDER)).toBe(0);
        });

        it("docks to the drawer's top edge when both are open", () => {
            expect(timeSliderBottomOffset(DRAWER_AND_SLIDER)).toBe(DATA_DRAWER_DEFAULT_HEIGHT);
        });

        it("leaves with the rest of the stack when the drawer is maximised", () => {
            expect(timeSliderBottomOffset({ ...MAXIMISED, timeSliderOn: true })).toBeNull();
        });
    });

    describe("docks against overlays", () => {
        it("takes no canvas while the drawer is closed", () => {
            expect(dockedHeight(SLIDER, CANVAS_HEIGHT)).toBe(0);
        });

        it("takes the drawer's height while it is open", () => {
            expect(dockedHeight(DRAWER, CANVAS_HEIGHT)).toBe(DATA_DRAWER_DEFAULT_HEIGHT);
        });

        it("takes the whole canvas while the drawer is maximised", () => {
            expect(dockedHeight(MAXIMISED, CANVAS_HEIGHT)).toBe(CANVAS_HEIGHT);
        });

        it("never takes more canvas than there is", () => {
            expect(dockedHeight({ ...DRAWER, drawerHeight: 5000 }, CANVAS_HEIGHT)).toBe(CANVAS_HEIGHT);
        });

        it("keeps its height on a canvas that has not been measured yet", () => {
            expect(dockedHeight(DRAWER, 0)).toBe(DATA_DRAWER_DEFAULT_HEIGHT);
        });

        /*
         * The drawer is a dock at every width the shell lays out at, with no escape
         * hatch. A `drawerOverlaysCanvas` flag stood in `CanvasBottomStackInput` until
         * 2026-09-14 and forced this to 0, because below 1280 px spec 01 section 7 item
         * 3 made the drawer an overlay that shortened nothing. That layout was deleted
         * rather than reworked, so the flag had exactly one reachable value left. It went
         * with the layout, and this board is what stops it coming back as an option
         * nobody can exercise.
         */
        it("takes the drawer's height with no way for a caller to ask it not to", () => {
            const layout = canvasBottomStack({
                stack: DRAWER,
                canvasWidth: WIDE_CANVAS,
                canvasHeight: CANVAS_HEIGHT,
                profile: CANVAS_TOOLBAR_DESKTOP,
                minimapVisible: true,
                legendVisible: true,
                encodedChannelCount: 1,
            });

            expect(layout.dockedHeight).toBe(DATA_DRAWER_DEFAULT_HEIGHT);
            expect(Object.keys(layout)).not.toContain("drawerOverlaysCanvas");
        });
    });

    /*
     * ONE RECT, ONE STACK -- the fact the owner's "the data table isn't visible when the
     * panels are open" report turned on.
     *
     * The drawer, the time slider, the minimap and the legend are four components, but
     * they are ONE measurement: every offset any of them takes comes out of this
     * function, measured against `canvasWidth` and `canvasHeight`. That is why a rect
     * wider than the visible strip did not produce four bugs -- it produced one bug that
     * showed up in four places -- and why the repair is a single correct rect rather
     * than four z-index raises. Spec 5.2:448 forbids the drawer covering the panel or
     * the inspector, so raising it above them would have bought visibility by breaking
     * the guarantee; shrinking the rect keeps it.
     *
     * These boards pin the coupling itself, so that anybody who ever needs to inset the
     * rect can see, in one place, exactly how much rides on it.
     */
    describe("the whole bottom stack rides one rect", () => {
        it("moves every offset together when the measured rect narrows", () => {
            const wide = stackAt(DRAWER_AND_SLIDER, 832);
            const narrow = stackAt(DRAWER_AND_SLIDER, 560);

            expect(wide.reflowed).toBe(false);
            expect(narrow.reflowed).toBe(true);

            // The toolbar keeps its ladder rung; the two baseline overlays rise off it
            // together. Neither is ever hidden by the reflow (spec 01 section 5).
            expect(narrow.toolbarBottom).toBe(wide.toolbarBottom);
            expect(narrow.overlayBottom).toBe((wide.overlayBottom ?? 0) + OVERLAY_REFLOW_RISE);
            expect(narrow.minimapDrawn).toBe(wide.minimapDrawn);
            expect(narrow.legendDrawn).toBe(wide.legendDrawn);
        });

        it("takes the reflow decision over the width it is given and nothing else", () => {
            // 592 is what the reader could see at a 1200 px window with both sidebars
            // over the canvas; 1152 is what the canvas ELEMENT reported at that moment.
            // The two disagree about the reflow, which is the defect in one line.
            expect(stackAt(NOTHING, 592).reflowed).toBe(true);
            expect(stackAt(NOTHING, 1152).reflowed).toBe(false);
        });
    });

    describe("the minimap and the legend while the drawer is open", () => {
        it("hides the minimap", () => {
            expect(isMinimapDrawn(true, DRAWER)).toBe(false);
            expect(isMinimapDrawn(true, NOTHING)).toBe(true);
        });

        it("compacts the legend rather than hiding it", () => {
            expect(isLegendCompact(DRAWER)).toBe(true);
            expect(isLegendDrawn(true, 1, DRAWER)).toBe(true);
        });

        it("takes the legend with the toolbar only when the drawer is maximised", () => {
            expect(isLegendDrawn(true, 1, MAXIMISED)).toBe(false);
            expect(isLegendCompact(MAXIMISED)).toBe(false);
        });

        it("does not render the legend when nothing is encoded", () => {
            expect(isLegendDrawn(true, 0, NOTHING)).toBe(false);
        });

        it("does not render either when the Views menu has turned it off", () => {
            expect(isMinimapDrawn(false, NOTHING)).toBe(false);
            expect(isLegendDrawn(false, 3, NOTHING)).toBe(false);
        });
    });

    describe("the legend's height cap", () => {
        it("caps at 240 on a tall canvas", () => {
            expect(legendMaxHeight(CANVAS_HEIGHT, 12)).toBe(LEGEND_MAX_HEIGHT);
        });

        it("measures the cap from the raised bottom", () => {
            expect(legendMaxHeight(CANVAS_HEIGHT, 700)).toBe(CANVAS_HEIGHT - 700 - 12);
        });

        it("never falls below the 80 minimum", () => {
            expect(legendMaxHeight(CANVAS_HEIGHT, 820)).toBe(LEGEND_MIN_HEIGHT);
        });
    });

    describe("the drawer's drag clamp", () => {
        it("never goes below its own chrome", () => {
            expect(clampDataDrawerHeight(0, CANVAS_HEIGHT)).toBe(DATA_DRAWER_MIN_HEIGHT);
        });

        it("never goes taller than the canvas", () => {
            expect(clampDataDrawerHeight(5000, CANVAS_HEIGHT)).toBe(CANVAS_HEIGHT);
        });

        it("passes a height in range straight through", () => {
            expect(clampDataDrawerHeight(300, CANVAS_HEIGHT)).toBe(300);
        });

        it("keeps the floor when the canvas is shorter than it", () => {
            expect(clampDataDrawerHeight(200, 40)).toBe(DATA_DRAWER_MIN_HEIGHT);
        });

        it("does not clamp against a canvas that has not been measured yet", () => {
            expect(clampDataDrawerHeight(300, 0)).toBe(300);
        });
    });

    describe("the minimap's heatmap", () => {
        it("reports nothing for an empty cell", () => {
            expect(heatmapCellOpacity(0, 100)).toBe(0);
        });

        it("reports full opacity for the densest cell", () => {
            expect(heatmapCellOpacity(100, 100)).toBe(1);
        });

        it("is log-scaled, so a tenth of the density is far more than a tenth of the ink", () => {
            expect(heatmapCellOpacity(10, 100)).toBeGreaterThan(0.5);
        });
    });

    describe("pointer fractions", () => {
        const box = { left: 100, top: 50, width: 200, height: 100 };

        it("reports the centre as a half in each direction", () => {
            expect(pointerFractionWithin(box, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
        });

        it("clamps a pointer that has left the box", () => {
            expect(pointerFractionWithin(box, 0, 0)).toEqual({ x: 0, y: 0 });
            expect(pointerFractionWithin(box, 9999, 9999)).toEqual({ x: 1, y: 1 });
        });

        it("survives a box that has not been measured", () => {
            expect(pointerFractionWithin({ left: 0, top: 0, width: 0, height: 0 }, 10, 10)).toEqual({ x: 0, y: 0 });
        });
    });
});
