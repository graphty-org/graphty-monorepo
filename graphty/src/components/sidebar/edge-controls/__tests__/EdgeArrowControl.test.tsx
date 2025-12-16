import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
import type {ArrowConfig} from "../../../../types/style-layer";
import {EdgeArrowControl} from "../EdgeArrowControl";

describe("EdgeArrowControl", () => {
    const defaultValue: ArrowConfig = {
        type: "none",
        size: 1,
        color: "#FFFFFF",
        opacity: 100,
    };

    const arrowValue: ArrowConfig = {
        type: "normal",
        size: 1.5,
        color: "#FF0000",
        opacity: 100,
    };

    it("renders arrow type select", () => {
        render(<EdgeArrowControl label="Arrow Head" value={defaultValue} onChange={vi.fn()} />);

        const select = screen.getByLabelText("Arrow Head Type");
        expect(select).toBeInTheDocument();
    });

    it("hides size/color when type is 'none'", () => {
        render(<EdgeArrowControl label="Arrow Head" value={defaultValue} onChange={vi.fn()} />);

        // Size input should not be visible when type is 'none'
        expect(screen.queryByLabelText("Arrow Head Size")).not.toBeInTheDocument();
    });

    it("shows size when type is not 'none'", () => {
        render(<EdgeArrowControl label="Arrow Head" value={arrowValue} onChange={vi.fn()} />);

        // Size input should be visible when type is not 'none'
        expect(screen.getByLabelText("Arrow Head Size")).toBeInTheDocument();
    });

    it("calls onChange when arrow type changes", () => {
        const onChange = vi.fn();
        render(<EdgeArrowControl label="Arrow Head" value={defaultValue} onChange={onChange} />);

        const select = screen.getByLabelText("Arrow Head Type");
        fireEvent.change(select, {target: {value: "normal"}});

        expect(onChange).toHaveBeenCalledWith({
            ... defaultValue,
            type: "normal",
        });
    });

    it("calls onChange when size changes (on blur)", () => {
        const onChange = vi.fn();
        render(<EdgeArrowControl label="Arrow Head" value={arrowValue} onChange={onChange} />);

        const sizeInput = screen.getByLabelText("Arrow Head Size");
        fireEvent.change(sizeInput, {target: {value: "2"}});
        fireEvent.blur(sizeInput);

        expect(onChange).toHaveBeenCalledWith({
            ... arrowValue,
            size: 2,
        });
    });

    it("supports different labels for head and tail", () => {
        render(<EdgeArrowControl label="Arrow Tail" value={arrowValue} onChange={vi.fn()} />);

        expect(screen.getByLabelText("Arrow Tail Type")).toBeInTheDocument();
        expect(screen.getByLabelText("Arrow Tail Size")).toBeInTheDocument();
    });
});
