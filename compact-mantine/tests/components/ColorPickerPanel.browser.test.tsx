/**
 * The color picker's value box and Tab walk, driven with real keys inside the color field's
 * pop-out: text that reads as no color goes back to the color in force, as Figma's does, and is
 * said aloud; the picker opens focused on itself (Figma), and Tab reaches every control.
 */
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { CompactColorInput, compactTheme, PopoutManager } from "../../src";

/**
 * Render a color field with no opacity and open its picker, which focuses the picker itself.
 * @param intoValue - then click into the value box and select its text
 * @returns the picker's value box
 */
async function openPicker(intoValue = true): Promise<HTMLInputElement> {
    render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>
                <CompactColorInput
                    label="Fill"
                    color="#6366F1"
                    defaultColor="#6366F1"
                    showOpacity={false}
                    swatches={["#6366F1", "#AAAAAA", "#111111"]}
                />
            </PopoutManager>
        </MantineProvider>,
    );
    await userEvent.click(page.getByRole("button", { name: "Pick fill color" }));
    const value = page.getByRole("textbox", { name: "Color value" });
    await expect.poll(() => page.getByTestId("popout-panel").element().contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(value.element());
    if (intoValue) {
        await userEvent.click(value);
        await userEvent.keyboard("{Control>}a{/Control}");
    }
    return value.element() as HTMLInputElement;
}

describe("ColorPickerPanel value box", () => {
    it("Enter on text that is no color goes back to the color in force, says why aloud, and stays open", async () => {
        const value = await openPicker();
        await userEvent.keyboard("FF0000blue{Enter}");

        await expect.element(page.getByTestId("color-picker-panel")).toBeVisible();
        expect(value.value).toBe("6366F1");
        expect(value.getAttribute("aria-invalid")).toBeNull();
        expect(document.querySelector('[role="alert"]')).toBeNull();
        await expect
            .element(page.getByTestId("color-picker-panel").getByRole("status"))
            .toHaveTextContent('"FF0000blue" is not a color, so this stays 6366F1.');
    });

    it("says the box went back when the reader leaves it holding text that is no color", async () => {
        const value = await openPicker();
        await userEvent.keyboard("blu");
        await userEvent.tab();

        await expect
            .element(page.getByTestId("color-picker-panel").getByRole("status"))
            .toHaveTextContent('"blu" is not a color, so this stays 6366F1.');
        expect(value.value).toBe("6366F1");
    });
});

describe("ColorPickerPanel Escape", () => {
    it("Escape in the value box takes typing back, keeps focus there, and says so aloud", async () => {
        const value = await openPicker();
        await userEvent.keyboard("FF0000{Escape}");

        await expect.element(page.getByTestId("color-picker-panel")).toBeVisible();
        expect(value.value).toBe("6366F1");
        expect(document.activeElement).toBe(value);
        await expect
            .element(page.getByTestId("color-picker-panel").getByRole("status"))
            .toHaveTextContent("Edit discarded; this stays 6366F1.");
    });
});

describe("ColorPickerPanel Tab walk", () => {
    it("Tab reaches every control of the picker before it leaves", async () => {
        await openPicker(false);
        const panel = page.getByTestId("popout-panel").element();
        const reached = new Set<Element>();
        let left = false;
        for (let step = 0; step < 30 && !left; step += 1) {
            await userEvent.tab();
            const active = document.activeElement;
            if (active === null || !panel.contains(active)) {
                left = true;
            } else {
                reached.add(active);
            }
        }

        expect(left).toBe(true);
        // It moves on from what opened it, as if the picker sat beside the swatch button.
        expect(document.activeElement?.getAttribute("data-testid")).toBe("compact-color-input-hex");
        const named = [...reached].map((element) => element.getAttribute("aria-label") ?? "");
        for (const name of ["Close", "Saturation and brightness", "Hue", "Color format", "Color value"]) {
            expect(named.some((label) => label.startsWith(name))).toBe(true);
        }
        expect(named.filter((label) => label.includes("before this edit"))).toHaveLength(0);
    });
});
