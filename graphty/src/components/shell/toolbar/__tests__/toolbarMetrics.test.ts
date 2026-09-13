import { describe, expect, it } from "vitest";

import {
    CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE,
    CANVAS_TOOLBAR_DESKTOP,
    CANVAS_TOOLBAR_NARROW,
    canvasToolbarWidth,
    canvasToolbarZoomGroupWidth,
} from "../../constants";
import {
    canvasToolbarProfileFor,
    toolbarItemSentence,
    toolbarItemTitle,
    VIEWS_MENU_CARET_CLAMP,
    VIEWS_MENU_CARET_SIZE,
    VIEWS_MENU_WIDTH,
    viewsMenuBottomOffset,
    XR_ENTRY_EDGE_CEILING,
    XR_ENTRY_NODE_CEILING,
    XR_SUBSET_NODE_LIMIT,
    xrEntryState,
    xrReadinessLine,
    xrRowLabel,
} from "../toolbarMetrics";

describe("toolbarMetrics", () => {
    describe("the size profiles", () => {
        it("returns the desktop profile for the desktop id", () => {
            expect(canvasToolbarProfileFor("desktop")).toBe(CANVAS_TOOLBAR_DESKTOP);
        });

        it("returns the narrow profile for the narrow id", () => {
            expect(canvasToolbarProfileFor("narrow")).toBe(CANVAS_TOOLBAR_NARROW);
        });
    });

    describe("the width arithmetic", () => {
        // The bar's width is the sum of the parts it draws. The two documented totals
        // appear here and nowhere in the components.
        const sumOfParts = (profile: typeof CANVAS_TOOLBAR_DESKTOP): number =>
            profile.borderWidth +
            profile.containerPadding +
            profile.segmentedWidth +
            profile.dividerSlotWidth +
            canvasToolbarZoomGroupWidth(profile) +
            profile.dividerSlotWidth +
            profile.viewsButtonWidth +
            profile.containerPadding +
            profile.borderWidth;

        it("adds the desktop parts to 246", () => {
            expect(sumOfParts(CANVAS_TOOLBAR_DESKTOP)).toBe(246);
            expect(canvasToolbarWidth(CANVAS_TOOLBAR_DESKTOP)).toBe(sumOfParts(CANVAS_TOOLBAR_DESKTOP));
        });

        it("adds the narrow parts to 274", () => {
            expect(sumOfParts(CANVAS_TOOLBAR_NARROW)).toBe(274);
            expect(canvasToolbarWidth(CANVAS_TOOLBAR_NARROW)).toBe(sumOfParts(CANVAS_TOOLBAR_NARROW));
        });

        it("keeps the zoom group at four items and three gaps", () => {
            expect(canvasToolbarZoomGroupWidth(CANVAS_TOOLBAR_DESKTOP)).toBe(28 * 4 + 2 * 3);
            expect(canvasToolbarZoomGroupWidth(CANVAS_TOOLBAR_NARROW)).toBe(32 * 4 + 2 * 3);
        });

        it("keeps the container radius concentric with the item radius", () => {
            for (const profile of [CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_NARROW]) {
                expect(profile.containerRadius).toBe(profile.itemRadius + profile.containerPadding);
            }
        });

        it("leaves the segmented halves one inner padding shorter than an item", () => {
            // The profile's `segmentedHalfWidth` is the half's drawn HEIGHT: 26 inside
            // a 28 item, 30 inside a 32 one. The halves share the track's width.
            for (const profile of [CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_NARROW]) {
                expect(profile.itemSize - profile.segmentedInnerPadding * 2).toBe(profile.segmentedHalfWidth);
            }
        });
    });

    describe("the register titles", () => {
        it("writes a title with its key chip", () => {
            expect(toolbarItemTitle("Zoom out", "-")).toBe("Zoom out (-)");
            expect(toolbarItemTitle("Zoom in", "=")).toBe("Zoom in (=)");
            expect(toolbarItemTitle("Zoom to fit", "0")).toBe("Zoom to fit (0)");
            expect(toolbarItemTitle("Zoom to selection", "F")).toBe("Zoom to selection (F)");
        });

        it("writes the disabled title with its reason", () => {
            expect(toolbarItemTitle("Zoom to selection", "F", "Select something first")).toBe(
                "Zoom to selection (F). Select something first",
            );
        });

        it("writes a title with no chip when the action has no chord", () => {
            expect(toolbarItemTitle("Views", null)).toBe("Views");
        });

        it("takes the key chip out for the accessible name", () => {
            expect(toolbarItemSentence("Zoom out (-)", "-")).toBe("Zoom out");
            expect(toolbarItemSentence("Zoom to selection (F). Select something first", "F")).toBe(
                "Zoom to selection. Select something first",
            );
            expect(toolbarItemSentence("Views", null)).toBe("Views");
        });
    });

    describe("the Views menu anchor", () => {
        it("puts the menu's bottom edge 4 above the bar's top edge", () => {
            const bottom = viewsMenuBottomOffset(CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE);
            const barTop = CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE + CANVAS_TOOLBAR_DESKTOP.height;

            expect(bottom).toBe(52);
            expect(bottom - barTop).toBe(4);
        });

        it("keeps the same two readings on the narrow profile", () => {
            const bottom = viewsMenuBottomOffset(CANVAS_TOOLBAR_NARROW, CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE);
            const barTop = CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE + CANVAS_TOOLBAR_NARROW.height;

            expect(bottom).toBe(56);
            expect(bottom - barTop).toBe(4);
        });

        it("rides the offset ladder with the bar", () => {
            const raised = viewsMenuBottomOffset(CANVAS_TOOLBAR_DESKTOP, 82);

            expect(raised - viewsMenuBottomOffset(CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_BOTTOM_OFFSET_BASE)).toBe(70);
        });

        it("carries a caret rather than an edge line, because it is under 280 wide", () => {
            expect(VIEWS_MENU_WIDTH).toBeLessThan(280);
            expect(VIEWS_MENU_CARET_SIZE).toBe(8);
        });

        it("clamps the caret inside the menu corner rather than on the button centre", () => {
            // Centred on a 36 px button whose right edge is the menu's, the caret box
            // lands inside the clamp, so the clamp is what fixes it at 12.
            expect(VIEWS_MENU_CARET_CLAMP).toBe(12);
        });
    });

    describe("the XR entry gate", () => {
        it("is ready under the ceiling", () => {
            expect(xrEntryState(20, 29)).toBe("ready");
            expect(xrEntryState(XR_ENTRY_NODE_CEILING, XR_ENTRY_EDGE_CEILING)).toBe("ready");
        });

        it("offers the visible subset above either half of the ceiling", () => {
            expect(xrEntryState(XR_ENTRY_NODE_CEILING + 1, 0)).toBe("subset");
            expect(xrEntryState(20, XR_ENTRY_EDGE_CEILING + 1)).toBe("subset");
        });

        it("refuses entry above 50,000 visible nodes", () => {
            expect(xrEntryState(XR_SUBSET_NODE_LIMIT, 0)).toBe("subset");
            expect(xrEntryState(XR_SUBSET_NODE_LIMIT + 1, 0)).toBe("blocked");
        });

        it("renames the row for the subset state and leaves it alone otherwise", () => {
            expect(xrRowLabel("Enter VR", "ready")).toBe("Enter VR");
            expect(xrRowLabel("Enter VR", "subset")).toBe("Enter VR (visible subset)");
            expect(xrRowLabel("Enter AR", "blocked")).toBe("Enter AR");
        });

        it("keeps the scope count resident in every state and names the departure", () => {
            expect(xrReadinessLine("20", "ready")).toBe("20 visible nodes");
            expect(xrReadinessLine("20,000", "subset")).toBe("20,000 visible nodes. Visible subset only");
            expect(xrReadinessLine("60,000", "blocked")).toBe("60,000 visible nodes. Too many to enter VR");
        });
    });
});
