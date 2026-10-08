import cytoscape from "cytoscape";
import { beforeAll, describe, expect, it, vi } from "vitest";

import graphtyCytoscape from "../src/index";

// Records the options each wrapped @graphty/algorithms function receives, so the test sees what this package passes
// rather than what the library does with it.
const seen: Record<string, unknown> = {};
vi.mock("@graphty/algorithms", async (importOriginal) => {
    const real = await importOriginal<Record<string, unknown>>();
    const wrap =
        (name: string) =>
        (...args: unknown[]): unknown => {
            seen[name] = args.at(-1);
            return (real[name] as (...a: unknown[]) => unknown)(...args);
        };
    return { ...real, pageRank: wrap("pageRank"), katzCentrality: wrap("katzCentrality") };
});

beforeAll(() => {
    cytoscape.use(graphtyCytoscape);
});

const cy = (): cytoscape.Core =>
    cytoscape({
        headless: true,
        elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { id: "ab", source: "a", target: "b" } }],
    });

describe("the package's own defaults", () => {
    it("are passed explicitly, so a library default change does not reach the caller", () => {
        cy().graphtyPageRank();
        expect(seen.pageRank).toMatchObject({
            dampingFactor: 0.85,
            maxIterations: 100,
            tolerance: 1e-6,
            weighted: false,
        });
        cy().graphtyKatzCentrality();
        expect(seen.katzCentrality).toMatchObject({ alpha: 0.1, beta: 1, maxIterations: 100, tolerance: 1e-6 });
    });

    it("yield to the caller's option, and an undefined option keeps the default", () => {
        cy().graphtyPageRank({ dampingFactor: 0.5, tolerance: undefined });
        expect(seen.pageRank).toMatchObject({ dampingFactor: 0.5, tolerance: 1e-6 });
    });
});
