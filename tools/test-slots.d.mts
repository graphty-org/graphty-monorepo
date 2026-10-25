/**
 * How many workers one Node vitest run may use: max(1, floor(cores / slots)), or undefined (Vitest's
 * own default) on GitHub Actions or with GRAPHTY_TEST_SLOTS=0. Set it as a vitest config's root
 * `maxWorkers`.
 * @param env - the environment (GITHUB_ACTIONS, GRAPHTY_TEST_SLOTS)
 * @param cores - the machine's cores
 */
export declare function workerShare(env?: Record<string, string | undefined>, cores?: number): number | undefined;
/**
 * This run's own Vite cache directory when it runs as one shard of the pre-push gate
 * (GRAPHTY_TEST_SHARD, set by tools/prepush-tests.mjs), else undefined (Vite's own default). Set it
 * as a vitest config's `cacheDir`, at the root and on every inline project that does not extend it.
 * @param env - the environment (GRAPHTY_TEST_SHARD)
 */
export declare function shardCacheDir(env?: Record<string, string | undefined>): string | undefined;
