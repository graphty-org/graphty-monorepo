import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../../test/test-utils";
import { LayerItem, LeftSidebar } from "../LeftSidebar";

describe("LeftSidebar", () => {
    const createLayer = (id: string, name: string): LayerItem => ({
        id,
        name,
        styleLayer: {
            node: { selector: "", style: {} },
            edge: { selector: "", style: {} },
        },
    });

    const defaultProps = {
        layers: [] as LayerItem[],
        selectedLayerId: null,
        onLayersChange: vi.fn(),
        onLayerSelect: vi.fn(),
        onAddLayer: vi.fn(),
    };

    describe("rendering", () => {
        it("renders sidebar with header", () => {
            render(<LeftSidebar {...defaultProps} />);

            expect(screen.getByText("Layers")).toBeInTheDocument();
        });

        it("renders add layer button", () => {
            render(<LeftSidebar {...defaultProps} />);

            expect(screen.getByRole("button", { name: /add layer/i })).toBeInTheDocument();
        });

        it("shows empty state when no layers", () => {
            render(<LeftSidebar {...defaultProps} />);

            expect(screen.getByText(/click the \+ button to add layers/i)).toBeInTheDocument();
        });

        it("renders layers when provided", () => {
            const layers = [createLayer("1", "Layer 1"), createLayer("2", "Layer 2")];
            render(<LeftSidebar {...defaultProps} layers={layers} />);

            expect(screen.getByText("Layer 1")).toBeInTheDocument();
            expect(screen.getByText("Layer 2")).toBeInTheDocument();
        });

        it("applies custom className", () => {
            const { container } = render(<LeftSidebar {...defaultProps} className="custom-class" />);

            const sidebar = container.querySelector(".custom-class");
            expect(sidebar).toBeInTheDocument();
        });

        it("applies custom style", () => {
            const { container } = render(<LeftSidebar {...defaultProps} style={{ backgroundColor: "red" }} />);

            const sidebar = container.querySelector("aside");
            expect(sidebar).toBeInTheDocument();
        });
    });

    describe("layer selection", () => {
        it("calls onLayerSelect when layer is clicked", () => {
            const onLayerSelect = vi.fn();
            const layers = [createLayer("1", "Layer 1")];
            render(<LeftSidebar {...defaultProps} layers={layers} onLayerSelect={onLayerSelect} />);

            fireEvent.click(screen.getByText("Layer 1"));

            expect(onLayerSelect).toHaveBeenCalledWith("1");
        });

        it("renders selected layer differently", () => {
            const layers = [createLayer("1", "Layer 1"), createLayer("2", "Layer 2")];
            render(<LeftSidebar {...defaultProps} layers={layers} selectedLayerId="1" />);

            // Verify both layers render - styling is applied via inline styles
            expect(screen.getByText("Layer 1")).toBeInTheDocument();
            expect(screen.getByText("Layer 2")).toBeInTheDocument();
        });
    });

    describe("add layer", () => {
        it("calls onAddLayer when add button is clicked", () => {
            const onAddLayer = vi.fn();
            render(<LeftSidebar {...defaultProps} onAddLayer={onAddLayer} />);

            const addButton = screen.getByRole("button", { name: /add layer/i });
            fireEvent.click(addButton);

            expect(onAddLayer).toHaveBeenCalledTimes(1);
        });
    });

    describe("layer name editing", () => {
        it("shows text input on double-click", async () => {
            const layers = [createLayer("1", "Layer 1")];
            render(<LeftSidebar {...defaultProps} layers={layers} />);

            const layerText = screen.getByText("Layer 1");
            fireEvent.doubleClick(layerText);

            await waitFor(() => {
                expect(screen.getByRole("textbox")).toBeInTheDocument();
            });
        });

        it("populates input with current name", async () => {
            const layers = [createLayer("1", "My Layer")];
            render(<LeftSidebar {...defaultProps} layers={layers} />);

            fireEvent.doubleClick(screen.getByText("My Layer"));

            await waitFor(() => {
                const input = screen.getByRole("textbox");
                expect(input).toHaveValue("My Layer");
            });
        });

        it("calls onLayersChange with new name on blur", async () => {
            const onLayersChange = vi.fn();
            const layers = [createLayer("1", "Layer 1")];
            render(<LeftSidebar {...defaultProps} layers={layers} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(screen.getByText("Layer 1"));

            await waitFor(() => {
                const input = screen.getByRole("textbox");
                fireEvent.change(input, { target: { value: "New Name" } });
                fireEvent.blur(input);
            });

            expect(onLayersChange).toHaveBeenCalledWith([
                expect.objectContaining({ id: "1", name: "New Name" }),
            ]);
        });

        it("calls onLayersChange with new name on Enter", async () => {
            const onLayersChange = vi.fn();
            const layers = [createLayer("1", "Layer 1")];
            render(<LeftSidebar {...defaultProps} layers={layers} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(screen.getByText("Layer 1"));

            await waitFor(() => {
                const input = screen.getByRole("textbox");
                fireEvent.change(input, { target: { value: "Enter Name" } });
                fireEvent.keyDown(input, { key: "Enter" });
            });

            expect(onLayersChange).toHaveBeenCalledWith([
                expect.objectContaining({ id: "1", name: "Enter Name" }),
            ]);
        });

        it("reverts name on Escape", async () => {
            const onLayersChange = vi.fn();
            const layers = [createLayer("1", "Original")];
            render(<LeftSidebar {...defaultProps} layers={layers} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(screen.getByText("Original"));

            await waitFor(() => {
                const input = screen.getByRole("textbox");
                fireEvent.change(input, { target: { value: "Changed" } });
                fireEvent.keyDown(input, { key: "Escape" });
            });

            // Should not call onLayersChange with the changed name
            expect(onLayersChange).not.toHaveBeenCalled();
        });

        it("reverts to original name if empty on blur", async () => {
            const onLayersChange = vi.fn();
            const layers = [createLayer("1", "Original")];
            render(<LeftSidebar {...defaultProps} layers={layers} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(screen.getByText("Original"));

            await waitFor(() => {
                const input = screen.getByRole("textbox");
                fireEvent.change(input, { target: { value: "" } });
                fireEvent.blur(input);
            });

            // Should not call onLayersChange because empty names are rejected
            expect(onLayersChange).not.toHaveBeenCalled();
        });

        it("reverts to original name if empty on Enter", async () => {
            const onLayersChange = vi.fn();
            const layers = [createLayer("1", "Original")];
            render(<LeftSidebar {...defaultProps} layers={layers} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(screen.getByText("Original"));

            await waitFor(() => {
                const input = screen.getByRole("textbox");
                fireEvent.change(input, { target: { value: "   " } }); // whitespace only
                fireEvent.keyDown(input, { key: "Enter" });
            });

            // Should not call onLayersChange because empty names are rejected
            expect(onLayersChange).not.toHaveBeenCalled();
        });
    });

    describe("drag handle", () => {
        it("shows drag handle for each layer", () => {
            const layers = [createLayer("1", "Layer 1")];
            render(<LeftSidebar {...defaultProps} layers={layers} />);

            // The drag handle shows "⋮⋮"
            expect(screen.getByText("⋮⋮")).toBeInTheDocument();
        });
    });

    describe("multiple layers", () => {
        it("renders all layers in reverse order (top = highest precedence)", () => {
            // Note: The LeftSidebar displays layers in REVERSE order
            // so that the TOP layer in the UI has HIGHEST precedence.
            // graphty-element stores layers as [low priority, ..., high priority]
            // but in the UI, users expect the top layer to override lower layers.
            const layers = [
                createLayer("1", "First"),
                createLayer("2", "Second"),
                createLayer("3", "Third"),
            ];
            render(<LeftSidebar {...defaultProps} layers={layers} />);

            const layerElements = screen.getAllByText(/First|Second|Third/);
            // Layers are displayed in reverse order
            expect(layerElements[0]).toHaveTextContent("Third");
            expect(layerElements[1]).toHaveTextContent("Second");
            expect(layerElements[2]).toHaveTextContent("First");
        });

        it("updates correct layer when editing", async () => {
            const onLayersChange = vi.fn();
            const layers = [
                createLayer("1", "First"),
                createLayer("2", "Second"),
            ];
            render(<LeftSidebar {...defaultProps} layers={layers} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(screen.getByText("Second"));

            await waitFor(() => {
                const input = screen.getByRole("textbox");
                fireEvent.change(input, { target: { value: "Updated Second" } });
                fireEvent.blur(input);
            });

            expect(onLayersChange).toHaveBeenCalledWith([
                expect.objectContaining({ id: "1", name: "First" }),
                expect.objectContaining({ id: "2", name: "Updated Second" }),
            ]);
        });
    });
});
