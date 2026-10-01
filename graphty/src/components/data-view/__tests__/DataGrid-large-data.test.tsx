import { describe, expect, it } from "vitest";

import { render, screen } from "../../../test/test-utils";
import { DataGrid } from "../DataGrid";

// Render speed is not asserted here: a wall-clock budget measures the machine, not the code.
// These tests check that large and deeply nested inputs render completely.
describe("DataGrid with large data", () => {
    it("renders every one of 1000 items", () => {
        const data = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            value: i * 100,
        }));
        const { container } = render(<DataGrid data={data} />);
        expect(screen.getByText("Item 0")).toBeInTheDocument();
        expect(screen.getByText("Item 999")).toBeInTheDocument();
        // One header row plus one row per item
        expect(container.querySelectorAll("tr")).toHaveLength(1001);
    });

    it("renders deeply nested objects to the requested depth", () => {
        // Create nested structure 10 levels deep
        const createNested = (depth: number): object => {
            if (depth === 0) {
                return { value: "leaf" };
            }

            return {
                level: depth,
                children: createNested(depth - 1),
            };
        };

        const data = createNested(10);
        render(<DataGrid data={data} defaultExpandDepth={2} />);
        // Levels 10 and 9 are expanded, so level 8 is shown collapsed and nothing below it
        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getByText("9")).toBeInTheDocument();
        expect(screen.getByText("8")).toBeInTheDocument();
        expect(screen.queryByText("7")).not.toBeInTheDocument();
        expect(screen.queryByText("leaf")).not.toBeInTheDocument();
    });

    it("renders every one of 500 complex objects", () => {
        const data = Array.from({ length: 500 }, (_, i) => ({
            id: `node-${i}`,
            label: `Node ${i}`,
            attributes: {
                x: i * 1.5, // Deterministic values instead of Math.random()
                y: i * 2.5,
                metadata: {
                    created: "2024-01-15T00:00:00.000Z", // Fixed timestamp
                    tags: ["tag1", "tag2", "tag3"],
                },
            },
        }));

        render(<DataGrid data={data} defaultExpandDepth={1} />);
        expect(screen.getByText("node-0")).toBeInTheDocument();
        expect(screen.getByText("node-499")).toBeInTheDocument();
    });
});
