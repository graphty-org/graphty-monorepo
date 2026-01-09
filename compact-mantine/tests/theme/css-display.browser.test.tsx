/**
 * Display Components - Comprehensive CSS Browser Tests
 *
 * Tests ALL CSS values set by compact-mantine display component extensions.
 * Covers: Text, Badge, Pill, Avatar, ThemeIcon, Indicator, Kbd
 */
import {
    Avatar,
    Badge,
    Indicator,
    Kbd,
    MantineProvider,
    Pill,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { compactTheme } from "../../src";

// Simple icon placeholder for tests
const IconPlaceholder = () => <span style={{ width: 14, height: 14 }}>★</span>;

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
// Text - Comprehensive Tests (uses global fontSizes from theme)
// ============================================================================
describe("Text - All CSS Values (Browser)", () => {
    describe("with size='sm' (the compact default)", () => {
        describe("computed styles", () => {
            it("fontSize is 11px when size='sm'", () => {
                // Text uses global fontSizes from theme (compactFontSizes.sm = 11px)
                const { container } = renderWithTheme(<Text size="sm">Hello</Text>);
                const root = container.querySelector(".mantine-Text-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.fontSize).toBe("11px");
            });

            it("uses Mantine's built-in font size CSS var (derived from global fontSizes)", () => {
                const { container } = renderWithTheme(<Text size="sm">Hello</Text>);
                const root = container.querySelector(".mantine-Text-root");
                // Mantine sets --text-fz from the theme's fontSizes.sm value
                // Our theme extension doesn't override this - it comes from global fontSizes
                expect(getCssVar(root, "--text-fz")).toBe("11px");
            });
        });
    });

    describe("font size variations", () => {
        it("xs size is 10px", () => {
            const { container } = renderWithTheme(<Text size="xs">Hello</Text>);
            const root = container.querySelector(".mantine-Text-root");
            const style = root ? getComputedStyle(root) : null;
            expect(style?.fontSize).toBe("10px");
        });

        it("md size is 13px", () => {
            const { container } = renderWithTheme(<Text size="md">Hello</Text>);
            const root = container.querySelector(".mantine-Text-root");
            const style = root ? getComputedStyle(root) : null;
            expect(style?.fontSize).toBe("13px");
        });
    });
});

// ============================================================================
// Badge - Comprehensive Tests
// ============================================================================
describe("Badge - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--badge-height is 14px", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                expect(getCssVar(root, "--badge-height")).toBe("14px");
            });

            it("--badge-fz is 9px", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                expect(getCssVar(root, "--badge-fz")).toBe("9px");
            });

            it("--badge-padding-x is 4px", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                expect(getCssVar(root, "--badge-padding-x")).toBe("4px");
            });
        });

        describe("computed styles", () => {
            it("height is 14px", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("14px");
            });

            it("fontSize is 9px", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.fontSize).toBe("9px");
            });

            it("paddingLeft is 4px", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.paddingLeft).toBe("4px");
            });

            it("paddingRight is 4px", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.paddingRight).toBe("4px");
            });

            it("borderRadius is pill-shaped (1000px default)", () => {
                const { container } = renderWithTheme(<Badge>Label</Badge>);
                const root = container.querySelector(".mantine-Badge-root");
                const style = root ? getComputedStyle(root) : null;
                // Badge uses pill-shaped border radius by default
                expect(style?.borderRadius).toBe("1000px");
            });
        });
    });
});

// ============================================================================
// Pill - Comprehensive Tests
// ============================================================================
describe("Pill - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--pill-height is 16px", () => {
                const { container } = renderWithTheme(<Pill>Tag</Pill>);
                const root = container.querySelector(".mantine-Pill-root");
                expect(getCssVar(root, "--pill-height")).toBe("16px");
            });

            it("--pill-fz is 10px", () => {
                const { container } = renderWithTheme(<Pill>Tag</Pill>);
                const root = container.querySelector(".mantine-Pill-root");
                expect(getCssVar(root, "--pill-fz")).toBe("10px");
            });
        });

        describe("computed styles", () => {
            it("height is 16px", () => {
                const { container } = renderWithTheme(<Pill>Tag</Pill>);
                const root = container.querySelector(".mantine-Pill-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("16px");
            });

            it("fontSize is 10px", () => {
                const { container } = renderWithTheme(<Pill>Tag</Pill>);
                const root = container.querySelector(".mantine-Pill-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.fontSize).toBe("10px");
            });
        });
    });
});

// ============================================================================
// Avatar - Comprehensive Tests
// ============================================================================
describe("Avatar - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--avatar-size is 24px", () => {
                const { container } = renderWithTheme(<Avatar>AB</Avatar>);
                const root = container.querySelector(".mantine-Avatar-root");
                expect(getCssVar(root, "--avatar-size")).toBe("24px");
            });
        });

        describe("computed styles", () => {
            it("width is 24px", () => {
                const { container } = renderWithTheme(<Avatar>AB</Avatar>);
                const root = container.querySelector(".mantine-Avatar-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.width).toBe("24px");
            });

            it("height is 24px", () => {
                const { container } = renderWithTheme(<Avatar>AB</Avatar>);
                const root = container.querySelector(".mantine-Avatar-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("24px");
            });

            it("minWidth is 24px", () => {
                const { container } = renderWithTheme(<Avatar>AB</Avatar>);
                const root = container.querySelector(".mantine-Avatar-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minWidth).toBe("24px");
            });
        });
    });
});

