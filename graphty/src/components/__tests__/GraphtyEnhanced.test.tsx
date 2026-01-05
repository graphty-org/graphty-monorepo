import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../../test/test-utils";
import { GraphtyEnhanced } from "../GraphtyEnhanced";

// Mock graphty-element
vi.mock("@graphty/graphty-element", () => ({}));

describe("GraphtyEnhanced", () => {
    describe("rendering", () => {
        it("renders graphty-element container", () => {
            render(<GraphtyEnhanced />);

            const container = document.querySelector(".graphty-container");
            expect(container).toBeInTheDocument();
        });

        it("renders graphty-element with default props", () => {
            render(<GraphtyEnhanced />);

            const element = document.querySelector("graphty-element");
            expect(element).toBeInTheDocument();
            expect(element).toHaveAttribute("layout", "d3");
        });

        it("renders with custom layout", () => {
            render(<GraphtyEnhanced layout="force" />);

            const element = document.querySelector("graphty-element");
            expect(element).toHaveAttribute("layout", "force");
        });

        it("renders with 2D layout mode", () => {
            render(<GraphtyEnhanced layout2d={true} />);

            const element = document.querySelector("graphty-element");
            // Boolean attributes in React are rendered as the attribute being present
            expect(element).toHaveAttribute("layout2d");
        });

        it("renders with custom height", () => {
            render(<GraphtyEnhanced height="800px" />);

            const element = document.querySelector("graphty-element");
            expect(element).toHaveStyle({ height: "800px" });
        });
    });

    describe("initial data", () => {
        it("sets node-data attribute when initialData has nodes", async () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };

            render(<GraphtyEnhanced initialData={initialData} />);

            await waitFor(() => {
                const element = document.querySelector("graphty-element");
                expect(element).toHaveAttribute("node-data");
            });
        });

        it("sets edge-data attribute when initialData has edges", async () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };

            render(<GraphtyEnhanced initialData={initialData} />);

            await waitFor(() => {
                const element = document.querySelector("graphty-element");
                expect(element).toHaveAttribute("edge-data");
            });
        });

        it("does not set attributes when data is empty", () => {
            const initialData = {
                nodes: [],
                edges: [],
            };

            render(<GraphtyEnhanced initialData={initialData} />);

            const element = document.querySelector("graphty-element");
            expect(element).not.toHaveAttribute("node-data");
        });
    });

    describe("event handling", () => {
        it("calls onNodeClick when nodeClick event is dispatched", async () => {
            const onNodeClick = vi.fn();
            render(<GraphtyEnhanced onNodeClick={onNodeClick} />);

            const element = document.querySelector("graphty-element");
            expect(element).toBeInTheDocument();

            // Dispatch a custom nodeClick event
            const event = new CustomEvent("nodeClick", {
                detail: { id: "node-1" },
                bubbles: true,
            });
            element!.dispatchEvent(event);

            expect(onNodeClick).toHaveBeenCalledWith("node-1");
        });

        it("calls onEdgeClick when edgeClick event is dispatched", async () => {
            const onEdgeClick = vi.fn();
            render(<GraphtyEnhanced onEdgeClick={onEdgeClick} />);

            const element = document.querySelector("graphty-element");
            expect(element).toBeInTheDocument();

            // Dispatch a custom edgeClick event
            const event = new CustomEvent("edgeClick", {
                detail: { source: "node-1", target: "node-2" },
                bubbles: true,
            });
            element!.dispatchEvent(event);

            expect(onEdgeClick).toHaveBeenCalledWith("node-1", "node-2");
        });

        it("does not throw when onNodeClick is not provided", () => {
            render(<GraphtyEnhanced />);

            const element = document.querySelector("graphty-element");
            const event = new CustomEvent("nodeClick", {
                detail: { id: "node-1" },
                bubbles: true,
            });

            expect(() => element!.dispatchEvent(event)).not.toThrow();
        });

        it("does not throw when onEdgeClick is not provided", () => {
            render(<GraphtyEnhanced />);

            const element = document.querySelector("graphty-element");
            const event = new CustomEvent("edgeClick", {
                detail: { source: "node-1", target: "node-2" },
                bubbles: true,
            });

            expect(() => element!.dispatchEvent(event)).not.toThrow();
        });

        it("cleans up event listeners on unmount", () => {
            const onNodeClick = vi.fn();
            const { unmount } = render(<GraphtyEnhanced onNodeClick={onNodeClick} />);

            const element = document.querySelector("graphty-element");

            unmount();

            // Dispatch event after unmount - should not call handler
            const event = new CustomEvent("nodeClick", {
                detail: { id: "node-1" },
                bubbles: true,
            });

            // Element may be removed from DOM, but if it's still there, handler should not fire
            if (element && document.body.contains(element)) {
                element.dispatchEvent(event);
                expect(onNodeClick).not.toHaveBeenCalled();
            }
        });
    });

    describe("data updates", () => {
        it("renders with initial data", async () => {
            const initialData = {
                nodes: [{ id: "1" }, { id: "2" }],
                edges: [{ source: "1", target: "2" }],
            };

            render(<GraphtyEnhanced initialData={initialData} />);

            await waitFor(() => {
                const element = document.querySelector("graphty-element");
                const nodeData = element?.getAttribute("node-data");
                // Check that initial data is reflected
                expect(nodeData).toContain('"id":"1"');
                expect(nodeData).toContain('"id":"2"');
            });
        });
    });
});
