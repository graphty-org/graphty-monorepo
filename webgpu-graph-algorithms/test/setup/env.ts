/**
 * The test-only environment switches the helpers and test files share, read here and nowhere else in test/ (with
 * test/setup/gpu.ts, test/setup/global.ts, vitest.config.ts and scripts/; src/ never reads the environment).
 *
 * No side effects and no Node imports, so a helper the browser project bundles may import it: `process` is absent
 * there and every switch reads as unset (the browser receives GRAPHTY_NOISE_FLOOR_WRITE through import.meta.env
 * instead: test/helpers/noise-floor-browser.ts). Each accessor reads the variable at call time, so a test that sets
 * one for a moment (test/algorithms/degree.test.ts) is seen.
 */

function read(name: string): string | undefined {
    return typeof process === "undefined" ? undefined : process.env[name];
}

/**
 * GRAPHTY_NOISE_FLOOR_WRITE=1: a recording run, which writes noise fixtures and rows and holds every parity test to
 * its spec cap instead of the derived value.
 * @returns true in a recording run
 */
export function noiseFloorWriting(): boolean {
    return read("GRAPHTY_NOISE_FLOOR_WRITE") === "1";
}

/**
 * GRAPHTY_NOISE_DIR: a test-only redirection of the noise fixture directory.
 * @returns the directory as given, or undefined when unset or empty
 */
export function noiseDirOverride(): string | undefined {
    const value = read("GRAPHTY_NOISE_DIR");
    return value === "" ? undefined : value;
}

/**
 * GRAPHTY_GPU_NO_SUBGROUPS=1: the whole run drops `subgroups` from the default optional features (the workgroup twin
 * pass).
 * @returns true in the no-subgroups pass
 */
export function noSubgroupsPass(): boolean {
    return read("GRAPHTY_GPU_NO_SUBGROUPS") === "1";
}
