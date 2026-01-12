import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, CompactColorInput, PopoutManager } from "../../src";

/**
 * Test wrapper that includes all required providers.
 */
function TestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
    return (
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{children}</PopoutManager>
        </MantineProvider>
    );
}

describe("CompactColorInput", () => {
    it("renders hex input with default color value", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" />
            </TestWrapper>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveValue("FF0000");
    });

    it("renders hex input with explicit color value", () => {
        render(
            <TestWrapper>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
            </TestWrapper>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveValue("00FF00");
    });

    it("renders label when provided", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" label="Fill Color" />
            </TestWrapper>,
        );
        expect(screen.getByText("Fill Color")).toBeInTheDocument();
    });

    it("shows opacity input by default", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" defaultOpacity={75} />
            </TestWrapper>,
        );
        const opacityInput = screen.getByRole("textbox", { name: /opacity/i });
        expect(opacityInput).toHaveValue("75%");
    });

    it("hides opacity input when showOpacity is false", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" showOpacity={false} />
            </TestWrapper>,
        );
        expect(screen.queryByRole("textbox", { name: /opacity/i })).not.toBeInTheDocument();
    });

    it("has color swatch button", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" />
            </TestWrapper>,
        );
        expect(screen.getByRole("button", { name: /swatch/i })).toBeInTheDocument();
    });

    it("shows reset button when explicit color is set", () => {
        render(
            <TestWrapper>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" label="Test" />
            </TestWrapper>,
        );
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("hides reset button when using default value", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" label="Test" />
            </TestWrapper>,
        );
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("marks hex input as default when using default color", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" />
            </TestWrapper>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveAttribute("data-is-default", "true");
    });

    it("marks hex input as non-default when explicit color is set", () => {
        render(
            <TestWrapper>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
            </TestWrapper>,
        );
        const input = screen.getByRole("textbox", { name: /hex/i });
        expect(input).toHaveAttribute("data-is-default", "false");
    });

    it("calls onColorChange when hex input changes on blur", async () => {
        const user = userEvent.setup();
        const onColorChange = vi.fn();
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" onColorChange={onColorChange} />
            </TestWrapper>,
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
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" defaultOpacity={100} onOpacityChange={onOpacityChange} />
            </TestWrapper>,
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
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" defaultOpacity={50} onOpacityChange={onOpacityChange} />
            </TestWrapper>,
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
            <TestWrapper>
                <CompactColorInput
                    color="#00FF00"
                    defaultColor="#FF0000"
                    label="Test"
                    onColorChange={onColorChange}
                />
            </TestWrapper>,
        );

        const resetButton = screen.getByRole("button", { name: /reset/i });
        await user.click(resetButton);

        expect(onColorChange).toHaveBeenCalledWith(undefined);
    });
});
