import { describe, expect, it } from "vitest";

import { render } from "../../../test/test-utils";
import { DataGrid } from "../DataGrid";

describe("Performance", () => {
    it("renders 1000 items in under 1 second", () => {
        const data = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            value: i * 100,
        }));
        const start = performance.now();
        render(<DataGrid data={data} />);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(1000);
    });

    it("renders deeply nested objects efficiently", () => {
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
        const start = performance.now();
        render(<DataGrid data={data} defaultExpandDepth={2} />);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(500);
    });

    it("handles large array with complex objects", () => {
        const data = Array.from({ length: 500 }, (_, i) => ({
            id: `node-${i}`,
            label: `Node ${i}`,
            attributes: {
                x: Math.random() * 1000,
                y: Math.random() * 1000,
                metadata: {
                    created: new Date().toISOString(),
                    tags: ["tag1", "tag2", "tag3"],
                },
            },
        }));

        const start = performance.now();
        render(<DataGrid data={data} defaultExpandDepth={1} />);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(1000);
    });
});
