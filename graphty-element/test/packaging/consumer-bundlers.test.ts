/**
 * @file A consumer who installs graphty-element and nothing else can build its root entry with
 * webpack 5, Vite and esbuild, with no bundler configuration.
 *
 * This builds the PUBLISHED `dist/` (run the package build first), not the source: the defects it
 * guards against are in what the package ships. It lays out a consumer app in the system temp
 * directory, outside this repository, because Node resolution climbs to parent `node_modules` and
 * the monorepo's have every optional peer installed:
 *
 * - `node_modules/@graphty/graphty-element` holds a copy of `package.json` and `dist/` (a copy,
 *   not a link: a link resolves back into this package, whose `node_modules` has the optional
 *   peers as dev dependencies);
 * - every dependency and required peer is linked in beside it;
 * - no optional peer is anywhere it can be found.
 *
 * Two defects it caught:
 *
 * - Babylon.js deep imports without a file extension (`@babylonjs/core/Maths/math.vector`).
 *   `@babylonjs/core` is `"type": "module"`, so webpack 5 requires fully specified paths and
 *   refused every one of them (issue #3219).
 * - A static import of an optional peer (`ai`, `@ai-sdk/*`, `encrypt-storage`,
 *   `@hpcc-js/wasm-graphviz`) inside a lazily loaded chunk. The chunk is lazy at run time, but a
 *   bundler still resolves its static imports at build time, so webpack and esbuild failed to
 *   resolve the package and Vite 8 failed on a named import from its placeholder module (issue
 *   #3278). Each optional peer is reached only as the literal target of an `await import()`
 *   inside `try`, which every one of these bundlers builds when the package is absent.
 */

import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import webpack from "webpack";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface Manifest {
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    peerDependenciesMeta: Record<string, { optional?: boolean }>;
}

const manifest = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as Manifest;
const optionalPeers = Object.keys(manifest.peerDependencies).filter(
    (name) => manifest.peerDependenciesMeta[name]?.optional === true,
);
const installed = [
    ...Object.keys(manifest.dependencies),
    ...Object.keys(manifest.peerDependencies).filter((name) => !optionalPeers.includes(name)),
];

let app = "";
let entry = "";

/**
 * Lay out the consumer app.
 * @returns the app's directory
 */
function makeConsumerApp(): string {
    const dir = mkdtempSync(join(tmpdir(), "graphty-consumer-"));
    const element = join(dir, "node_modules/@graphty/graphty-element");
    mkdirSync(element, { recursive: true });
    cpSync(join(PACKAGE_ROOT, "package.json"), join(element, "package.json"));
    cpSync(join(PACKAGE_ROOT, "dist"), join(element, "dist"), {
        recursive: true,
        filter: (source) => !source.endsWith(".d.ts") && !source.endsWith(".map"),
    });
    for (const name of installed) {
        const link = join(dir, "node_modules", name);
        mkdirSync(dirname(link), { recursive: true });
        symlinkSync(realpathSync(join(PACKAGE_ROOT, "node_modules", name)), link, "dir");
    }
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
    writeFileSync(join(dir, "src/main.js"), 'import "@graphty/graphty-element";\n');
    return dir;
}

/**
 * Build with webpack 5 and its defaults.
 * @returns the build's error messages
 */
async function buildWithWebpack(): Promise<string[]> {
    const compiler = webpack({
        // What is under test is resolution, which every mode does alike; development mode skips the
        // production optimizations that were most of the build's time.
        mode: "development",
        devtool: false,
        context: app,
        entry,
        output: { path: join(app, "out-webpack") },
        // Webpack reads a tsconfig.json beside a linked workspace package and follows its `paths`
        // to the package's TypeScript source. A published package ships no tsconfig.json.
        resolve: { tsconfig: false },
        // Resolving graphty-element's imports of Babylon.js is what is under test, not Babylon.js's
        // own thousands of modules: left unparsed, they are most of the time a build takes.
        module: { noParse: /[\\/]@babylonjs[\\/]/ },
        performance: { hints: false },
        infrastructureLogging: { level: "none" },
    });
    const stats = await new Promise<webpack.Stats | undefined>((done, fail) => {
        compiler.run((error, result) => (error ? fail(error) : done(result)));
    });
    await new Promise((done) => compiler.close(done));
    return (stats?.toJson({ all: false, errors: true }).errors ?? []).map(
        (error) => `${error.moduleName ?? ""}: ${error.message}`,
    );
}

/**
 * Build with Vite and its defaults.
 * @returns the build's error messages
 */
async function buildWithVite(): Promise<string[]> {
    try {
        await viteBuild({
            root: app,
            configFile: false,
            logLevel: "silent",
            build: {
                outDir: join(app, "out-vite"),
                minify: false,
                rollupOptions: { input: entry },
            },
        });
        return [];
    } catch (error) {
        return [String(error)];
    }
}

/**
 * Build with esbuild, splitting as an app does, for an es2020 browser.
 * @returns the build's error messages
 */
async function buildWithEsbuild(): Promise<string[]> {
    try {
        await esbuild({
            absWorkingDir: app,
            entryPoints: [entry],
            bundle: true,
            splitting: true,
            format: "esm",
            platform: "browser",
            // The oldest target a consumer reasonably builds for (Vite 5 and 6 default to it). It
            // refuses a top-level await, which an optional peer must therefore not be loaded with.
            target: "es2020",
            outdir: join(app, "out-esbuild"),
            logLevel: "silent",
        });
        return [];
    } catch (error) {
        const { errors } = error as { errors?: { text: string; location?: { file: string } | null }[] };
        return errors?.map((e) => `${e.location?.file ?? ""}: ${e.text}`) ?? [String(error)];
    }
}

describe("a consumer app with only graphty-element and its required peers installed", () => {
    beforeAll(() => {
        app = makeConsumerApp();
        entry = join(app, "src/main.js");
    });

    afterAll(() => {
        rmSync(app, { recursive: true, force: true });
    });

    it("has none of the optional peers", () => {
        const require = createRequire(entry);
        for (const name of optionalPeers) {
            assert.throws(() => require.resolve(`${name}/package.json`), /Cannot find module/, name);
        }
    });

    it("builds the root entry with webpack 5", async () => {
        assert.deepEqual(await buildWithWebpack(), []);
    });

    it("builds the root entry with Vite", async () => {
        assert.deepEqual(await buildWithVite(), []);
    });

    it("builds the root entry with esbuild", async () => {
        assert.deepEqual(await buildWithEsbuild(), []);
    });
});
