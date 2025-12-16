import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
import {NodeShapeControl} from "../NodeShapeControl";

describe("NodeShapeControl", () => {
    const defaultValue = {
        type: "sphere" as const,
        size: 1.0,
    };

    it("renders shape type dropdown with grouped options", () => {
        render(<NodeShapeControl value={defaultValue} onChange={vi.fn()} />);

        // Check that the select is rendered
        const select = screen.getByLabelText("Shape Type");
        expect(select).toBeInTheDocument();
    });

    it("renders size number input", () => {
        render(<NodeShapeControl value={defaultValue} onChange={vi.fn()} />);

        const sizeInput = screen.getByLabelText("Size");
        expect(sizeInput).toBeInTheDocument();
        expect(sizeInput).toHaveValue("1");
    });

    it("calls onChange when shape type changes", () => {
        const onChange = vi.fn();
        render(<NodeShapeControl value={defaultValue} onChange={onChange} />);

        const select = screen.getByLabelText("Shape Type");
        fireEvent.change(select, {target: {value: "box"}});

        expect(onChange).toHaveBeenCalledWith({
            type: "box",
            size: 1.0,
        });
    });

    it("calls onChange when size changes (on blur)", () => {
        const onChange = vi.fn();
        render(<NodeShapeControl value={defaultValue} onChange={onChange} />);

        const sizeInput = screen.getByLabelText("Size");
        fireEvent.change(sizeInput, {target: {value: "2"}});
        fireEvent.blur(sizeInput);

        expect(onChange).toHaveBeenCalledWith({
            type: "sphere",
            size: 2,
        });
    });
});
