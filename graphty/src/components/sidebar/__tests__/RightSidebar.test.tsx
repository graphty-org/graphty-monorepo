import {describe, expect, it} from "vitest";

import {render, screen} from "../../../test/test-utils";
import type {LayerItem} from "../../layout/LeftSidebar";
import {RightSidebar} from "../../layout/RightSidebar";

describe("RightSidebar", () => {
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
        // Color control now has swatch + hex input
        expect(screen.getByLabelText("Color hex value")).toBeInTheDocument();
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
});
