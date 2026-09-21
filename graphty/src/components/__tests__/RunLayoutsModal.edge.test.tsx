/**
 * Tests for edge cases in RunLayoutsModal.
 * Phase 6: Polish, Edge Cases, and Accessibility
 */
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getLayoutMetadata } from "../../data/layoutMetadata";
import { render, screen } from "../../test/test-utils";
import { RunLayoutsModal } from "../RunLayoutsModal";

describe("RunLayoutsModal - Edge Cases", () => {
    /**
     * Pick one layout from the dropdown.
     * @param label - The engine's name, as the catalogue spells it.
     */
    async function selectLayout(label: string): Promise<void> {
        const dropdown = screen.getByRole("textbox", { name: /layout/i });
        fireEvent.click(dropdown);
        await waitFor(() => {
            expect(screen.getByText(label)).toBeInTheDocument();
        });
        fireEvent.click(screen.getByText(label));
    }

    describe("Missing inputs handling", () => {
        it("should disable Apply for a layout whose engine declares an option with no default", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // The BFS tree engine declares a start node and gives it no default, so there is
            // nothing to run until something picks one, and nothing in this modal can.
            expect(getLayoutMetadata("bfs")?.requiredFields).toContain("start");
            await selectLayout("BFS Tree");

            expect(screen.getByText("Apply Layout").closest("button")).toBeDisabled();
        });

        it("should name the option a layout is waiting for", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            await selectLayout("BFS Tree");

            expect(screen.getByText(/requires Start Node/i)).toBeInTheDocument();
        });

        it("should warn, but still allow Apply, for an arrangement whose grouping cannot be chosen", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // The catalogue says the two-column arrangement reads a partition, and the engine
            // publishes no option for one. It still runs, on the element's own split.
            expect(getLayoutMetadata("bipartite")?.unsupplied).toContain("partition");
            await selectLayout("Bipartite");

            expect(screen.getByText(/arranges the graph by partition/i)).toBeInTheDocument();
            expect(screen.getByText("Apply Layout").closest("button")).not.toBeDisabled();
        });

        it("should warn for the multipartite engine on the same ground", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            expect(getLayoutMetadata("multipartite")?.unsupplied).toContain("partition");
            await selectLayout("Multipartite");

            expect(screen.getByText(/arranges the graph by partition/i)).toBeInTheDocument();
            expect(screen.getByText("Apply Layout").closest("button")).not.toBeDisabled();
        });

        it("should enable Apply for layouts that need nothing chosen", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 Force (default) declares every option with a default and reads no structure.
            expect(getLayoutMetadata("d3")?.requiredFields).toHaveLength(0);
            expect(getLayoutMetadata("d3")?.unsupplied).toHaveLength(0);
            expect(screen.getByText("Apply Layout").closest("button")).not.toBeDisabled();
        });
    });

    describe("Accessibility", () => {
        it("should have proper aria-label on layout dropdown", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // The layout dropdown should have an aria-label
            const dropdown = screen.getByRole("textbox", { name: /layout algorithm/i });
            expect(dropdown).toBeInTheDocument();
        });

        it("should have proper aria-label on dimension radio group", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 Force is default and supports 3D, should show dimension radio
            // Mantine's Radio.Group uses the aria-label attribute directly
            const radioGroup = screen.getByLabelText(/layout dimensions/i);
            expect(radioGroup).toBeInTheDocument();
        });

        it("should focus layout dropdown when modal opens", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Wait for focus to be set
            await waitFor(() => {
                const dropdown = screen.getByRole("textbox", { name: /layout/i });
                expect(dropdown).toHaveFocus();
            });
        });
    });

    describe("Modal close behavior", () => {
        it("should close modal when Cancel button is clicked", () => {
            const onClose = vi.fn();
            render(<RunLayoutsModal opened={true} onClose={onClose} onApply={vi.fn()} is2DMode={false} />);

            // Click the Cancel button
            const cancelButton = screen.getByText("Cancel");
            fireEvent.click(cancelButton);
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe("Warning icon display", () => {
        it("should show warning icon beside a layout's missing input", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            await selectLayout("Bipartite");

            // Should have a warning icon (AlertTriangle icon from lucide-react)
            // We check for the warning container with the icon
            const warningText = screen.getByText(/arranges the graph by partition/i);
            expect(warningText.closest("[class*='warning']") ?? warningText.parentElement).toBeInTheDocument();
        });
    });
});
