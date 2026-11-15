#!/usr/bin/env node
// Checks that a live site serves a build (design/ci/channels-pipeline/migration.md, step 8): used on
// graphty-site before the custom domains move, and on canary, nightly and graphty.app after.
//
//   node tools/check-site.mjs <site-url> <build-dir> [--commit <sha>]
//
// - every file of <build-dir> answers 200 with the same sha256, except site.json (each site writes its
//   own) and the hosted datasets, which production overlays (tools/dataset-overlay.mjs): a .gsnp.gz must
//   gunzip to the same bytes, and data/graph-samples/v1/index.json must still list every entry of the build's
//   (it may list more);
// - every dataset and thumbnail the served index.json lists answers 200;
// - the build stamp of / (<meta name="graphty-build" content="commit=<sha> release=<tag>">) names the
//   commit: --commit, else the one stamped into <build-dir>/index.html.
//
// <site-url> must be https://, except for a server on this machine (the tests). Exits 1 naming every
// problem.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const DATA = "data/graph-samples/v1/";
const CONCURRENCY = 16;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * The commit a page's build stamp names.
 * @param html - the page
 * @returns the commit, or null without a stamp
 */
export function stampCommit(html) {
    return /<meta name="graphty-build" content="[^"]*\bcommit=([0-9a-f]{7,40})\b/.exec(html)?.[1] ?? null;
}

function listFiles(dir) {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((d) => d.isFile())
        .map((d) => relative(dir, join(d.parentPath, d.name)).split(sep).join("/"))
        .sort();
}

async function get(base, path) {
    const res = await fetch(new URL(path, base));
    return { status: res.status, bytes: Buffer.from(await res.arrayBuffer()) };
}

async function pool(items, fn) {
    let next = 0;
    const work = async () => {
        while (next < items.length) await fn(items[next++]);
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, work));
}

/**
 * Checks the site at siteUrl against buildDir.
 * @param siteUrl - the site, https://
 * @param buildDir - the build it should serve
 * @param options - commit: the commit the stamp must name (default: the build's own stamp)
 * @param options.commit - the expected commit
 * @returns the problems found, and checked: the number of requests made
 */
export async function checkSite(siteUrl, buildDir, options = {}) {
    const { commit } = options;
    const base = new URL(siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`);
    const local = base.hostname === "localhost" || base.hostname === "127.0.0.1";
    if (base.protocol !== "https:" && !local) return { problems: [`${siteUrl} is not https`], checked: 0 };
    const problems = [];
    let checked = 0;
    const files = listFiles(buildDir);
    let servedIndex = null;

    await pool(files, async (file) => {
        const { status, bytes } = await get(base, file);
        checked++;
        if (status !== 200) return problems.push(`${file}: ${status}`);
        if (file === "site.json") return;
        const built = readFileSync(join(buildDir, file));
        if (file === `${DATA}index.json`) {
            servedIndex = JSON.parse(bytes.toString("utf8"));
            const names = new Set(servedIndex.map((e) => e.name));
            for (const e of JSON.parse(built.toString("utf8"))) {
                if (!names.has(e.name)) problems.push(`${file}: does not list dataset ${e.name}`);
            }
        } else if (file.startsWith(DATA) && file.endsWith(".gsnp.gz")) {
            if (sha(gunzipSync(bytes)) !== sha(gunzipSync(built))) problems.push(`${file}: different snapshot`);
        } else if (sha(bytes) !== sha(built)) {
            problems.push(`${file}: sha256 differs from the build's`);
        }
    });

    // every dataset production serves, the ones only earlier builds had included
    const extra = (servedIndex ?? [])
        .flatMap((e) => [
            e.url ? new URL(e.url).pathname.slice(1) : `${DATA}${e.name}.gsnp.gz`,
            e.thumbnail && DATA + e.thumbnail,
        ])
        .filter((p) => p && !files.includes(p));
    await pool(extra, async (path) => {
        const { status } = await get(base, path);
        checked++;
        if (status !== 200) problems.push(`${path}: ${status}`);
    });

    const want = commit ?? stampCommit(readFileSync(join(buildDir, "index.html"), "utf8"));
    const { bytes } = await get(base, "");
    checked++;
    const got = stampCommit(bytes.toString("utf8"));
    if (!want) problems.push(`no commit to compare: pass --commit or stamp ${buildDir}/index.html`);
    else if (got !== want) problems.push(`build stamp of ${base.href} names ${got ?? "no commit"}, expected ${want}`);

    return { problems: problems.sort(), checked };
}

async function main(argv) {
    const i = argv.indexOf("--commit");
    const commit = i >= 0 ? argv.splice(i, 2)[1] : undefined;
    const [siteUrl, buildDir] = argv;
    if (!siteUrl || !buildDir) {
        console.error("usage: check-site.mjs <site-url> <build-dir> [--commit <sha>]");
        return 2;
    }
    const { problems, checked } = await checkSite(siteUrl, buildDir, { commit });
    for (const p of problems) console.error(p);
    console.log(`${siteUrl}: ${checked} requests, ${problems.length} problems`);
    return problems.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    process.exitCode = await main(process.argv.slice(2));
}
