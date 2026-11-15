/**
 * @file No browser test fetches Babylon.js's GLSL compilers from cdn.babylonjs.com. graphty-element
 * loads glslang and twgsl (a script and a WebAssembly file each) before it opens a WebGPU engine,
 * and when the CDN does not answer it draws with WebGL instead, so every test that expects WebGPU
 * failed whenever that host had a bad moment (issue #6787). The page's requests for them are
 * answered from a local copy instead.
 *
 * The copy is downloaded once per Babylon.js version into `~/.cache/babylon-shader-compilers/v<version>/`
 * (or `$BABYLON_COMPILERS_DIR`), never into the repository: twgsl (github.com/BabylonJS/twgsl)
 * carries no license. CI restores that directory from its cache and runs this file (`node
 * vitest.babylon-compilers.mjs`) before the tests to fill it on a miss, so a test run never reaches
 * the CDN.
 *
 * `withBabylonCompilers(config)` installs it in every browser project of a vitest config.
 */

import { Buffer } from "node:buffer";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

/**
 * The Babylon.js the tests run, whose CDN build of the compilers they are served. Read from
 * graphty-element's install, which depends on Babylon.js (the root package does not).
 */
const VERSION = JSON.parse(
    await readFile(new URL("graphty-element/node_modules/@babylonjs/core/package.json", import.meta.url), "utf8"),
).version;

/** Where the copy is kept. */
export const COMPILERS_DIR = path.join(
    process.env.BABYLON_COMPILERS_DIR ?? path.join(homedir(), ".cache", "babylon-shader-compilers"),
    `v${VERSION}`,
);

/** Each file, by the path Babylon asks for it under (`glslang/glslang.js`, ...). */
const FILES = ["glslang", "twgsl"].flatMap((name) => [`${name}/${name}.js`, `${name}/${name}.wasm`]);

/** A request for one of them, versioned (`/v8.56.2/glslang/glslang.js`) or not. */
const COMPILER_URL = /^https:\/\/cdn\.babylonjs\.com\/(?:v[^/]+\/)?((glslang|twgsl)\/\2\.(?:js|wasm))$/;

/** The one download of this process, shared by every page that asks. */
let fetched = null;

/**
 * Download one file into the copy, unless it is there. Written aside and renamed, so a shard
 * running beside this one never reads half a file.
 * @param file - Its path, as in {@link FILES}.
 */
async function fetchFile(file) {
    const target = path.join(COMPILERS_DIR, file);
    try {
        await readFile(target);
        return;
    } catch {
        // not there yet
    }
    const url = `https://cdn.babylonjs.com/v${VERSION}/${file}`;
    let failure;
    // ponytail: three tries with a growing pause; this runs before the tests, never inside one.
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await globalThis.fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const body = Buffer.from(await response.arrayBuffer());
            await mkdir(path.dirname(target), { recursive: true });
            const partial = `${target}.${process.pid}.part`;
            await writeFile(partial, body);
            await rename(partial, target);
            return;
        } catch (error) {
            failure = error;
            await sleep(attempt * 2000);
        }
    }
    throw new Error(`could not download ${url} into ${COMPILERS_DIR}: ${failure}`);
}

/**
 * Make sure the copy holds all four files.
 * @returns When it does.
 */
export function fetchBabylonCompilers() {
    fetched ??= Promise.all(FILES.map(fetchFile)).catch((error) => {
        fetched = null;
        throw error;
    });
    return fetched;
}

/** The browser contexts already answered from the copy. */
const served = new WeakSet();

/** The browser commands; typed in vitest.babylon-compilers.d.mts. */
export const babylonCompilerCommands = {
    /**
     * Answer the page's requests for glslang and twgsl from the local copy.
     * @param ctx - The browser command context.
     */
    async serveBabylonCompilers(ctx) {
        if (served.has(ctx.context)) {
            return;
        }
        await fetchBabylonCompilers();
        served.add(ctx.context);
        await ctx.context.route(COMPILER_URL, async (route) => {
            const file = COMPILER_URL.exec(route.request().url())[1];
            await route.fulfill({
                status: 200,
                contentType: file.endsWith(".wasm") ? "application/wasm" : "text/javascript",
                headers: { "access-control-allow-origin": "*" },
                body: await readFile(path.join(COMPILERS_DIR, file)),
            });
        });
    },
};

/** The setup file that calls the command before a test file runs. */
const SETUP = fileURLToPath(new URL("./vitest.babylon-compilers-setup.ts", import.meta.url));

/**
 * Serve the compilers from the local copy in every browser project of a vitest config.
 * @param config - The config.
 * @returns The config, each browser project given the command and the setup file.
 */
export function withBabylonCompilers(config) {
    const projects = config.test?.projects;
    if (!Array.isArray(projects)) {
        return config;
    }
    const serve = (p) =>
        p?.test?.browser?.enabled
            ? {
                  ...p,
                  test: {
                      ...p.test,
                      setupFiles: [SETUP, ...[p.test.setupFiles ?? []].flat()],
                      browser: {
                          ...p.test.browser,
                          commands: { ...p.test.browser.commands, ...babylonCompilerCommands },
                      },
                  },
              }
            : p;
    return { ...config, test: { ...config.test, projects: projects.map(serve) } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await fetchBabylonCompilers();
    process.stdout.write(`Babylon.js ${VERSION} GLSL compilers in ${COMPILERS_DIR}\n`);
}
