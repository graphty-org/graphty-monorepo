import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

        await userEvent.click(screen.getByRole("button", { name: "#00FF00FF" }));

        expect(onChangeEnd).toHaveBeenCalledTimes(1);
        expect(onChangeEnd).toHaveBeenCalledWith("#00FF00FF");
    });
});
