/**
 * Tests for dimension radio functionality in RunLayoutsModal.
 * Phase 3: Dimension Radio and 2D/3D Mode Integration
 */
import {fireEvent, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {render, screen} from "../../test/test-utils";
import {RunLayoutsModal} from "../RunLayoutsModal";

describe("RunLayoutsModal - Dimension Radio", () => {
    describe("Visibility based on layout maxDimensions", () => {
        it("should show dimension radio for layouts with maxDimensions=3", () => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            // D3 Force is default and supports 3D
            expect(screen.getByRole("radiogroup", {name: /dimensions/i})).toBeInTheDocument();
        });

        it("should hide dimension radio for layouts with maxDimensions=2", async() => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            // Select Spiral (2D only layout)
            const dropdown = screen.getByRole("textbox", {name: /layout/i});
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Spiral")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Spiral"));

            // Dimension radio should be hidden for 2D-only layouts
            expect(screen.queryByRole("radiogroup", {name: /dimensions/i})).not.toBeInTheDocument();
        });
    });

    describe("3D option disabled based on render mode", () => {
        it("should disable 3D radio when is2DMode=true", () => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            // D3 Force is default and supports 3D
            const radio3D = screen.getByRole("radio", {name: /3d/i});
            expect(radio3D).toBeDisabled();
        });

        it("should allow both 2D and 3D when is2DMode=false", () => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            // D3 Force is default and supports 3D
            const radio2D = screen.getByRole("radio", {name: /2d/i});
            const radio3D = screen.getByRole("radio", {name: /3d/i});
            expect(radio2D).not.toBeDisabled();
            expect(radio3D).not.toBeDisabled();
        });
    });

    describe("Default dimension selection", () => {
        it("should default to 3D when is2DMode=false and layout supports 3D", () => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            const radio3D = screen.getByRole("radio", {name: /3d/i});
            expect(radio3D).toBeChecked();
        });

        it("should default to 2D when is2DMode=true even for 3D-capable layouts", () => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            const radio2D = screen.getByRole("radio", {name: /2d/i});
            expect(radio2D).toBeChecked();
        });
    });

    describe("Dim value in config on apply", () => {
        it("should include dim=3 in config when 3D is selected", () => {
            const onApply = vi.fn();
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={onApply}
                />,
            );

            // 3D should be default when is2DMode=false
            fireEvent.click(screen.getByText("Apply Layout"));
            expect(onApply).toHaveBeenCalledWith("d3", expect.objectContaining({dim: 3}));
        });

        it("should include dim=2 in config when 2D is selected", () => {
            const onApply = vi.fn();
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={onApply}
                />,
            );

            // Click 2D radio
            const radio2D = screen.getByRole("radio", {name: /2d/i});
            fireEvent.click(radio2D);

            fireEvent.click(screen.getByText("Apply Layout"));
            expect(onApply).toHaveBeenCalledWith("d3", expect.objectContaining({dim: 2}));
        });

        it("should include dim=2 in config for 2D-only layouts", async() => {
            const onApply = vi.fn();
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={onApply}
                />,
            );

            // Select Spiral (2D only layout)
            const dropdown = screen.getByRole("textbox", {name: /layout/i});
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Spiral")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Spiral"));

            fireEvent.click(screen.getByText("Apply Layout"));
            expect(onApply).toHaveBeenCalledWith("spiral", expect.objectContaining({dim: 2}));
        });
    });

    describe("Dimension reset on layout change", () => {
        it("should reset dimension to 3D when switching to a 3D-capable layout", async() => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={false}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            // First select a 2D layout
            const dropdown = screen.getByRole("textbox", {name: /layout/i});
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Spiral")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Spiral"));

            // Now select a 3D layout (Circular)
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Circular")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Circular"));

            // Should show dimension radio with 3D selected
            const radio3D = screen.getByRole("radio", {name: /3d/i});
            expect(radio3D).toBeChecked();
        });

        it("should keep 2D selected when is2DMode=true and switching layouts", async() => {
            render(
                <RunLayoutsModal
                    opened={true}
                    is2DMode={true}
                    onClose={vi.fn()}
                    onApply={vi.fn()}
                />,
            );

            // D3 is default, select Circular (another 3D-capable layout)
            const dropdown = screen.getByRole("textbox", {name: /layout/i});
            fireEvent.click(dropdown);
            await waitFor(() => {
                expect(screen.getByText("Circular")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByText("Circular"));

            // Should still have 2D selected (since is2DMode=true)
            const radio2D = screen.getByRole("radio", {name: /2d/i});
            expect(radio2D).toBeChecked();
        });
    });
});
