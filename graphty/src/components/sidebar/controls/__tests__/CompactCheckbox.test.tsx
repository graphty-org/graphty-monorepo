import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
import {CompactCheckbox} from "../CompactCheckbox";

describe("CompactCheckbox", () => {
    it("renders with label", () => {
        render(<CompactCheckbox label="Test Label" />);
        expect(screen.getByText("Test Label")).toBeInTheDocument();
    });

    it("applies compact styling with 11px font", () => {
        const {container} = render(<CompactCheckbox label="Test" />);
        const label = container.querySelector(".mantine-Checkbox-label");
        expect(label).toHaveStyle({fontSize: "11px"});
    });

    it("applies paddingLeft to label", () => {
        const {container} = render(<CompactCheckbox label="Test" />);
        const label = container.querySelector(".mantine-Checkbox-label");
        expect(label).toHaveStyle({paddingLeft: "4px"});
    });

    it("uses xs size", () => {
        const {container} = render(<CompactCheckbox label="Test" />);
        const checkbox = container.querySelector(".mantine-Checkbox-root");
        expect(checkbox).toHaveAttribute("data-size", "xs");
    });

    it("forwards checked prop", () => {
        render(<CompactCheckbox label="Test" checked={true} readOnly />);
        const checkbox = screen.getByRole("checkbox", {name: "Test"});
        expect(checkbox).toBeChecked();
    });

    it("forwards unchecked prop", () => {
        render(<CompactCheckbox label="Test" checked={false} readOnly />);
        const checkbox = screen.getByRole("checkbox", {name: "Test"});
        expect(checkbox).not.toBeChecked();
    });

    it("calls onChange when clicked", () => {
        const onChange = vi.fn();
        render(<CompactCheckbox label="Test" onChange={onChange} />);
        const checkbox = screen.getByRole("checkbox", {name: "Test"});
        fireEvent.click(checkbox);
        expect(onChange).toHaveBeenCalled();
    });

    it("passes through additional props", () => {
        render(<CompactCheckbox label="Test" data-testid="custom-checkbox" />);
        expect(screen.getByTestId("custom-checkbox")).toBeInTheDocument();
    });
});
