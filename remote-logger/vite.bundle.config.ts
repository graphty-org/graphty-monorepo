import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/bundle/browser-entry.ts"),
            name: "RemoteLogger",
            formats: ["iife"],
            fileName: () => "remote-logger.browser.js",
        },
        outDir: resolve(__dirname, "dist"),
        emptyOutDir: false,
        sourcemap: true,
        target: "es2020",
        minify: true,
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
});
