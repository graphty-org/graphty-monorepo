import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
import type {LayerItem} from "../../../layout/LeftSidebar";
import {StyleLayerPropertiesPanel} from "../StyleLayerPropertiesPanel";

describe("StyleLayerPropertiesPanel", () => {
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

    it("renders layer name in header", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(screen.getByText(/Layer:.*Test Layer/)).toBeInTheDocument();
    });

    it("renders node selector input", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        const selectorInput = screen.getByLabelText("Node Selector");
        expect(selectorInput).toBeInTheDocument();
        expect(selectorInput).toHaveValue("id == `1`");
    });

    it("renders node color input", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        // Color control now has swatch + hex input (multiple on page due to edge controls)
        const colorInputs = screen.getAllByLabelText("Color hex value");
        expect(colorInputs.length).toBeGreaterThan(0);
    });

    it("calls onUpdate when selector changes", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        const selectorInput = screen.getByLabelText("Node Selector");
        fireEvent.change(selectorInput, {target: {value: "id == `2`"}});
        fireEvent.blur(selectorInput);

        expect(onUpdate).toHaveBeenCalledWith(mockLayer.id, {
            selector: "id == `2`",
            style: {color: "#ff0000"},
        });
    });

    it("calls onUpdate when color changes (on blur)", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        // First color hex input is for node color
        const colorInputs = screen.getAllByLabelText("Color hex value");
        fireEvent.change(colorInputs[0], {target: {value: "00FF00"}});
        fireEvent.blur(colorInputs[0]);

        expect(onUpdate).toHaveBeenCalledWith(mockLayer.id, expect.objectContaining({
            selector: "id == `1`",
            style: expect.objectContaining({
                texture: {color: "#00FF00"},
            }),
        }));
    });

    it("renders shape control", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(screen.getByLabelText("Shape Type")).toBeInTheDocument();
        expect(screen.getByLabelText("Size")).toBeInTheDocument();
    });

    it("calls onUpdate when shape changes", () => {
        const onUpdate = vi.fn();
        render(<StyleLayerPropertiesPanel layer={mockLayer} onUpdate={onUpdate} />);

        const shapeSelect = screen.getByLabelText("Shape Type");
        fireEvent.change(shapeSelect, {target: {value: "box"}});

        expect(onUpdate).toHaveBeenCalledWith(mockLayer.id, expect.objectContaining({
            selector: "id == `1`",
            style: expect.objectContaining({
                shape: {type: "box", size: 1.0},
            }),
        }));
    });

    it("renders color mode options", () => {
        render(<StyleLayerPropertiesPanel layer={mockLayer} />);

        expect(screen.getByRole("radio", {name: "Solid"})).toBeInTheDocument();
        expect(screen.getByRole("radio", {name: "Gradient"})).toBeInTheDocument();
        expect(screen.getByRole("radio", {name: "Radial"})).toBeInTheDocument();
    });
});
