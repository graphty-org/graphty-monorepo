// One build per measured source. BENCH_LABEL names the output directory, builds/<label>.
// `vite build` also needs BENCH_SOURCE: the checkout whose dist is measured. Its identity is baked
// into the page, so a result row always names the build that really ran, not the one you meant.
import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
const https = process.env.HTTPS_CERT_PATH
    ? { cert: readFileSync(process.env.HTTPS_CERT_PATH), key: readFileSync(process.env.HTTPS_KEY_PATH) }
    : undefined;
const label = process.env.BENCH_LABEL;
const S = process.env.BENCH_SOURCE;
export default defineConfig(({ command }) => {
    if (!label) throw new Error("set BENCH_LABEL");
    if (command === "build" && !S) throw new Error("set BENCH_SOURCE to the checkout to measure");
    const git = (...a) => {
        const out = execFileSync("git", ["-C", S, ...a]); // NOSONAR(S4036): the developer's own git
        return out.toString().trim();
    };
    const build = S
        ? {
              label,
              source: basename(resolve(S)),
              sha: git("rev-parse", "HEAD"),
              dirty: git("status", "--porcelain", "--untracked-files=no") !== "",
              distBuilt: statSync(`${S}/graphty-element/dist/graphty.js`).mtime.toISOString(),
          }
        : null;
    return {
        define: { __BENCH_BUILD__: JSON.stringify(build) },
        resolve: {
            alias: [
                { find: /^@graphty\/graphty-element\/webgpu$/, replacement: `${S}/graphty-element/dist/webgpu.js` },
                { find: /^@graphty\/graphty-element$/, replacement: `${S}/graphty-element/dist/graphty.js` },
                { find: /^@graphty\/graph-samples\/generators$/, replacement: `${S}/graph-samples/dist/generators.js` },
            ],
        },
        preview: { allowedHosts: true, https },
        // The element's workers are code-split chunks, which Vite's default "iife" worker format refuses.
        worker: { format: "es" },
        // assetsInlineLimit 0: dist/graphty.js has lost the ?no-inline on its shader thumbnails, so a
        // default Vite build inlines them past the element's 4096-character limit and the import throws.
        build: {
            target: "es2022",
            chunkSizeWarningLimit: 100000,
            assetsInlineLimit: 0,
            outDir: `builds/${label}`,
            emptyOutDir: true,
        },
    };
});
