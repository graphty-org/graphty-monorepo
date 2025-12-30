import {describe, expect, it} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
import {ControlSubGroup} from "../ControlSubGroup";

describe("ControlSubGroup", () => {
    it("renders the label", () => {
        render(
            <ControlSubGroup label="Advanced Options">
                <div>Content</div>
            </ControlSubGroup>,
        );

        expect(screen.getByText("Advanced Options")).toBeInTheDocument();
    });

    it("is collapsed by default when defaultOpen is false", () => {
        render(
            <ControlSubGroup label="Options" defaultOpen={false}>
                <div data-testid="content">Content</div>
            </ControlSubGroup>,
        );

        // Content should not be visible when collapsed
        expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });

    it("is expanded by default when defaultOpen is true", () => {
        render(
            <ControlSubGroup label="Options" defaultOpen={true}>
                <div data-testid="content">Content</div>
            </ControlSubGroup>,
        );

        expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("expands when clicking the header", () => {
        render(
            <ControlSubGroup label="Options" defaultOpen={false}>
                <div data-testid="content">Content</div>
            </ControlSubGroup>,
        );

        // Click the header to expand
        const header = screen.getByText("Options");
        fireEvent.click(header);

        expect(screen.getByTestId("content")).toBeInTheDocument();
    });

    it("collapses when clicking the header while expanded", () => {
        render(
            <ControlSubGroup label="Options" defaultOpen={true}>
                <div data-testid="content">Content</div>
            </ControlSubGroup>,
        );

        // Click the header to collapse
        const header = screen.getByText("Options");
        fireEvent.click(header);

        expect(screen.queryByTestId("content")).not.toBeInTheDocument();
    });

    it("renders children when expanded", () => {
        render(
            <ControlSubGroup label="Options" defaultOpen={true}>
                <div data-testid="child-1">Child 1</div>
                <div data-testid="child-2">Child 2</div>
            </ControlSubGroup>,
        );

        expect(screen.getByTestId("child-1")).toBeInTheDocument();
        expect(screen.getByTestId("child-2")).toBeInTheDocument();
    });

    it("has accessible expand/collapse button", () => {
        render(
            <ControlSubGroup label="Options" defaultOpen={false}>
                <div>Content</div>
            </ControlSubGroup>,
        );

        const button = screen.getByRole("button", {name: "Expand Options"});
        expect(button).toBeInTheDocument();
    });

    it("updates aria-label when toggling", () => {
        render(
            <ControlSubGroup label="Options" defaultOpen={false}>
                <div>Content</div>
            </ControlSubGroup>,
        );

        // Initially collapsed
        expect(screen.getByRole("button", {name: "Expand Options"})).toBeInTheDocument();

        // Click to expand
        fireEvent.click(screen.getByText("Options"));

        // Now expanded
        expect(screen.getByRole("button", {name: "Collapse Options"})).toBeInTheDocument();
    });
});
