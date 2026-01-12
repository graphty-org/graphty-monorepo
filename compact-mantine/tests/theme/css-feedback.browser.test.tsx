/**
 * Feedback Components - Comprehensive CSS Browser Tests
 *
 * Tests ALL CSS values set by compact-mantine feedback component extensions.
 * Covers: Loader, Progress, RingProgress
 *
 * After refactor: All feedback components use defaultProps with size="sm"
 * and unconditional CSS variables (no conditional size="compact" checks).
 */
import { Loader, MantineProvider, Progress, RingProgress } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { compactTheme } from "../../src";

/**
 * Helper to render a component with the compact theme.
 */
function renderWithTheme(ui: React.ReactElement) {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Helper to get CSS variable value from an element
 */
function getCssVar(element: Element | null, varName: string): string {
    if (!element) return "";
    return getComputedStyle(element).getPropertyValue(varName).trim();
}

// ============================================================================
// Loader - Comprehensive Tests
// ============================================================================
describe("Loader - All CSS Values (Browser)", () => {
    describe("default behavior (size='sm' via defaultProps)", () => {
        describe("root CSS variables", () => {
            it("--loader-size is 18px", () => {
                const { container } = renderWithTheme(<Loader />);
                const root = container.querySelector(".mantine-Loader-root");
                expect(getCssVar(root, "--loader-size")).toBe("18px");
            });
        });

        describe("computed styles", () => {
            it("width is 18px", () => {
                const { container } = renderWithTheme(<Loader />);
                const root = container.querySelector(".mantine-Loader-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.width).toBe("18px");
            });

            it("height is 18px", () => {
                const { container } = renderWithTheme(<Loader />);
                const root = container.querySelector(".mantine-Loader-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("18px");
            });
        });
    });

    describe("with explicit size override", () => {
        it("can override to larger size", () => {
            const { container } = renderWithTheme(<Loader size="lg" />);
            const root = container.querySelector(".mantine-Loader-root");
            // CSS var still set, but Mantine overrides with explicit size
            expect(root?.getAttribute("data-size")).toBe("lg");
        });
    });
});

// ============================================================================
// Progress - Comprehensive Tests
// ============================================================================
describe("Progress - All CSS Values (Browser)", () => {
    describe("default behavior (size='sm' via defaultProps)", () => {
        describe("root CSS variables", () => {
            it("--progress-size is 4px", () => {
                const { container } = renderWithTheme(<Progress value={50} />);
                const root = container.querySelector(".mantine-Progress-root");
                expect(getCssVar(root, "--progress-size")).toBe("4px");
            });
        });

        describe("computed styles", () => {
            it("height is 4px", () => {
                const { container } = renderWithTheme(<Progress value={50} />);
                const root = container.querySelector(".mantine-Progress-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("4px");
            });

            it("borderRadius is 4px", () => {
                const { container } = renderWithTheme(<Progress value={50} />);
                const root = container.querySelector(".mantine-Progress-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });

        describe("section computed styles", () => {
            it("section height is 4px", () => {
                const { container } = renderWithTheme(<Progress value={50} />);
                const section = container.querySelector(".mantine-Progress-section");
                const style = section ? getComputedStyle(section) : null;
                expect(style?.height).toBe("4px");
            });
        });

        describe("label computed styles (when label is provided)", () => {
            it("label fontSize is 9px", () => {
                const { container } = renderWithTheme(
                    <Progress.Root>
                        <Progress.Section value={50}>
                            <Progress.Label>50%</Progress.Label>
                        </Progress.Section>
                    </Progress.Root>
                );
                const label = container.querySelector(".mantine-Progress-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.fontSize).toBe("9px");
            });
        });
    });

    describe("with explicit size override", () => {
        it("can override to larger size", () => {
            const { container } = renderWithTheme(<Progress size="lg" value={50} />);
            const root = container.querySelector(".mantine-Progress-root");
            // CSS var still set, but Mantine overrides with explicit size
            expect(root?.getAttribute("data-size")).toBe("lg");
        });
    });
});

// ============================================================================
// RingProgress - Note: Uses numeric size, not CSS variables
// ============================================================================
describe("RingProgress - Numeric Size (Browser)", () => {
    describe("behavior", () => {
        it("uses numeric size prop (no CSS variable support)", () => {
            // RingProgress doesn't support string sizes like "compact"
            // Size must be a number that directly controls SVG dimensions
            const { container } = renderWithTheme(<RingProgress size={48} sections={[]} />);
            const root = container.querySelector(".mantine-RingProgress-root");
            const style = root ? getComputedStyle(root) : null;

            // Size is controlled by direct prop, not CSS variables
            expect(style?.width).toBe("48px");
            expect(style?.height).toBe("48px");
        });

        it("compact equivalent is size={48}", () => {
            const { container } = renderWithTheme(
                <RingProgress
                    size={48}
                    thickness={4}
                    sections={[{ value: 50, color: "blue" }]}
                />
            );
            const root = container.querySelector(".mantine-RingProgress-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.width).toBe("48px");
            expect(style?.height).toBe("48px");
        });
    });
});
