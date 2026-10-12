import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { defineConfig, loadEnv, type Plugin, UserConfig } from "vite";
import VitePluginCustomElementsManifest from "vite-plugin-cem";

// import eslint from "vite-plugin-eslint";
import { stubAnthropicNodeToolset } from "../vite.anthropic-sdk-stub.mjs";

/**
 * The published entry points, as `<output file name>: <source file>`.
 *
 * The keys are the file names in `dist/`, and `package.json`'s `exports` map points at exactly
 * these. The root entry keeps the name `graphty` it has always had, so a deep import of
 * `dist/graphty.js` written against 1.x still resolves.
 *
 * Eight of them -- session, schema, catalog, commands, extend, format, react and logging --
 * must stay free of Babylon.js, Lit and the DOM; `test/packaging/node-safe-entries.test.ts`
 * fails the build's tests if any of them stops being.
 *
 * Four lists name these files and nothing checks them against each other at build time:
 * this one, `tsconfig.build.json`'s `include`, `typedoc.json`'s `entryPoints` and the
 * graphty-element entry list in the repository root's `knip.config.ts`. The other three also
 * name `jsx.ts`, the `./jsx` entry, which is types only and so has no place here. Adding an entry to this
 * one alone produces a `dist/<name>.js` with no `.d.ts` beside it, which fails far away from
 * here -- in a consumer's editor. `test/logging/logging-entry-point.test.ts` holds the four
 * lists to each other.
 */
const entries = {
    graphty: "./index.ts",
    session: "./session.ts",
    schema: "./schema.ts",
    catalog: "./catalog.ts",
    commands: "./commands.ts",
    extend: "./extend.ts",
    format: "./format.ts",
    logging: "./logging.ts",
    react: "./react.ts",
    webgpu: "./webgpu.ts",
    ai: "./ai.ts",
};

/**
 * Dependencies that are copied into the output instead of being left to the consumer.
 *
 * `lodash` publishes CommonJS with no ESM build, and Node's ESM loader cannot detect its named
 * exports, so a native `import { set } from "lodash"` throws `Named export 'set' not found`
 * before any of this package's code runs. That would make the Node-safe entry points unusable
 * in the one place they exist for. Copying the few functions in is the packaging-side answer;
 * the source-side answer is for `src/algorithms/Algorithm.ts` to import `lodash/set.js`
 * directly, after which this entry can go.
 *
 * `@graphty/remote-logger` is copied in because the element uses only its `RemoteLogClient`,
 * which has no dependencies of its own, while the package as a whole carries a log server and an
 * MCP server. Declaring it as a dependency made every consumer install that server tree (about
 * 130 packages, among them `@modelcontextprotocol/sdk`, `http-proxy` and `selfsigned`). No
 * published `.d.ts` names a remote-logger type, so copying it changes no public type.
 *
 * Because they are copied in, both are devDependencies: a consumer never resolves them. This set
 * stays so that declaring either as a dependency again cannot quietly externalise it.
 */
const bundledDependencies = new Set(["lodash", "@graphty/remote-logger"]);

/**
 * Every declared dependency and peer dependency, as a specifier matcher.
 *
 * A library never copies a declared dependency into its own output: the consumer's installer
 * resolves it, so one copy exists in the application. Inlining a sibling is worse than
 * wasteful -- two copies of `@graphty/algorithms` are two `.d.ts` identities that do not assign
 * to each other, and two copies of a registry are two registries.
 *
 * Reading the list from the manifest rather than typing it here means a dependency added later
 * is externalised without anyone remembering to come back to this file.
 * @returns One regular expression per package, matching the package and any subpath of it.
 */
