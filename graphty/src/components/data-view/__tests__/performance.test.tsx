import { describe, expect, it } from "vitest";

import { render } from "../../../test/test-utils";
import { DataGrid } from "../DataGrid";

// CI runners can be slower than local machines, so use a more lenient threshold
// Check for CI environment in a browser-safe way
const isCI =
    typeof import.meta.env?.CI === "string" ||
    (typeof globalThis !== "undefined" &&
        "process" in globalThis &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).process?.env?.CI);
const PERFORMANCE_THRESHOLD = isCI ? 3000 : 1000;

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
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD);
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
        // CI gets more lenient threshold
        expect(elapsed).toBeLessThan(isCI ? 1500 : 500);
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
        expect(elapsed).toBeLessThan(PERFORMANCE_THRESHOLD);
    });
});
