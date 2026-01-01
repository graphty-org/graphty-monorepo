import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { ColorStop } from "../../../../types/style-layer";
import { GradientEditor } from "../GradientEditor";

describe("GradientEditor", () => {
    const defaultStops: ColorStop[] = [
        { id: "stop-1", offset: 0, color: "#ff0000" },
        { id: "stop-2", offset: 1, color: "#00ff00" },
    ];

    it("renders color stops", () => {
        render(<GradientEditor stops={defaultStops} direction={90} onChange={vi.fn()} />);

        expect(screen.getByText("Color Stops")).toBeInTheDocument();
    });

    it("renders direction slider by default", () => {
        render(<GradientEditor stops={defaultStops} direction={90} onChange={vi.fn()} />);

        expect(screen.getByText("Direction")).toBeInTheDocument();
        expect(screen.getByLabelText("Gradient direction")).toBeInTheDocument();
    });

    it("hides direction slider when showDirection is false", () => {
        render(<GradientEditor stops={defaultStops} direction={90} showDirection={false} onChange={vi.fn()} />);

        expect(screen.queryByText("Direction")).not.toBeInTheDocument();
    });

    it("renders add stop button", () => {
        render(<GradientEditor stops={defaultStops} direction={90} onChange={vi.fn()} />);

        expect(screen.getByLabelText("Add color stop")).toBeInTheDocument();
    });

    it("renders remove stop buttons", () => {
        render(<GradientEditor stops={defaultStops} direction={90} onChange={vi.fn()} />);

        const removeButtons = screen.getAllByLabelText(/Remove color stop/);
        expect(removeButtons).toHaveLength(2);
    });

    it("calls onChange when color changes", () => {
        const onChange = vi.fn();
        render(<GradientEditor stops={defaultStops} direction={90} onChange={onChange} />);

        const colorInputs = screen.getAllByLabelText(/Color stop \d+/);
        fireEvent.change(colorInputs[0], { target: { value: "#0000ff" } });

        expect(onChange).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ color: "#0000ff" })]),
            90,
        );
    });

    it("calls onChange when add stop is clicked", () => {
        const onChange = vi.fn();
        render(<GradientEditor stops={defaultStops} direction={90} onChange={onChange} />);

        const addButton = screen.getByLabelText("Add color stop");
        fireEvent.click(addButton);

        expect(onChange).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: "stop-1" }),
                expect.objectContaining({ id: "stop-2" }),
                expect.objectContaining({ color: "#888888" }),
            ]),
            90,
        );
    });

    it("calls onChange when remove stop is clicked", () => {
        const onChange = vi.fn();
        // Use three stops so remove buttons are enabled
        const threeStops: ColorStop[] = [
            { id: "stop-1", offset: 0, color: "#ff0000" },
            { id: "stop-2", offset: 0.5, color: "#00ff00" },
            { id: "stop-3", offset: 1, color: "#0000ff" },
        ];

        render(<GradientEditor stops={threeStops} direction={90} onChange={onChange} />);

        // Find and click remove button for the second stop
        const removeButtons = screen.getAllByLabelText(/Remove color stop/);
        fireEvent.click(removeButtons[1]);

        expect(onChange).toHaveBeenCalled();
    });

    it("disables add button when at max stops (5)", () => {
        const fiveStops: ColorStop[] = [
            { id: "stop-1", offset: 0, color: "#ff0000" },
            { id: "stop-2", offset: 0.25, color: "#ffff00" },
            { id: "stop-3", offset: 0.5, color: "#00ff00" },
            { id: "stop-4", offset: 0.75, color: "#00ffff" },
            { id: "stop-5", offset: 1, color: "#0000ff" },
        ];

        render(<GradientEditor stops={fiveStops} direction={90} onChange={vi.fn()} />);

        const addButton = screen.getByLabelText("Add color stop");
        expect(addButton).toBeDisabled();
    });

    it("disables remove buttons when at min stops (2)", () => {
        render(<GradientEditor stops={defaultStops} direction={90} onChange={vi.fn()} />);

        const removeButtons = screen.getAllByLabelText(/Remove color stop/);
        removeButtons.forEach((button) => {
            expect(button).toBeDisabled();
        });
    });

    it("uses stable keys for color stops (id-based, not index-based)", () => {
        const onChange = vi.fn();
        const { rerender } = render(<GradientEditor stops={defaultStops} direction={90} onChange={onChange} />);

        // Get initial color inputs
        const initialInputs = screen.getAllByLabelText(/Color stop \d+/);
        expect(initialInputs).toHaveLength(2);

        // Reorder stops (swap positions)
        const reorderedStops: ColorStop[] = [
            { id: "stop-2", offset: 0, color: "#00ff00" },
            { id: "stop-1", offset: 1, color: "#ff0000" },
        ];

        rerender(<GradientEditor stops={reorderedStops} direction={90} onChange={onChange} />);

        // Get reordered inputs - they should reflect the new order
        const reorderedInputs = screen.getAllByLabelText(/Color stop \d+/);
        expect(reorderedInputs).toHaveLength(2);

        // When using stable keys (stop.id), React will reorder DOM elements
        // rather than recreate them. We verify the colors are in the new order.
        expect(reorderedInputs[0]).toHaveValue("#00ff00");
        expect(reorderedInputs[1]).toHaveValue("#ff0000");
    });
});
