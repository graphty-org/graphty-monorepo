import { describe, expect, it } from "vitest";

import { render } from "../../../test/test-utils";
import { DataGrid } from "../DataGrid";

// Performance thresholds - browser tests in CI have significant overhead
// Using lenient thresholds to avoid flaky tests while still catching major regressions
// These thresholds are intentionally high to account for:
// - CI resource variability (shared runners)
// - Browser test overhead (Playwright + chromium startup)
// - React rendering in test environment
const LARGE_DATASET_THRESHOLD = 5000; // 5 seconds for 1000 items
const NESTED_OBJECT_THRESHOLD = 2000; // 2 seconds for nested objects

describe("Performance", () => {
    it("renders 1000 items in under 5 seconds", () => {
        const data = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            value: i * 100,
        }));
        const start = performance.now();
        render(<DataGrid data={data} />);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(LARGE_DATASET_THRESHOLD);
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
        expect(elapsed).toBeLessThan(NESTED_OBJECT_THRESHOLD);
    });

    it("handles large array with complex objects", () => {
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

        const start = performance.now();
        render(<DataGrid data={data} defaultExpandDepth={1} />);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(LARGE_DATASET_THRESHOLD);
    });
});
