/**
 * What a browser application's bundler makes of the published package: a Vite build of a page that imports the
 * main entry and nothing else. @graphty/webgpu-graph-algorithms must land in a chunk of its own that the page loads
 * only when a GPU-eligible call runs, and the Node build (with its `import("webgpu")`) must not be bundled at all.
 *
 * Builds against dist/, the files a consumer installs, so the package must be built first (the pre-push gate and
 * CI do).
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build, type Rollup } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const pkg = fileURLToPath(new URL("..", import.meta.url));
let dir = "";
let chunks: Rollup.OutputChunk[] = [];

beforeAll(async () => {
    expect(existsSync(join(pkg, "dist/gpu.js")), "build the package first (npm run build)").toBe(true);
    dir = mkdtempSync(join(tmpdir(), "cytoscape-extensions-bundle-"));
    mkdirSync(join(dir, "node_modules/@graphty"), { recursive: true });
    symlinkSync(pkg, join(dir, "node_modules/@graphty/cytoscape-extensions"), "dir");
    writeFileSync(
        join(dir, "main.js"),
        'import graphtyCytoscape from "@graphty/cytoscape-extensions";\nconsole.log(graphtyCytoscape);\n',
    );
    const out = (await build({
        root: dir,
        configFile: false,
        logLevel: "silent",
        build: { write: false, minify: false, rollupOptions: { input: join(dir, "main.js") } },
    })) as Rollup.RollupOutput;
    chunks = out.output.filter((o): o is Rollup.OutputChunk => o.type === "chunk");
}, 120_000);

afterAll(() => {
    if (dir !== "") {
        rmSync(dir, { recursive: true, force: true });
    }
});

describe("a browser bundle", () => {
    it("keeps the GPU package out of the main chunk and loads it with a dynamic import", () => {
        const main = chunks.filter((c) => c.isEntry);
        expect(main).toHaveLength(1);
        expect(main[0].code).not.toMatch(/probeBrowserWebGpu|createAccelerator|verifyDevice/);
        expect(main[0].dynamicImports.length).toBeGreaterThan(0);
        const gpu = chunks.filter((c) => !c.isEntry && /function probeBrowserWebGpu\b/.test(c.code));
        expect(gpu).toHaveLength(1);
        expect(main[0].dynamicImports).toContain(gpu[0].fileName);
    });

    it("never bundles the Node build", () => {
        for (const c of chunks) {
            expect(c.code, c.fileName).not.toMatch(/import\(["']webgpu["']\)|probeNodeWebGpu/);
        }
    });
});
