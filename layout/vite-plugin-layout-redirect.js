/**
 * Vite Plugin: Layout Redirect
 *
 * During development, this plugin intercepts imports of './layout.js' from examples
 * and serves the content of 'dist/layout.js' instead.
 *
 * This allows us to:
 * - Keep only one build artifact (dist/layout.js)
 * - Have examples work in development without a copy
 * - Deploy examples to GitHub Pages with a proper build step
 */

import fs from "fs";
import path from "path";

export function layoutRedirectPlugin() {
    return {
        name: "layout-redirect",
        enforce: "pre",

        resolveId(source, importer) {
            // Only intercept './layout.js' imports from files in the examples directory
            if (source === "./layout.js" && importer && importer.includes("/examples/")) {
                // Return a virtual module ID
                return "\0virtual:layout.js";
            }
        },

        load(id) {
            // Serve the content of dist/layout.js for our virtual module
            if (id === "\0virtual:layout.js") {
                const distLayoutPath = path.resolve(process.cwd(), "dist/layout.js");

                if (!fs.existsSync(distLayoutPath)) {
                    throw new Error('dist/layout.js not found. Run "npm run build:bundle" first.');
                }

                return fs.readFileSync(distLayoutPath, "utf-8");
            }
        },
    };
}
