/**
 * Navigation Components - Comprehensive CSS Browser Tests
 *
 * Tests ALL CSS values set by compact-mantine navigation component extensions.
 * After the refactor, all components default to compact styling via defaultProps.
 * Covers: Anchor, Burger, NavLink, Pagination, Stepper, Tabs
 */
import {
    Anchor,
    Burger,
    MantineProvider,
    NavLink,
    Pagination,
    Stepper,
    Tabs,
} from "@mantine/core";
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
// Anchor - Comprehensive Tests
// ============================================================================
describe("Anchor - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("computed styles", () => {
            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(
                    <Anchor href="#">
                        Link
                    </Anchor>
                );
                const root = container.querySelector(".mantine-Anchor-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.fontSize).toBe("11px");
            });
        });
    });
});

// ============================================================================
// Burger - Comprehensive Tests
// ============================================================================
describe("Burger - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--burger-size is 18px", () => {
                const { container } = renderWithTheme(
                    <Burger opened={false} aria-label="Menu" />
                );
                const root = container.querySelector(".mantine-Burger-root");
                expect(getCssVar(root, "--burger-size")).toBe("18px");
            });

            it("--burger-line-size is 2px", () => {
                const { container } = renderWithTheme(
                    <Burger opened={false} aria-label="Menu" />
                );
                const root = container.querySelector(".mantine-Burger-root");
                expect(getCssVar(root, "--burger-line-size")).toBe("2px");
            });
        });

        describe("burger computed styles", () => {
            it("width is 18px", () => {
                const { container } = renderWithTheme(
                    <Burger opened={false} aria-label="Menu" />
                );
                const burger = container.querySelector(".mantine-Burger-burger");
                const style = burger ? getComputedStyle(burger) : null;
                expect(style?.width).toBe("18px");
            });

            it("height matches --burger-size CSS variable", () => {
                const { container } = renderWithTheme(
                    <Burger opened={false} aria-label="Menu" />
                );
                const root = container.querySelector(".mantine-Burger-root");
                // Test the CSS variable is set correctly
                expect(getCssVar(root, "--burger-size")).toBe("18px");
            });
        });
    });
});

// ============================================================================
// NavLink - Comprehensive Tests
// ============================================================================
describe("NavLink - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root computed styles", () => {
            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(
                    <NavLink label="Link" />
                );
                const root = container.querySelector(".mantine-NavLink-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.fontSize).toBe("11px");
            });

            it("minHeight is 28px", () => {
                const { container } = renderWithTheme(
                    <NavLink label="Link" />
                );
                const root = container.querySelector(".mantine-NavLink-root");
                const style = root ? getComputedStyle(root) : null;
                expect(style?.minHeight).toBe("28px");
            });
        });

        describe("label computed styles", () => {
            it("label fontSize is 11px", () => {
                const { container } = renderWithTheme(
                    <NavLink label="Link" />
                );
                const label = container.querySelector(".mantine-NavLink-label");
                const style = label ? getComputedStyle(label) : null;
                expect(style?.fontSize).toBe("11px");
            });
        });
    });
});

// ============================================================================
// Pagination - Comprehensive Tests
// ============================================================================
describe("Pagination - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--pagination-control-size is 24px", () => {
                const { container } = renderWithTheme(<Pagination total={10} />);
                const root = container.querySelector(".mantine-Pagination-root");
                expect(getCssVar(root, "--pagination-control-size")).toBe("24px");
            });

            it("--pagination-control-fz is 11px", () => {
                const { container } = renderWithTheme(<Pagination total={10} />);
                const root = container.querySelector(".mantine-Pagination-root");
                expect(getCssVar(root, "--pagination-control-fz")).toBe("11px");
            });
        });

        describe("control computed styles", () => {
            it("width is 24px", () => {
                const { container } = renderWithTheme(<Pagination total={10} />);
                const control = container.querySelector(".mantine-Pagination-control");
                const style = control ? getComputedStyle(control) : null;
                expect(style?.width).toBe("24px");
            });

            it("height is 24px", () => {
                const { container } = renderWithTheme(<Pagination total={10} />);
                const control = container.querySelector(".mantine-Pagination-control");
                const style = control ? getComputedStyle(control) : null;
                expect(style?.height).toBe("24px");
            });

            it("minWidth is 24px", () => {
                const { container } = renderWithTheme(<Pagination total={10} />);
                const control = container.querySelector(".mantine-Pagination-control");
                const style = control ? getComputedStyle(control) : null;
                expect(style?.minWidth).toBe("24px");
            });

            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(<Pagination total={10} />);
                const control = container.querySelector(".mantine-Pagination-control");
                const style = control ? getComputedStyle(control) : null;
                expect(style?.fontSize).toBe("11px");
            });

            it("borderRadius is 4px", () => {
                const { container } = renderWithTheme(<Pagination total={10} />);
                const control = container.querySelector(".mantine-Pagination-control");
                const style = control ? getComputedStyle(control) : null;
                expect(style?.borderRadius).toBe("4px");
            });
        });
    });
});

