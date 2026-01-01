import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { StyleSelect } from "../StyleSelect";

const options = [
    { value: "sphere", label: "Sphere" },
    { value: "box", label: "Box" },
    { value: "cylinder", label: "Cylinder" },
];

describe("StyleSelect", () => {
    it("shows muted style for default value (when value is undefined)", () => {
        render(
            <StyleSelect label="Shape" value={undefined} defaultValue="sphere" options={options} onChange={vi.fn()} />,
        );

        const select = screen.getByLabelText("Shape");
        expect(select).toHaveValue("sphere");
        // Input should have muted styling (via data attribute)
        expect(select).toHaveAttribute("data-is-default", "true");
    });

    it("shows normal style for explicit value", () => {
        render(<StyleSelect label="Shape" value="box" defaultValue="sphere" options={options} onChange={vi.fn()} />);

        const select = screen.getByLabelText("Shape");
        expect(select).toHaveValue("box");
        expect(select).toHaveAttribute("data-is-default", "false");
    });

    it("shows reset button only for explicit values", () => {
        const { rerender } = render(
            <StyleSelect label="Shape" value={undefined} defaultValue="sphere" options={options} onChange={vi.fn()} />,
        );

        // No reset button when using default
        expect(screen.queryByLabelText("Reset Shape to default")).not.toBeInTheDocument();

        // Rerender with explicit value
        rerender(<StyleSelect label="Shape" value="box" defaultValue="sphere" options={options} onChange={vi.fn()} />);

        // Reset button should be visible
        expect(screen.getByLabelText("Reset Shape to default")).toBeInTheDocument();
    });

    it("calls onChange(undefined) when reset clicked", () => {
        const onChange = vi.fn();
        render(<StyleSelect label="Shape" value="box" defaultValue="sphere" options={options} onChange={onChange} />);

        const resetButton = screen.getByLabelText("Reset Shape to default");
        fireEvent.click(resetButton);

        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("calls onChange with new value when selection changes", () => {
        const onChange = vi.fn();
        render(
            <StyleSelect label="Shape" value="sphere" defaultValue="sphere" options={options} onChange={onChange} />,
        );

        const select = screen.getByLabelText("Shape");
        fireEvent.change(select, { target: { value: "cylinder" } });

        expect(onChange).toHaveBeenCalledWith("cylinder");
    });

    it("has proper aria-label", () => {
        render(
            <StyleSelect
                label="Node Shape"
                value="sphere"
                defaultValue="sphere"
                options={options}
                onChange={vi.fn()}
            />,
        );

        expect(screen.getByLabelText("Node Shape")).toBeInTheDocument();
    });
});
