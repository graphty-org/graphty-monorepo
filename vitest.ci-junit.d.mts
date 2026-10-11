/**
 * The CI reporter entries to spread into a vitest config's `reporters`: the JUnit report when CI is
 * set, the time-budget check when VITEST_BUDGET_CHECK=1; locally, none.
 * @param options - extra junit reporter options, e.g. a classnameTemplate that tells apart two passes
 * of the same tests under different settings
 */
export declare function ciReporters(options?: { classnameTemplate?: string }): [string, Record<string, unknown>][];
