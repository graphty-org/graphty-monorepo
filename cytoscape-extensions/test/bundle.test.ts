/**
 * What a browser application's bundler makes of the published package: a Vite build of a page that imports the
 * main entry and nothing else. @graphty/webgpu-graph-algorithms must land in a chunk of its own that the page loads
 * only when a GPU-eligible call runs, and the Node build (with its `import("webgpu")`) must not be bundled at all.
 * The generators and the file parsers load the same way, each on its first use; no dataset's data is in any chunk.
 *
 * Builds against dist/, the files a consumer installs, so the package must be built first (the pre-push gate and
 * CI do).
 */

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import type { InlineConfig, Rollup } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Chunk = Pick<Rollup.OutputChunk, "fileName" | "isEntry" | "code" | "dynamicImports">;

const pkg = fileURLToPath(new URL("..", import.meta.url));
let dir = "";
let chunks: Chunk[] = [];

/**
 * Runs a Vite build in a child process (test/vite-build.mjs), which coverage does not instrument.
 * @param config - the inline Vite config, JSON-serializable
 * @returns the chunks of a build that writes nothing; an empty array otherwise
 */
async function viteBuild(config: InlineConfig): Promise<Chunk[]> {
    const script = fileURLToPath(new URL("vite-build.mjs", import.meta.url));
    const { stdout } = await promisify(execFile)(process.execPath, [script, JSON.stringify(config)], {
        cwd: pkg,
        maxBuffer: 512 * 1024 * 1024,
    });
    return stdout === "" ? [] : (JSON.parse(stdout) as Chunk[]);
}

beforeAll(async () => {
    expect(existsSync(join(pkg, "dist/gpu.js")), "build the package first (npm run build)").toBe(true);
    dir = mkdtempSync(join(tmpdir(), "cytoscape-extensions-bundle-"));
    mkdirSync(join(dir, "node_modules/@graphty"), { recursive: true });
    symlinkSync(pkg, join(dir, "node_modules/@graphty/cytoscape-extensions"), "dir");
    writeFileSync(
        join(dir, "main.js"),
        'import graphtyCytoscape from "@graphty/cytoscape-extensions";\nconsole.log(graphtyCytoscape);\n',
    );
    chunks = await viteBuild({
        root: dir,
        configFile: false,
        logLevel: "silent",
        build: { write: false, minify: false, rollupOptions: { input: join(dir, "main.js") } },
    });
});

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

    it("loads the generators and the file formats only when asked, and bundles no dataset's data", () => {
        const [main] = chunks.filter((c) => c.isEntry);
        expect(main.code).not.toMatch(/function barabasiAlbertGraph\b|function fetchDataset\b|graphmlImporter/);
        const owner = (re: RegExp): Chunk[] => chunks.filter((c) => !c.isEntry && re.test(c.code));
        expect(owner(/function barabasiAlbertGraph\b/)).toHaveLength(1);
        expect(owner(/function fetchDataset\b/)).toHaveLength(1);
        expect(owner(/graphmlImporter/).length).toBeGreaterThan(0);
        // karate's first edges as the data files recorded them; no chunk holds a dataset's edge list
        expect(owner(/function buildDataset\b|edges:\s*\[\s*0,\s*1,\s*0,\s*2,\s*0,\s*3/)).toEqual([]);
    });

    it("never bundles the Node build", () => {
        for (const c of chunks) {
            expect(c.code, c.fileName).not.toMatch(/import\(["']webgpu["']\)|probeNodeWebGpu/);
        }
    });
});

/**
 * Runs a built page under Node, as a module whose top-level await Node reports when it never settles.
 * @param file - the built entry
 * @param page - which part of the page to run
 * @returns the exit code and everything printed
 */
function runPage(file: string, page: string): Promise<{ code: number; out: string }> {
    return new Promise((resolve) => {
        const offline = fileURLToPath(new URL("setup/local-datasets.mjs", import.meta.url));
        execFile(process.execPath, ["--import", offline, file, page], { timeout: 60_000 }, (error, stdout, stderr) => {
            resolve({ code: typeof error?.code === "number" ? error.code : 0, out: stdout + stderr });
        });
    });
}

describe("a Vite production build whose entry module awaits a loading method at its top level", () => {
    // The entry chunk holds the page and the package; the lazy chunks import @graphty/graph-format from it, so they
    // cannot run until the page's await settles. Node, unlike a browser, reports the stuck await and exits with 13.
    let entry = "";

    beforeAll(async () => {
        const page = mkdtempSync(join(tmpdir(), "cytoscape-extensions-tla-"));
        mkdirSync(join(page, "node_modules/@graphty"), { recursive: true });
        symlinkSync(pkg, join(page, "node_modules/@graphty/cytoscape-extensions"), "dir");
        symlinkSync(realpathSync(join(pkg, "node_modules/cytoscape")), join(page, "node_modules/cytoscape"), "dir");
        writeFileSync(
            join(page, "main.js"),
            [
                'import cytoscape from "cytoscape";',
                'import graphtyCytoscape from "@graphty/cytoscape-extensions";',
                "cytoscape.use(graphtyCytoscape);",
                "const cy = cytoscape({ headless: true });",
                // read at run time (Vite rewrites process.env)
                "const page = globalThis.process.argv[2];",
                'if (page === "dataset") {',
                '    await cy.graphtyDataset("karate");',
                '} else if (page === "async") {',
                '    cy.add([{ data: { id: "a" } }, { data: { id: "b" } }, { data: { source: "a", target: "b" } }]);',
                "    await cy.graphtyPageRankAsync();",
                "} else {",
                // one string: console.log colors a number argument when the runner sets FORCE_COLOR, as CI does
                '    void cy.graphtyDataset("karate").then(() => console.log("nodes " + cy.nodes().length));',
                "}",
                "",
            ].join("\n"),
        );
        await viteBuild({
            root: page,
            configFile: false,
            logLevel: "silent",
            build: {
                outDir: join(page, "out"),
                minify: false,
                // the preload helper reads document; Node has none
                modulePreload: false,
                rollupOptions: {
                    input: join(page, "main.js"),
                    output: { entryFileNames: "[name].mjs", chunkFileNames: "[name]-[hash].mjs" },
                },
            },
        });
        entry = join(page, "out/main.mjs");
        return (): void => {
            rmSync(page, { recursive: true, force: true });
        };
    });

    it("warns, naming the method and the fix, instead of stopping with no message", async () => {
        const [dataset, gpu, then] = await Promise.all([
            runPage(entry, "dataset"),
            runPage(entry, "async"),
            runPage(entry, "then"),
        ]);
        expect(dataset.code, dataset.out).toBe(13);
        expect(dataset.out).toContain(
            "graphty: graphtyDataset has waited 5 s for part of @graphty/cytoscape-extensions to load. If a module awaits graphtyDataset at its top level, a Vite 6 or 7 production build never loads it",
        );
        expect(gpu.code, gpu.out).toBe(13);
        expect(gpu.out).toContain("graphty: an ...Async method or a simulation layout has waited 5 s");
        // the same call from .then() loads the dataset
        expect(then.code, then.out).toBe(0);
        expect(then.out).toContain("nodes 34");
        expect(then.out).not.toContain("graphty:");
    });
});
