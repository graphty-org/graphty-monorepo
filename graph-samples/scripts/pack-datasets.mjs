#!/usr/bin/env node
/**
 * Pack the small datasets (the ones converted into the repository, data/<name>.ts) into the files
 * graphty.app serves, the same form as the large ones scripts/build-hosted.mjs builds:
 *
 *     node scripts/pack-datasets.mjs           (the last step of npm run build:all)
 *     node scripts/pack-datasets.mjs --write   (npm run datasets:pack) also rewrites src/datasets/packed.ts
 *
 * Writes, offline and deterministically for a Node.js major version:
 *
 *   dist/data/v1/<name>.gsnp.gz   the snapshot's wire bytes (snapshot.toBytes()), gzipped
 *   dist/data/v1/<name>.webp      its picture, copied from thumbnails/ (tools/render-sample-thumbnails.mjs), and
 *                                 every other picture there: the large datasets' and the generators'
 *   dist/data/v1/index.json       these datasets' metadata, URL, size, checksum and picture
 *   src/datasets/packed.ts        (with --write) each file's size and SHA-256, for DATASETS (committed)
 *
 * dist/data/ is not published to npm (package.json "files"): deploy-pages.yml publishes it on
 * graphty.app through scripts/build-hosted.mjs, and the tests and Storybooks of the monorepo read it
 * instead of the network. Run it after tsc (needs graph-format/dist).
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { runnerImport } from "vite";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// graph-format's tsc output, not its bundle: the bundle stamps the commit it was built from into every file's
// manifest (`producer`), which would change each file's checksum with every commit; the tsc output writes
// "@graphty/graph-format@dev", so a file changes only when its data or the wire format does
const { fromEdgeArrays } = await import(
    pathToFileURL(path.resolve(packageRoot, "../graph-format/dist/src/index.js")).href
);
const outDir = path.join(packageRoot, "dist/data/v1");
const BASE_URL = "https://graphty.app/data/graph-samples/v1/";

/**
 * A TypeScript module of this package, loaded through Vite.
 * @param {string} file - relative to the package root
 * @returns {Promise<any>} the module
 */
async function load(file) {
    const { module } = await runnerImport(path.join(packageRoot, file), { configFile: false, logLevel: "error" });
    return module;
}

const names = new Set(
    readdirSync(path.join(packageRoot, "data"))
        .filter((file) => file.endsWith(".ts") && file !== "build.ts")
        .map((file) => file.slice(0, -3)),
);
const { buildDataset } = await load("data/build.ts");
const { DATASETS } = await load("src/datasets/catalog.ts");
const metas = DATASETS.filter((meta) => names.has(meta.name));
if (metas.length !== names.size) {
    throw new Error(`data/ holds ${names.size} datasets, the catalogue lists ${metas.length} of them`);
}

mkdirSync(outDir, { recursive: true });
const packed = [];
for (const meta of metas) {
    const { DATA } = await load(`data/${meta.name}.ts`);
    const gz = gzipSync(fromEdgeArrays(buildDataset(DATA)).toBytes(), { level: 9 });
    writeFileSync(path.join(outDir, `${meta.name}.gsnp.gz`), gz);
    // The picture tools/render-sample-thumbnails.mjs drew of it, published beside it.
    const picture = path.join(packageRoot, "thumbnails", `${meta.name}.webp`);
    const thumbnail = existsSync(picture) ? `${meta.name}.webp` : undefined;
    if (thumbnail !== undefined) {
        copyFileSync(picture, path.join(outDir, thumbnail));
    }
    packed.push({ ...meta, bytes: gz.length, sha256: createHash("sha256").update(gz).digest("hex"), thumbnail });
}
// The pictures of the large datasets and the generators, served beside the small datasets' files.
for (const file of readdirSync(path.join(packageRoot, "thumbnails"))) {
    copyFileSync(path.join(packageRoot, "thumbnails", file), path.join(outDir, file));
}
const index = packed.map((meta) => ({ ...meta, url: BASE_URL + meta.name + ".gsnp.gz" }));
// every non-ASCII character escaped, so the file stays plain ASCII
const json = JSON.stringify(index, null, 2).replaceAll(
    /[\u0080-\uffff]/g,
    (c) => String.raw`\u` + c.codePointAt(0).toString(16).padStart(4, "0"),
);
writeFileSync(path.join(outDir, "index.json"), json + "\n");
console.log(`packed ${packed.length} datasets into dist/data/v1/`);

if (process.argv.includes("--write")) {
    const file = path.join(packageRoot, "src/datasets/packed.ts");
    const entries = packed.map(
        (meta) =>
            `    "${meta.name}": { bytes: ${meta.bytes}, sha256: "${meta.sha256}"` +
            (meta.thumbnail === undefined ? "" : `, thumbnail: "${meta.thumbnail}"`) +
            " },",
    );
    writeFileSync(
        file,
        [
            "// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT graph-samples/scripts/pack-datasets.mjs",
            "",
            "/**",
            " * The size and SHA-256 of each small dataset's .gsnp.gz file on graphty.app (dist/data/v1/), and the",
            " * file name of its picture beside it when it has one, by name.",
            " */",
            "export const PACKED: Readonly<",
            "    Record<string, { readonly bytes: number; readonly sha256: string; readonly thumbnail?: string }>",
            "> = {",
            ...entries,
            "};",
            "",
        ].join("\n"),
    );
    const prettier = path.resolve(packageRoot, "../node_modules/.bin/prettier");
    if (existsSync(prettier)) {
        execFileSync(prettier, ["--write", file], { cwd: packageRoot, stdio: "ignore" });
    }
    console.log("rewrote src/datasets/packed.ts");
}
