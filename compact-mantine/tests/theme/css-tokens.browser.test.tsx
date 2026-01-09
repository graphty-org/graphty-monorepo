/**
 * Global Theme Tokens Browser Tests
 *
 * Tests that global theme tokens (fontSizes, spacing, radius, colors) are
 * correctly applied via CSS custom properties.
 */
import { Box, MantineProvider, Text } from "@mantine/core";
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
 * Font Sizes - Global Token Tests
 */
describe("Global Tokens - Font Sizes (Browser)", () => {
    it("xs font size is 10px", () => {
        const { container } = renderWithTheme(<Text size="xs">Test</Text>);
        const root = container.querySelector(".mantine-Text-root");
        const style = root ? getComputedStyle(root) : null;

        expect(style?.fontSize).toBe("10px");
    });

    it("sm font size is 11px", () => {
        const { container } = renderWithTheme(<Text size="sm">Test</Text>);
        const root = container.querySelector(".mantine-Text-root");
        const style = root ? getComputedStyle(root) : null;

        expect(style?.fontSize).toBe("11px");
    });

    it("md font size is 13px", () => {
        const { container } = renderWithTheme(<Text size="md">Test</Text>);
        const root = container.querySelector(".mantine-Text-root");
        const style = root ? getComputedStyle(root) : null;

        expect(style?.fontSize).toBe("13px");
    });

    it("lg font size is 14px", () => {
        const { container } = renderWithTheme(<Text size="lg">Test</Text>);
        const root = container.querySelector(".mantine-Text-root");
        const style = root ? getComputedStyle(root) : null;

        expect(style?.fontSize).toBe("14px");
    });

    it("xl font size is 16px", () => {
        const { container } = renderWithTheme(<Text size="xl">Test</Text>);
        const root = container.querySelector(".mantine-Text-root");
        const style = root ? getComputedStyle(root) : null;

        expect(style?.fontSize).toBe("16px");
    });
});

/**
 * Spacing - Global Token Tests
 *
 * Tests that CSS variables are correctly set on :root
 */
describe("Global Tokens - Spacing (Browser)", () => {
    it("--mantine-spacing-xs is 4px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-spacing-xs").trim()).toBe("4px");
    });

    it("--mantine-spacing-sm is 6px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-spacing-sm").trim()).toBe("6px");
    });

    it("--mantine-spacing-md is 8px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-spacing-md").trim()).toBe("8px");
    });

    it("--mantine-spacing-lg is 12px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-spacing-lg").trim()).toBe("12px");
    });

    it("--mantine-spacing-xl is 16px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-spacing-xl").trim()).toBe("16px");
    });
});

/**
 * Radius - Global Token Tests
 *
 * Tests that CSS variables are correctly set on :root
 */
describe("Global Tokens - Radius (Browser)", () => {
    it("--mantine-radius-xs is 2px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-radius-xs").trim()).toBe("2px");
    });

    it("--mantine-radius-sm is 4px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-radius-sm").trim()).toBe("4px");
    });

    it("--mantine-radius-md is 6px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-radius-md").trim()).toBe("6px");
    });

    it("--mantine-radius-lg is 8px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-radius-lg").trim()).toBe("8px");
    });

    it("--mantine-radius-xl is 12px", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-radius-xl").trim()).toBe("12px");
    });
});

/**
 * Colors - Dark Palette Tests
 *
 * Tests that the dark color palette CSS variables are correctly set.
 */
describe("Global Tokens - Dark Colors (Browser)", () => {
    it("--mantine-color-dark-0 is #d5d7da", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-0").trim()).toBe("#d5d7da");
    });

    it("--mantine-color-dark-1 is #a3a8b1", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-1").trim()).toBe("#a3a8b1");
    });

    it("--mantine-color-dark-2 is #7a828e", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-2").trim()).toBe("#7a828e");
    });

    it("--mantine-color-dark-3 is #5f6873", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-3").trim()).toBe("#5f6873");
    });

    it("--mantine-color-dark-4 is #48525c", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-4").trim()).toBe("#48525c");
    });

    it("--mantine-color-dark-5 is #374047", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-5").trim()).toBe("#374047");
    });

    it("--mantine-color-dark-6 is #2a3035 (input background)", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-6").trim()).toBe("#2a3035");
    });

    it("--mantine-color-dark-7 is #1f2428", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-7").trim()).toBe("#1f2428");
    });

    it("--mantine-color-dark-8 is #161b22", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-8").trim()).toBe("#161b22");
    });

    it("--mantine-color-dark-9 is #0d1117 (darkest)", () => {
        renderWithTheme(<Box>Test</Box>);
        const rootStyle = getComputedStyle(document.documentElement);
        expect(rootStyle.getPropertyValue("--mantine-color-dark-9").trim()).toBe("#0d1117");
    });
});
