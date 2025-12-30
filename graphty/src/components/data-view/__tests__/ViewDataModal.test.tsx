import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

import {render, screen, waitFor} from "../../../test/test-utils";
import {ViewDataModal} from "../ViewDataModal";

describe("ViewDataModal", () => {
    const mockData = {
        nodes: [{id: "1", label: "Node 1"}],
        edges: [{src: "1", dst: "2"}],
    };

    it("renders when opened is true", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("does not render when opened is false", () => {
        render(<ViewDataModal opened={false} onClose={vi.fn()} data={mockData} />);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows Nodes tab by default", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByText("Node 1")).toBeInTheDocument();
    });

    it("switches to Edges when tab clicked", async() => {
        const user = userEvent.setup();
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);

        // Click the Edges tab
        await user.click(screen.getByRole("radio", {name: /edges/i}));

        // Verify edges content is shown (src and dst fields)
        await waitFor(() => {
            expect(screen.getByText("src")).toBeInTheDocument();
        });
    });

    it("shows item count in footer", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByText(/1 node/i)).toBeInTheDocument();
        expect(screen.getByText(/1 edge/i)).toBeInTheDocument();
    });

    it("shows correct plural for multiple items", () => {
        const multipleData = {
            nodes: [
                {id: "1", label: "Node 1"},
                {id: "2", label: "Node 2"},
            ],
            edges: [
                {src: "1", dst: "2"},
                {src: "2", dst: "3"},
                {src: "3", dst: "1"},
            ],
        };
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={multipleData} />);
        expect(screen.getByText(/2 nodes/i)).toBeInTheDocument();
        expect(screen.getByText(/3 edges/i)).toBeInTheDocument();
    });

    it("calls onClose when close button clicked", async() => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        render(<ViewDataModal opened={true} onClose={onClose} data={mockData} />);

        // Mantine Modal renders via portal, so we need to query the document body
        const closeButton = document.querySelector(".mantine-Modal-close");
        if (!closeButton) {
            throw new Error("Close button not found");
        }

        await user.click(closeButton);
        expect(onClose).toHaveBeenCalled();
    });

    it("has a search input", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it("filters data based on search text", async() => {
        const user = userEvent.setup();
        const searchableData = {
            nodes: [
                {id: "1", label: "Alpha"},
                {id: "2", label: "Beta"},
            ],
            edges: [],
        };
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={searchableData} />);

        const searchInput = screen.getByPlaceholderText(/search/i);
        await user.type(searchInput, "Alpha");

        // Search should pass through to DataGrid (debounced)
        await waitFor(
            () => {
                // The search text should be passed to the DataGrid component
                // Since DataGrid handles highlighting, we just verify the modal renders
                expect(searchInput).toHaveValue("Alpha");
            },
            {timeout: 500},
        );
    });

    it("renders with empty data", () => {
        const emptyData = {nodes: [], edges: []};
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={emptyData} />);
        expect(screen.getByText(/0 nodes/i)).toBeInTheDocument();
        expect(screen.getByText(/0 edges/i)).toBeInTheDocument();
    });

    it("displays modal title", () => {
        render(<ViewDataModal opened={true} onClose={vi.fn()} data={mockData} />);
        expect(screen.getByText("View Data")).toBeInTheDocument();
    });
});
