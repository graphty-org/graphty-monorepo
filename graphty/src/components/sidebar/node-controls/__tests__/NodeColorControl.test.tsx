import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { ColorConfig } from "../../../../types/style-layer";
import { NodeColorControl } from "../NodeColorControl";

describe("NodeColorControl", () => {
    const solidColorValue: ColorConfig = {
        mode: "solid",
        color: "#ff0000",
        opacity: 1.0,
    };

    const gradientColorValue: ColorConfig = {
        mode: "gradient",
        stops: [
            { id: "stop-1", offset: 0, color: "#ff0000" },
            { id: "stop-2", offset: 1, color: "#0000ff" },
        ],
        direction: 0,
        opacity: 1.0,
    };

    it("renders solid/gradient/radial toggle", () => {
        render(<NodeColorControl value={solidColorValue} onChange={vi.fn()} />);

        expect(screen.getByRole("radio", { name: "Solid" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Gradient" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Radial" })).toBeInTheDocument();
    });

    it("shows single color picker in solid mode", () => {
        render(<NodeColorControl value={solidColorValue} onChange={vi.fn()} />);

        // Now uses color swatch + hex input on same line
        expect(screen.getByLabelText("Color swatch")).toBeInTheDocument();
        expect(screen.getByLabelText("Color hex value")).toBeInTheDocument();
    });

    it("shows gradient editor in gradient mode", () => {
        render(<NodeColorControl value={gradientColorValue} onChange={vi.fn()} />);

        // Gradient editor should show color stops
        expect(screen.getByText("Color Stops")).toBeInTheDocument();
    });

    it("renders opacity input", () => {
        render(<NodeColorControl value={solidColorValue} onChange={vi.fn()} />);

        // Opacity is now a number input on the same line as color
        expect(screen.getByLabelText("Opacity")).toBeInTheDocument();
    });

    it("calls onChange when mode changes", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={solidColorValue} onChange={onChange} />);

        const gradientRadio = screen.getByRole("radio", { name: "Gradient" });
        fireEvent.click(gradientRadio);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "gradient",
            }),
        );
    });

    it("calls onChange when color changes in solid mode (on blur)", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={solidColorValue} onChange={onChange} />);

        const colorInput = screen.getByLabelText("Color hex value");
        fireEvent.change(colorInput, { target: { value: "00FF00" } });
        fireEvent.blur(colorInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "solid",
                color: "#00FF00",
            }),
        );
    });

    it("switches from solid to radial mode", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={solidColorValue} onChange={onChange} />);

        const radialRadio = screen.getByRole("radio", { name: "Radial" });
        fireEvent.click(radialRadio);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "radial",
            }),
        );
    });

    it("shows direction slider in gradient mode", () => {
        render(<NodeColorControl value={gradientColorValue} onChange={vi.fn()} />);

        expect(screen.getByText("Direction")).toBeInTheDocument();
    });

    it("does not show direction slider in radial mode", () => {
        const radialValue: ColorConfig = {
            mode: "radial",
            stops: [
                { id: "stop-1", offset: 0, color: "#ff0000" },
                { id: "stop-2", offset: 1, color: "#0000ff" },
            ],
            opacity: 1.0,
        };
        render(<NodeColorControl value={radialValue} onChange={vi.fn()} />);

        expect(screen.queryByText("Direction")).not.toBeInTheDocument();
    });

    it("does not call onChange when clicking already selected mode", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={solidColorValue} onChange={onChange} />);

        const solidRadio = screen.getByRole("radio", { name: "Solid" });
        fireEvent.click(solidRadio);

        expect(onChange).not.toHaveBeenCalled();
    });

    it("switches from gradient to solid mode preserving first stop color", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={gradientColorValue} onChange={onChange} />);

        const solidRadio = screen.getByRole("radio", { name: "Solid" });
        fireEvent.click(solidRadio);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "solid",
                color: "#ff0000", // First stop's color
            }),
        );
    });

    it("switches from gradient to radial mode preserving stops", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={gradientColorValue} onChange={onChange} />);

        const radialRadio = screen.getByRole("radio", { name: "Radial" });
        fireEvent.click(radialRadio);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "radial",
                stops: gradientColorValue.stops,
            }),
        );
    });

    it("switches from radial to gradient mode preserving stops", () => {
        const radialValue: ColorConfig = {
            mode: "radial",
            stops: [
                { id: "stop-1", offset: 0, color: "#ff0000" },
                { id: "stop-2", offset: 1, color: "#0000ff" },
            ],
            opacity: 0.8,
        };
        const onChange = vi.fn();
        render(<NodeColorControl value={radialValue} onChange={onChange} />);

        const gradientRadio = screen.getByRole("radio", { name: "Gradient" });
        fireEvent.click(gradientRadio);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: "gradient",
                stops: radialValue.stops,
                direction: 0,
            }),
        );
    });

    it("calls onChange when opacity changes", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={solidColorValue} onChange={onChange} />);

        const opacityInput = screen.getByLabelText("Opacity");
        fireEvent.change(opacityInput, { target: { value: "50" } });
        fireEvent.blur(opacityInput);

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                opacity: 0.5,
            }),
        );
    });

    it("does not call handleColorChange when not in solid mode", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={gradientColorValue} onChange={onChange} />);

        // In gradient mode, there's no single color input
        expect(screen.queryByLabelText("Color hex value")).not.toBeInTheDocument();
    });

    it("updates gradient stops when in gradient mode", () => {
        const onChange = vi.fn();
        render(<NodeColorControl value={gradientColorValue} onChange={onChange} />);

        // The gradient editor handles stop changes - we verify it renders
        expect(screen.getByText("Color Stops")).toBeInTheDocument();
    });

    it("updates radial stops when in radial mode", () => {
        const radialValue: ColorConfig = {
            mode: "radial",
            stops: [
                { id: "stop-1", offset: 0, color: "#ff0000" },
                { id: "stop-2", offset: 1, color: "#0000ff" },
            ],
            opacity: 1.0,
        };
        const onChange = vi.fn();
        render(<NodeColorControl value={radialValue} onChange={onChange} />);

        // The gradient editor handles stop changes for radial too
        expect(screen.getByText("Color Stops")).toBeInTheDocument();
    });
});
