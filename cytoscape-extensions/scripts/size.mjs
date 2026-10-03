#!/usr/bin/env node
/**
 * size.mjs -- what @graphty/cytoscape-extensions costs a browser application, and a budget so it cannot grow
 * silently.
 *
 * Builds small pages with Vite (minified, as an application's production build would be) against dist/, the files a
 * consumer installs, and measures each part minified and gzipped (level 9):
 *   - the main entry: what `import graphtyCytoscape from "@graphty/cytoscape-extensions"` downloads up front,
 *   - each part it loads on first use: the WebGPU code, the generators, each bundled dataset, the file formats,
 *   - everything together, and the script-tag bundle (dist/cytoscape-extensions.bundle.js), which leaves out the
 *     file formats and the datasets and loads them from dist/cdn/ on first use,
 *   - for comparison, one layout and one algorithm imported straight from @graphty/layout and @graphty/algorithms
 *     (the least a package holding only that layout or algorithm could weigh), and each graph-io format alone.
 * Cytoscape itself is left out: the page already has it.
 *
 * Usage (build the package first):
 *   node scripts/size.mjs            check every part against size-budgets.json; exit 1 when one is over its
 *                                    budget, has none, or the file names a part that no longer exists
 *   node scripts/size.mjs --update   rewrite the budgets from this build (say why in the commit message)
 *   node scripts/size.mjs --compare  also measure cytoscape-fcose, cytoscape-cola and cytoscape-graphml the same
 *                                    way (npm pack, npm install, Vite build); needs the network; prints Markdown
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { build } from "vite";

const pkg = fileURLToPath(new URL("..", import.meta.url));
const budgetFile = join(pkg, "size-budgets.json");
const FORMATS = ["graphml", "gexf", "gml", "dot", "pajek", "csv", "json", "neo4j"];

/**
 * Minified and gzipped byte counts of some code.
 * @param {string[]} codes - the files
 * @returns {{ min: number, gz: number }} the sums
 */
function sizeOf(codes) {
    return codes.reduce(
        (a, c) => ({ min: a.min + Buffer.byteLength(c), gz: a.gz + gzipSync(c, { level: 9 }).length }),
        { min: 0, gz: 0 },
    );
}

/**
 * Builds one page with Vite.
 * @param {string} root - the directory holding the page and the node_modules it resolves from
 * @param {string} code - the page's module
 * @returns {Promise<import("vite").Rollup.OutputChunk[]>} the chunks
 */
async function bundle(root, code) {
    const entry = join(root, `page-${Math.random().toString(36).slice(2)}.js`);
    writeFileSync(entry, code);
    try {
        const out = await build({
            root,
            configFile: false,
            logLevel: "silent",
            build: {
                write: false,
                minify: true,
                rollupOptions: { input: entry, external: ["cytoscape", "jquery"] },
            },
        });
        return (Array.isArray(out) ? out[0] : out).output.filter((o) => o.type === "chunk");
    } finally {
        rmSync(entry, { force: true });
    }
}

/**
 * The size of a page: every chunk it downloads up front (the entry and its static imports).
 * @param {import("vite").Rollup.OutputChunk[]} chunks - the build
 * @returns {{ min: number, gz: number }} the size
 */
function upFront(chunks) {
    const byName = new Map(chunks.map((c) => [c.fileName, c]));
    const seen = new Set();
    const visit = (c) => {
        if (!seen.has(c)) {
            seen.add(c);
            c.imports.forEach((f) => visit(byName.get(f)));
        }
    };
    chunks.filter((c) => c.isEntry).forEach(visit);
    return sizeOf([...seen].map((c) => c.code));
}

/**
 * The budget name of a part the main entry loads on first use.
 * @param {string} id - the chunk's module id
 * @param {string} fileName - the chunk's file name
 * @returns {string} the name
 */
