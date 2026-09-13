import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/test-utils";
import { theme } from "../../theme";
import { ErrorFallback } from "../ErrorFallback";
import { RunLayoutsModal } from "../RunLayoutsModal";

describe("theme compliance", () => {
    describe("semantic color variables", () => {
        it("should not use hardcoded dark-8 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-8");
        });

        it("should not use hardcoded dark-7 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-7");
        });

        it("should not use hardcoded dark-2 in theme extensions", () => {
            const themeStr = JSON.stringify(theme);
            expect(themeStr).not.toContain("dark-2");
        });

        it("should use semantic color variables instead of hardcoded dark colors", () => {
            // The rule is "no colour that only works in dark mode". A `dark-N` PAIRED
            // inside `light-dark(light, dark)` is not that -- it is the correct way to
            // write both modes at once, and it is how `@graphty/compact-mantine`'s
            // PANEL_INK is written -- so the pairs are removed before the check and
            // what is left is the dark-only usage this guards against.
            const themeStr = JSON.stringify(theme).replace(/light-dark\((?:[^()]|\([^()]*\))*\)/g, "");

            expect(themeStr).not.toMatch(/--mantine-color-dark-[0-9]/);
        });
    });

    describe("light mode rendering", () => {
        it("should render in light mode without errors", () => {
            const { container } = render(
                <MantineProvider theme={theme} defaultColorScheme="light">
                    <div>Test</div>
                </MantineProvider>,
            );
            expect(container).toBeTruthy();
        });

        it("should render in dark mode without errors", () => {
            const { container } = render(
                <MantineProvider theme={theme} defaultColorScheme="dark">
                    <div>Test</div>
                </MantineProvider>,
            );
            expect(container).toBeTruthy();
        });
    });

    describe("Modal theme compliance", () => {
        it("RunLayoutsModal uses semantic color variables instead of dark-X colors", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);
            const modal = screen.getByRole("dialog");
            // Check that the modal rendered
            expect(modal).toBeInTheDocument();
            // Get all inline styles and verify no dark-X patterns
            const allElements = modal.querySelectorAll("*");
            allElements.forEach((el) => {
                const style = el.getAttribute("style") ?? "";
                // Should not contain --mantine-color-dark-N patterns in inline styles
                expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
            });
        });
    });

    describe("ErrorFallback theme compliance", () => {
        it("uses semantic color variables instead of dark-X colors", () => {
            render(<ErrorFallback error={new Error("test")} resetError={vi.fn()} />);
            // Find the error container
            const container = screen.getByText("Something went wrong").closest("div");
            expect(container).toBeInTheDocument();
            // Get all elements and check their styles
            if (container) {
                const parentContainer = container.parentElement?.parentElement;
                if (parentContainer) {
                    const style = parentContainer.getAttribute("style") ?? "";
                    // Should not contain --mantine-color-dark-N patterns
                    expect(style).not.toMatch(/--mantine-color-dark-[0-9]/);
                }
            }
        });
    });
});
