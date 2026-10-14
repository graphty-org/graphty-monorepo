/** The environment variable that turns the fuzzer on and names its seed. */
export declare const TIMING_FUZZ_ENV: string;
/** The key under which a vitest config provides the seed to the setup file. */
export declare const TIMING_FUZZ_PROVIDE_KEY: string;
/** The setup file a vitest project lists to install the fuzzer. */
export declare const TIMING_FUZZ_SETUP: string;
/** Read GRAPHTY_TIMING_FUZZ: the seed, or undefined when the fuzzer is off. */
export declare function parseTimingFuzzSeed(value: string | undefined): number | undefined;
/** Install the fuzzer on a global object; a second install returns the first. */
export declare function installTimingFuzzer(
    g: typeof globalThis,
    seed: number,
): { seed: number; reseed: (label: string) => void; counts: Record<string, number> };
/** The script for Playwright's `page.addInitScript` that installs the fuzzer in a page. */
export declare function timingFuzzerInitScript(seed: number): string;
/** Spread into a vitest project's `test` options; list TIMING_FUZZ_SETUP in its setupFiles too. */
export declare function timingFuzzConfig(): { provide: Record<string, string> };
/** Install the fuzzer in a Playwright page when this process runs under it; call before the page loads. */
export declare function fuzzPage(page: { addInitScript(script: string): Promise<unknown> }): Promise<void>;
