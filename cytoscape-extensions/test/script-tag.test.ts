/**
 * The script-tag build, dist/cytoscape-extensions.bundle.js, run the way a page with no bundler runs it: as a classic
 * script after Cytoscape's: evaluated in the global scope with no module loader, with Cytoscape as the global
 * `cytoscape`. Node has no `navigator.gpu`, so every run must report the CPU and say why.
 *
 * Reads dist/, so the package must be built first (the pre-push gate and CI do).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import cytoscape from "cytoscape";
import { beforeAll, describe, expect, it } from "vitest";

const file = join(fileURLToPath(new URL("..", import.meta.url)), "dist/cytoscape-extensions.bundle.js");
let code = "";

beforeAll(() => {
    expect(existsSync(file), "build the package first (npm run build)").toBe(true);
    code = readFileSync(file, "utf8");
});

/**
 * Runs the bundle as a classic script: an indirect eval runs in the global scope, as a script tag does.
 * @param withCytoscape - whether the global `cytoscape` exists when the script runs
 * @returns the global `graphtyCytoscape` the script set
 */
function load(withCytoscape: boolean): unknown {
    const scope = globalThis as Record<string, unknown>;
    if (withCytoscape) {
        scope.cytoscape = cytoscape;
    }
    try {
        (0, eval)(code);
        return scope.graphtyCytoscape;
    } finally {
        delete scope.cytoscape;
    }
}

describe("the script-tag bundle", () => {
    it("is one file that loads only the file formats and the datasets later, from dist/cdn/", () => {
        expect(code).not.toMatch(/\bimport\s*\(\s*["'`]|^\s*import\s|^\s*export\s/m);
        // its one dynamic import is the loader, which resolves against the script's own URL
        expect(code.match(/\bimport\(/g)).toHaveLength(1);
        expect(code).toMatch(/import\(new URL\("cdn\/"\+/);
        expect(code).not.toMatch(/graphmlImporter|function karate\(/);
        expect(code).not.toMatch(/probeNodeWebGpu/);
        // the GPU detection is inside it
        expect(code).toMatch(/navigator\.gpu/);
    });

    it("registers onto the global cytoscape it finds", async () => {
        expect(typeof load(true)).toBe("function");
        const cy = cytoscape({
            headless: true,
            elements: [
                { data: { id: "a" } },
                { data: { id: "b" } },
                { data: { id: "c" } },
                { data: { source: "a", target: "b" } },
                { data: { source: "b", target: "c" } },
            ],
        });
        expect(cy.elements().graphtyPageRank().rank("#b")).toBeGreaterThan(0);
        const r = await cy.elements().graphtyPageRankAsync();
        expect(r.backend.ran).toBe("cpu");
        expect(r.backend.reason).not.toBe("");
        cy.layout({ name: "graphty-circular", boundingBox: { x1: 0, y1: 0, w: 100, h: 100 } }).run();
        expect(cy.$("#a").position()).not.toEqual(cy.$("#b").position());
        await cy.graphtyGenerate("grid", { rows: 2, cols: 2 });
        expect(cy.nodes().length).toBe(7);
    });

    it("names the ES module build when it cannot tell where it was loaded from", async () => {
        // the test above registered the bundle onto cytoscape (a second registration only warns)
        const cy = cytoscape({ headless: true });
        // Node has no document.currentScript, as a bundle loaded by eval or a module loader has none
        await expect(cy.graphtyDataset("karate")).rejects.toThrow(/dist\/cdn\/cytoscape-extensions\.js/);
        await expect(cy.graphtyExport("graphml")).rejects.toThrow(/not loaded by a <script src> tag/);
    });

    it("leaves registration to the page when Cytoscape is not loaded yet", () => {
        expect(typeof load(false)).toBe("function");
    });
});
