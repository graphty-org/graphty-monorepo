import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { ColorPickerPanel, compactTheme } from "../../src";

/**
 * Render inside the compact theme.
 * @param ui - the element under test
 * @returns the render result
 */
function renderPanel(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("ColorPickerPanel change-end", () => {
    it("an eyedropper pick reports the end of the change exactly once", async () => {
        vi.stubGlobal(
            "EyeDropper",
            class {
                open(): Promise<{ sRGBHex: string }> {
                    return Promise.resolve({ sRGBHex: "#336699" });
                }
            },
        );
        const onChange = vi.fn();
        const onChangeEnd = vi.fn();
        renderPanel(<ColorPickerPanel value="#FF0000FF" onChange={onChange} onChangeEnd={onChangeEnd} />);

        await userEvent.click(screen.getByRole("button", { name: "Sample color" }));

        await waitFor(() => {
            expect(onChangeEnd).toHaveBeenCalledTimes(1);
        });
        expect(onChangeEnd).toHaveBeenCalledWith("#336699FF");
        expect(onChange).toHaveBeenLastCalledWith("#336699FF");
    });

    it("a swatch reports the end of the change exactly once", async () => {
        const onChangeEnd = vi.fn();
        renderPanel(
            <ColorPickerPanel
                value="#FF0000FF"
                onChange={vi.fn()}
                onChangeEnd={onChangeEnd}
                swatches={["#00FF00FF"]}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "lime 00FF00" }));

        expect(onChangeEnd).toHaveBeenCalledTimes(1);
        expect(onChangeEnd).toHaveBeenCalledWith("#00FF00FF");
    });

    it("groups the swatches in a native fieldset a keyboard reaches and presses", async () => {
        const onChangeEnd = vi.fn();
        renderPanel(
            <ColorPickerPanel
                value="#FF0000FF"
                onChange={vi.fn()}
                onChangeEnd={onChangeEnd}
                swatches={["#00FF00FF"]}
            />,
        );
        const group = screen.getByRole("group", { name: "Swatches" });
        expect(group.tagName).toBe("FIELDSET");

        const swatch = screen.getByRole("button", { name: /00FF00/ });
        expect(group).toContainElement(swatch);
        while (document.activeElement !== swatch) {
            await userEvent.tab();
        }
        await userEvent.keyboard("{Enter}");
        expect(onChangeEnd).toHaveBeenCalledWith("#00FF00FF");
    });
});

describe("ColorPickerPanel formats and sliders", () => {
    /**
     * Pick a format from the format list.
     * @param name - the format's name
     */
    async function chooseFormat(name: string): Promise<void> {
        await userEvent.click(screen.getByRole("combobox", { name: "Color format" }));
        await userEvent.click(screen.getByRole("option", { name }));
    }

    /**
     * Type a value into the value box and commit it with Enter.
     * @param text - what to type
     */
    async function typeValue(text: string): Promise<void> {
        const box = screen.getByRole("textbox", { name: "Color value" });
        await userEvent.click(box);
        await userEvent.keyboard(`{Control>}a{/Control}${text}{Enter}`);
    }

    it("shows and takes a color in HSB, RGB and HSL", async () => {
        const onChange = vi.fn();
        renderPanel(<ColorPickerPanel value="#FF0000FF" onChange={onChange} />);

        await chooseFormat("HSB");
        expect(screen.getByRole("textbox", { name: "Color value" })).toHaveValue("0, 100, 100");
        await typeValue("120, 100, 100");
        expect(onChange).toHaveBeenLastCalledWith("#00FF00FF");

        await chooseFormat("RGB");
        await typeValue("0, 0, 255");
        expect(onChange).toHaveBeenLastCalledWith("#0000FFFF");

        await chooseFormat("HSL");
        await typeValue("60, 100, 50");
        expect(onChange).toHaveBeenLastCalledWith("#FFFF00FF");
    });

    it("refuses a value with the wrong count of numbers", async () => {
        const onChange = vi.fn();
        renderPanel(<ColorPickerPanel value="#FF0000FF" onChange={onChange} />);
        await chooseFormat("RGB");
        await typeValue("1, 2");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("leaves the color as it was when the eyedropper is closed without a pick", async () => {
        vi.stubGlobal(
            "EyeDropper",
            class {
                open(): Promise<{ sRGBHex: string }> {
                    return Promise.reject(new Error("AbortError"));
                }
            },
        );
        const onChange = vi.fn();
        renderPanel(<ColorPickerPanel value="#FF0000FF" onChange={onChange} />);
        await userEvent.click(screen.getByRole("button", { name: "Sample color" }));
        expect(onChange).not.toHaveBeenCalled();
    });
});
