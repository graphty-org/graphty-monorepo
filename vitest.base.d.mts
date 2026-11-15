import type { InlineConfig } from "vitest/node";

type Reporters = Extract<NonNullable<InlineConfig["reporters"]>, unknown[]>;

/** The options of {@link baseTest}. */
export interface BaseTestOptions {
    /** The reporters before the CI ones (default `["default"]`). */
    reporters?: Reporters;
    /** The config's own global setup files, run after the machine-wide test slot is taken. */
    globalSetup?: string[];
    /** Defaults to this run's share of the cores (tools/test-slots.mjs; undefined on GitHub Actions). */
    maxWorkers?: number;
    /** Options for the CI junit reporter. */
    junit?: { classnameTemplate?: string };
}

/**
 * The shared part of a Vitest config's `test` block (the test slot, the core share, the CI reporters):
 * spread it in, then add the project's own settings. Importing the module also presets FC_FONTATIONS.
 */
export declare function baseTest(options?: BaseTestOptions): {
    globalSetup: string[];
    maxWorkers: number | undefined;
    reporters: Reporters;
};

/** "verbose" locally, "default" in CI. */
export declare function localVerbose(): "default" | "verbose";