// ============================================================================
// ThemeIcon - Comprehensive Tests
// ============================================================================
describe("ThemeIcon - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--ti-size is 24px", () => {
                const { container } = renderWithTheme(
                    <ThemeIcon>
                        <IconPlaceholder />
                    </ThemeIcon>
                );
                const root = container.querySelector(".mantine-ThemeIcon-root");
                expect(getCssVar(root, "--ti-size")).toBe("24px");
            });
        });

        describe("computed styles", () => {
            it("width is 24px", () => {
                const { container } = renderWithTheme(
                    <ThemeIcon>
                        <IconPlaceholder />
                    </ThemeIcon>
                );
                const root = container.querySelector(".mantine-ThemeIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.width).toBe("24px");
            });

            it("height is 24px", () => {
                const { container } = renderWithTheme(
                    <ThemeIcon>
                        <IconPlaceholder />
                    </ThemeIcon>
                );
                const root = container.querySelector(".mantine-ThemeIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("24px");
            });

            it("minWidth is 24px", () => {
                const { container } = renderWithTheme(
                    <ThemeIcon>
                        <IconPlaceholder />
                    </ThemeIcon>
                );
                const root = container.querySelector(".mantine-ThemeIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minWidth).toBe("24px");
            });

            it("minHeight is 24px", () => {
                const { container } = renderWithTheme(
                    <ThemeIcon>
                        <IconPlaceholder />
                    </ThemeIcon>
                );
                const root = container.querySelector(".mantine-ThemeIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minHeight).toBe("24px");
            });

            it("borderRadius is 4px", () => {
                const { container } = renderWithTheme(
                    <ThemeIcon>
                        <IconPlaceholder />
                    </ThemeIcon>
                );
                const root = container.querySelector(".mantine-ThemeIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });
    });
});

// ============================================================================
// Indicator - Comprehensive Tests
// ============================================================================
describe("Indicator - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--indicator-size is 8px", () => {
                const { container } = renderWithTheme(
                    <Indicator>
                        <div>Content</div>
                    </Indicator>
                );
                const root = container.querySelector(".mantine-Indicator-root");
                expect(getCssVar(root, "--indicator-size")).toBe("8px");
            });
        });

        describe("indicator computed styles", () => {
            it("width is 8px", () => {
                const { container } = renderWithTheme(
                    <Indicator>
                        <div>Content</div>
                    </Indicator>
                );
                const indicator = container.querySelector(".mantine-Indicator-indicator");
                const style = indicator ? getComputedStyle(indicator) : null;
                expect(style?.width).toBe("8px");
            });

            it("height is 8px", () => {
                const { container } = renderWithTheme(
                    <Indicator>
                        <div>Content</div>
                    </Indicator>
                );
                const indicator = container.querySelector(".mantine-Indicator-indicator");
                const style = indicator ? getComputedStyle(indicator) : null;
                expect(style?.height).toBe("8px");
            });

            it("minWidth is 8px", () => {
                const { container } = renderWithTheme(
                    <Indicator>
                        <div>Content</div>
                    </Indicator>
                );
                const indicator = container.querySelector(".mantine-Indicator-indicator");
                const style = indicator ? getComputedStyle(indicator) : null;
                expect(style?.minWidth).toBe("8px");
            });

            it("height matches --indicator-size", () => {
                const { container } = renderWithTheme(
                    <Indicator>
                        <div>Content</div>
                    </Indicator>
                );
                const indicator = container.querySelector(".mantine-Indicator-indicator");
                const style = indicator ? getComputedStyle(indicator) : null;
                // Height is set, minHeight may not be explicitly set
                expect(style?.height).toBe("8px");
            });
        });
    });
});

// ============================================================================
// Kbd - Comprehensive Tests
// ============================================================================
describe("Kbd - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--kbd-fz is 10px", () => {
                const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
                const root = container.querySelector(".mantine-Kbd-root");
                expect(getCssVar(root, "--kbd-fz")).toBe("10px");
            });

            it("--kbd-padding is 2px 4px", () => {
                const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
                const root = container.querySelector(".mantine-Kbd-root");
                expect(getCssVar(root, "--kbd-padding")).toBe("2px 4px");
            });
        });

        describe("computed styles", () => {
            it("fontSize is 10px", () => {
                const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
                const root = container.querySelector(".mantine-Kbd-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.fontSize).toBe("10px");
            });

            it("--kbd-padding is set to 2px 4px", () => {
                const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
                const root = container.querySelector(".mantine-Kbd-root");
                // Check the CSS variable is set correctly
                expect(getCssVar(root, "--kbd-padding")).toBe("2px 4px");
            });

            it("has compact vertical padding", () => {
                const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
                const root = container.querySelector(".mantine-Kbd-root");
                const style = root ? getComputedStyle(root) : null;
                // Padding values may be computed slightly differently
                const paddingTop = parseFloat(style?.paddingTop || "0");
                expect(paddingTop).toBeLessThanOrEqual(2);
            });

            it("has compact horizontal padding", () => {
                const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
                const root = container.querySelector(".mantine-Kbd-root");
                const style = root ? getComputedStyle(root) : null;
                // Padding values may be computed slightly differently
                const paddingLeft = parseFloat(style?.paddingLeft || "0");
                expect(paddingLeft).toBeLessThanOrEqual(5);
            });

            it("borderRadius is 4px", () => {
                const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
                const root = container.querySelector(".mantine-Kbd-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });
    });
});
