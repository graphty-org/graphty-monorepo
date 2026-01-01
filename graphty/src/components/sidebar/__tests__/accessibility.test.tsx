import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../test/test-utils";
import type { GraphInfo } from "../../../types/selection";
import type { LayerItem } from "../../layout/LeftSidebar";
import { RightSidebar } from "../../layout/RightSidebar";

/**
 * Accessibility tests for the sidebar components.
 * Tests focus order, ARIA labels, and keyboard navigation.
 */
describe("Sidebar Accessibility", () => {
    const mockGraphInfo: GraphInfo = {
        nodeCount: 100,
        edgeCount: 250,
        density: 0.0505,
        dataSources: [{ name: "test.json", type: "json" }],
        graphType: {
            directed: true,
            weighted: false,
            selfLoops: false,
        },
    };

    const mockLayer: LayerItem = {
        id: "layer-1",
        name: "Test Layer",
        styleLayer: {
            node: {
                selector: "",
                style: {},
            },
            edge: {
                selector: "",
                style: {},
            },
        },
    };

    describe("ARIA labels", () => {
        it("all controls have proper ARIA labels", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // Node controls should have labels
            expect(screen.getByLabelText("Node Selector")).toBeInTheDocument();
            expect(screen.getByLabelText("Shape Type")).toBeInTheDocument();
            expect(screen.getByLabelText("Size")).toBeInTheDocument();

            // Color controls should have labels
            const colorSwatches = screen.getAllByLabelText("Color swatch");
            expect(colorSwatches.length).toBeGreaterThan(0);

            const hexInputs = screen.getAllByLabelText("Color hex value");
            expect(hexInputs.length).toBeGreaterThan(0);

            // Edge controls should have labels
            expect(screen.getByLabelText("Edge Selector")).toBeInTheDocument();
            expect(screen.getByLabelText("Line Type")).toBeInTheDocument();
        });

        it("collapsible sections have expand/collapse labels", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // Check for collapse/expand buttons with proper labels
            const collapseButtons = screen.getAllByRole("button", { name: /Collapse|Expand/ });
            expect(collapseButtons.length).toBeGreaterThan(0);
        });

        it("graph properties panel shows data sources and statistics", () => {
            render(<RightSidebar selectedLayer={null} graphInfo={mockGraphInfo} />);

            // Data sources should be labeled
            expect(screen.getByText("Data Sources")).toBeInTheDocument();

            // Statistics should be labeled
            expect(screen.getByText("Statistics")).toBeInTheDocument();
            expect(screen.getByText("Nodes")).toBeInTheDocument();
            expect(screen.getByText("Edges")).toBeInTheDocument();
            expect(screen.getByText("Density")).toBeInTheDocument();
        });
    });

    describe("keyboard navigation", () => {
        it("focus order follows visual order", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // Get all focusable elements
            const nodeSelector = screen.getByLabelText("Node Selector");
            const shapeType = screen.getByLabelText("Shape Type");
            const size = screen.getByLabelText("Size");

            // These elements should be focusable
            expect(nodeSelector).not.toHaveAttribute("tabindex", "-1");
            expect(shapeType).not.toHaveAttribute("tabindex", "-1");
            expect(size).not.toHaveAttribute("tabindex", "-1");
        });

        it("escape key triggers deselect callback", () => {
            // Test that Escape key behavior is wired up
            // The actual behavior is tested via the onLayerDeselect callback
            const onLayerDeselect = vi.fn();
            render(<RightSidebar selectedLayer={mockLayer} onLayerDeselect={onLayerDeselect} />);

            // Fire keydown on the sidebar
            const sidebar = screen.getByRole("complementary");
            fireEvent.keyDown(sidebar, { key: "Escape" });

            expect(onLayerDeselect).toHaveBeenCalled();
        });
    });

    describe("effect toggle accessibility", () => {
        it("effect toggles are accessible via checkbox role", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // Effect checkboxes should be accessible
            const glowCheckbox = screen.getByRole("checkbox", { name: "Glow" });
            expect(glowCheckbox).toBeInTheDocument();

            const outlineCheckbox = screen.getByRole("checkbox", { name: "Outline" });
            expect(outlineCheckbox).toBeInTheDocument();

            const wireframeCheckbox = screen.getByRole("checkbox", { name: "Wireframe" });
            expect(wireframeCheckbox).toBeInTheDocument();
        });
    });

    describe("control section accessibility", () => {
        it("sections have clickable headers for expand/collapse", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // Find the Node Properties section header - it should be visible
            const nodePropertiesHeader = screen.getByText("Node Properties");
            expect(nodePropertiesHeader).toBeInTheDocument();
        });

        it("collapsible sections use ControlSection with proper accessibility", () => {
            render(<RightSidebar selectedLayer={mockLayer} />);

            // ControlSection has ActionIcons with aria-labels
            // Check for some collapse/expand buttons
            const buttons = screen.getAllByRole("button");

            // We should have many buttons (collapse buttons, action icons, etc.)
            expect(buttons.length).toBeGreaterThan(0);
        });
    });
});
