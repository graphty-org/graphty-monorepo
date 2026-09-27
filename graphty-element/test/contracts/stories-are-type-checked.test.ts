/**
 * @file Every story is in the TypeScript project that `npm run lint` checks.
 *
 * A story's `play` function is a real test, run by the `storybook` vitest project, and that
 * project compiles with esbuild, which strips types without checking them. Until September 2026
 * the package tsconfig excluded `stories/**`, so a story could pass a number where the element
 * takes a layout name, or call a method the element no longer has, and nothing said so until the
 * story failed at runtime. This test fails if a story drops out of the project again, whether by
 * an exclude or by an include that stops reaching it.
 */

import path from "node:path";

import ts from "typescript";
import { assert, describe, it } from "vitest";

const PACKAGE_ROOT = path.resolve(import.meta.dirname, "../..");

describe("stories are type-checked", () => {
    it("the package tsconfig includes every file under stories/", () => {
        const configPath = path.join(PACKAGE_ROOT, "tsconfig.json");
        const { config } = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));
        const project = ts.parseJsonConfigFileContent(config, ts.sys, PACKAGE_ROOT);
        const inProject = new Set(project.fileNames.map((file) => path.resolve(file)));
        const stories = ts.sys
            .readDirectory(path.join(PACKAGE_ROOT, "stories"), [".ts"])
            .map((file) => path.resolve(file));

        assert.isAbove(stories.length, 30, "stories/ should hold the package's story files");
        const missing = stories.filter((file) => !inProject.has(file));

        assert.deepEqual(missing, [], "these stories are outside the tsconfig, so nothing type-checks them");
    });
});
