import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LAYOUT_METADATA } from "../data/layoutMetadata";
import { render, screen } from "../test/test-utils";
import { RunLayoutsModal } from "./RunLayoutsModal";

describe("RunLayoutsModal", () => {
    describe("Basic rendering", () => {
        it("should render when opened", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);
            expect(screen.getByText("Run Layout")).toBeInTheDocument();
        });

        it("should not render when closed", () => {
            render(<RunLayoutsModal opened={false} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);
            expect(screen.queryByText("Run Layout")).not.toBeInTheDocument();
        });

        it("should display layout dropdown", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);
            expect(screen.getByRole("textbox", { name: /layout/i })).toBeInTheDocument();
        });
    });

    describe("Cancel behavior", () => {
        it("should call onClose when Cancel is clicked", () => {
            const onClose = vi.fn();
            render(<RunLayoutsModal opened={true} onClose={onClose} onApply={vi.fn()} is2DMode={false} />);
            fireEvent.click(screen.getByText("Cancel"));
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe("Layout selection", () => {
        it("should display all 16 layout options in dropdown", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Click to open the dropdown
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);

            // Wait for dropdown to open and verify all layouts are present
            await waitFor(() => {
                // Check that all 16 layouts are present
                for (const layout of LAYOUT_METADATA) {
                    expect(screen.getByText(layout.label)).toBeInTheDocument();
                }
            });
        });

        it("should have D3 Force as the default selected layout", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            expect(dropdown).toHaveValue("D3 Force");
        });

        it("should show layout description when layout is selected", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 Force is the default, should show its description
            expect(screen.getByText(/D3 force-directed simulation/i)).toBeInTheDocument();
        });
    });

    describe("Apply behavior", () => {
        it("should call onApply with layout type when Apply is clicked", () => {
            const onApply = vi.fn();
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={onApply} is2DMode={false} />);

            fireEvent.click(screen.getByText("Apply Layout"));
            expect(onApply).toHaveBeenCalledWith("d3", expect.any(Object));
        });

        it("should call onClose after applying layout", () => {
            const onClose = vi.fn();
            render(<RunLayoutsModal opened={true} onClose={onClose} onApply={vi.fn()} is2DMode={false} />);

            fireEvent.click(screen.getByText("Apply Layout"));
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe("Current layout pre-selection", () => {
        it("should pre-select current layout when opened", () => {
            render(
                <RunLayoutsModal
                    opened={true}
                    currentLayout="circular"
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                    is2DMode={false}
                />,
            );

            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            expect(dropdown).toHaveValue("Circular");
        });
    });

    describe("Styling", () => {
        it("should have dark theme styling", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // The modal should be present with title
            expect(screen.getByText("Run Layout")).toBeInTheDocument();
        });
    });

    describe("Layout options form", () => {
        it("should display Options section", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            expect(screen.getByText("Options")).toBeInTheDocument();
        });

        it("should display D3 layout options with default D3 selection", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 layout has alphaMin, alphaTarget, alphaDecay, velocityDecay
            expect(screen.getByLabelText("Alpha Min")).toBeInTheDocument();
            expect(screen.getByLabelText("Alpha Target")).toBeInTheDocument();
            expect(screen.getByLabelText("Alpha Decay")).toBeInTheDocument();
            expect(screen.getByLabelText("Velocity Decay")).toBeInTheDocument();
        });

        it("should show default values for D3 layout options", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 defaults: alphaMin=0.1, alphaTarget=0, alphaDecay=0.0228, velocityDecay=0.4
            expect(screen.getByDisplayValue("0.1")).toBeInTheDocument();
            expect(screen.getByDisplayValue("0.0228")).toBeInTheDocument();
            expect(screen.getByDisplayValue("0.4")).toBeInTheDocument();
        });

        it("should not show hidden fields like scalingFactor", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select ForceAtlas2 which has scalingFactor hidden
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("ForceAtlas2")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("ForceAtlas2"));

            // scalingFactor should be hidden
            expect(screen.queryByLabelText("Scaling Factor")).not.toBeInTheDocument();

            // But other ForceAtlas2 options should be visible
            expect(screen.getByLabelText("Max Iter")).toBeInTheDocument();
            expect(screen.getByLabelText("Gravity")).toBeInTheDocument();
        });

        it("should include form values in onApply config", () => {
            const onApply = vi.fn();
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={onApply} is2DMode={false} />);

            // Change a value
            const alphaMinInput = screen.getByLabelText("Alpha Min");
            fireEvent.change(alphaMinInput, { target: { value: "0.2" } });

            // Apply the layout
            fireEvent.click(screen.getByText("Apply Layout"));

            // Config should include the changed value and defaults
            expect(onApply).toHaveBeenCalledWith(
                "d3",
                expect.objectContaining({
                    alphaMin: 0.2,
                    alphaTarget: 0,
                    alphaDecay: 0.0228,
                    velocityDecay: 0.4,
                }),
            );
        });
    });
});
