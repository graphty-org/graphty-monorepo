/**
 * This package's `vitest.config.ts` must LOAD on every machine the project is built on, whatever
 * `GRAPHTY_BROWSER_GPU` happens to say.
 *
 * Nx loads every project's Vite or Vitest config to build its project graph, so a config that
 * throws while being read takes down commands that never mention this package. That is what
 * happened on pull request #21: `.github/workflows/hosts.yml` sets GRAPHTY_BROWSER_GPU for the
 * whole job -- `metal` on its macOS leg, `warp` on its Windows leg -- and this config knew only
 * `nvidia` and `swiftshader`, so it threw, `pnpm exec nx run-many -t build --projects=graph-format,
 * webgpu-graph-algorithms` died with "Failed to process project graph", nothing was built, and
 * every suite after it failed on a missing @graphty/graph-format. Linux never saw it, because no
 * workflow that runs on Linux sets either value.
 *
 * Nothing platform-specific is being simulated here: the two hosts differ from Linux only in the
 * value that variable carries, and a Linux machine can load the config under any value. So the
 * values come out of the workflow files rather than a list written here -- add a lane, or change
 * what one asks for, and this notices without being edited.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it, vi } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "../..");
const workflowDir = path.resolve(packageRoot, "../.github/workflows");

/**
 * Every value a workflow assigns to GRAPHTY_BROWSER_GPU, directly or through a matrix.
 *
 * Both spellings a workflow can use: `GRAPHTY_BROWSER_GPU: nvidia` and `GRAPHTY_BROWSER_GPU=
 * swiftshader` in a command, plus `browser_gpu: warp` in a matrix leg -- the matrix is where the
 * host lanes name theirs, and the job env then reads `${{ matrix.browser_gpu }}`, which this
 * pattern skips because it is not a literal.
 * @returns The values, deduplicated and sorted.
 */
function gpuValuesInWorkflows(): string[] {
    const pattern = /(?:GRAPHTY_BROWSER_GPU|browser_gpu)\s*[:=]\s*([A-Za-z][\w-]*)/g;
    const values = new Set<string>();

    for (const file of readdirSync(workflowDir).filter((name) => name.endsWith(".yml"))) {
        const text = readFileSync(path.join(workflowDir, file), "utf8");
        for (const match of text.matchAll(pattern)) {
            values.add(match[1]);
        }
    }

    return [...values].sort();
}

const GPU_VALUES = gpuValuesInWorkflows();

/** As much of a loaded config as this file reads: the `browser` project's Chromium arguments. */
interface LoadedConfig {
    /** The default export of vitest.config.ts. */
    default?: {
        /** Its `test` block. */
        test?: {
            /** One entry per test project, each with its own `test` block. */
            projects?: {
                /** The project's own settings. */
                test?: {
                    /** The project name, e.g. "browser". */
                    name?: string;
                    /** Browser-mode settings, present only on the browser projects. */
                    browser?: {
                        /** The Playwright instances the project launches. */
                        instances?: {
                            /** The launch options, where the Chromium switches live. */
                            launch?: {
                                /** The Chromium switches. */
                                args?: string[];
                            };
                        }[];
                    };
                };
            }[];
        };
    };
}

/**
 * The Chromium switches the `browser` project would launch with in a loaded config.
 * @param loaded - The module namespace of a freshly loaded vitest.config.ts.
 * @returns The switches, or an empty array when the project asked for none.
 */
function browserArgs(loaded: LoadedConfig): string[] {
    const project = loaded.default?.test?.projects?.find((entry) => entry.test?.name === "browser");
    assert.isDefined(project, "the loaded config has no project named 'browser'");

    return project.test?.browser?.instances?.[0]?.launch?.args ?? [];
}

describe("vitest.config.ts under the GPU flag values CI sets", () => {
    it("found the values in the workflows", () => {
        // Without this the loop below would pass by running nothing at all -- a renamed variable,
        // a moved workflow directory or a tightened pattern would make this file silently vacuous.
        assert.isAtLeast(
            GPU_VALUES.length,
            2,
            `expected several GRAPHTY_BROWSER_GPU values across ${workflowDir}, found ${JSON.stringify(GPU_VALUES)}`,
        );
    });

    it.each(GPU_VALUES)("loads with GRAPHTY_BROWSER_GPU=%s, and asks Chromium for a GPU", async(value) => {
        const before = process.env.GRAPHTY_BROWSER_GPU;
        process.env.GRAPHTY_BROWSER_GPU = value;

        try {
            // A fresh module each time, so the config re-reads the environment instead of handing
            // back the first value's cached result.
            vi.resetModules();
            const loaded = (await import("../../vitest.config.ts")) as LoadedConfig;
            assert.isObject(loaded.default, `vitest.config.ts exported no config under ${value}`);

            // Loading is half the requirement. The other half is that the value still means
            // something: test/browser/webgpu-layout.test.ts runs whenever the variable is set at
            // all and asks for a real adapter, so a value that loads but launches Chromium with no
            // switches is a suite failing on a GPU it was never given -- which is what deleting
            // the flag sets, rather than completing them, would produce.
            assert.isNotEmpty(
                browserArgs(loaded),
                `GRAPHTY_BROWSER_GPU=${value} left the browser project with no Chromium switches`,
            );
        } finally {
            if (before === undefined) {
                delete process.env.GRAPHTY_BROWSER_GPU;
            } else {
                process.env.GRAPHTY_BROWSER_GPU = before;
            }
        }
    });
});
