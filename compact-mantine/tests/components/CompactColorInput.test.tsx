import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, CompactColorInput } from "../../src";

describe("CompactColorInput", () => {
    it("renders hex input with default color value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveValue("FF0000");
    });

    it("renders hex input with explicit color value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveValue("00FF00");
    });

    it("renders label when provided", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" label="Fill Color" />
            </MantineProvider>,
        );
        expect(screen.getByText("Fill Color")).toBeInTheDocument();
    });

    it("shows opacity input by default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" defaultOpacity={75} />
            </MantineProvider>,
        );
        const opacityInput = screen.getByRole("textbox", { name: /opacity/i });
        expect(opacityInput).toHaveValue("75%");
    });

    it("hides opacity input when showOpacity is false", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" showOpacity={false} />
            </MantineProvider>,
        );
        expect(screen.queryByRole("textbox", { name: /opacity/i })).not.toBeInTheDocument();
    });

    it("has color swatch button", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" />
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: /swatch/i })).toBeInTheDocument();
    });

    it("shows reset button when explicit color is set", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" label="Test" />
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("hides reset button when using default value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" label="Test" />
            </MantineProvider>,
        );
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("marks hex input as default when using default color", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveAttribute("data-is-default", "true");
    });

    it("marks hex input as non-default when explicit color is set", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveAttribute("data-is-default", "false");
    });

    it("calls onColorChange when hex input changes on blur", async () => {
        const user = userEvent.setup();
        const onColorChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" onColorChange={onColorChange} />
            </MantineProvider>,
        );

        const input = screen.getByRole("textbox", { name: /hex/i });
        await user.clear(input);
        await user.type(input, "00FF00");
        await user.tab(); // blur

        expect(onColorChange).toHaveBeenCalledWith("#00FF00");
    });

    it("calls onOpacityChange when opacity input changes on blur", async () => {
        const user = userEvent.setup();
        const onOpacityChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" defaultOpacity={100} onOpacityChange={onOpacityChange} />
            </MantineProvider>,
        );

        const input = screen.getByRole("textbox", { name: /opacity/i });
        await user.clear(input);
        await user.type(input, "50");
        await user.tab(); // blur

        expect(onOpacityChange).toHaveBeenCalledWith(50);
    });

    it("clamps opacity between 0 and 100", async () => {
        const user = userEvent.setup();
        const onOpacityChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput defaultColor="#FF0000" defaultOpacity={50} onOpacityChange={onOpacityChange} />
            </MantineProvider>,
        );

        const input = screen.getByRole("textbox", { name: /opacity/i });
        await user.clear(input);
        await user.type(input, "150");
        await user.tab(); // blur

        expect(onOpacityChange).toHaveBeenCalledWith(100);
    });

    it("calls onColorChange with undefined when reset is clicked", async () => {
        const user = userEvent.setup();
        const onColorChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <CompactColorInput
                    color="#00FF00"
                    defaultColor="#FF0000"
                    label="Test"
                    onColorChange={onColorChange}
                />
            </MantineProvider>,
        );

        const resetButton = screen.getByRole("button", { name: /reset/i });
        await user.click(resetButton);

        expect(onColorChange).toHaveBeenCalledWith(undefined);
    });
});
