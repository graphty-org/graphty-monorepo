#!/usr/bin/env node
/**
 * The bundler matrix: does a consumer's build of the PUBLISHED graphty-element find, miss or
 * report a broken @graphty/webgpu-graph-algorithms the way the docs say, with every toolchain the
 * docs name?
 *
 * Workspace links hide exactly what is under test (the GPU package is a dev dependency here, so
 * it is always present), so this packs graphty-element and its @graphty dependencies with
 * `pnpm pack`, installs the tarballs into a fresh consumer app with npm, and builds that app
 * with each toolchain in three states of the GPU package:
 *
 * - absent: its directory deleted (`npm rm` leaves an optional peer in node_modules, so it is
 *   deleted by hand). The build passes; the page reports `E_MISSING_PACKAGE` and prints nothing.
 * - present: under `acceleration="required"` on Chromium's software WebGPU adapter the element
 *   attaches it (`idle`), which proves it was loaded and used; under `auto` the same adapter is
 *   refused as `E_SOFTWARE_ONLY` with one console.warn.
 * - broken: a stub package of the same name that throws while its module evaluates. The page
 *   reports `E_ACCELERATOR_FAILED` with one console.error.
 *
 * Toolchains: Vite 8 (build), webpack (current, and exactly 5.90.2, the documented minimum),
 * Rollup 4 with node-resolve and commonjs, esbuild with --splitting, and no bundler at all (the
 * `./bundle` file with an import map). Plus `tsc` with `skipLibCheck: false` and the GPU package
 * absent, which fails if a published declaration names it.
 *
 * Needs `pnpm exec nx run graphty-element:build` first, network access to the npm registry and
 * Playwright's Chromium. Slow (installs a toolchain and builds fifteen bundles), so it runs on the
 * release train, not on every push: `npm run test:bundlers` in graphty-element.
 *
 * Writes everything under $BUNDLER_MATRIX_DIR (default: <os tmpdir>/graphty-bundler-matrix), which
 * must not sit under any node_modules that holds the GPU package, and prints a table; exits 1 on
 * any failure.
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const elementDir = path.resolve(here, "..");
const repo = path.resolve(elementDir, "..");
// Outside the repository on purpose: Node resolution climbs to parent node_modules, and the
// monorepo's own has the GPU package, which would make "absent" quietly present.
const work = process.env.BUNDLER_MATRIX_DIR ?? path.join(tmpdir(), "graphty-bundler-matrix");
const packs = path.join(work, "packs");
const app = path.join(work, "app");
const PEER = "@graphty/webgpu-graph-algorithms";

/** The packages packed from this checkout: graphty-element, its @graphty dependencies and the peer. */
const PACKED = [
    "graph-format",
    "graph-io",
    "algorithms",
    "layout",
    "graph-samples",
    "webgpu-graph-algorithms",
    "graphty-element",
];

/** The toolchain installed into the consumer app. */
const TOOLCHAIN = {
    vite: "^8.3.5",
    webpack: "^5.112.0",
    "webpack-5-90-2": "npm:webpack@5.90.2",
    rollup: "^4.65.0",
    "@rollup/plugin-node-resolve": "^16.0.3",
    "@rollup/plugin-commonjs": "^28.0.0",
    "@rollup/plugin-replace": "^6.0.0",
    esbuild: "^0.28.2",
    typescript: "^5.9.3",
};

/** Chromium with its software WebGPU adapter and software WebGL, as graphty-element's browser tests use. */
const CHROMIUM_FLAGS = [
    "--enable-unsafe-webgpu",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--use-webgpu-adapter=swiftshader",
];

/**
 * Runs a command, returning its output, or throwing with the tail of it.
 * @param command - The executable.
 * @param args - Its arguments.
 * @param cwd - Where to run it.
 * @returns Standard output and error.
 */
function run(command, args, cwd) {
    try {
        return execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe", maxBuffer: 256 * 1024 * 1024 });
    } catch (error) {
        const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
        throw new Error(`${command} ${args.join(" ")} failed:\n${output.split("\n").slice(-40).join("\n")}`);
    }
}

