/**
 * A model or picture a story names by URL has to reach the element as a web address in the built
 * Storybook too, not only under Vite's dev server (issue #4365). A `?url` import of a file smaller
 * than Vite's `build.assetsInlineLimit` (4 KB by default; .storybook/main.ts sets none) is a file
 * URL in dev but a `data:` URL in the build, and the element fetches a model only over http(s), so
 * the built story drew its placeholder shapes while the story test drew the model. Such a file is
 * imported with `?url&no-inline`, which keeps it a file in the build.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const STORIES = join(dirname(fileURLToPath(import.meta.url)), "../../stories");

/** Vite's default `build.assetsInlineLimit`, in bytes. */
const INLINE_LIMIT = 4096;

/** Files a story hands the element as a model or a picture. */
const ASSET = /\.(?:stl|glb|gltf|obj|ply|png|jpe?g|webp|ktx2)$/i;

/**
 * Every story file under a folder.
 * @param dir - The folder.
 * @returns Their paths.
 */
function storyFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            return storyFiles(path);
        }

        return entry.name.endsWith(".stories.ts") ? [path] : [];
    });
}

describe("story model fixtures", () => {
    it("imports no model or picture with ?url that the build would inline as a data: URL", () => {
        const inlined: string[] = [];
        for (const file of storyFiles(STORIES)) {
            const source = readFileSync(file, "utf8");
            for (const [, spec, query] of source.matchAll(/from\s+"([^"?]+)\?([^"]*)"/g)) {
                const params = query.split("&");
                if (!ASSET.test(spec) || !params.includes("url") || params.includes("no-inline")) {
                    continue;
                }

                const bytes = statSync(join(dirname(file), spec)).size;
                if (bytes < INLINE_LIMIT) {
                    inlined.push(`${file.slice(STORIES.length + 1)}: ${spec} (${String(bytes)} bytes)`);
                }
            }
        }

        assert.deepStrictEqual(inlined, [], "import these with ?url&no-inline");
    });
});
