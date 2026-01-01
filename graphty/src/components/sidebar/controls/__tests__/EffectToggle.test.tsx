import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { EffectToggle } from "../EffectToggle";

describe("EffectToggle", () => {
    it("hides children when unchecked", () => {
        render(
            <EffectToggle label="Glow" checked={false} onChange={vi.fn()}>
                <div data-testid="child-content">Child Content</div>
            </EffectToggle>,
        );

        expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("shows children when checked", () => {
        render(
            <EffectToggle label="Glow" checked={true} onChange={vi.fn()}>
                <div data-testid="child-content">Child Content</div>
            </EffectToggle>,
        );

        expect(screen.getByTestId("child-content")).toBeInTheDocument();
    });

    it("calls onChange appropriately when checkbox is toggled", () => {
        const onChange = vi.fn();
        render(
            <EffectToggle label="Glow" checked={false} onChange={onChange}>
                <div>Child Content</div>
            </EffectToggle>,
        );

        const checkbox = screen.getByRole("checkbox", { name: "Glow" });
        fireEvent.click(checkbox);

        expect(onChange).toHaveBeenCalledWith(true);
    });

    it("calls onChange with false when unchecking", () => {
        const onChange = vi.fn();
        render(
            <EffectToggle label="Glow" checked={true} onChange={onChange}>
                <div>Child Content</div>
            </EffectToggle>,
        );

        const checkbox = screen.getByRole("checkbox", { name: "Glow" });
        fireEvent.click(checkbox);

        expect(onChange).toHaveBeenCalledWith(false);
    });

    it("renders the label text", () => {
        render(
            <EffectToggle label="Outline Effect" checked={false} onChange={vi.fn()}>
                <div>Child Content</div>
            </EffectToggle>,
        );

        expect(screen.getByText("Outline Effect")).toBeInTheDocument();
    });

    it("applies indentation to children", () => {
        const { container } = render(
            <EffectToggle label="Glow" checked={true} onChange={vi.fn()}>
                <div data-testid="child-content">Child Content</div>
            </EffectToggle>,
        );

        // Check that children are wrapped in a container with padding for indentation
        const childWrapper = container.querySelector("[data-testid='effect-toggle-children']");
        expect(childWrapper).toBeInTheDocument();
    });
});