/**
 * graphty-element's other optional peers, installed so that the GPU package is the only thing the
 * three states vary. Without them Vite 8, webpack and esbuild fail to build the root entry at all,
 * because lazily loaded chunks of it import the AI and Graphviz peers statically; that is a
 * separate defect of the element, issue 3278.
 * @returns Each optional peer except the GPU package, with graphty-element's declared range.
 */
function otherOptionalPeers() {
    const manifest = JSON.parse(readFileSync(path.join(elementDir, "package.json"), "utf8"));
    return Object.fromEntries(
        Object.entries(manifest.peerDependencies).filter(
            ([name]) => name !== PEER && manifest.peerDependenciesMeta?.[name]?.optional === true,
        ),
    );
}

/** Packs every package and writes the consumer app, then installs it. */
function prepare() {
    for (let dir = path.dirname(work); dir !== path.dirname(dir); dir = path.dirname(dir)) {
        if (existsSync(path.join(dir, "node_modules", PEER))) {
            throw new Error(
                `${work} is below ${dir}, whose node_modules has ${PEER}: "absent" would find it. Set BUNDLER_MATRIX_DIR elsewhere.`,
            );
        }
    }

    rmSync(work, { recursive: true, force: true });
    mkdirSync(packs, { recursive: true });
    mkdirSync(path.join(app, "src"), { recursive: true });

    const tarballs = {};
    for (const dir of PACKED) {
        const manifest = JSON.parse(readFileSync(path.join(repo, dir, "package.json"), "utf8"));
        const before = new Set(readdirSync(packs));
        run("pnpm", ["pack", "--pack-destination", packs], path.join(repo, dir));
        const made = readdirSync(packs).find((file) => !before.has(file));
        tarballs[manifest.name] = `file:${path.join(packs, made)}`;
    }

    writeFileSync(
        path.join(app, "package.json"),
        JSON.stringify(
            {
                name: "bundler-matrix-app",
                private: true,
                type: "module",
                // lodash: @jsonhero/json-schema-fns (under @jsonhero/schema-infer, a graphty-element
                // dependency) requires `lodash/omit` without declaring lodash, so a consumer's build fails
                // unless something else installs it. Also issue 3278.
                dependencies: { ...tarballs, ...otherOptionalPeers(), lodash: "^4.17.21", ...TOOLCHAIN },
                // Every @graphty package resolves to this checkout's tarball, wherever it is asked for.
                overrides: Object.fromEntries(Object.keys(tarballs).map((name) => [name, `$${name}`])),
            },
            null,
            2,
        ),
    );

    writeFileSync(path.join(app, "src", "main.js"), 'import "@graphty/graphty-element";\nimport "./page.js";\n');
    writeFileSync(path.join(app, "src", "page.js"), PAGE_SCRIPT);
    writeFileSync(
        path.join(app, "index.html"),
        '<!doctype html><html><body><script type="module" src="/src/main.js"></script></body></html>\n',
    );
    writeFileSync(path.join(app, "rollup.config.mjs"), ROLLUP_CONFIG);
    writeFileSync(path.join(app, "webpack.mjs"), WEBPACK_RUNNER);
    mkdirSync(path.join(app, "types"), { recursive: true });
    writeFileSync(path.join(app, "types", "consumer.ts"), TYPES_CONSUMER);
    writeFileSync(path.join(app, "tsconfig.json"), JSON.stringify(TSCONFIG, null, 2));

    run("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], app);
    // The pristine package, put back before each state.
    cpSync(path.join(app, "node_modules", PEER), path.join(work, "peer-pristine"), { recursive: true });
}

/** What every page does: put the element on the page and let the test read where acceleration settled. */
const PAGE_SCRIPT = `const policy = new URLSearchParams(location.search).get("acceleration") ?? "auto";
const element = document.createElement("graphty-element");
element.setAttribute("acceleration", policy);
element.style.cssText = "display:block;width:320px;height:240px";
document.body.append(element);
`;

const ROLLUP_CONFIG = `import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
export default {
    input: "src/main.js",
    output: { dir: process.env.OUT, format: "esm" },
    plugins: [
        replace({ preventAssignment: true, values: { "process.env.NODE_ENV": JSON.stringify("production") } }),
        resolve({ browser: true }),
        commonjs(),
    ],
    onwarn: () => {},
};
`;

/** Runs one webpack (by package name) through its Node API, so the old and new versions coexist. */
const WEBPACK_RUNNER = `import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
const [name, out] = process.argv.slice(2);
const webpack = require(name);
webpack({
    mode: "production",
    entry: "./src/main.js",
    output: { path: path.resolve(out), publicPath: "auto" },
    optimization: { minimize: false },
    performance: { hints: false },
    stats: "errors-only",
}, (error, stats) => {
    if (error || stats.hasErrors()) {
        console.error(error ?? stats.toString("errors-only"));
        process.exit(1);
    }
    console.log(stats.toString("errors-warnings"));
});
`;

const TYPES_CONSUMER = `import "@graphty/graphty-element";
import type { AccelerationStatus } from "@graphty/graphty-element";
import "@graphty/graphty-element/webgpu";

export function codeOf(status: AccelerationStatus): string | undefined {
    return status.code;
}
`;

const TSCONFIG = {
    compilerOptions: {
        target: "es2022",
        module: "esnext",
        moduleResolution: "bundler",
        lib: ["dom", "es2023"],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        types: [],
    },
    include: ["types/*.ts"],
};

/**
 * Puts the GPU package into one of the three states.
 * @param state - absent, present or broken.
 */
function setPeer(state) {
    const target = path.join(app, "node_modules", PEER);
    rmSync(target, { recursive: true, force: true });
    if (state === "present") {
        cpSync(path.join(work, "peer-pristine"), target, { recursive: true });
    } else if (state === "broken") {
        mkdirSync(target, { recursive: true });
        writeFileSync(
            path.join(target, "package.json"),
            JSON.stringify({
                name: PEER,
                version: "0.0.0-broken",
                type: "module",
                exports: { ".": "./index.js", "./browser": "./browser.js" },
            }),
        );
        writeFileSync(
            path.join(target, "index.js"),
            'throw new Error("bundler-matrix: this stub throws while it evaluates");\nexport {};\n',
        );
        writeFileSync(path.join(target, "browser.js"), 'export * from "./index.js";\n');
    }
}

/**
 * Builds the app with one toolchain.
 * @param bundler - Which toolchain.
 * @param out - The output directory.
 * @returns The HTML file to open, relative to the served root, and the root to serve.
 */
function build(bundler, out) {
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const moduleHtml = '<!doctype html><html><body><script type="module" src="./main.js"></script></body></html>\n';

    switch (bundler) {
        case "vite-8": {
            run(
                "npx",
                ["vite", "build", "--outDir", out, "--emptyOutDir", "--logLevel", "error", "--minify", "false"],
                app,
            );
            return { root: out, page: "index.html" };
        }
        case "webpack-current":
        case "webpack-5.90.2": {
            const name = bundler === "webpack-current" ? "webpack" : "webpack-5-90-2";
            run("node", ["webpack.mjs", name, out], app);
            writeFileSync(
                path.join(out, "index.html"),
                '<!doctype html><html><body><script src="./main.js"></script></body></html>\n',
            );
            return { root: out, page: "index.html" };
        }
        case "rollup": {
            execFileSync("npx", ["rollup", "-c", "rollup.config.mjs"], {
                cwd: app,
                env: { ...process.env, OUT: out },
                stdio: "pipe",
            });
            writeFileSync(path.join(out, "index.html"), moduleHtml);
            return { root: out, page: "index.html" };
        }
        case "esbuild": {
            run(
                "npx",
                [
                    "esbuild",
                    "src/main.js",
                    "--bundle",
                    "--format=esm",
                    "--splitting",
                    `--outdir=${out}`,
                    "--log-level=error",
                    '--define:process.env.NODE_ENV="production"',
                    "--loader:.wasm=file",
                ],
                app,
            );
            writeFileSync(path.join(out, "index.html"), moduleHtml);
            return { root: out, page: "index.html" };
        }
        case "import-map": {
            return { root: work, page: importMapPage(out) };
        }
        default:
            throw new Error(`unknown toolchain ${bundler}`);
    }
}

/**
 * Writes the no-bundler page: the `./bundle` file, and an import map that maps the GPU package
 * when it is installed.
 * @param out - Where to write the page.
 * @returns The page's path relative to the app root.
 */
function importMapPage(out) {
    // Served from the work directory, so the page and the installed packages share one origin.
    const modules = "/app/node_modules/";
    const peerDir = path.join(app, "node_modules", PEER);
    const imports = {};
    if (existsSync(peerDir)) {
        const peer = JSON.parse(readFileSync(path.join(peerDir, "package.json"), "utf8"));
        const entry = (key) => {
            const value = peer.exports[key];
            return typeof value === "string" ? value : value.import;
        };
        imports[PEER] = `${modules}${PEER}/${entry(".").replace(/^\.\//, "")}`;
        imports[`${PEER}/browser`] = `${modules}${PEER}/${entry("./browser").replace(/^\.\//, "")}`;
        imports["@graphty/graph-format"] = `${modules}@graphty/graph-format/dist/graph-format.js`;
    }

    const html = `<!doctype html><html><head><script type="importmap">${JSON.stringify({ imports })}</script></head><body>
<script type="module">
import "${modules}@graphty/graphty-element/dist/graphty.bundle.js";
${PAGE_SCRIPT}</script></body></html>
`;
    writeFileSync(path.join(out, "index.html"), html);
    return path.relative(work, path.join(out, "index.html"));
}

/**
 * Serves a directory over HTTP on a free port.
 * @param root - The directory.
 * @returns The server and its origin.
 */
async function serve(root) {
    const types = {
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".html": "text/html",
        ".json": "application/json",
        ".wasm": "application/wasm",
        ".css": "text/css",
    };
    const server = createServer((request, response) => {
        const file = path.join(root, decodeURIComponent(new URL(request.url, "http://x").pathname));
        if (!file.startsWith(root) || !existsSync(file)) {
            response.writeHead(404);
            response.end();
            return;
        }

        response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
        response.end(readFileSync(file));
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

/**
 * Opens one page and reads where acceleration settled and what graphty-element printed.
 * @param browser - The Chromium instance.
 * @param url - The page.
 * @returns The status and the console lines.
 */
async function observe(browser, url) {
    const page = await browser.newPage();
    const lines = [];
    const errors = [];
    page.on("console", (message) => {
        if (message.text().startsWith("[graphty-element]")) {
            lines.push({ type: message.type(), text: message.text() });
        }
    });
    page.on("pageerror", (error) => errors.push(error.message));
    try {
        await page.goto(url);
        const handle = await page.waitForFunction(
            () => {
                const status =
                    globalThis.document.querySelector("graphty-element")?.session?.capabilities?.acceleration;
                return status !== undefined && status.state !== "probing"
                    ? { state: status.state, code: status.code ?? null, params: status.params ?? null }
                    : null;
            },
            null,
            { timeout: 120_000 },
        );
        return { status: await handle.jsonValue(), lines, errors };
    } catch (error) {
        return { status: null, lines, errors: [...errors, String(error)] };
    } finally {
        await page.close();
    }
}

/**
 * What each state must look like.
 * @param state - absent, present or broken.
 * @param auto - What the auto page showed.
 * @param required - What the required page showed (present only).
 * @returns The problems, empty when it passed.
 */
function judge(state, auto, required) {
    const problems = [];
    const warns = auto.lines.filter((line) => line.type === "warning");
    const errs = auto.lines.filter((line) => line.type === "error");
    if (auto.status === null) {
        return [`the page never settled: ${auto.errors.join("; ")}`];
    }

    if (state === "absent") {
        if (auto.status.code !== "E_MISSING_PACKAGE")
            problems.push(`code ${auto.status.code}, expected E_MISSING_PACKAGE`);
        if (auto.status.params?.package !== PEER) problems.push("params.package does not name the package");
        if (auto.lines.length > 0) problems.push(`printed ${auto.lines.map((line) => line.text).join(" | ")}`);
    } else if (state === "present") {
        if (
            !["E_SOFTWARE_ONLY", "E_NO_WEBGPU", "E_NO_ADAPTER"].includes(auto.status.code) &&
            !["idle", "active"].includes(auto.status.state)
        ) {
            problems.push(
                `auto: state ${auto.status.state} code ${auto.status.code}, expected the package's own probe answer`,
            );
        }
        if (auto.status.code !== null && (warns.length !== 1 || errs.length > 0))
            problems.push(`auto printed ${warns.length} warnings and ${errs.length} errors, expected 1 warning`);
        if (required?.status === null || !["idle", "active"].includes(required?.status?.state)) {
            problems.push(
                `required: state ${required?.status?.state} code ${required?.status?.code}, expected the package attached`,
            );
        }
    } else {
        if (auto.status.code !== "E_ACCELERATOR_FAILED")
            problems.push(`code ${auto.status.code}, expected E_ACCELERATOR_FAILED`);
        if (errs.length !== 1 || warns.length > 0)
            problems.push(`printed ${errs.length} errors and ${warns.length} warnings, expected 1 error`);
    }

    return problems;
}

const BUNDLERS = ["vite-8", "webpack-current", "webpack-5.90.2", "rollup", "esbuild", "import-map"];
const STATES = ["absent", "present", "broken"];

async function main() {
    const only = process.argv.slice(2);
    const bundlers = only.length > 0 ? BUNDLERS.filter((name) => only.includes(name)) : BUNDLERS;
    console.log("packing and installing the consumer app ...");
    prepare();

    const require = createRequire(path.join(elementDir, "package.json"));
    const { chromium } = require("@playwright/test");
    const browser = await chromium.launch({ args: CHROMIUM_FLAGS });
    const results = [];

    setPeer("absent");
    try {
        run("npx", ["tsc", "-p", "tsconfig.json"], app);
        results.push({ bundler: "tsc (skipLibCheck: false)", state: "absent", problems: [] });
    } catch (error) {
        results.push({
            bundler: "tsc (skipLibCheck: false)",
            state: "absent",
            problems: [String(error.message).slice(0, 2000)],
        });
    }

    for (const state of STATES) {
        setPeer(state);
        for (const bundler of bundlers) {
            const out = path.join(work, "out", state, bundler);
            let problems;
            let summary = "";
            try {
                const { root, page } = build(bundler, out);
                const { server, origin } = await serve(root);
                try {
                    const auto = await observe(browser, `${origin}/${page}`);
                    const required =
                        state === "present"
                            ? await observe(browser, `${origin}/${page}?acceleration=required`)
                            : undefined;
                    problems = judge(state, auto, required);
                    summary = `${auto.status?.state ?? "-"} ${auto.status?.code ?? ""}${required ? ` / required: ${required.status?.state ?? "-"}` : ""}`;
                } finally {
                    server.close();
                }
            } catch (error) {
                problems = [`build failed: ${String(error.message).slice(0, 2000)}`];
            }

            results.push({ bundler, state, summary, problems });
            console.log(
                `${problems.length === 0 ? "PASS" : "FAIL"}  ${bundler.padEnd(16)} ${state.padEnd(8)} ${summary}`,
            );
            for (const problem of problems) console.log(`      ${problem}`);
        }
    }

    await browser.close();
    writeFileSync(path.join(work, "results.json"), JSON.stringify(results, null, 2));
    const failed = results.filter((result) => result.problems.length > 0);
    console.log(
        `\n${results.length - failed.length} passed, ${failed.length} failed (${path.join(work, "results.json")})`,
    );
    for (const result of failed.filter((entry) => entry.bundler.startsWith("tsc")))
        console.log(`FAIL  ${result.bundler}: ${result.problems[0]}`);
    process.exitCode = failed.length > 0 ? 1 : 0;
}

await main();
