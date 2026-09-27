/**
 * Every `*.test.ts` file under `test/` must be picked up by at least one vitest project.
 *
 * `vitest.config.ts` splits the suite into projects (default, mesh, contract, bench, browser, xr,
 * interactions, llm-regression), each with its own include and exclude globs. A file that none of
 * them includes is never run by anything -- not the pre-push gate, not CI, not a bare `vitest run`
 * -- and nothing says so. The mesh tests sat in that state for months, and
 * test/browser/dash-spacing-measurement.test.ts sat in it for most of a year while pointing at a
 * story that had been deleted.
 *
 * The globs are read from the loaded config rather than copied here, so moving a file, adding a
 * project or tightening an exclude is checked without this file being edited. The storybook
 * project is skipped: its files come from the Storybook plugin and are `*.stories.ts`, never
 * `*.test.ts`.
 */

import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "../..");

/**
 * Test files that deliberately belong to no project, each with the reason. Keep it empty unless a
 * file genuinely must not run anywhere -- and then prefer renaming it so it is not a test at all.
 */
const ALLOWED_ORPHANS: string[] = [];

/** As much of a loaded config as this file reads: each project's name and globs. */
interface LoadedConfig {
    /** The default export of vitest.config.ts. */
    default?: {
        /** Its `test` block. */
        test?: {
            /** One entry per test project. */
            projects?: {
                /** The project's own settings. */
                test?: {
                    /** The project name, e.g. "browser". */
                    name?: string;
                    /** Globs, relative to the package root, of the files the project runs. */
                    include?: string[];
                    /** Globs of files the project skips even when `include` matches them. */
                    exclude?: string[];
                };
            }[];
        };
    };
}

/**
 * Every `*.test.ts` file under `test/`, relative to the package root with forward slashes.
 * @returns The paths, sorted.
 */
function testFiles(): string[] {
    return readdirSync(path.join(packageRoot, "test"), { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(".test.ts"))
        .map((file) => `test/${file.split(path.sep).join("/")}`)
        .sort();
}

/**
 * The test files no project in the config would run.
 * @param loaded - The module namespace of vitest.config.ts.
 * @param files - The candidate files, relative to the package root.
 * @returns The files every project leaves out.
 */
function orphans(loaded: LoadedConfig, files: string[]): string[] {
    const projects = (loaded.default?.test?.projects ?? [])
        .map((project) => project.test)
        .filter((test) => test?.name !== "storybook");

    const matches = (file: string, globs: string[] | undefined): boolean =>
        (globs ?? []).some((glob) => path.matchesGlob(file, glob));

    return files.filter(
        (file) => !projects.some((test) => matches(file, test?.include) && !matches(file, test?.exclude)),
    );
}

describe("vitest.config.ts projects", () => {
    it("run every *.test.ts file under test/", async() => {
        const loaded = (await import("../../vitest.config.ts")) as LoadedConfig;
        const files = testFiles();

        // Without these the check below could pass by comparing nothing with nothing.
        assert.isAtLeast(files.length, 100, "found suspiciously few test files under test/");
        assert.isAtLeast(loaded.default?.test?.projects?.length ?? 0, 2, "the loaded config has no projects");
        // And it must be able to see an orphan at all: this path is under test/ but in no project.
        assert.deepEqual(orphans(loaded, ["test/no-project~/orphan.test.ts"]), ["test/no-project~/orphan.test.ts"]);

        const unrun = orphans(loaded, files).filter((file) => !ALLOWED_ORPHANS.includes(file));
        assert.deepEqual(
            unrun,
            [],
            "these test files match no vitest project, so nothing runs them -- add them to a " +
                "project's include in vitest.config.ts, or rename them if they are not tests",
        );
    });
});
