import { describe, expect, it } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { ControlSection } from "../ControlSection";

describe("ControlSection", () => {
    it("renders with label", () => {
        render(
            <ControlSection label="Test Section">
                <div>Content</div>
            </ControlSection>,
        );

        expect(screen.getByText("Test Section")).toBeInTheDocument();
    });

    it("is expanded by default", () => {
        render(
            <ControlSection label="Test Section">
                <div data-testid="content">Content</div>
            </ControlSection>,
        );

        expect(screen.getByTestId("content")).toBeVisible();
    });

    it("can be collapsed by default", () => {
        render(
            <ControlSection label="Test Section" defaultOpen={false}>
                <div data-testid="content">Content</div>
            </ControlSection>,
        );

        // When collapsed by default, content is in the DOM but not visible
        // (Mantine Collapse uses CSS to hide content)
        // We verify by checking the Expand label (collapsed state)
        expect(screen.getByLabelText("Expand Test Section")).toBeInTheDocument();
    });

    it("toggles when header is clicked", () => {
        render(
            <ControlSection label="Test Section">
                <div data-testid="content">Content</div>
            </ControlSection>,
        );

        // Initially visible - should have collapse button
        expect(screen.getByLabelText("Collapse Test Section")).toBeInTheDocument();

        // Click header to collapse
        const header = screen.getByText("Test Section");
        fireEvent.click(header);

        // After collapsing, should have expand button
        expect(screen.getByLabelText("Expand Test Section")).toBeInTheDocument();
    });

    it("shows collapse/expand aria labels", () => {
        render(
            <ControlSection label="Test Section">
                <div>Content</div>
            </ControlSection>,
        );

        // Should have collapse label when open
        expect(screen.getByLabelText("Collapse Test Section")).toBeInTheDocument();

        // Click to collapse
        fireEvent.click(screen.getByText("Test Section"));

        // Should have expand label when closed
        expect(screen.getByLabelText("Expand Test Section")).toBeInTheDocument();
    });

    describe("indicator dot", () => {
        it("does not show indicator dot by default", () => {
            render(
                <ControlSection label="Test Section">
                    <div>Content</div>
                </ControlSection>,
            );

            expect(screen.queryByLabelText("Test Section has configured values")).not.toBeInTheDocument();
        });

        it("shows indicator dot when hasConfiguredValues is true", () => {
            render(
                <ControlSection label="Test Section" hasConfiguredValues={true}>
                    <div>Content</div>
                </ControlSection>,
            );

            expect(screen.getByLabelText("Test Section has configured values")).toBeInTheDocument();
        });

        it("hides indicator dot when hasConfiguredValues is false", () => {
            render(
                <ControlSection label="Test Section" hasConfiguredValues={false}>
                    <div>Content</div>
                </ControlSection>,
            );

            expect(screen.queryByLabelText("Test Section has configured values")).not.toBeInTheDocument();
        });
    });
});
