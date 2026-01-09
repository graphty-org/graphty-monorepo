/**
 * Button Components - Comprehensive CSS Browser Tests
 *
 * Tests ALL CSS values set by compact-mantine button component extensions.
 * Covers: Button, ActionIcon, CloseButton
 */
import { ActionIcon, Button, CloseButton, MantineProvider } from "@mantine/core";
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
// Button - Comprehensive Tests
// ============================================================================
describe("Button - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--button-height is 24px", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                expect(getCssVar(root, "--button-height")).toBe("24px");
            });

            it("--button-fz is 11px", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                expect(getCssVar(root, "--button-fz")).toBe("11px");
            });

            it("--button-padding-x is 8px", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                expect(getCssVar(root, "--button-padding-x")).toBe("8px");
            });
        });

        describe("computed styles", () => {
            it("height is 24px", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("24px");
            });

            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.fontSize).toBe("11px");
            });

            it("paddingLeft is 8px", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.paddingLeft).toBe("8px");
            });

            it("paddingRight is 8px", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.paddingRight).toBe("8px");
            });

            it("borderRadius is 4px (from theme radius.sm)", () => {
                const { container } = renderWithTheme(<Button>Click</Button>);
                const root = container.querySelector(".mantine-Button-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });

        it("renders with data-size='sm' attribute", () => {
            const { container } = renderWithTheme(<Button>Click</Button>);
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });
    });
});

// ============================================================================
// ActionIcon - Comprehensive Tests
// ============================================================================
describe("ActionIcon - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--ai-size is 24px", () => {
                const { container } = renderWithTheme(
                    <ActionIcon aria-label="Action">
                        <IconPlaceholder />
                    </ActionIcon>
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                expect(getCssVar(root, "--ai-size")).toBe("24px");
            });
        });

        describe("computed styles", () => {
            it("width is 24px", () => {
                const { container } = renderWithTheme(
                    <ActionIcon aria-label="Action">
                        <IconPlaceholder />
                    </ActionIcon>
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.width).toBe("24px");
            });

            it("height is 24px", () => {
                const { container } = renderWithTheme(
                    <ActionIcon aria-label="Action">
                        <IconPlaceholder />
                    </ActionIcon>
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("24px");
            });

            it("minWidth is 24px", () => {
                const { container } = renderWithTheme(
                    <ActionIcon aria-label="Action">
                        <IconPlaceholder />
                    </ActionIcon>
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minWidth).toBe("24px");
            });

            it("minHeight is 24px", () => {
                const { container } = renderWithTheme(
                    <ActionIcon aria-label="Action">
                        <IconPlaceholder />
                    </ActionIcon>
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minHeight).toBe("24px");
            });

            it("borderRadius is 4px", () => {
                const { container } = renderWithTheme(
                    <ActionIcon aria-label="Action">
                        <IconPlaceholder />
                    </ActionIcon>
                );
                const root = container.querySelector(".mantine-ActionIcon-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });

        it("renders with data-size='sm' attribute", () => {
            const { container } = renderWithTheme(
                <ActionIcon aria-label="Action">
                    <IconPlaceholder />
                </ActionIcon>
            );
            expect(container.querySelector("[data-size='sm']")).toBeInTheDocument();
        });

        it("renders with variant='subtle' by default", () => {
            const { container } = renderWithTheme(
                <ActionIcon aria-label="Action">
                    <IconPlaceholder />
                </ActionIcon>
            );
            expect(container.querySelector("[data-variant='subtle']")).toBeInTheDocument();
        });
    });
});

// ============================================================================
// CloseButton - Comprehensive Tests
// ============================================================================
describe("CloseButton - All CSS Values (Browser)", () => {
    describe("default (size='xs' via defaultProps)", () => {
        describe("root CSS variables", () => {
            it("--cb-size is 16px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const root = container.querySelector(".mantine-CloseButton-root");
                expect(getCssVar(root, "--cb-size")).toBe("16px");
            });

            it("--cb-icon-size is 12px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const root = container.querySelector(".mantine-CloseButton-root");
                expect(getCssVar(root, "--cb-icon-size")).toBe("12px");
            });
        });

        describe("computed styles", () => {
            it("width is 16px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const root = container.querySelector(".mantine-CloseButton-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.width).toBe("16px");
            });

            it("height is 16px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const root = container.querySelector(".mantine-CloseButton-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.height).toBe("16px");
            });

            it("minWidth is 16px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const root = container.querySelector(".mantine-CloseButton-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minWidth).toBe("16px");
            });

            it("minHeight is 16px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const root = container.querySelector(".mantine-CloseButton-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minHeight).toBe("16px");
            });

            it("borderRadius is 4px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const root = container.querySelector(".mantine-CloseButton-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });

        describe("icon computed styles", () => {
            it("icon width is 12px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const icon = container.querySelector(".mantine-CloseButton-root svg");
                const style = icon ? getComputedStyle(icon) : null;
                expect(style?.width).toBe("12px");
            });

            it("icon height is 12px", () => {
                const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
                const icon = container.querySelector(".mantine-CloseButton-root svg");
                const style = icon ? getComputedStyle(icon) : null;
                expect(style?.height).toBe("12px");
            });
        });
    });
});
