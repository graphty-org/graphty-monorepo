import { describe, expect, it } from "vitest";

import { FLOATING_UI_Z_INDEX } from "../../src/constants/popout";
import { overlayComponentExtensions } from "../../src/theme/components/overlays";

/**
 * Tests for the refactored overlay components.
 * These tests verify that overlay components maintain proper z-index defaults
 * and apply compact styling where appropriate.
 */
describe("Overlay Component Extensions (Refactored)", () => {
    describe("defaultProps", () => {
        it("Menu maintains zIndex default", () => {
            const extension = overlayComponentExtensions.Menu;
            expect(extension?.defaultProps?.zIndex).toBe(FLOATING_UI_Z_INDEX);
        });

        it("Tooltip maintains zIndex default", () => {
            const extension = overlayComponentExtensions.Tooltip;
            expect(extension?.defaultProps?.zIndex).toBe(FLOATING_UI_Z_INDEX);
        });

        it("Popover maintains zIndex default", () => {
            const extension = overlayComponentExtensions.Popover;
            expect(extension?.defaultProps?.zIndex).toBe(FLOATING_UI_Z_INDEX);
        });

        it("HoverCard maintains zIndex default", () => {
            const extension = overlayComponentExtensions.HoverCard;
            expect(extension?.defaultProps?.zIndex).toBe(FLOATING_UI_Z_INDEX);
        });

        it("all overlay components maintain proper zIndex", () => {
            const overlayComponents = [
                "Menu",
                "Tooltip",
                "Popover",
                "HoverCard",
            ] as const;

            for (const name of overlayComponents) {
                const ext = overlayComponentExtensions[name];
                expect(
                    ext?.defaultProps?.zIndex,
                    `${name} should have zIndex ${FLOATING_UI_Z_INDEX}`,
                ).toBe(FLOATING_UI_Z_INDEX);
            }
        });
    });

    describe("CSS variables via vars", () => {
        it("Menu has vars function for compact menu item styling", () => {
            const extension = overlayComponentExtensions.Menu;
            expect(extension?.vars).toBeDefined();
            expect(typeof extension?.vars).toBe("function");
            const vars = extension?.vars!();
            expect(vars.dropdown["--menu-item-fz"]).toBe("11px");
        });
    });

    describe("styles", () => {
        it("Tooltip uses static styles for compact styling", () => {
            const extension = overlayComponentExtensions.Tooltip;
            expect(extension?.styles).toBeDefined();
            expect(typeof extension?.styles).toBe("object");
            const styles = extension?.styles as Record<
                string,
                Record<string, unknown>
            >;
            expect(styles.tooltip).toBeDefined();
            expect(styles.tooltip.fontSize).toBe(11);
            expect(styles.tooltip.padding).toBe("4px 8px");
        });

        it("Popover uses static styles for compact dropdown padding", () => {
            const extension = overlayComponentExtensions.Popover;
            expect(extension?.styles).toBeDefined();
            expect(typeof extension?.styles).toBe("object");
            const styles = extension?.styles as Record<
                string,
                Record<string, unknown>
            >;
            expect(styles.dropdown).toBeDefined();
            expect(styles.dropdown.padding).toBe(8);
        });

        it("HoverCard uses static styles for compact dropdown padding", () => {
            const extension = overlayComponentExtensions.HoverCard;
            expect(extension?.styles).toBeDefined();
            expect(typeof extension?.styles).toBe("object");
            const styles = extension?.styles as Record<
                string,
                Record<string, unknown>
            >;
            expect(styles.dropdown).toBeDefined();
            expect(styles.dropdown.padding).toBe(8);
        });
    });
});
