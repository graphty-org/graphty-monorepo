import { GraphFormatError } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { TOO_MANY_EMPTY_CELLS_CODE } from "../../src/common/cell-budget.js";
import { importAllGraphs, importGraph } from "../../src/index.js";
import { ImportError } from "../../src/types.js";

/** n nodes, node k carrying only the attribute `k<k>`: n values, n x n slots. */
const sparseDot = (n: number): string =>
    `graph { ${Array.from({ length: n }, (_, i) => `n${i} [k${i}=1]`).join("\n")} }`;
const sparseJson = (n: number): string =>
    JSON.stringify({ nodes: Array.from({ length: n }, (_, i) => ({ id: `n${i}`, [`k${i}`]: 1 })), links: [] });
const sparseGraphml = (n: number): string =>
    `<graphml>${Array.from({ length: n }, (_, i) => `<key id="k${i}" for="node" attr.name="k${i}" attr.type="double"/>`).join("")}` +
    `<graph edgedefault="undirected">${Array.from({ length: n }, (_, i) => `<node id="n${i}"><data key="k${i}">1</data></node>`).join("")}</graph></graphml>`;
/** Edges, each with its own attribute. */
const sparseEdgesDot = (n: number): string =>
    `digraph { ${Array.from({ length: n }, (_, i) => `a -> b [e${i}=1]`).join("\n")} }`;

const stopped = async (run: Promise<unknown>): Promise<ImportError> => {
    const err = await run.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ImportError);
    const e = err as ImportError;
    expect(e.details?.code).toBe(TOO_MANY_EMPTY_CELLS_CODE);
    expect(e.message).toMatch(/maxEmptyCells/);
    expect(e.report.issues.map((i) => i.code)).toEqual([TOO_MANY_EMPTY_CELLS_CODE]);
    return e;
};

describe("the empty-cell limit of importGraph", () => {
    it.each([
        ["dot", sparseDot],
        ["json", sparseJson],
        ["graphml", sparseGraphml],
    ] as const)("stops a %s file whose node attributes are too sparse", async (format, make) => {
        await stopped(importGraph(make(200), { format, maxEmptyCells: 1000 }));
    });

    it("stops sparse edge attributes too", async () => {
        await stopped(importGraph(sparseEdgesDot(200), { format: "dot", maxEmptyCells: 1000 }));
    });

    it("stops a sub-megabyte file under the default limit before it allocates gigabytes", async () => {
        const text = sparseDot(6000);
        expect(text.length).toBeLessThan(100_000);
        await stopped(importGraph(text, { format: "dot" }));
    });

    it("reads the same file when the limit allows it, or with Infinity", async () => {
        for (const maxEmptyCells of [200 * 200, Infinity]) {
            const { snapshot } = await importGraph(sparseDot(200), { format: "dot", maxEmptyCells });
            expect(snapshot.nodeCount).toBe(200);
            expect([...snapshot.nodes].filter((c) => c.meta.name.startsWith("k"))).toHaveLength(200);
        }
    });

    it("never stops a dense file, even with a limit far below its slot count", async () => {
        const n = 2000;
        const dense = `graph { ${Array.from({ length: n }, (_, i) => `n${i} [a=${i}, b=x, c=${i % 2}]`).join("\n")} }`;
        const { snapshot } = await importGraph(dense, { format: "dot", maxEmptyCells: 10 });
        expect(snapshot.nodeCount).toBe(n);
    });

    it("applies to every graph of importAllGraphs", async () => {
        await stopped(importAllGraphs(sparseDot(200), { format: "dot", maxEmptyCells: 1000 }));
    });

    it.each<unknown>([-1, 1.5, "10", Number.NaN])("refuses maxEmptyCells %s", async (maxEmptyCells) => {
        // a JavaScript caller can pass anything
        const options: Record<string, unknown> = { format: "dot", maxEmptyCells };
        await expect(importGraph("graph { a }", options)).rejects.toThrow(GraphFormatError);
    });
});
