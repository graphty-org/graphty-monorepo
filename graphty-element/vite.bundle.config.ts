import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin } from "vite";

import { stubAnthropicNodeToolset } from "../vite.anthropic-sdk-stub.mjs";
import { thirdPartyLicenses } from "./vite.config";

const here = fileURLToPath(new URL(".", import.meta.url));

const NO_PROGRAM = "\0graphty-no-program";

/**
 * Leaves the in-page code sandbox out of `./bundle`: one file cannot carry QuickJS's WebAssembly
 * beside it, and inlined it would add 700 kB to every page. `loadProgramRunner()` gets a sandbox
 * that refuses every program, and `PROGRAM_IN_BUILD` is false, so `./bundle` reports in-page code
 * unsupported.
 * @returns The plugin.
 */
function withoutProgram(): Plugin {
    return {
        name: "graphty-bundle-without-program",
        // Before Vite's own resolver, which would otherwise resolve the real module first.
        enforce: "pre",
        resolveId(source, importer): string | undefined {
            return source === "./tanstack/program" && importer?.endsWith("/src/ai/engine/load.ts") === true
                ? NO_PROGRAM
                : undefined;
        },
        load(id): string | undefined {
            if (id.endsWith("/src/ai/engine/programBuild.ts")) {
                return "export const PROGRAM_IN_BUILD = false;";
            }

            return id === NO_PROGRAM
                ? [
                      'export const runProgram = () => Promise.reject(new Error("E_PROGRAM_UNSUPPORTED"));',
                      "export const openProgramContexts = () => 0;",
                  ].join("\n")
                : undefined;
        },
    };
}

/**
 * The self-contained build behind the `./bundle` export.
 *
 * `vite.config.ts` builds the library the way a library is built: every declared dependency is
 * left to the consumer's installer, so an application ends up with one copy of Babylon.js, one
 * copy of Lit and one copy of each `@graphty/*` sibling however many packages ask for them.
 * That is right for anyone with a bundler and wrong for the person who has a text editor and a
 * `<script>` tag. For them an external is not a smaller download, it is a broken page.
 *
 * So this config inverts the one decision: nothing is external, and the output is a single file
 * that runs from a CDN with no build step and no import map. It defines the custom element as a
 * side effect, exactly as the root entry does.
 *
 * It is deliberately a second build rather than a second format on the first. The two differ in
 * what they externalise, and Vite's library mode applies one `external` list to every format it
 * emits, so the same run cannot produce both.
 */
export default defineConfig({
    // The AI providers' SDKs are built in; this one needs its Node-only toolset stubbed (vite.config.ts).
    // Everything is copied in here, so its license list is the package's whole list.
    plugins: [stubAnthropicNodeToolset(), thirdPartyLicenses(), withoutProgram()],
    // Relative, so the Graphviz Worker's file is found beside the bundle wherever it is served.
    base: "./",
    // The Graphviz Worker stays a file of its own and imports the optional package by name, which
    // a page without a bundler cannot resolve: there the Graphviz layouts report
    // `graphviz.unavailable`, as they do wherever the package is not installed.
    worker: {
        format: "es",
        rollupOptions: { external: ["@hpcc-js/wasm-graphviz"] },
    },
    define: {
        // A page loading this from a CDN is running the shipped build, never a dev build, and
        // Lit's dev-mode warning would otherwise fire on every load.
        "process.env.NODE_ENV": JSON.stringify("production"),
        // The version a project file's `generator` names (src/session/runs/engine.ts).
        __GRAPHTY_ELEMENT_VERSION__: JSON.stringify(
            (JSON.parse(readFileSync(`${here}package.json`, "utf8")) as { version: string }).version,
        ),
    },
    build: {
        // The library build owns dist/. This one adds a file to it rather than replacing it.
        emptyOutDir: false,
        lib: {
            entry: `${here}bundle.ts`,
            fileName: (): string => "graphty.bundle.js",
            formats: ["es"],
        },
        minify: true,
        sourcemap: false,
        // One file, so a script tag needs one URL. Without this, Rollup splits the dynamic
        // imports out and the tag fetches a directory's worth of chunks.
        rollupOptions: {
            // Almost nothing external. That is the whole point of this file: the one output carries
            // Babylon.js, Lit, the siblings and every other dependency, because the page
            // loading it has no installer to resolve them. The exception is the optional
            // in-browser AI runtime, which would double the file for every page: a page that
            // wants it maps `@mlc-ai/web-llm` in an import map, and without one
            // `enableAiControl({ provider: "webllm" })` rejects with `E_MISSING_PACKAGE`.
            // neo4j-driver, graph-io's optional peer for Cypher over Bolt, is left out the same
            // way: a page maps it in an import map, and without one a Bolt load rejects with
            // `E_SOURCE_RUNTIME` (`reason: "needs-peer-dependency"`). The Query API needs nothing.
            external: ["@mlc-ai/web-llm", "@hpcc-js/wasm-graphviz", "neo4j-driver"],
            output: {
                // Vite 8 warns that this is deprecated in favour of `codeSplitting: false`,
                // but that key is not in the Rollup types this workspace resolves, so using it
                // fails `tsc`. Revisit when the types catch up.
                inlineDynamicImports: true,
            },
        },
    },
});
