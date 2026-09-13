import { describe, expect, it } from "vitest";

import {
    ACTIVITIES_REQUIRING_DATA,
    ACTIVITY_ORDER,
    ACTIVITY_PANEL_MAX_WIDTH,
    ACTIVITY_PANEL_MIN_WIDTH,
    ACTIVITY_PANEL_WIDTH_DEFAULT,
    ACTIVITY_RAIL_WIDTH,
    BASELINE_OVERLAY_BAND,
    CANVAS_MENU_Z_INDEX,
    CANVAS_MIN_WIDTH,
    CANVAS_POPOUT_Z_INDEX,
    CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE,
    CANVAS_TOOLBAR_BOTTOM_OFFSET_DRAWER,
    CANVAS_TOOLBAR_BOTTOM_OFFSET_DRAWER_AND_SLIDER,
    CANVAS_TOOLBAR_BOTTOM_OFFSET_TIME_SLIDER,
    CANVAS_TOOLBAR_DESKTOP,
    CANVAS_TOOLBAR_DESKTOP_WIDTH,
    CANVAS_TOOLBAR_NARROW,
    CANVAS_TOOLBAR_NARROW_WIDTH,
    CANVAS_TOOLBAR_Z_INDEX,
    canvasToolbarBottomOffset,
    canvasToolbarProfile,
    canvasToolbarReflowThreshold,
    canvasToolbarWidth,
    canvasToolbarZoomGroupWidth,
    clampActivityPanelWidth,
    clampInspectorWidth,
    clampWidth,
    DATA_DRAWER_DEFAULT_HEIGHT,
    hasOverlayReflowed,
    INSPECTOR_MAX_WIDTH,
    INSPECTOR_MIN_WIDTH,
    INSPECTOR_WIDTH_DEFAULT,
    isNarrowViewport,
    LEGEND_MAX_HEIGHT,
    LEGEND_MIN_HEIGHT,
    LEGEND_WIDTH,
    liveCanvasWidth,
    maxActivityPanelWidth,
    maxInspectorWidth,
    MINIMAP_HEIGHT,
    MINIMAP_WIDTH,
    NARROW_BREAKPOINT,
    OVERLAY_INSET,
    OVERLAY_MIN_CLEARANCE,
    OVERLAY_REFLOW_RISE,
    PANEL_HEADER_HEIGHT,
    PINNED_ACTIVITIES,
    PRIMARY_ACTIVITIES,
    REFLOW_THRESHOLD_DESKTOP,
    REFLOW_THRESHOLD_NARROW,
    STATUS_BAR_DROP_ORDER,
    STATUS_BAR_HEIGHT,
    STATUS_BAR_NEVER_DROP,
    STATUS_BAR_SLOT_ORDER,
    TIME_SLIDER_HEIGHT,
    TOP_BAR_HEIGHT,
    UNDO_DEPTH,
} from "../constants";

