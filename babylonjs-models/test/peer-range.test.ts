/**
 * The Babylon.js peer range starts at the release this package is built and tested against. The
 * main entry imports Babylon's FBX and USD loaders (9.13 and 9.26) and their `.pure.js` split
 * (9.15), so a range that let in an earlier 9.x would satisfy npm and fail to import.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

interface Manifest {
    readonly peerDependencies: Record<string, string>;
    readonly devDependencies: Record<string, string>;
}

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string): Manifest => JSON.parse(readFileSync(join(here, path), "utf8")) as Manifest;

describe("the Babylon.js peer range", () => {
    it.each(["../package.json", "../../graphty-element/package.json"])(
        "of %s starts at the version it is built against",
        (path) => {
            const manifest = read(path);
            for (const name of ["@babylonjs/core", "@babylonjs/loaders"]) {
                const built = manifest.devDependencies[name].replace(/^\^/, "");
                assert.strictEqual(manifest.peerDependencies[name], `^${built}`, name);
            }
        },
    );
});
