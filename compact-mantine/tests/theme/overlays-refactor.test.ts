import { describe, expect, it } from "vitest";

import { FLOATING_UI_Z_INDEX, TOOLTIP_Z_INDEX } from "../../src/constants/popout";
import { overlayComponentExtensions } from "../../src/theme/components/overlays";
import {
    compactMenuClassNames,
    compactPopoverClassNames,
    compactTooltipClassNames,
    TOOLTIP_CLOSE_DELAY,
    TOOLTIP_OPEN_DELAY,
} from "../../src/theme/styles/overlays";

/**
 * The overlay theme extensions: z-index layering, the Figma behaviour defaults (no transitions,
 * tooltip timing, menu placement) and the classNames that point each part at the overlay CSS
 * (design/figma-spec.md section 8). The computed look is measured in
 * tests/figma/overlays.browser.test.tsx.
 */
describe("Overlay Component Extensions", () => {
    describe("z-index", () => {
        it("Menu, Popover and HoverCard clear an open Popout", () => {
            for (const name of ["Menu", "Popover", "HoverCard"] as const) {
                expect(overlayComponentExtensions[name]?.defaultProps?.zIndex, name).toBe(FLOATING_UI_Z_INDEX);
            }
        });

        it("Tooltip sits above every popover and menu", () => {
            expect(overlayComponentExtensions.Tooltip?.defaultProps?.zIndex).toBe(TOOLTIP_Z_INDEX);
            expect(TOOLTIP_Z_INDEX).toBeGreaterThan(FLOATING_UI_Z_INDEX);
        });
    });

    describe("motion: every overlay opens and closes in one frame", () => {
        it.each(["Menu", "MenuSub", "Tooltip", "Popover", "HoverCard", "Modal"])("%s has a zero transition", (name) => {
            expect(overlayComponentExtensions[name]?.defaultProps?.transitionProps).toEqual({ duration: 0 });
        });
    });

    describe("tooltip timing", () => {
        it("Tooltip opens after 1000 ms and hides 300 ms after the pointer leaves", () => {
            const props = overlayComponentExtensions.Tooltip?.defaultProps;
            expect(props?.openDelay).toBe(1000);
            expect(props?.closeDelay).toBe(300);
            expect(TOOLTIP_OPEN_DELAY).toBe(1000);
            expect(TOOLTIP_CLOSE_DELAY).toBe(300);
        });

        it("a bare Tooltip.Group gets the same timing, for the shell-wide warm hand-off", () => {
            const props = overlayComponentExtensions.TooltipGroup?.defaultProps;
            expect(props?.openDelay).toBe(1000);
            expect(props?.closeDelay).toBe(300);
        });

        it("Tooltip shows below, with an arrow, on hover and on keyboard focus", () => {
            const props = overlayComponentExtensions.Tooltip?.defaultProps;
            expect(props?.position).toBe("bottom");
            expect(props?.withArrow).toBe(true);
            // 6px from the trigger: Mantine adds half the 8.5px arrow to the offset
            expect(props?.offset).toBe(6 - 8.5 / 2);
            expect(props?.events).toEqual({ hover: true, focus: true, touch: false });
        });
    });

    describe("menu placement and submenus", () => {
        it("Menu opens 4px below its trigger, start-aligned, looping", () => {
            const props = overlayComponentExtensions.Menu?.defaultProps;
            expect(props?.position).toBe("bottom-start");
            expect(props?.offset).toBe(4);
            expect(props?.loop).toBe(true);
            expect(props?.trapFocus).toBe(true);
        });

        it("submenus open and close with no delay, 4px beside the parent", () => {
            const props = overlayComponentExtensions.MenuSub?.defaultProps;
            expect(props?.openDelay).toBe(0);
            expect(props?.closeDelay).toBe(0);
            expect(props?.offset).toEqual({ mainAxis: 4, alignmentAxis: -8 });
        });

        it("Menu has vars for the compact item size", () => {
            const vars = overlayComponentExtensions.Menu?.vars!({} as never, {} as never);
            expect(vars.dropdown["--menu-item-fz"]).toBe("11px");
        });
    });

    describe("classNames", () => {
        it("Menu builds on the foundation's dark menu surface and rows", () => {
            expect(overlayComponentExtensions.Menu?.classNames).toBe(compactMenuClassNames);
            expect(compactMenuClassNames.dropdown).toContain("cm-menu-surface");
            expect(compactMenuClassNames.item).toContain("cm-menu-row");
        });

        it("Tooltip, Popover and HoverCard point at their CSS", () => {
            expect(overlayComponentExtensions.Tooltip?.classNames).toBe(compactTooltipClassNames);
            expect(overlayComponentExtensions.Popover?.classNames).toBe(compactPopoverClassNames);
            expect(overlayComponentExtensions.HoverCard?.classNames).toBe(compactPopoverClassNames);
            expect(compactPopoverClassNames.dropdown).toContain("cm-popover-surface");
        });

        it("Modal, Notification and ScrollArea are themed", () => {
            for (const name of ["Modal", "Notification", "ScrollArea"]) {
                expect(overlayComponentExtensions[name]?.classNames, name).toBeDefined();
            }
            expect(overlayComponentExtensions.Modal?.defaultProps).toMatchObject({ centered: true, withOverlay: false });
            expect(overlayComponentExtensions.ScrollArea?.defaultProps).toMatchObject({
                type: "hover",
                scrollHideDelay: 0,
                scrollbarSize: 10,
            });
        });
    });
});