describe("shell constants", () => {
    describe("region geometry", () => {
        it("fixes the rail, the bars and the panel columns at their drawn sizes", () => {
            expect(ACTIVITY_RAIL_WIDTH).toBe(48);
            expect(TOP_BAR_HEIGHT).toBe(40);
            expect(STATUS_BAR_HEIGHT).toBe(24);
            expect(PANEL_HEADER_HEIGHT).toBe(36);
            expect(ACTIVITY_PANEL_WIDTH_DEFAULT).toBe(280);
            expect(INSPECTOR_WIDTH_DEFAULT).toBe(280);
        });

        it("makes the panel width the PANEL_GRID identity", () => {
            const identity = 16 + 108 + 8 + 108 + 8 + 24 + 8;

            expect(ACTIVITY_PANEL_WIDTH_DEFAULT).toBe(identity);
            expect(ACTIVITY_PANEL_MIN_WIDTH).toBe(identity);
        });

        it("caps a panel drag at the top rung of the pop-out width ladder", () => {
            expect(ACTIVITY_PANEL_MAX_WIDTH).toBe(480);
        });

        /*
         * design 6.9 (SPEC:3369) makes the inspector the same 280 px column as an activity
         * panel, and the section 3 toolbar table's "nothing else on | 12" IS the shared
         * OVERLAY_INSET. constants.ts records both identities by declaring the second name
         * as the first, and those five declarations carry an `@alias` JSDoc tag so knip
         * reads them as a deliberate derivation rather than a duplicate export. The tag
         * also takes them out of knip's unused-export check, so the identity itself is
         * pinned here: if someone replaces a derivation with its own literal, this fails.
         */
        it("derives the inspector column and the base toolbar offset from the surfaces the spec shares them with", () => {
            expect(INSPECTOR_WIDTH_DEFAULT).toBe(ACTIVITY_PANEL_WIDTH_DEFAULT);
            expect(INSPECTOR_MIN_WIDTH).toBe(ACTIVITY_PANEL_MIN_WIDTH);
            expect(INSPECTOR_MAX_WIDTH).toBe(ACTIVITY_PANEL_MAX_WIDTH);
            expect(CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE).toBe(OVERLAY_INSET);
        });

        it("fixes the canvas clamp and the narrow breakpoint", () => {
            expect(CANVAS_MIN_WIDTH).toBe(520);
            expect(NARROW_BREAKPOINT).toBe(1280);
        });

        it("fixes the undo depth at 50", () => {
            expect(UNDO_DEPTH).toBe(50);
        });
    });

    describe("canvas overlay geometry", () => {
        it("shares one 12 px baseline inset and a 16 px minimum clearance", () => {
            expect(OVERLAY_INSET).toBe(12);
            expect(OVERLAY_MIN_CLEARANCE).toBe(16);
        });

        it("draws the minimap at 160 x 100 and the legend at 256 wide", () => {
            expect(MINIMAP_WIDTH).toBe(160);
            expect(MINIMAP_HEIGHT).toBe(100);
            expect(LEGEND_WIDTH).toBe(256);
            expect(LEGEND_MIN_HEIGHT).toBe(80);
            expect(LEGEND_MAX_HEIGHT).toBe(240);
        });

        it("gives one baseline overlay a 172 px band from its own canvas edge", () => {
            expect(BASELINE_OVERLAY_BAND).toBe(172);
            expect(BASELINE_OVERLAY_BAND).toBe(OVERLAY_INSET + MINIMAP_WIDTH);
        });

        it("raises the minimap and legend 48 px on reflow", () => {
            expect(OVERLAY_REFLOW_RISE).toBe(48);
        });

        it("docks the drawer at 260 and overlays the time slider at 70, not 72", () => {
            expect(DATA_DRAWER_DEFAULT_HEIGHT).toBe(260);
            expect(TIME_SLIDER_HEIGHT).toBe(70);
        });

        it("stacks the toolbar under pop-outs and pop-outs under menus", () => {
            expect(CANVAS_TOOLBAR_Z_INDEX).toBe(6);
            expect(CANVAS_POPOUT_Z_INDEX).toBe(8);
            expect(CANVAS_MENU_Z_INDEX).toBe(15);
        });
    });

    describe("canvas toolbar width arithmetic", () => {
        it("sums the desktop profile to the documented 246", () => {
            expect(canvasToolbarWidth(CANVAS_TOOLBAR_DESKTOP)).toBe(246);
            expect(CANVAS_TOOLBAR_DESKTOP_WIDTH).toBe(246);
        });

        it("reproduces the spec's desktop derivation term by term", () => {
            const derivation = 3 + 60 + 12 + (28 * 4 + 2 * 3) + 12 + 36 + 3 + 2;

            expect(canvasToolbarWidth(CANVAS_TOOLBAR_DESKTOP)).toBe(derivation);
        });

        it("sums the narrow profile to the documented 274", () => {
            expect(canvasToolbarWidth(CANVAS_TOOLBAR_NARROW)).toBe(274);
            expect(CANVAS_TOOLBAR_NARROW_WIDTH).toBe(274);
        });

        it("reproduces the spec's narrow derivation term by term", () => {
            const derivation = 3 + 68 + 12 + (32 * 4 + 2 * 3) + 12 + 40 + 3 + 2;

            expect(canvasToolbarWidth(CANVAS_TOOLBAR_NARROW)).toBe(derivation);
        });

        it("measures the four-item zoom group as items plus three gaps", () => {
            expect(canvasToolbarZoomGroupWidth(CANVAS_TOOLBAR_DESKTOP)).toBe(28 * 4 + 2 * 3);
            expect(canvasToolbarZoomGroupWidth(CANVAS_TOOLBAR_NARROW)).toBe(32 * 4 + 2 * 3);
        });

        it("keeps the two profiles at their drawn heights and glyph sizes", () => {
            expect(CANVAS_TOOLBAR_DESKTOP.height).toBe(36);
            expect(CANVAS_TOOLBAR_DESKTOP.itemSize).toBe(28);
            expect(CANVAS_TOOLBAR_DESKTOP.glyphSize).toBe(14);
            expect(CANVAS_TOOLBAR_NARROW.height).toBe(40);
            expect(CANVAS_TOOLBAR_NARROW.itemSize).toBe(32);
            expect(CANVAS_TOOLBAR_NARROW.glyphSize).toBe(16);
        });

        it("keeps the container radius concentric with the item radius", () => {
            expect(CANVAS_TOOLBAR_DESKTOP.containerRadius).toBe(
                CANVAS_TOOLBAR_DESKTOP.itemRadius + CANVAS_TOOLBAR_DESKTOP.containerPadding,
            );
        });

        it("picks the profile by the narrow breakpoint", () => {
            expect(canvasToolbarProfile(1440).id).toBe("desktop");
            expect(canvasToolbarProfile(1280).id).toBe("desktop");
            expect(canvasToolbarProfile(1279).id).toBe("narrow");
        });
    });

    describe("two-line reflow thresholds", () => {
        it("fires at the documented 622 with the desktop bar", () => {
            expect(canvasToolbarReflowThreshold(CANVAS_TOOLBAR_DESKTOP)).toBe(622);
            expect(REFLOW_THRESHOLD_DESKTOP).toBe(622);
        });

        it("reproduces 172 + 16 + 246 + 16 + 172", () => {
            expect(REFLOW_THRESHOLD_DESKTOP).toBe(172 + 16 + 246 + 16 + 172);
        });

        it("fires at the documented 650 with the narrow bar", () => {
            expect(canvasToolbarReflowThreshold(CANVAS_TOOLBAR_NARROW)).toBe(650);
            expect(REFLOW_THRESHOLD_NARROW).toBe(650);
        });

        it("reports the reflow only below the threshold", () => {
            expect(hasOverlayReflowed(623, CANVAS_TOOLBAR_DESKTOP)).toBe(false);
            expect(hasOverlayReflowed(622, CANVAS_TOOLBAR_DESKTOP)).toBe(false);
            expect(hasOverlayReflowed(621, CANVAS_TOOLBAR_DESKTOP)).toBe(true);
        });

        it("leaves the canvas clamp below the reflow threshold, so the two-line rule is the only step", () => {
            expect(CANVAS_MIN_WIDTH).toBeLessThan(REFLOW_THRESHOLD_DESKTOP);
            expect(CANVAS_MIN_WIDTH).toBeLessThan(REFLOW_THRESHOLD_NARROW);
        });
    });

    describe("canvas toolbar bottom offsets", () => {
        it("names the four documented offsets", () => {
            expect(CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE).toBe(12);
            expect(CANVAS_TOOLBAR_BOTTOM_OFFSET_TIME_SLIDER).toBe(82);
            expect(CANVAS_TOOLBAR_BOTTOM_OFFSET_DRAWER).toBe(272);
            expect(CANVAS_TOOLBAR_BOTTOM_OFFSET_DRAWER_AND_SLIDER).toBe(342);
        });

        it("computes 12 above whichever of the canvas floor, slider and drawer is uppermost", () => {
            const base = {
                drawerOpen: false,
                drawerHeight: DATA_DRAWER_DEFAULT_HEIGHT,
                drawerMaximised: false,
                timeSliderOn: false,
            };

            expect(canvasToolbarBottomOffset(base)).toBe(12);
            expect(canvasToolbarBottomOffset({ ...base, timeSliderOn: true })).toBe(82);
            expect(canvasToolbarBottomOffset({ ...base, drawerOpen: true })).toBe(272);
            expect(canvasToolbarBottomOffset({ ...base, drawerOpen: true, timeSliderOn: true })).toBe(342);
        });

        it("follows a resized drawer rather than its default height", () => {
            expect(
                canvasToolbarBottomOffset({
                    drawerOpen: true,
                    drawerHeight: 400,
                    drawerMaximised: false,
                    timeSliderOn: false,
                }),
            ).toBe(412);
        });

        it("does not draw the bar at all while the drawer is maximised", () => {
            expect(
                canvasToolbarBottomOffset({
                    drawerOpen: true,
                    drawerHeight: DATA_DRAWER_DEFAULT_HEIGHT,
                    drawerMaximised: true,
                    timeSliderOn: false,
                }),
            ).toBeNull();
        });
    });

    describe("width clamps", () => {
        it("moves a value into range and lets the floor win an inverted range", () => {
            expect(clampWidth(300, 280, 480)).toBe(300);
            expect(clampWidth(100, 280, 480)).toBe(280);
            expect(clampWidth(900, 280, 480)).toBe(480);
            expect(clampWidth(900, 280, 100)).toBe(280);
        });

        it("stops a panel drag where the canvas would fall below 520", () => {
            expect(maxActivityPanelWidth(1280, 280)).toBe(1280 - 48 - 280 - 520);
            expect(clampActivityPanelWidth(900, 1280, 280)).toBe(432);
        });

        it("leaves the canvas at exactly 520 at the clamp", () => {
            const panelWidth = clampActivityPanelWidth(900, 1280, 280);

            expect(liveCanvasWidth(1280, panelWidth, 280)).toBe(520);
        });

        it("stops an inspector drag on the same clamp", () => {
            expect(maxInspectorWidth(1280, 280)).toBe(432);
            expect(clampInspectorWidth(900, 1280, 280)).toBe(432);
        });

        it("never drags either column below the grid identity", () => {
            expect(clampActivityPanelWidth(120, 1920, 280)).toBe(280);
            expect(clampInspectorWidth(120, 1920, 280)).toBe(280);
        });

        it("pins both columns at 280 below the breakpoint, where the canvas is not resized", () => {
            expect(clampActivityPanelWidth(420, 1024, 280)).toBe(280);
            expect(clampInspectorWidth(420, 1024, 280)).toBe(280);
            expect(liveCanvasWidth(1024, 280, 280)).toBe(1024 - 48);
        });

        it("reads the breakpoint as strictly below 1280", () => {
            expect(isNarrowViewport(1280)).toBe(false);
            expect(isNarrowViewport(1279)).toBe(true);
        });
    });

    describe("orders", () => {
        it("lists the six activities then the two pinned ones", () => {
            expect(PRIMARY_ACTIVITIES).toEqual(["data", "explore", "analyze", "style", "present", "ai"]);
            expect(PINNED_ACTIVITIES).toEqual(["settings", "help"]);
            expect(ACTIVITY_ORDER).toHaveLength(8);
            expect(ACTIVITY_ORDER[0]).toBe("data");
            expect(ACTIVITY_ORDER[7]).toBe("help");
        });

        it("disables exactly the four data-dependent activities in the Empty state", () => {
            expect(ACTIVITIES_REQUIRING_DATA).toEqual(["explore", "analyze", "style", "present"]);
            expect(ACTIVITIES_REQUIRING_DATA).not.toContain("data");
            expect(ACTIVITIES_REQUIRING_DATA).not.toContain("ai");
        });

        it("orders the status bar slots left to right", () => {
            expect(STATUS_BAR_SLOT_ORDER).toEqual([
                "counts",
                "zoom",
                "xr",
                "layout",
                "running",
                "viewing",
                "issues",
                "ai",
                "selection",
            ]);
        });

        it("drops AI status first and never drops counts, progress or issues", () => {
            expect(STATUS_BAR_DROP_ORDER).toEqual(["ai", "layout", "zoom", "viewing"]);

            for (const slot of STATUS_BAR_NEVER_DROP) {
                expect(STATUS_BAR_DROP_ORDER).not.toContain(slot);
            }
        });
    });
});
