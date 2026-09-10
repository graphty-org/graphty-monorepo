/**
 * Focus indicator browser tests (WCAG 2.4.7).
 *
 * Rendered in real Chromium, because `:focus-visible` is a browser heuristic
 * that JSDOM does not implement. Keyboard focus must paint something on every
 * control; a pointer click must not paint a ring.
 */
import { ActionIcon, Button, Checkbox, MantineProvider, Switch, TextInput } from "@mantine/core";
import { render } from "@testing-library/react";
import { userEvent } from "@vitest/browser/context";
import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src";

/**
 * Helper to render a component with the compact theme.
 */
function renderWithTheme(ui: React.ReactElement) {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * The outline width an element draws, in pixels, counting the sibling Mantine
 * paints the ring on for the controls whose real input is visually hidden
 * (Checkbox, Switch).
 */
function ringWidth(element: Element): number {
    const candidates = [element, element.nextElementSibling].filter((el): el is Element => el !== null);
    return candidates.reduce((widest, el) => {
        const style = getComputedStyle(el);
        if (style.outlineStyle === "none") {
            return widest;
        }
        return Math.max(widest, parseFloat(style.outlineWidth) || 0);
    }, 0);
}

/**
 * The border colour of an element, which is how Mantine marks a focused input.
 *
 * Mantine transitions `border-color` over 100ms, so the painted value lags the
 * focus event and every assertion on it has to be polled.
 */
function borderColor(element: Element): string {
    return getComputedStyle(element).borderTopColor;
}

/**
 * Reads the single control rendered into a container, failing the test rather
 * than returning null so the assertions below need no null guard.
 */
function control(container: HTMLElement, selector: string): HTMLElement {
    const element = container.querySelector<HTMLElement>(selector);
    if (!element) {
        throw new Error(`no element matched ${selector}`);
    }
    return element;
}

const TRANSPARENT = "rgba(0, 0, 0, 0)";

describe("keyboard focus is visible (browser)", () => {
    it("TextInput paints its border", async () => {
        const { container } = renderWithTheme(<TextInput label="Name" />);
        const input = control(container, "input");

        expect(borderColor(input)).toBe(TRANSPARENT);

        await userEvent.tab();

        expect(document.activeElement).toBe(input);
        await expect.poll(() => borderColor(input)).not.toBe(TRANSPARENT);
    });

    it("Button paints a ring", async () => {
        const { container } = renderWithTheme(<Button>Run</Button>);
        const button = control(container, "button");

        await userEvent.tab();

        expect(document.activeElement).toBe(button);
        await expect.poll(() => ringWidth(button)).toBeGreaterThan(0);
    });

    it("ActionIcon paints a ring", async () => {
        const { container } = renderWithTheme(
            <ActionIcon aria-label="Reset">
                <span>x</span>
            </ActionIcon>,
        );
        const button = control(container, "button");

        await userEvent.tab();

        expect(document.activeElement).toBe(button);
        await expect.poll(() => ringWidth(button)).toBeGreaterThan(0);
    });

    it("Checkbox paints a ring", async () => {
        const { container } = renderWithTheme(<Checkbox label="Visible" />);
        const input = control(container, "input");

        await userEvent.tab();

        expect(document.activeElement).toBe(input);
        await expect.poll(() => ringWidth(input)).toBeGreaterThan(0);
    });

    it("Switch paints a ring", async () => {
        const { container } = renderWithTheme(<Switch label="Enabled" />);
        const input = control(container, "input");

        await userEvent.tab();

        expect(document.activeElement).toBe(input);
        await expect.poll(() => ringWidth(input)).toBeGreaterThan(0);
    });
});

describe("pointer focus draws no ring (browser)", () => {
    it("Button", async () => {
        const { container } = renderWithTheme(<Button>Run</Button>);
        const button = control(container, "button");

        await userEvent.click(button);

        expect(document.activeElement).toBe(button);
        expect(ringWidth(button)).toBe(0);
    });

    it("ActionIcon", async () => {
        const { container } = renderWithTheme(
            <ActionIcon aria-label="Reset">
                <span>x</span>
            </ActionIcon>,
        );
        const button = control(container, "button");

        await userEvent.click(button);

        expect(document.activeElement).toBe(button);
        expect(ringWidth(button)).toBe(0);
    });

    it("Checkbox", async () => {
        const { container } = renderWithTheme(<Checkbox label="Visible" />);
        const input = control(container, "input");

        await userEvent.click(input);

        expect(document.activeElement).toBe(input);
        expect(ringWidth(input)).toBe(0);
    });

    it("Switch", async () => {
        // Controlled, so that the click under test changes focus without also
        // changing state outside React's act() scope.
        const { container } = renderWithTheme(<Switch label="Enabled" checked={false} onChange={() => undefined} />);
        const input = control(container, "input");
        // The Switch's input is visually hidden; the track is what a pointer hits.
        const track = control(container, ".mantine-Switch-track");

        await userEvent.click(track);

        expect(document.activeElement).toBe(input);
        expect(ringWidth(input)).toBe(0);
    });
});
