/**
 * Tests for Reset to Defaults functionality and category grouping in RunLayoutsModal.
 * Phase 5: Reset to Defaults and Category Grouping
 */
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CATEGORY_LABELS } from "../../data/layoutMetadata";
import { render, screen } from "../../test/test-utils";
import { RunLayoutsModal } from "../RunLayoutsModal";

describe("RunLayoutsModal - Reset to Defaults", () => {
    describe("Reset button", () => {
        it("should display Reset to Defaults button", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            expect(screen.getByText("Reset to Defaults")).toBeInTheDocument();
        });

        it("should reset form values to defaults when Reset clicked", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 default alphaMin is 0.1
            const alphaMinInput = screen.getByLabelText("Alpha Min");
            expect(alphaMinInput).toHaveValue("0.1");

            // Modify the value
            fireEvent.change(alphaMinInput, { target: { value: "0.5" } });
            expect(alphaMinInput).toHaveValue("0.5");

            // Click reset
            fireEvent.click(screen.getByText("Reset to Defaults"));

            // Value should be back to default
            expect(alphaMinInput).toHaveValue("0.1");
        });

        it("should reset multiple form values to defaults", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Modify multiple values
            const alphaMinInput = screen.getByLabelText("Alpha Min");
            const alphaDecayInput = screen.getByLabelText("Alpha Decay");
            const velocityDecayInput = screen.getByLabelText("Velocity Decay");

            fireEvent.change(alphaMinInput, { target: { value: "0.9" } });
            fireEvent.change(alphaDecayInput, { target: { value: "0.1" } });
            fireEvent.change(velocityDecayInput, { target: { value: "0.8" } });

            expect(alphaMinInput).toHaveValue("0.9");
            expect(alphaDecayInput).toHaveValue("0.1");
            expect(velocityDecayInput).toHaveValue("0.8");

            // Click reset
            fireEvent.click(screen.getByText("Reset to Defaults"));

            // All values should be back to defaults
            expect(alphaMinInput).toHaveValue("0.1");
            expect(alphaDecayInput).toHaveValue("0.0228");
            expect(velocityDecayInput).toHaveValue("0.4");
        });

        it("should reset boolean values to defaults", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select ForceAtlas2 which has boolean options
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("ForceAtlas2")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("ForceAtlas2"));

            // Find Strong Gravity checkbox (default is false)
            const strongGravityCheckbox = screen.getByRole("checkbox", { name: /strong gravity/i });
            expect(strongGravityCheckbox).not.toBeChecked();

            // Toggle it on
            fireEvent.click(strongGravityCheckbox);
            expect(strongGravityCheckbox).toBeChecked();

            // Click reset
            fireEvent.click(screen.getByText("Reset to Defaults"));

            // Should be back to unchecked
            expect(strongGravityCheckbox).not.toBeChecked();
        });

        it("should reset to correct defaults after changing layouts", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select Circular layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Circular")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Circular"));

            // Circular layout has scale field with default 1
            const scaleInput = screen.getByLabelText("Scale");
            expect(scaleInput).toHaveValue("1");

            // Modify the scale
            fireEvent.change(scaleInput, { target: { value: "5" } });
            expect(scaleInput).toHaveValue("5");

            // Click reset
            fireEvent.click(screen.getByText("Reset to Defaults"));

            // Should be back to default for Circular layout
            expect(scaleInput).toHaveValue("1");
        });
    });

    describe("Apply after reset", () => {
        it("should apply default values after reset", () => {
            const onApply = vi.fn();
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={onApply} is2DMode={false} />);

            // Modify a value
            const alphaMinInput = screen.getByLabelText("Alpha Min");
            fireEvent.change(alphaMinInput, { target: { value: "0.9" } });

            // Click reset
            fireEvent.click(screen.getByText("Reset to Defaults"));

            // Apply the layout
            fireEvent.click(screen.getByText("Apply Layout"));

            // Config should have default values
            expect(onApply).toHaveBeenCalledWith(
                "d3",
                expect.objectContaining({
                    alphaMin: 0.1,
                    alphaTarget: 0,
                    alphaDecay: 0.0228,
                    velocityDecay: 0.4,
                }),
            );
        });
    });
});

describe("RunLayoutsModal - Category Grouping", () => {
    describe("Layout dropdown categories", () => {
        it("should show layouts grouped by category", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Open dropdown
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);

            // Wait for dropdown to open and verify category groups exist
            await waitFor(() => {
                expect(screen.getByText(CATEGORY_LABELS.force)).toBeInTheDocument();
                expect(screen.getByText(CATEGORY_LABELS.geometric)).toBeInTheDocument();
                expect(screen.getByText(CATEGORY_LABELS.hierarchical)).toBeInTheDocument();
                expect(screen.getByText(CATEGORY_LABELS.special)).toBeInTheDocument();
            });
        });

        it("should show Force-Directed category with correct layouts", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);

            await waitFor(() => {
                // Force-directed layouts
                expect(screen.getByText("D3 Force")).toBeInTheDocument();
                expect(screen.getByText("NGraph")).toBeInTheDocument();
                expect(screen.getByText("ForceAtlas2")).toBeInTheDocument();
                expect(screen.getByText("Spring")).toBeInTheDocument();
                expect(screen.getByText("Kamada-Kawai")).toBeInTheDocument();
                expect(screen.getByText("ARF")).toBeInTheDocument();
            });
        });

        it("should show Geometric category with correct layouts", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);

            await waitFor(() => {
                // Geometric layouts
                expect(screen.getByText("Circular")).toBeInTheDocument();
                expect(screen.getByText("Spiral")).toBeInTheDocument();
                expect(screen.getByText("Shell")).toBeInTheDocument();
                expect(screen.getByText("Random")).toBeInTheDocument();
                expect(screen.getByText("Planar")).toBeInTheDocument();
                expect(screen.getByText("Spectral")).toBeInTheDocument();
            });
        });

        it("should show Hierarchical category with correct layouts", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);

            await waitFor(() => {
                // Hierarchical layouts
                expect(screen.getByText("BFS Tree")).toBeInTheDocument();
                expect(screen.getByText("Bipartite")).toBeInTheDocument();
                expect(screen.getByText("Multipartite")).toBeInTheDocument();
            });
        });

        it("should show Special category with correct layouts", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);

            await waitFor(() => {
                // Special layouts
                expect(screen.getByText("Fixed")).toBeInTheDocument();
            });
        });
    });

    describe("Layout description display", () => {
        it("should display layout description for selected layout", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 Force is the default
            expect(screen.getByText(/D3 force-directed simulation/)).toBeInTheDocument();
        });

        it("should update description when layout changes", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select Circular layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Circular")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Circular"));

            // Description should change to Circular's description
            expect(screen.getByText(/Positions nodes in a circle or sphere/)).toBeInTheDocument();
        });
    });
});
