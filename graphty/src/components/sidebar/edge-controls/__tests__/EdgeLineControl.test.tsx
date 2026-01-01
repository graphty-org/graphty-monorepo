import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import type { EdgeLineConfig } from "../../../../types/style-layer";
import { EdgeLineControl } from "../EdgeLineControl";

describe("EdgeLineControl", () => {
    const defaultValue: EdgeLineConfig = {
        type: "solid",
        width: 1,
        color: "#FFFFFF",
        opacity: 100,
    };

    it("renders line type select", () => {
        render(<EdgeLineControl value={defaultValue} onChange={vi.fn()} />);

        const select = screen.getByLabelText("Line Type");
        expect(select).toBeInTheDocument();
    });

    it("renders width input", () => {
        render(<EdgeLineControl value={defaultValue} onChange={vi.fn()} />);

        const widthInput = screen.getByLabelText("Width");
        expect(widthInput).toBeInTheDocument();
        expect(widthInput).toHaveValue("1");
    });

    it("renders color swatch", () => {
        render(<EdgeLineControl value={defaultValue} onChange={vi.fn()} />);

        const colorSwatch = screen.getByLabelText("Color swatch");
        expect(colorSwatch).toBeInTheDocument();
    });

    it("renders opacity input", () => {
        render(<EdgeLineControl value={defaultValue} onChange={vi.fn()} />);

        const opacityInput = screen.getByLabelText("Opacity");
        expect(opacityInput).toBeInTheDocument();
    });

    it("calls onChange when line type changes", () => {
        const onChange = vi.fn();
        render(<EdgeLineControl value={defaultValue} onChange={onChange} />);

        const select = screen.getByLabelText("Line Type");
        fireEvent.change(select, { target: { value: "dash" } });

        expect(onChange).toHaveBeenCalledWith({
            ...defaultValue,
            type: "dash",
        });
    });

    it("calls onChange when width changes (on blur)", () => {
        const onChange = vi.fn();
        render(<EdgeLineControl value={defaultValue} onChange={onChange} />);

        const widthInput = screen.getByLabelText("Width");
        fireEvent.change(widthInput, { target: { value: "2" } });
        fireEvent.blur(widthInput);

        expect(onChange).toHaveBeenCalledWith({
            ...defaultValue,
            width: 2,
        });
    });
});
