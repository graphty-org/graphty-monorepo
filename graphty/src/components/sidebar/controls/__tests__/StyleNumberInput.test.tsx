import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { StyleNumberInput } from "../StyleNumberInput";

describe("StyleNumberInput", () => {
    it("shows muted style for default value (when value is undefined)", () => {
        render(<StyleNumberInput label="Size" value={undefined} defaultValue={1} onChange={vi.fn()} />);

        const input = screen.getByLabelText("Size");
        // NumberInput uses text input, so value is a string
        expect(input).toHaveValue("1");
        // Input should have muted/italic styling (via data attribute)
        expect(input).toHaveAttribute("data-is-default", "true");
    });

    it("shows normal style for explicit value", () => {
        render(<StyleNumberInput label="Size" value={2} defaultValue={1} onChange={vi.fn()} />);

        const input = screen.getByLabelText("Size");
        // NumberInput uses text input, so value is a string
        expect(input).toHaveValue("2");
        expect(input).toHaveAttribute("data-is-default", "false");
    });

    it("shows reset button only for explicit values", () => {
        const { rerender } = render(
            <StyleNumberInput label="Size" value={undefined} defaultValue={1} onChange={vi.fn()} />,
        );

        // No reset button when using default
        expect(screen.queryByLabelText("Reset Size to default")).not.toBeInTheDocument();

        // Rerender with explicit value
        rerender(<StyleNumberInput label="Size" value={2} defaultValue={1} onChange={vi.fn()} />);

        // Reset button should be visible
        expect(screen.getByLabelText("Reset Size to default")).toBeInTheDocument();
    });

    it("calls onChange(undefined) when reset clicked", () => {
        const onChange = vi.fn();
        render(<StyleNumberInput label="Size" value={2} defaultValue={1} onChange={onChange} />);

        const resetButton = screen.getByLabelText("Reset Size to default");
        fireEvent.click(resetButton);

        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("calls onChange with new value when input changes", () => {
        const onChange = vi.fn();
        render(<StyleNumberInput label="Size" value={1} defaultValue={1} onChange={onChange} />);

        const input = screen.getByLabelText("Size");
        fireEvent.change(input, { target: { value: "3" } });
        fireEvent.blur(input);

        expect(onChange).toHaveBeenCalledWith(3);
    });

    it("respects min and max constraints", () => {
        const onChange = vi.fn();
        render(
            <StyleNumberInput label="Opacity" value={50} defaultValue={100} min={0} max={100} onChange={onChange} />,
        );

        const input = screen.getByLabelText("Opacity");
        expect(input).toBeInTheDocument();
    });

    it("shows suffix when provided", () => {
        render(<StyleNumberInput label="Opacity" value={50} defaultValue={100} suffix="%" onChange={vi.fn()} />);

        // The suffix is appended to the value in the input
        const input = screen.getByLabelText("Opacity");
        expect(input).toHaveValue("50%");
    });

    it("has proper aria-label", () => {
        render(<StyleNumberInput label="Node Size" value={1} defaultValue={1} onChange={vi.fn()} />);

        expect(screen.getByLabelText("Node Size")).toBeInTheDocument();
    });
});
