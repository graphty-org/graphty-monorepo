/**
 * The color picker's value box and Tab walk, driven with real keys inside the color field's
 * pop-out: text that reads as no color is refused out loud, and Tab reaches every control.
 */
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { CompactColorInput, compactTheme, PopoutManager } from "../../src";

/**
 * Render a color field with no opacity and open its picker, which starts in its value box.
 * @returns the picker's value box
 */
async function openPicker(): Promise<HTMLInputElement> {
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
    await expect.element(value).toHaveFocus();
    return value.element() as HTMLInputElement;
}

describe("ColorPickerPanel value box", () => {
    it("refuses text that is no color out loud on Enter, keeps it, and stays open", async () => {
        const value = await openPicker();
        await userEvent.keyboard("FF0000blue{Enter}");

        const message = page.getByRole("alert");
        await expect.element(message).toHaveTextContent('"FF0000blue" is not a color.');
        await expect.element(page.getByTestId("color-picker-panel")).toBeVisible();
        expect(value.value).toBe("FF0000blue");
        expect(value.getAttribute("aria-invalid")).toBe("true");
        expect(value.getAttribute("aria-describedby")).toBe(message.element().id);

        // Typing again answers the refusal.
        await userEvent.keyboard("{Backspace}");
        await expect.element(page.getByRole("alert")).not.toBeInTheDocument();
    });

    it("says the box went back when the reader leaves it holding text that is no color", async () => {
        const value = await openPicker();
        await userEvent.keyboard("blu");
        await userEvent.tab();

        await expect.element(page.getByRole("alert")).toHaveTextContent('"blu" is not a color, so this stays 6366F1.');
        expect(value.value).toBe("6366F1");
    });
});

describe("ColorPickerPanel Tab walk", () => {
    it("Tab reaches every control of the picker before it leaves", async () => {
        await openPicker();
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
        expect(named.filter((label) => label.includes("before this edit"))).toHaveLength(1);
    });

    it("Shift+Tab reaches every control of the picker before it leaves", async () => {
        await openPicker();
        const panel = page.getByTestId("popout-panel").element();
        const reached = new Set<Element>();
        let left = false;
        for (let step = 0; step < 30 && !left; step += 1) {
            await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
            const active = document.activeElement;
            if (active === null || !panel.contains(active)) {
                left = true;
            } else {
                reached.add(active);
            }
        }

        expect(left).toBe(true);
        const named = [...reached].map((element) => element.getAttribute("aria-label") ?? "");
        for (const name of ["Close", "Hue", "Color format"]) {
            expect(named.some((label) => label.startsWith(name))).toBe(true);
        }
        expect(named.filter((label) => /^(black|gray|indigo|blue)/i.test(label)).length).toBeGreaterThan(0);
    });
});
