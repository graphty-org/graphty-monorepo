import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
import {StyleColorInput} from "../StyleColorInput";

describe("StyleColorInput", () => {
    it("shows muted style for default value (when value is undefined)", () => {
        render(
            <StyleColorInput
                label="Color"
                value={undefined}
                defaultValue="#5B8FF9"
                onChange={vi.fn()}
            />,
        );

        const hexInput = screen.getByLabelText("Color hex value");
        expect(hexInput).toHaveValue("5B8FF9");
        // Input wrapper should have muted styling (via data attribute)
        expect(hexInput).toHaveAttribute("data-is-default", "true");
    });

    it("shows normal style for explicit value", () => {
        render(
            <StyleColorInput
                label="Color"
                value="#FF0000"
                defaultValue="#5B8FF9"
                onChange={vi.fn()}
            />,
        );

        const hexInput = screen.getByLabelText("Color hex value");
        expect(hexInput).toHaveValue("FF0000");
        expect(hexInput).toHaveAttribute("data-is-default", "false");
    });

    it("shows reset button only for explicit values", () => {
        const {rerender} = render(
            <StyleColorInput
                label="Color"
                value={undefined}
                defaultValue="#5B8FF9"
                onChange={vi.fn()}
            />,
        );

        // No reset button when using default
        expect(screen.queryByLabelText("Reset Color to default")).not.toBeInTheDocument();

        // Rerender with explicit value
        rerender(
            <StyleColorInput
                label="Color"
                value="#FF0000"
                defaultValue="#5B8FF9"
                onChange={vi.fn()}
            />,
        );

        // Reset button should be visible
        expect(screen.getByLabelText("Reset Color to default")).toBeInTheDocument();
    });

    it("calls onChange(undefined) when reset clicked", () => {
        const onChange = vi.fn();
        render(
            <StyleColorInput
                label="Color"
                value="#FF0000"
                defaultValue="#5B8FF9"
                onChange={onChange}
            />,
        );

        const resetButton = screen.getByLabelText("Reset Color to default");
        fireEvent.click(resetButton);

        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("calls onChange with new value when hex input changes", () => {
        const onChange = vi.fn();
        render(
            <StyleColorInput
                label="Color"
                value="#5B8FF9"
                defaultValue="#5B8FF9"
                onChange={onChange}
            />,
        );

        const hexInput = screen.getByLabelText("Color hex value");
        fireEvent.change(hexInput, {target: {value: "00FF00"}});
        fireEvent.blur(hexInput);

        expect(onChange).toHaveBeenCalledWith("#00FF00");
    });

    it("renders color swatch", () => {
        render(
            <StyleColorInput
                label="Color"
                value="#FF0000"
                defaultValue="#5B8FF9"
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText("Color swatch")).toBeInTheDocument();
    });
});
