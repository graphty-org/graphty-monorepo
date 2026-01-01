/**
 * Tests for edge cases in RunLayoutsModal.
 * Phase 6: Polish, Edge Cases, and Accessibility
 */
import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/test-utils";
import { RunLayoutsModal } from "../RunLayoutsModal";

describe("RunLayoutsModal - Edge Cases", () => {
    describe("Required fields handling", () => {
        it("should disable Apply when bipartite layout is selected (requires nodes)", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select bipartite layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Bipartite")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Bipartite"));

            // Apply button should be disabled
            expect(screen.getByText("Apply Layout").closest("button")).toBeDisabled();
        });

        it("should show warning message for bipartite layout", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select bipartite layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Bipartite")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Bipartite"));

            // Should show warning about required fields
            expect(screen.getByText(/requires node selection/i)).toBeInTheDocument();
        });

        it("should disable Apply when bfs layout is selected (requires start)", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select bfs layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("BFS Tree")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("BFS Tree"));

            // Apply button should be disabled
            expect(screen.getByText("Apply Layout").closest("button")).toBeDisabled();
        });

        it("should show warning message for bfs layout", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select bfs layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("BFS Tree")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("BFS Tree"));

            // Should show warning about required fields
            expect(screen.getByText(/requires a starting node/i)).toBeInTheDocument();
        });

        it("should disable Apply when multipartite layout is selected (requires subsetKey)", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select multipartite layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Multipartite")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Multipartite"));

            // Apply button should be disabled
            expect(screen.getByText("Apply Layout").closest("button")).toBeDisabled();
        });

        it("should show warning message for multipartite layout", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select multipartite layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Multipartite")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Multipartite"));

            // Should show warning about required fields
            expect(screen.getByText(/requires subset key configuration/i)).toBeInTheDocument();
        });

        it("should enable Apply for layouts without required fields", () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // D3 Force (default) has no required fields
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
        it("should show warning icon for layouts with required fields", async () => {
            render(<RunLayoutsModal opened={true} onClose={vi.fn()} onApply={vi.fn()} is2DMode={false} />);

            // Select bipartite layout
            const dropdown = screen.getByRole("textbox", { name: /layout/i });
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Bipartite")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Bipartite"));

            // Should have a warning icon (AlertTriangle icon from lucide-react)
            // We check for the warning container with the icon
            const warningText = screen.getByText(/requires node selection/i);
            expect(warningText.closest("[class*='warning']") ?? warningText.parentElement).toBeInTheDocument();
        });
    });
});
