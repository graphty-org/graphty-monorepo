import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));

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
    define: {
        // A page loading this from a CDN is running the shipped build, never a dev build, and
        // Lit's dev-mode warning would otherwise fire on every load.
        "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
        // The library build owns dist/. This one adds a file to it rather than replacing it.
        emptyOutDir: false,
        lib: {
            entry: `${here}index.ts`,
            fileName: (): string => "graphty.bundle.js",
            formats: ["es"],
        },
        minify: true,
        sourcemap: false,
        // One file, so a script tag needs one URL. Without this, Rollup splits the dynamic
        // imports out and the tag fetches a directory's worth of chunks.
        rollupOptions: {
            // No `external`. That is the whole point of this file: the one output carries
            // Babylon.js, Lit, the siblings and every other dependency, because the page
            // loading it has no installer to resolve them.
            output: {
                // Vite 8 warns that this is deprecated in favour of `codeSplitting: false`,
                // but that key is not in the Rollup types this workspace resolves, so using it
                // fails `tsc`. Revisit when the types catch up.
                inlineDynamicImports: true,
            },
        },
    },
});
