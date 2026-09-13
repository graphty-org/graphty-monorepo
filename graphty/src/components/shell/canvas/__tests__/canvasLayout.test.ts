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

    describe("the two-line reflow", () => {
        it("does not fire at the reference canvas of 832", () => {
            expect(stackAt(NOTHING, 832).reflowed).toBe(false);
        });

        it("does not fire at 672, the canvas at 1280 with both columns open", () => {
            expect(stackAt(NOTHING, 672).reflowed).toBe(false);
        });

        it("fires below 622 with the desktop bar", () => {
            expect(stackAt(NOTHING, 621).reflowed).toBe(true);
            expect(stackAt(NOTHING, 622).reflowed).toBe(false);
        });

        it("fires below 650 with the narrow bar", () => {
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
