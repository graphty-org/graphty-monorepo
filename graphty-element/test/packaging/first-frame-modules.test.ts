/**
 * @file What `import "@graphty/graphty-element"` plus `import "@graphty/graphty-element/webgpu"` load
 * before the first frame of a plain 2D graph leaves out the parts a first frame never uses.
 *
 * A consumer's page waits for every module the two entry points import statically to download,
 * compile and run before the element can draw. On the cosmos-compare harness that was about 0.8 s of
 * engine setup against the element's own 27 ms (issue #6389): an 11 MB chunk, most of it the whole of
 * Babylon.js reached through the `@babylonjs/core` barrel (XR, physics, particles, audio, flow and
 * frame graphs), every graph-io format, and the WebGPU accelerator. The deferred parts load on first
 * use through `import()` inside the element, so a consumer who uses them writes nothing extra.
 *
 * Reads `build/chunks.json` (written by the library build, see vite.config.ts) and counts the
 * modules, never a timing: the chunks the two entries reach through static imports, and the bare
 * specifiers those chunks import, which the consumer's bundler then loads up front too.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface Chunk {
    fileName: string;
    modules: string[];
    imports: string[];
}

/** Bare specifiers a first 2D frame never needs; a static import of any of them is a failure. */
const DEFERRED: readonly [RegExp, string][] = [
    [/^@babylonjs\/core$/, "the whole-library barrel, which loads every Babylon.js module"],
    [
        /^@babylonjs\/core\/(XR|Physics|FlowGraph|FrameGraph|Particles|Audio|AudioV2|Sprites|Gizmos|Loading)\//,
        "a Babylon.js feature no 2D frame draws",
    ],
    [/^@babylonjs\/loaders/, "the Babylon.js file loaders"],
    [/^@graphty\/webgpu-graph-algorithms/, "the WebGPU accelerator, which starts after the first frame"],
];

function upFront(entries: readonly string[]): { chunks: Set<string>; specifiers: Set<string> } {
    const { chunks } = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "build/chunks.json"), "utf8")) as {
        chunks: Chunk[];
    };
    const byFile = new Map(chunks.map((c) => [c.fileName, c]));
    const reached = new Set<string>();
    const specifiers = new Set<string>();
    const queue = [...entries];
    for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
        if (reached.has(file)) {
            continue;
        }
        reached.add(file);
        for (const spec of byFile.get(file)?.imports ?? []) {
            if (byFile.has(spec)) {
                queue.push(spec);
            } else {
                specifiers.add(spec);
            }
        }
    }
    return { chunks: reached, specifiers };
}

describe("the modules loaded before a first 2D frame", () => {
    it("leave out every deferred part", () => {
        const { specifiers } = upFront(["graphty.js", "webgpu.js"]);
        const problems = [...specifiers].flatMap((spec) =>
            DEFERRED.flatMap(([re, why]) => (re.test(spec) ? [`${spec} is imported up front: ${why}`] : [])),
        );
        assert.deepEqual(problems, []);
    });
});