function externalDependencies(): RegExp[] {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
    };
    const names = new Set([
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {}),
    ]);

    return [...names]
        .filter((name) => !bundledDependencies.has(name))
        .map((name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/.*)?$`));
}

/**
 * Writes `build/chunks.json`: for every chunk of the library build, its file, whether it is an
 * entry, the modules built into it, and the chunks and packages it imports statically and with
 * `import()`. `test/packaging/ai-lazy-chunks.test.ts` reads it to prove that what an entry point
 * loads up front holds no AI framework or provider SDK (design/ai/tanstack-ai-harness-design.md,
 * section 7, rule 6). `build/` is git-ignored and not published.
 * @returns The plugin.
 */
function chunkMeta(): Plugin {
    return {
        name: "graphty-chunk-meta",
        apply: "build",
        writeBundle(_options, bundle): void {
            const chunks = Object.values(bundle).flatMap((output) =>
                output.type === "chunk"
                    ? [
                          {
                              fileName: output.fileName,
                              isEntry: output.isEntry,
                              modules: Object.keys(output.modules).map((id) => relative(__dirname, id)),
                              imports: output.imports,
                              dynamicImports: output.dynamicImports,
                          },
                      ]
                    : [],
            );
            mkdirSync(resolve(__dirname, "build"), { recursive: true });
            writeFileSync(resolve(__dirname, "build/chunks.json"), `${JSON.stringify({ chunks }, null, 1)}\n`);
        },
    };
}

/**
 * Builds the in-page code sandbox (`src/ai/engine/tanstack/program.ts`) as its own chunk,
 * `chunks/program-<hash>.js`, with QuickJS's WebAssembly beside the build as an asset. Nothing an
 * entry exports reaches it statically: `loadProgramRunner()` loads it with `import()`. It is
 * emitted here as well, so the chunk exists (and the packaging fixtures in
 * `test/packaging/program-wasm.test.ts` can load it) whether or not a caller is built in yet.
 * @returns The plugin.
 */
function programChunk(): Plugin {
    return {
        name: "graphty-program-chunk",
        apply: "build",
        buildStart(): void {
            this.emitFile({
                type: "chunk",
                id: resolve(__dirname, "src/ai/engine/tanstack/program.ts"),
                name: "program",
            });
        },
        transform: {
            filter: { id: /quickjs-wasmfile-release-sync\/dist\/emscripten-module\.browser\.mjs$/ },
            handler(code): string {
                // Emscripten's own `new URL("emscripten-module.wasm", import.meta.url)` is its default
                // location, never used: program.ts always passes `wasmLocation`. Left in, a library
                // build inlines the WebAssembly into the chunk as base64 (700 kB), and a consumer's
                // bundler would look for a file beside a chunk that has none.
                const replaced = code.replace(
                    '(new URL("emscripten-module.wasm",import.meta.url)).href',
                    '"emscripten-module.wasm"',
                );
                if (replaced === code) {
                    this.error("the QuickJS module no longer has the default WebAssembly URL this build removes");
                }

                return replaced;
            },
        },
    };
}

/**
 * Writes `THIRD-PARTY-LICENSES.txt` beside the build: the license and notice files of every package
 * whose code the build copies into its own output (TanStack AI and the provider SDKs in the AI
 * chunks, lodash, and in the `./bundle` build everything), so the package ships the notices their
 * licenses ask for. The `./bundle` build runs second and writes the full list.
 * @returns The plugin.
 */
export function thirdPartyLicenses(): Plugin {
    const SECTION_BREAK = ["", "", "-".repeat(80), "", ""].join("\n");
    return {
        name: "graphty-third-party-licenses",
        apply: "build",
        generateBundle(_options, bundle): void {
            const packages = new Map<string, string>();
            for (const output of Object.values(bundle)) {
                // A virtual module (`\0`, a CommonJS proxy) stands beside the real file, which counts.
                const ids = output.type === "chunk" ? Object.keys(output.modules) : [];
                for (const id of ids.filter((m) => !m.startsWith("\0"))) {
                    const at = id.lastIndexOf("/node_modules/") + "/node_modules/".length;
                    const parts = id.slice(at).split("/");
                    const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
                    if (at >= "/node_modules/".length) {
                        packages.set(name, `${id.slice(0, at)}${name}`);
                    }
                }
            }

            const sections = [...packages]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([name, dir]) => {
                    const { version, license } = JSON.parse(readFileSync(`${dir}/package.json`, "utf8")) as {
                        version: string;
                        license?: string;
                    };
                    const texts = readdirSync(dir)
                        .filter((file) => /^(?:licen[cs]e|notice|copying)(?:[.-]|$)/i.test(file))
                        .sort((a, b) => a.localeCompare(b))
                        .map((file) => readFileSync(`${dir}/${file}`, "utf8").trim());
                    return [`${name}@${version} (${license ?? "see below"})`, ...texts].join("\n\n");
                });
            this.emitFile({
                type: "asset",
                fileName: "THIRD-PARTY-LICENSES.txt",
                source: `${sections.join(SECTION_BREAK)}\n`,
            });
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file from monorepo root (one level up from this package).
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const monorepoRoot = resolve(__dirname, "..");
    const env = loadEnv(mode, monorepoRoot, "");
    const config: UserConfig = {
        plugins: [
            // eslint(),
            VitePluginCustomElementsManifest({
                files: ["./src/graphty-element.ts"],
                lit: true,
            }),
            chunkMeta(),
            programChunk(),
            stubAnthropicNodeToolset(),
            thirdPartyLicenses(),
        ],
        define: {
            // Disable Lit dev mode warning
            "process.env.NODE_ENV": JSON.stringify(mode === "development" ? "production" : mode),
        },
        build: {
            lib: {
                entry: entries,
                fileName: (_format, entryName): string => `${entryName}.js`,
                formats: ["es"],
            },
            minify: mode === "production",
            // Sourcemaps stay out of the tarball: they were 26 MB of a 41 MB unpacked package,
            // and "install graphty-element" must not be a 41 MB download.
            sourcemap: false,
            rollupOptions: {
                external: externalDependencies(),
                output: {
                    // Shared code lands in one directory so that `sideEffects` can name it.
                    // The built-in layouts, data sources and algorithms register themselves
                    // when their module is evaluated, and after the entry points were split
                    // those modules became shared chunks: a bundler told the chunks were pure
                    // would be free to drop every registration and leave an element that
                    // renders nothing it knows how to render.
                    chunkFileNames: "chunks/[name]-[hash].js",
                    // QuickJS's WebAssembly (the program chunk's), beside the chunks.
                    assetFileNames: "chunks/[name]-[hash][extname]",
                },
                treeshake: {
                    // This does NOT override package.json's `sideEffects` array, and the
                    // difference is load-bearing. Rolldown resolves every source file against
                    // the nearest package.json, and a file absent from an array-valued
                    // `sideEffects` is marked side-effect-free at resolve time, which wins over
                    // this default. Measured on vite 8 / rolldown 1.2.8 with a two-module probe:
                    // with `sideEffects: ["./dist/x.js"]` a top-level `register(...)` call is
                    // dropped from the output; adding the module's own path to the array brings
                    // it back. The same thing happens to the real package -- building with
                    // `./src/data/index.ts` removed from `sideEffects` produces a `dist/` with
                    // no CSV importer in it at all.
                    //
                    // So the three `./src/` entries in `sideEffects` are not leftovers from the
                    // UMD era; they are what keeps the built-in data sources, layouts and
                    // algorithms in the build. `test/packaging/exports-map.test.ts` pins them.
                    moduleSideEffects: true,
                },
            },
        },
        experimental: {
            // The program chunk finds its WebAssembly relative to itself, wherever dist/ is served from.
            renderBuiltUrl: (fileName) => (fileName.endsWith(".wasm") ? { relative: true } : undefined),
        },
        optimizeDeps: {
            exclude: ["@babylonjs/core", "@babylonjs/inspector"],
        },
        resolve: {
            alias: {
                graphty: resolve(__dirname, "./index.ts"),
                // The docs' examples (docs/examples/) import the package by its published name, as a
                // reader copies them; a story that runs one reaches the source, not a stale dist/.
                "@graphty/graphty-element/extend": resolve(__dirname, "./extend.ts"),
                "@graphty/graphty-element/logging": resolve(__dirname, "./logging.ts"),
            },
        },
        server: {
            host: true,
            allowedHosts: true,
        },
    };

    /*
     * The two settings below belong to `npm run dev` only: a LAN hostname and a TLS certificate,
     * read from the environment or the developer's .env at the monorepo root. (The port is not
     * here: the `dev` script passes `--port $PORT`, which servherd sets.) They must not
     * reach the Vite server that Vitest's browser mode starts, because the storybook test project
     * pulls this file in through `extends: "vite.config.ts"`.
     *
     * What happened when they did: Vite puts a non-loopback `server.host` under "network" rather
     * than "local", and separately it appends every DNS name in the TLS certificate to the "local"
     * list with the wildcard label rewritten to the literal string "vite" -- a `*.ato.ms`
     * certificate becomes `vite.ato.ms`. With both settings applied the only local URL left was
     * that invented name, Vitest pointed headless Chromium at it, and every run of the storybook
     * project died on `page.goto: net::ERR_NAME_NOT_RESOLVED` with zero tests executed. CI never
     * saw it because CI has no .env.
     *
     * Vitest sets VITEST before it loads any config file, so this reliably distinguishes "the test
     * runner is driving Vite" from "a developer ran vite dev".
     */
    const drivenByVitest = process.env.VITEST === "true";

    if (!drivenByVitest) {
        if (env.HOST && config.server) {
            config.server.host = env.HOST;
        }

        if (env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH && config.server) {
            config.server.https = {
                key: readFileSync(env.HTTPS_KEY_PATH),
                cert: readFileSync(env.HTTPS_CERT_PATH),
            };
        }
    }

    return config;
});
