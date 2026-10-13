/**
 * How many workers one Node vitest run may use: max(1, floor(cores / slots)), or undefined (Vitest's
 * own default) on GitHub Actions or with GRAPHTY_TEST_SLOTS=0. Set it as a vitest config's root
 * `maxWorkers`.
 * @param env - the environment (GITHUB_ACTIONS, GRAPHTY_TEST_SLOTS)
 * @param cores - the machine's cores
 */
export declare function workerShare(env?: Record<string, string | undefined>, cores?: number): number | undefined;
