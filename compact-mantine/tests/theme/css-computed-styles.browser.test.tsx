/**
 * CSS Computed Styles Browser Tests
 *
 * These tests run in a real browser via Playwright to verify actual computed CSS values.
 * Unlike JSDOM tests, these can verify height, fontSize, borderRadius, padding, etc.
 *
 * Run with: npm test -- --project=browser
 */
import {
    MantineProvider,
    // Input components
    TextInput,
    NumberInput,
    Select,
    // Button components
    Button,
    ActionIcon,
    CloseButton,
    // Control components
    Switch,
    Checkbox,
    Radio,
    Slider,
    SegmentedControl,
    // Display components
    Text,
    Badge,
    Pill,
    Avatar,
    ThemeIcon,
    Indicator,
    Kbd,
    // Feedback components
    Loader,
    Progress,
    // Navigation components
    Burger,
    Pagination,
    Stepper,
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
 * Input Components - Computed Styles
 */
describe("Input Components - Computed Styles (Browser)", () => {
    describe("TextInput", () => {
        it("input has correct computed height", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.height).toBe("24px");
        });

        it("input has correct computed font size", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.fontSize).toBe("11px");
        });

        it("input has correct padding", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.paddingLeft).toBe("8px");
            expect(style?.paddingRight).toBe("8px");
        });

        it("input has correct border radius", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const input = container.querySelector(".mantine-TextInput-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.borderRadius).toBe("4px");
        });

        it("label has correct font size", () => {
            const { container } = renderWithTheme(<TextInput label="Test" />);
            const label = container.querySelector(".mantine-TextInput-label");
            const style = label ? getComputedStyle(label) : null;

            expect(style?.fontSize).toBe("11px");
        });
    });

    describe("NumberInput", () => {
        it("input has correct computed height", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const input = container.querySelector(".mantine-NumberInput-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.height).toBe("24px");
        });

        it("input has correct border radius", () => {
            const { container } = renderWithTheme(<NumberInput label="Test" />);
            const input = container.querySelector(".mantine-NumberInput-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.borderRadius).toBe("4px");
        });
    });

    describe("Select", () => {
        it("input has correct computed height", () => {
            const { container } = renderWithTheme(<Select label="Test" data={["A", "B"]} />);
            const input = container.querySelector(".mantine-Select-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.height).toBe("24px");
        });
    });
});

/**
 * Button Components - Computed Styles
 */
