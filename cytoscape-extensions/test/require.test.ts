/**
 * The package ships ESM only, because every package it loads at run time (@graphty/algorithms, layout,
 * graph-format, graph-io, graph-samples, webgpu-graph-algorithms) does: a CommonJS build would still have to load
 * them as modules. CommonJS code on a Node that can require() an ES module (20.19 and later, 22.12 and later) loads
 * it with a plain require(); this runs that in a child process against dist/, as an application installs it.
 *
 * Builds against dist/, so the package must be built first (the pre-push gate and CI do).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pkg = fileURLToPath(new URL("..", import.meta.url));
const canRequireEsm = (process.features as { require_module?: boolean }).require_module === true;

describe.runIf(canRequireEsm)("require() from CommonJS", () => {
    it("loads the extension and registers it", () => {
        expect(existsSync(join(pkg, "dist/index.js")), "build the package first (npm run build)").toBe(true);
        const dir = mkdtempSync(join(tmpdir(), "cytoscape-extensions-require-"));
        try {
            mkdirSync(join(dir, "node_modules/@graphty"), { recursive: true });
            symlinkSync(pkg, join(dir, "node_modules/@graphty/cytoscape-extensions"), "dir");
            const cy = process.env.CYTOSCAPE_DIR ?? realpathSync(join(pkg, "node_modules/cytoscape"));
            symlinkSync(cy, join(dir, "node_modules/cytoscape"), "dir");
            const script = [
                'const cytoscape = require("cytoscape");',
                'const graphtyCytoscape = require("@graphty/cytoscape-extensions").default;',
                "cytoscape.use(graphtyCytoscape);",
                'const cy = cytoscape({ headless: true, elements: [{ data: { id: "a" } }, { data: { id: "b" } },',
                '    { data: { source: "a", target: "b" } }] });',
                'process.stdout.write(String(cy.elements().graphtyPageRank().rank("#a")));',
            ].join("\n");
            const out = execFileSync(process.execPath, ["--input-type=commonjs", "-e", script], {
                cwd: dir,
                encoding: "utf8",
            });
            expect(Number(out)).toBeCloseTo(0.5);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }, 60_000);
});
