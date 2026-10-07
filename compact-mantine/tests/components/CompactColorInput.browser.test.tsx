/**
 * CompactColorInput's `swatches` and `onChangeEnd`, in a real browser so a drag in the picker's
 * saturation field is a real pointer gesture.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { CompactColorInput, compactTheme, PopoutManager } from "../../src";

afterEach(async () => {
    await commands.mouseAway();
});

/**
 * Render the field and open its picker.
 * @param props - extra props for the field
 * @returns the picker dialog
 */
async function openPicker(props: Partial<React.ComponentProps<typeof CompactColorInput>>): Promise<HTMLElement> {
    render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>
                <CompactColorInput label="Fill" defaultColor="#3373E5" {...props} />
            </PopoutManager>
        </MantineProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /swatch/i }));
    return screen.findByRole("dialog");
}

describe("CompactColorInput swatches and onChangeEnd", () => {
    it("offers the swatches it is given in the picker", async () => {
        const dialog = await openPicker({ swatches: ["#112233", "#445566", "#778899CC"] });
        const group = within(dialog).getByRole("group", { name: /swatches/i });
        const names = within(group)
            .getAllByRole("button")
            .map((b) => b.getAttribute("aria-label"));
        expect(names).toEqual(["#112233", "#445566", "#778899CC"]);
    });

    it("a drag across the saturation field calls onChange many times and onChangeEnd once, on release", async () => {
        const onChange = vi.fn();
        const onChangeEnd = vi.fn();
        const dialog = await openPicker({ onChange, onChangeEnd });
        const field = within(dialog).getByTestId("color-picker-saturation");

        await userEvent.hover(field, { position: { x: 10, y: 10 } });
        await commands.mouseDown();
        await userEvent.hover(field, { position: { x: 40, y: 30 } });
        await userEvent.hover(field, { position: { x: 80, y: 60 } });
        expect(onChangeEnd).not.toHaveBeenCalled();
        await commands.mouseUp();

        expect(onChange.mock.calls.length).toBeGreaterThan(1);
        expect(onChangeEnd).toHaveBeenCalledTimes(1);
        expect(onChangeEnd.mock.calls[0].slice(0, 2)).toEqual(onChange.mock.calls.at(-1)?.slice(0, 2));
    });

    it("a swatch pick and a typed hex each call onChangeEnd once", async () => {
        const onChangeEnd = vi.fn();
        const dialog = await openPicker({ onChangeEnd, swatches: ["#112233"] });
        await userEvent.click(within(dialog).getByRole("button", { name: "#112233" }));
        expect(onChangeEnd).toHaveBeenCalledTimes(1);
        expect(onChangeEnd.mock.calls[0][0]).toBe("#112233");

        const hex = screen.getByTestId("compact-color-input-hex");
        await userEvent.clear(hex);
        await userEvent.type(hex, "AABBCC{Enter}");
        expect(onChangeEnd).toHaveBeenCalledTimes(2);
        expect(onChangeEnd.mock.calls[1][0]).toBe("#AABBCC");
    });
});