describe("Button Components - Computed Styles (Browser)", () => {
    describe("Button with default size (sm)", () => {
        it("has correct computed height", () => {
            const { container } = renderWithTheme(<Button>Click</Button>);
            const root = container.querySelector(".mantine-Button-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.height).toBe("24px");
        });

        it("has correct computed font size", () => {
            const { container } = renderWithTheme(<Button>Click</Button>);
            const root = container.querySelector(".mantine-Button-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.fontSize).toBe("11px");
        });

        it("has correct border radius", () => {
            const { container } = renderWithTheme(<Button>Click</Button>);
            const root = container.querySelector(".mantine-Button-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.borderRadius).toBe("4px");
        });
    });

    describe("ActionIcon with default size (sm)", () => {
        it("has correct computed dimensions", () => {
            const { container } = renderWithTheme(
                <ActionIcon aria-label="Action">
                    <IconPlaceholder />
                </ActionIcon>
            );
            const root = container.querySelector(".mantine-ActionIcon-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.width).toBe("24px");
            expect(style?.height).toBe("24px");
        });
    });

    describe("CloseButton (defaults to xs)", () => {
        it("has correct computed dimensions", () => {
            const { container } = renderWithTheme(<CloseButton aria-label="Close" />);
            const root = container.querySelector(".mantine-CloseButton-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.width).toBe("16px");
            expect(style?.height).toBe("16px");
        });
    });
});

/**
 * Control Components - Computed Styles
 */
describe("Control Components - Computed Styles (Browser)", () => {
    describe("Switch with default size (sm)", () => {
        it("track has correct computed dimensions", () => {
            const { container } = renderWithTheme(<Switch label="Toggle" />);
            const track = container.querySelector(".mantine-Switch-track");
            const style = track ? getComputedStyle(track) : null;

            expect(style?.height).toBe("16px");
            expect(style?.width).toBe("28px");
        });

        it("label has correct font size", () => {
            const { container } = renderWithTheme(<Switch label="Toggle" />);
            const label = container.querySelector(".mantine-Switch-label");
            const style = label ? getComputedStyle(label) : null;

            expect(style?.fontSize).toBe("11px");
        });
    });

    describe("Checkbox with default size (sm)", () => {
        it("input has correct computed dimensions", () => {
            const { container } = renderWithTheme(<Checkbox label="Check" />);
            const input = container.querySelector(".mantine-Checkbox-input");
            const style = input ? getComputedStyle(input) : null;

            expect(style?.width).toBe("16px");
            expect(style?.height).toBe("16px");
        });

        it("label has correct font size", () => {
            const { container } = renderWithTheme(<Checkbox label="Check" />);
            const label = container.querySelector(".mantine-Checkbox-label");
            const style = label ? getComputedStyle(label) : null;

            expect(style?.fontSize).toBe("11px");
        });
    });

    describe("Radio with default size (sm)", () => {
        it("radio has correct computed dimensions", () => {
            const { container } = renderWithTheme(<Radio label="Option" value="a" />);
            const radio = container.querySelector(".mantine-Radio-radio");
            const style = radio ? getComputedStyle(radio) : null;

            expect(style?.width).toBe("16px");
            expect(style?.height).toBe("16px");
        });

        it("label has correct font size", () => {
            const { container } = renderWithTheme(<Radio label="Option" value="a" />);
            const label = container.querySelector(".mantine-Radio-label");
            const style = label ? getComputedStyle(label) : null;

            expect(style?.fontSize).toBe("11px");
        });
    });

    describe("Slider with default size (sm)", () => {
        it("track has correct computed height", () => {
            const { container } = renderWithTheme(<Slider defaultValue={50} />);
            const track = container.querySelector(".mantine-Slider-track");
            const style = track ? getComputedStyle(track) : null;

            expect(style?.height).toBe("4px");
        });

        it("thumb has correct computed dimensions", () => {
            const { container } = renderWithTheme(<Slider defaultValue={50} />);
            const thumb = container.querySelector(".mantine-Slider-thumb");
            const style = thumb ? getComputedStyle(thumb) : null;

            expect(style?.width).toBe("12px");
            expect(style?.height).toBe("12px");
        });
    });

    describe("SegmentedControl with default size (sm)", () => {
        it("label has correct font size", () => {
            const { container } = renderWithTheme(
                <SegmentedControl data={["A", "B", "C"]} />
            );
            const label = container.querySelector(".mantine-SegmentedControl-label");
            const style = label ? getComputedStyle(label) : null;

            expect(style?.fontSize).toBe("10px");
        });
    });
});

/**
 * Display Components - Computed Styles
 * After refactor, display components default to compact styling via defaultProps.
 */
describe("Display Components - Computed Styles (Browser)", () => {
    describe("Text with size='sm' (uses global fontSizes)", () => {
        it("has correct computed font size", () => {
            // Text uses global fontSizes from theme (compactFontSizes.sm = 11px)
            const { container } = renderWithTheme(<Text size="sm">Hello</Text>);
            const root = container.querySelector(".mantine-Text-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.fontSize).toBe("11px");
        });
    });

    describe("Badge (defaults to compact)", () => {
        it("has correct computed height by default", () => {
            // After refactor, compact styling is applied by default
            const { container } = renderWithTheme(<Badge>Label</Badge>);
            const root = container.querySelector(".mantine-Badge-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.height).toBe("14px");
        });

        it("has correct computed font size by default", () => {
            const { container } = renderWithTheme(<Badge>Label</Badge>);
            const root = container.querySelector(".mantine-Badge-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.fontSize).toBe("9px");
        });
    });

    describe("Pill (defaults to compact)", () => {
        it("has correct computed height by default", () => {
            // After refactor, compact styling is applied by default
            const { container } = renderWithTheme(<Pill>Tag</Pill>);
            const root = container.querySelector(".mantine-Pill-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.height).toBe("16px");
        });
    });

    describe("Avatar (defaults to compact)", () => {
        it("has correct computed dimensions by default", () => {
            // After refactor, compact styling is applied by default
            const { container } = renderWithTheme(<Avatar>AB</Avatar>);
            const root = container.querySelector(".mantine-Avatar-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.width).toBe("24px");
            expect(style?.height).toBe("24px");
        });
    });

    describe("ThemeIcon (defaults to compact)", () => {
        it("has correct computed dimensions by default", () => {
            // After refactor, compact styling is applied by default
            const { container } = renderWithTheme(
                <ThemeIcon>
                    <IconPlaceholder />
                </ThemeIcon>
            );
            const root = container.querySelector(".mantine-ThemeIcon-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.width).toBe("24px");
            expect(style?.height).toBe("24px");
        });

        it("has correct border radius by default", () => {
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

    describe("Indicator (defaults to compact)", () => {
        it("indicator has correct computed dimensions by default", () => {
            // After refactor, compact styling is applied by default
            const { container } = renderWithTheme(
                <Indicator>
                    <div>Content</div>
                </Indicator>
            );
            const indicator = container.querySelector(".mantine-Indicator-indicator");
            const style = indicator ? getComputedStyle(indicator) : null;

            expect(style?.width).toBe("8px");
            expect(style?.height).toBe("8px");
        });
    });

    describe("Kbd (defaults to compact)", () => {
        it("has correct computed font size by default", () => {
            // After refactor, compact styling is applied by default
            const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
            const root = container.querySelector(".mantine-Kbd-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.fontSize).toBe("10px");
        });

        it("has correct border radius by default", () => {
            const { container } = renderWithTheme(<Kbd>Ctrl</Kbd>);
            const root = container.querySelector(".mantine-Kbd-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.borderRadius).toBe("4px");
        });
    });
});

/**
 * Feedback Components - Computed Styles
 */
describe("Feedback Components - Computed Styles (Browser)", () => {
    describe("Loader with default size (sm)", () => {
        it("has correct computed dimensions", () => {
            const { container } = renderWithTheme(<Loader />);
            const root = container.querySelector(".mantine-Loader-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.width).toBe("18px");
            expect(style?.height).toBe("18px");
        });
    });

    describe("Progress with default size (sm)", () => {
        it("has correct computed height", () => {
            const { container } = renderWithTheme(<Progress value={50} />);
            const root = container.querySelector(".mantine-Progress-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.height).toBe("4px");
        });

        it("has correct border radius", () => {
            const { container } = renderWithTheme(<Progress value={50} />);
            const root = container.querySelector(".mantine-Progress-root");
            const style = root ? getComputedStyle(root) : null;

            expect(style?.borderRadius).toBe("4px");
        });
    });
});

/**
 * Navigation Components - Computed Styles
 */
describe("Navigation Components - Computed Styles (Browser)", () => {
    describe("Burger with default size (sm)", () => {
        it("burger lines have correct dimensions", () => {
            const { container } = renderWithTheme(<Burger opened={false} />);
            const burger = container.querySelector(".mantine-Burger-burger");
            const style = burger ? getComputedStyle(burger) : null;

            expect(style?.width).toBe("18px");
        });
    });

    describe("Pagination with default size (sm)", () => {
        it("control has correct computed dimensions", () => {
            const { container } = renderWithTheme(<Pagination total={10} />);
            const control = container.querySelector(".mantine-Pagination-control");
            const style = control ? getComputedStyle(control) : null;

            expect(style?.width).toBe("24px");
            expect(style?.height).toBe("24px");
            expect(style?.minWidth).toBe("24px");
        });

        it("control has correct font size", () => {
            const { container } = renderWithTheme(<Pagination total={10} />);
            const control = container.querySelector(".mantine-Pagination-control");
            const style = control ? getComputedStyle(control) : null;

            expect(style?.fontSize).toBe("11px");
        });

        it("control has correct border radius", () => {
            const { container } = renderWithTheme(<Pagination total={10} />);
            const control = container.querySelector(".mantine-Pagination-control");
            const style = control ? getComputedStyle(control) : null;

            expect(style?.borderRadius).toBe("4px");
        });
    });

    describe("Stepper with default size (sm)", () => {
        it("step icon has correct dimensions", () => {
            const { container } = renderWithTheme(
                <Stepper active={1}>
                    <Stepper.Step label="Step 1" description="First" />
                    <Stepper.Step label="Step 2" description="Second" />
                </Stepper>
            );
            const stepIcon = container.querySelector(".mantine-Stepper-stepIcon");
            const style = stepIcon ? getComputedStyle(stepIcon) : null;

            expect(style?.width).toBe("24px");
            expect(style?.height).toBe("24px");
        });

        it("step label has correct font size", () => {
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
