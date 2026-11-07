/**
 * A consumer's bundler can ship the in-page code sandbox: graphty-element is packed as npm would
 * publish it, a page that runs a program from the packed program chunk is built with Vite and with
 * webpack, each build must emit QuickJS's WebAssembly as an asset, and each page must run the
 * program in Chromium. Build first (`npm run build`).
 * @module test/packaging/program-wasm.test
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type Browser, chromium } from "@playwright/test";
import { build as viteBuild } from "vite";
import { afterAll, assert, describe, it } from "vitest";
import webpack from "webpack";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const WORK = mkdtempSync(join(tmpdir(), "graphty-program-wasm-"));

/** What the page records: the program's result. */
interface PageResult {
    code: string;
    value?: unknown;
}

let packed: Promise<string> | undefined;

/**
 * Pack graphty-element and unpack it into a fixture's node_modules, once.
 * @returns The packed program chunk, relative to the fixture root.
 */
function packedProgramChunk(): Promise<string> {
    packed ??= Promise.resolve().then(() => {
        execFileSync("pnpm", ["pack", "--pack-destination", WORK], { cwd: PACKAGE_ROOT, stdio: "pipe" });
        const tarball = readdirSync(WORK).find((f) => f.endsWith(".tgz"));
        assert.ok(tarball, "pnpm pack wrote a tarball");
        const installed = join(WORK, "fixture/node_modules/@graphty/graphty-element");
        mkdirSync(installed, { recursive: true });
        execFileSync("tar", ["-xzf", join(WORK, tarball), "-C", installed, "--strip-components=1"]);
        const chunks = join(installed, "dist/chunks");
        const program = readdirSync(chunks).find((f) => /^program-[\w-]+\.js$/.test(f));
        assert.ok(program, "the tarball holds dist/chunks/program-*.js: run npm run build first");
        assert.ok(
            readdirSync(chunks).some((f) => f.endsWith(".wasm")),
            "the tarball holds the program chunk's WebAssembly",
        );
        const root = join(WORK, "fixture");
        writeFileSync(
            join(root, "main.js"),
            [
                `import { runProgram } from "./${relative(root, join(chunks, program))}";`,
                "const limits = { timeoutMs: 5000, maxCalls: 8, maxLogChars: 1000, memoryMb: 16 };",
                "runProgram('return (await tools.add({ a: 2, b: 3 })) * 2;', { add: async ({ a, b }) => a + b },",
                "    limits, new AbortController().signal)",
                "    .then((result) => { window.programResult = result; })",
                "    .catch((error) => { window.programResult = { code: 'THREW', value: String(error) }; });",
            ].join("\n"),
        );
        return program;
    });
    return packed;
}

/**
 * Every file under a directory.
 * @param dir - The directory.
 * @returns Their paths.
 */
function filesUnder(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
}

const TYPES: Readonly<Record<string, string>> = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".wasm": "application/wasm",
};

let browser: Browser | undefined;
const servers: Server[] = [];

/**
 * Serve a built page and run it in Chromium.
 * @param dir - The build output, with index.html.
 * @returns What the program returned.
 */
async function runPage(dir: string): Promise<PageResult> {
    const server = createServer((request, response) => {
        const { pathname } = new URL(request.url ?? "/", "http://x");
        const file = resolve(dir, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
        try {
            const body = readFileSync(file);
            response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
            response.end(body);
        } catch {
            response.writeHead(404).end();
        }
    });
    servers.push(server);
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    browser ??= await chromium.launch();
    const page = await browser.newPage();
    // A page that cannot load (a missing chunk, a script error) fails here rather than waiting.
    const broken = new Promise<never>((_, fail) => {
        page.on("pageerror", fail);
        page.on("response", (r) => {
            if (r.status() >= 400) {
                fail(new Error(`${r.url()}: HTTP ${r.status()}`));
            }
        });
    });
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`);
    const handle = await Promise.race([
        page.waitForFunction(() => (window as { programResult?: unknown }).programResult),
        broken,
    ]);
    return (await handle.jsonValue()) as PageResult;
}

/**
 * The size of the published WebAssembly, which an emitted asset must equal.
 * @returns Its size in bytes.
 */
function publishedWasmSize(): number {
    const chunks = join(WORK, "fixture/node_modules/@graphty/graphty-element/dist/chunks");
    const wasm = readdirSync(chunks).find((f) => f.endsWith(".wasm")) as string;
    return statSync(join(chunks, wasm)).size;
}

afterAll(async () => {
    await browser?.close();
    for (const server of servers) {
        server.close();
    }

    rmSync(WORK, { recursive: true, force: true });
});

describe("the program chunk in a consumer's bundler", () => {
    it("Vite builds a page that runs a program, with the WebAssembly as an asset", async () => {
        await packedProgramChunk();
        const root = join(WORK, "fixture");
        writeFileSync(join(root, "index.html"), '<!doctype html><script type="module" src="./main.js"></script>');
        const out = join(WORK, "vite-out");
        await viteBuild({
            configFile: false,
            root,
            base: "./",
            logLevel: "silent",
            build: { outDir: out, emptyOutDir: true },
        });
        const wasm = filesUnder(out).filter((f) => f.endsWith(".wasm"));
        assert.lengthOf(wasm, 1, "one WebAssembly asset");
        assert.strictEqual(statSync(wasm[0]).size, publishedWasmSize());
        assert.deepEqual(await runPage(out), { code: "AI_COMPLETED", params: {}, value: 10, logs: [] } as PageResult);
    });

    it("webpack builds a page that runs a program, with the WebAssembly as an asset", async () => {
        await packedProgramChunk();
        const out = join(WORK, "webpack-out");
        const stats = await new Promise<webpack.Stats | undefined>((done, fail) => {
            webpack(
                {
                    mode: "production",
                    context: join(WORK, "fixture"),
                    entry: "./main.js",
                    output: { path: out, filename: "main.js", clean: true },
                    optimization: { minimize: false },
                },
                (error, result) => (error ? fail(error) : done(result)),
            );
        });
        assert.isFalse(stats?.hasErrors() ?? true, stats?.toString("errors-only"));
        writeFileSync(join(out, "index.html"), '<!doctype html><script src="./main.js"></script>');
        const wasm = filesUnder(out).filter((f) => f.endsWith(".wasm"));
        assert.lengthOf(wasm, 1, "one WebAssembly asset");
        assert.strictEqual(statSync(wasm[0]).size, publishedWasmSize());
        assert.deepEqual(await runPage(out), { code: "AI_COMPLETED", params: {}, value: 10, logs: [] } as PageResult);
    });
});
