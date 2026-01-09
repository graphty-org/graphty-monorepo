/**
 * Overlay Components - Comprehensive CSS Browser Tests
 *
 * Tests ALL CSS values set by compact-mantine overlay component extensions.
 * Covers: Menu, Tooltip, Popover, HoverCard
 *
 * Note: These components use defaultProps for zIndex configuration.
 * Overlay dropdowns are rendered in portals at document.body level.
 */
import {
    Button,
    MantineProvider,
    Menu,
    Popover,
    Tooltip,
} from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { compactTheme } from "../../src";
import { FLOATING_UI_Z_INDEX } from "../../src/constants/popout";

/**
 * Helper to render a component with the compact theme.
 */
function renderWithTheme(ui: React.ReactElement) {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

// ============================================================================
// Menu - Comprehensive Tests
// ============================================================================
describe("Menu - All CSS Values (Browser)", () => {
    describe("zIndex configuration", () => {
        it("dropdown has correct zIndex when opened", async () => {
            const user = userEvent.setup();

            renderWithTheme(
                <Menu>
                    <Menu.Target>
                        <Button>Open Menu</Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item>Item 1</Menu.Item>
                        <Menu.Item>Item 2</Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            );

            // Open the menu
            const button = screen.getByRole("button", { name: "Open Menu" });
            await user.click(button);

            // Wait for dropdown to appear in DOM
            await waitFor(() => {
                const dropdown = document.body.querySelector(".mantine-Menu-dropdown");
                expect(dropdown).toBeTruthy();
            });

            // Find the dropdown and check zIndex
            const dropdown = document.body.querySelector(".mantine-Menu-dropdown");
            const style = dropdown ? getComputedStyle(dropdown) : null;

            expect(style?.zIndex).toBe(String(FLOATING_UI_Z_INDEX));
        });

        it("uses FLOATING_UI_Z_INDEX constant (1100)", () => {
            // Verify the constant value
            expect(FLOATING_UI_Z_INDEX).toBe(1100);
        });
    });
});

// ============================================================================
// Tooltip - Comprehensive Tests
// ============================================================================
describe("Tooltip - All CSS Values (Browser)", () => {
    describe("zIndex configuration", () => {
        it("tooltip has correct zIndex when shown (opened prop)", async () => {
            renderWithTheme(
                <Tooltip label="Tooltip content" opened>
                    <Button>Hover me</Button>
                </Tooltip>
            );

            // Wait for tooltip to appear
            await waitFor(() => {
                const tooltip = document.body.querySelector(".mantine-Tooltip-tooltip");
                expect(tooltip).toBeTruthy();
            });

            const tooltip = document.body.querySelector(".mantine-Tooltip-tooltip");
            const style = tooltip ? getComputedStyle(tooltip) : null;

            expect(style?.zIndex).toBe(String(FLOATING_UI_Z_INDEX));
        });

        it("tooltip appears on hover with correct zIndex", async () => {
            const user = userEvent.setup();

            renderWithTheme(
                <Tooltip label="Tooltip content">
                    <Button>Hover me</Button>
                </Tooltip>
            );

            // Hover over the button
            const button = screen.getByRole("button", { name: "Hover me" });
            await user.hover(button);

            // Wait for tooltip to appear
            await waitFor(
                () => {
                    const tooltip = document.body.querySelector(".mantine-Tooltip-tooltip");
                    expect(tooltip).toBeTruthy();
                },
                { timeout: 1000 }
            );

            const tooltip = document.body.querySelector(".mantine-Tooltip-tooltip");
            if (tooltip) {
                const style = getComputedStyle(tooltip);
                expect(style.zIndex).toBe(String(FLOATING_UI_Z_INDEX));
            }
        });
    });
});

// ============================================================================
// Popover - Comprehensive Tests
// ============================================================================
describe("Popover - All CSS Values (Browser)", () => {
    describe("zIndex configuration", () => {
        it("dropdown has correct zIndex when opened", async () => {
            const user = userEvent.setup();

            renderWithTheme(
                <Popover>
                    <Popover.Target>
                        <Button>Open Popover</Button>
                    </Popover.Target>
                    <Popover.Dropdown>Popover content</Popover.Dropdown>
                </Popover>
            );

            // Open the popover
            const button = screen.getByRole("button", { name: "Open Popover" });
            await user.click(button);

            // Wait for dropdown to appear
            await waitFor(() => {
                const dropdown = document.body.querySelector(".mantine-Popover-dropdown");
                expect(dropdown).toBeTruthy();
            });

            const dropdown = document.body.querySelector(".mantine-Popover-dropdown");
            const style = dropdown ? getComputedStyle(dropdown) : null;

            expect(style?.zIndex).toBe(String(FLOATING_UI_Z_INDEX));
        });
    });
});

// ============================================================================
// HoverCard - Theme Configuration Tests
// ============================================================================
describe("HoverCard - All CSS Values (Browser)", () => {
    describe("zIndex configuration", () => {
        // Note: HoverCard requires complex mouse position tracking that is difficult
        // to simulate in tests. The z-index is verified via theme configuration.
        // Other overlays (Menu, Popover, Tooltip) share identical configuration
        // and are tested with rendering above.

        it("theme sets correct zIndex in defaultProps", () => {
            // Verify the theme configuration matches FLOATING_UI_Z_INDEX
            const hoverCardConfig = compactTheme.components?.HoverCard;
            expect(hoverCardConfig).toBeDefined();
            expect(hoverCardConfig?.defaultProps?.zIndex).toBe(FLOATING_UI_Z_INDEX);
        });

        it("uses same zIndex as other overlay components", () => {
            // HoverCard shares zIndex configuration with Menu, Tooltip, and Popover
            const menuZIndex = compactTheme.components?.Menu?.defaultProps?.zIndex;
            const tooltipZIndex = compactTheme.components?.Tooltip?.defaultProps?.zIndex;
            const popoverZIndex = compactTheme.components?.Popover?.defaultProps?.zIndex;
            const hoverCardZIndex = compactTheme.components?.HoverCard?.defaultProps?.zIndex;

            expect(hoverCardZIndex).toBe(menuZIndex);
            expect(hoverCardZIndex).toBe(tooltipZIndex);
            expect(hoverCardZIndex).toBe(popoverZIndex);
        });
    });
});

// ============================================================================
// Z-Index Constant Verification
// ============================================================================
describe("FLOATING_UI_Z_INDEX Constant", () => {
    it("is exported and equals 1100", () => {
        expect(FLOATING_UI_Z_INDEX).toBe(1100);
    });

    it("is used for overlay components to appear above Popout panels", () => {
        // This is a documentation test - the z-index is set high enough
        // to appear above typical modal/popout z-indices (usually 1000)
        expect(FLOATING_UI_Z_INDEX).toBeGreaterThan(1000);
    });
});
