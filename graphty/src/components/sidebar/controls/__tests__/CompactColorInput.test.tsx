import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { CompactColorInput } from "../CompactColorInput";

describe("CompactColorInput", () => {
    it("renders color swatch", () => {
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={vi.fn()} onOpacityChange={vi.fn()} />);
        expect(screen.getByLabelText("Color swatch")).toBeInTheDocument();
    });

    it("renders hex input", () => {
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={vi.fn()} onOpacityChange={vi.fn()} />);
        expect(screen.getByLabelText("Color hex value")).toBeInTheDocument();
    });

    it("renders with opacity control when onOpacityChange is provided", () => {
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={vi.fn()} onOpacityChange={vi.fn()} />);
        expect(screen.getByLabelText("Opacity")).toBeInTheDocument();
    });

    it("renders without opacity control when onOpacityChange is undefined", () => {
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={vi.fn()} />);
        expect(screen.queryByLabelText("Opacity")).not.toBeInTheDocument();
    });

    it("renders without opacity control when showOpacity is false", () => {
        render(
            <CompactColorInput
                color="#ff0000"
                opacity={100}
                onColorChange={vi.fn()}
                onOpacityChange={vi.fn()}
                showOpacity={false}
            />,
        );
        expect(screen.queryByLabelText("Opacity")).not.toBeInTheDocument();
    });

    it("renders with opacity control when showOpacity is true", () => {
        render(
            <CompactColorInput
                color="#ff0000"
                opacity={100}
                onColorChange={vi.fn()}
                onOpacityChange={vi.fn()}
                showOpacity={true}
            />,
        );
        expect(screen.getByLabelText("Opacity")).toBeInTheDocument();
    });

    it("calls onColorChange when hex value changes", () => {
        const onColorChange = vi.fn();
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={onColorChange} />);

        const hexInput = screen.getByLabelText("Color hex value");
        fireEvent.change(hexInput, { target: { value: "00FF00" } });
        fireEvent.blur(hexInput);

        expect(onColorChange).toHaveBeenCalledWith("#00FF00");
    });

    it("calls onOpacityChange when opacity changes", () => {
        const onOpacityChange = vi.fn();
        render(
            <CompactColorInput
                color="#ff0000"
                opacity={100}
                onColorChange={vi.fn()}
                onOpacityChange={onOpacityChange}
            />,
        );

        const opacityInput = screen.getByLabelText("Opacity");
        fireEvent.change(opacityInput, { target: { value: "50" } });
        fireEvent.blur(opacityInput);

        expect(onOpacityChange).toHaveBeenCalledWith(50);
    });

    it("renders label when provided", () => {
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={vi.fn()} label="Background Color" />);
        expect(screen.getByText("Background Color")).toBeInTheDocument();
    });

    it("does not render label when not provided", () => {
        render(<CompactColorInput color="#ff0000" opacity={100} onColorChange={vi.fn()} />);
        // The label "Background Color" should not be present
        expect(screen.queryByText("Background Color")).not.toBeInTheDocument();
    });
});