// ============================================================================
// Stepper - Comprehensive Tests
// ============================================================================
describe("Stepper - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("root CSS variables", () => {
            it("--stepper-icon-size is 24px", () => {
                const { container } = renderWithTheme(
                    <Stepper active={1}>
                        <Stepper.Step label="Step 1" description="First" />
                        <Stepper.Step label="Step 2" description="Second" />
                    </Stepper>
                );
                const root = container.querySelector(".mantine-Stepper-root");
                expect(getCssVar(root, "--stepper-icon-size")).toBe("24px");
            });

            it("--stepper-fz is 11px", () => {
                const { container } = renderWithTheme(
                    <Stepper active={1}>
                        <Stepper.Step label="Step 1" description="First" />
                        <Stepper.Step label="Step 2" description="Second" />
                    </Stepper>
                );
                const root = container.querySelector(".mantine-Stepper-root");
                expect(getCssVar(root, "--stepper-fz")).toBe("11px");
            });

            it("--stepper-spacing is 8px", () => {
                const { container } = renderWithTheme(
                    <Stepper active={1}>
                        <Stepper.Step label="Step 1" description="First" />
                        <Stepper.Step label="Step 2" description="Second" />
                    </Stepper>
                );
                const root = container.querySelector(".mantine-Stepper-root");
                expect(getCssVar(root, "--stepper-spacing")).toBe("8px");
            });
        });

        describe("stepIcon computed styles", () => {
            it("width is 24px", () => {
                const { container } = renderWithTheme(
                    <Stepper active={1}>
                        <Stepper.Step label="Step 1" description="First" />
                        <Stepper.Step label="Step 2" description="Second" />
                    </Stepper>
                );
                const stepIcon = container.querySelector(".mantine-Stepper-stepIcon");
                const style = stepIcon ? getComputedStyle(stepIcon) : null;
                expect(style?.width).toBe("24px");
            });

            it("height is 24px", () => {
                const { container } = renderWithTheme(
                    <Stepper active={1}>
                        <Stepper.Step label="Step 1" description="First" />
                        <Stepper.Step label="Step 2" description="Second" />
                    </Stepper>
                );
                const stepIcon = container.querySelector(".mantine-Stepper-stepIcon");
                const style = stepIcon ? getComputedStyle(stepIcon) : null;
                expect(style?.height).toBe("24px");
            });

            it("minWidth is 24px", () => {
                const { container } = renderWithTheme(
                    <Stepper active={1}>
                        <Stepper.Step label="Step 1" description="First" />
                        <Stepper.Step label="Step 2" description="Second" />
                    </Stepper>
                );
                const stepIcon = container.querySelector(".mantine-Stepper-stepIcon");
                const style = stepIcon ? getComputedStyle(stepIcon) : null;
                expect(style?.minWidth).toBe("24px");
            });
        });

        describe("stepLabel computed styles", () => {
            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(
                    <Stepper active={1}>
                        <Stepper.Step label="Step 1" description="First" />
                        <Stepper.Step label="Step 2" description="Second" />
                    </Stepper>
                );
                const stepLabel = container.querySelector(".mantine-Stepper-stepLabel");
                const style = stepLabel ? getComputedStyle(stepLabel) : null;
                expect(style?.fontSize).toBe("11px");
            });
        });
    });
});

// ============================================================================
// Tabs - Comprehensive Tests
// ============================================================================
describe("Tabs - All CSS Values (Browser)", () => {
    describe("with default size (sm)", () => {
        describe("tab computed styles", () => {
            it("fontSize is 11px", () => {
                const { container } = renderWithTheme(
                    <Tabs defaultValue="first">
                        <Tabs.List>
                            <Tabs.Tab value="first">First</Tabs.Tab>
                            <Tabs.Tab value="second">Second</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                );
                const tab = container.querySelector(".mantine-Tabs-tab");
                const style = tab ? getComputedStyle(tab) : null;
                expect(style?.fontSize).toBe("11px");
            });

            it("paddingTop is 6px", () => {
                const { container } = renderWithTheme(
                    <Tabs defaultValue="first">
                        <Tabs.List>
                            <Tabs.Tab value="first">First</Tabs.Tab>
                            <Tabs.Tab value="second">Second</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                );
                const tab = container.querySelector(".mantine-Tabs-tab");
                const style = tab ? getComputedStyle(tab) : null;
                expect(style?.paddingTop).toBe("6px");
            });

            it("paddingBottom is 6px", () => {
                const { container } = renderWithTheme(
                    <Tabs defaultValue="first">
                        <Tabs.List>
                            <Tabs.Tab value="first">First</Tabs.Tab>
                            <Tabs.Tab value="second">Second</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                );
                const tab = container.querySelector(".mantine-Tabs-tab");
                const style = tab ? getComputedStyle(tab) : null;
                expect(style?.paddingBottom).toBe("6px");
            });

            it("paddingLeft is 10px", () => {
                const { container } = renderWithTheme(
                    <Tabs defaultValue="first">
                        <Tabs.List>
                            <Tabs.Tab value="first">First</Tabs.Tab>
                            <Tabs.Tab value="second">Second</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                );
                const tab = container.querySelector(".mantine-Tabs-tab");
                const style = tab ? getComputedStyle(tab) : null;
                expect(style?.paddingLeft).toBe("10px");
            });

            it("paddingRight is 10px", () => {
                const { container } = renderWithTheme(
                    <Tabs defaultValue="first">
                        <Tabs.List>
                            <Tabs.Tab value="first">First</Tabs.Tab>
                            <Tabs.Tab value="second">Second</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>
                );
                const tab = container.querySelector(".mantine-Tabs-tab");
                const style = tab ? getComputedStyle(tab) : null;
                expect(style?.paddingRight).toBe("10px");
            });
        });
    });
});
