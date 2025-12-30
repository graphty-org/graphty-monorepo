import {describe, expect, it} from "vitest";

import {render, screen} from "../../../test/test-utils";
import type {GraphInfo} from "../../../types/selection";
import type {LayerItem} from "../../layout/LeftSidebar";
import {RightSidebar} from "../../layout/RightSidebar";

describe("RightSidebar", () => {
    const mockGraphInfo: GraphInfo = {
        nodeCount: 100,
        edgeCount: 250,
        density: 0.0505,
        dataSources: [{name: "test.json", type: "json"}],
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
                selector: "id == `1`",
                style: {color: "#ff0000"},
            },
            edge: {
                selector: "",
                style: {},
            },
        },
    };

    it("renders 'Select a layer' when no layer is selected", () => {
        render(<RightSidebar selectedLayer={null} />);

        expect(screen.getByText("Select a layer to view properties")).toBeInTheDocument();
    });

    it("renders StyleLayerPropertiesPanel when layer is selected", () => {
        render(<RightSidebar selectedLayer={mockLayer} />);

        // Should show the layer name and node properties
        expect(screen.getByText("Node Properties")).toBeInTheDocument();
        expect(screen.getByLabelText("Node Selector")).toBeInTheDocument();
        // Color control now has swatch + hex input (multiple on page due to edge controls)
        expect(screen.getAllByLabelText("Color hex value").length).toBeGreaterThan(0);
    });

    it("displays the selected layer's name", () => {
        render(<RightSidebar selectedLayer={mockLayer} />);

        expect(screen.getByText("Test Layer")).toBeInTheDocument();
    });

    it("displays shape controls when layer is selected", () => {
        render(<RightSidebar selectedLayer={mockLayer} />);

        expect(screen.getByLabelText("Shape Type")).toBeInTheDocument();
        expect(screen.getByLabelText("Size")).toBeInTheDocument();
    });

    it("displays color mode options when layer is selected", () => {
        render(<RightSidebar selectedLayer={mockLayer} />);

        expect(screen.getByRole("radio", {name: "Solid"})).toBeInTheDocument();
        expect(screen.getByRole("radio", {name: "Gradient"})).toBeInTheDocument();
        expect(screen.getByRole("radio", {name: "Radial"})).toBeInTheDocument();
    });

    it("displays GraphPropertiesPanel when no layer is selected but graphInfo is provided", () => {
        render(<RightSidebar selectedLayer={null} graphInfo={mockGraphInfo} />);

        // Should show Graph Properties header
        expect(screen.getByText("Graph Properties")).toBeInTheDocument();
        // Should show statistics
        expect(screen.getByText("Nodes")).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
        expect(screen.getByText("Edges")).toBeInTheDocument();
        expect(screen.getByText("250")).toBeInTheDocument();
    });

    it("prioritizes layer over graphInfo when both are provided", () => {
        render(<RightSidebar selectedLayer={mockLayer} graphInfo={mockGraphInfo} />);

        // Should show layer name, not Graph Properties
        expect(screen.getByText("Test Layer")).toBeInTheDocument();
        expect(screen.getByText("Node Properties")).toBeInTheDocument();
        // Should NOT show graph statistics
        expect(screen.queryByText("Nodes")).not.toBeInTheDocument();
    });
});