function lazyPartName(id, fileName) {
    if (/gpu-platform/.test(id)) {
        return "WebGPU code (on the first GPU-eligible call)";
    }
    if (/cytoscape-extensions\/dist\/samples\.js$/.test(id)) {
        return "generators (on the first graphtyGenerate or graphtyDataset)";
    }
    if (/cytoscape-extensions\/dist\/io\.js$/.test(id)) {
        return "file formats, all of them (on the first graphtyImport or graphtyExport)";
    }
    const dataset = /datasets\/([^/.]+)/.exec(id);
    return dataset ? `dataset ${dataset[1]}` : `other lazy chunk ${fileName}`;
}

/**
 * Measures the package.
 * @param {boolean} compare - also measure the parts that are only for comparison (not budgeted: they measure other
 *   packages, whose growth reaches this package's budgets through the parts that load them)
 * @returns {Promise<Record<string, { min: number, gz: number }>>} the parts, by name
 */
async function measurePackage(compare) {
    const root = join(pkg, "tmp", `size-${process.pid}`);
    mkdirSync(join(root, "node_modules/@graphty"), { recursive: true });
    symlinkSync(pkg, join(root, "node_modules/@graphty/cytoscape-extensions"), "dir");
    try {
        const parts = {};
        const chunks = await bundle(root, 'import g from "@graphty/cytoscape-extensions";\nconsole.log(g);\n');
        const byName = new Map(chunks.map((c) => [c.fileName, c]));
        const initial = new Set();
        const closure = (c, into, skip) => {
            if (!into.has(c) && !skip.has(c)) {
                into.add(c);
                c.imports.forEach((f) => closure(byName.get(f), into, skip));
            }
        };
        chunks.filter((c) => c.isEntry).forEach((c) => closure(c, initial, new Set()));
        parts["main entry (loaded up front)"] = sizeOf([...initial].map((c) => c.code));
        // each dynamically imported chunk, with what it imports that the page does not already hold
        const lazy = new Map();
        for (const c of chunks) {
            for (const f of c.dynamicImports) {
                const target = byName.get(f);
                const name = lazyPartName(target.facadeModuleId ?? target.fileName, target.fileName);
                if (!lazy.has(name)) {
                    const group = new Set();
                    closure(target, group, initial);
                    lazy.set(name, group);
                }
            }
        }
        for (const [name, group] of [...lazy].sort(([a], [b]) => a.localeCompare(b))) {
            parts[name] = sizeOf([...group].map((c) => c.code));
        }
        parts["everything (every chunk of the build)"] = sizeOf(chunks.map((c) => c.code));
        parts["script-tag bundle (dist/cytoscape-extensions.bundle.js, without the file formats and the datasets)"] =
            sizeOf([readFileSync(join(pkg, "dist/cytoscape-extensions.bundle.js"), "utf8")]);
        if (!compare) {
            return parts;
        }
        // the two halves of the main entry, each alone (they share the snapshot conversion and the GPU dispatch, so
        // the two add up to more than the main entry)
        const dist = (f) => JSON.stringify(join(pkg, "dist", f));
        parts["main entry's layouts alone"] = upFront(
            await bundle(
                root,
                `import { registerLayouts } from ${dist("layouts.js")};\nconsole.log(registerLayouts);\n`,
            ),
        );
        parts["main entry's algorithms alone"] = upFront(
            await bundle(
                root,
                `import { registerAlgorithms } from ${dist("algorithms.js")};\nconsole.log(registerAlgorithms);\n`,
            ),
        );
        parts["the Cytoscape-to-snapshot conversion with one algorithm (toSnapshot + pageRank)"] = upFront(
            await bundle(
                root,
                'import { toSnapshot } from "@graphty/cytoscape-extensions";\nimport { pageRank } from "@graphty/algorithms";\n' +
                    "console.log(toSnapshot, pageRank);\n",
            ),
        );
        parts["one layout alone: forceAtlas2 from @graphty/layout"] = upFront(
            await bundle(root, 'import { forceAtlas2 } from "@graphty/layout";\nconsole.log(forceAtlas2);\n'),
        );
        parts["one algorithm alone: pageRank from @graphty/algorithms"] = upFront(
            await bundle(root, 'import { pageRank } from "@graphty/algorithms";\nconsole.log(pageRank);\n'),
        );
        for (const f of FORMATS) {
            parts[`one format alone: @graphty/graph-io/${f}`] = upFront(
                await bundle(root, `import * as m from "@graphty/graph-io/${f}";\nconsole.log(m);\n`),
            );
        }
        return parts;
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

/**
 * Measures the comparison packages: npm pack, install with their dependencies, build a page importing each.
 * @returns {Promise<Record<string, { min: number, gz: number }>>} the sizes, by package
 */
async function measureOthers() {
    const dir = mkdtempSync(join(tmpdir(), "cytoscape-extensions-size-"));
    try {
        const names = ["cytoscape-fcose", "cytoscape-cola", "cytoscape-graphml"];
        writeFileSync(join(dir, "package.json"), '{ "name": "size-compare", "private": true }\n');
        const tgz = names.map((n) =>
            execFileSync("npm", ["pack", n, "--silent"], { cwd: dir, encoding: "utf8" }).trim().split("\n").pop(),
        );
        execFileSync("npm", ["install", "--no-save", "--ignore-scripts", "--no-audit", "--no-fund", ...tgz], {
            cwd: dir,
            stdio: "ignore",
        });
        const out = {};
        for (const n of names) {
            const version = JSON.parse(readFileSync(join(dir, "node_modules", n, "package.json"), "utf8")).version;
            out[`${n} ${version}`] = upFront(await bundle(dir, `import x from "${n}";\nconsole.log(x);\n`));
        }
        return out;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

const kb = (n) => `${(n / 1024).toFixed(1)} KiB`;
const compare = process.argv.includes("--compare");
const parts = await measurePackage(compare);

if (compare) {
    const others = await measureOthers();
    console.log("| What | Minified | Gzipped |\n| --- | ---: | ---: |");
    for (const [name, s] of Object.entries({ ...parts, ...others })) {
        console.log(`| ${name} | ${kb(s.min)} | ${kb(s.gz)} |`);
    }
    process.exit(0);
}

const budgets = JSON.parse(readFileSync(budgetFile, "utf8"));
if (process.argv.includes("--update")) {
    const factor = 1 + budgets.headroomPercent / 100;
    budgets.parts = Object.fromEntries(
        Object.entries(parts).map(([k, { gz }]) => [
            k,
            Math.ceil(Math.max(gz * factor, gz + budgets.minimumHeadroomBytes)),
        ]),
    );
    writeFileSync(budgetFile, `${JSON.stringify(budgets, null, 4)}\n`);
    console.log(`Rewrote size-budgets.json with ${budgets.headroomPercent}% headroom.`);
    process.exit(0);
}

let failed = 0;
for (const [name, { min, gz }] of Object.entries(parts)) {
    const budget = budgets.parts[name];
    if (budget === undefined) {
        failed++;
        console.error(`${name}: ${kb(gz)} gzip, but size-budgets.json has no budget for it`);
    } else if (gz > budget) {
        failed++;
        console.error(`${name}: ${kb(gz)} gzip is ${kb(gz - budget)} over its budget of ${kb(budget)}`);
    } else {
        console.log(`${name}: ${kb(min)} minified, ${kb(gz)} gzip, budget ${kb(budget)}`);
    }
}
for (const name of Object.keys(budgets.parts)) {
    if (!(name in parts)) {
        failed++;
        console.error(`${name}: size-budgets.json has a budget for a part this build no longer has`);
    }
}
if (failed > 0) {
    console.error(
        `\n${failed} size problem(s). If the growth is intended, run \`node scripts/size.mjs --update\` in ` +
            "cytoscape-extensions/ and commit size-budgets.json, saying why in the commit message.",
    );
    process.exit(1);
}
