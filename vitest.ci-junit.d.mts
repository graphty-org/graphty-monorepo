/**
 * In CI, the JUnit reporter entry to spread into a vitest config's `reporters`; locally, none.
 * @param options - extra junit reporter options, e.g. a classnameTemplate that tells apart two passes
 * of the same tests under different settings
 */
export declare function ciJunitReporter(options?: {
    classnameTemplate?: string;
}): ["junit", { outputFile: string; classnameTemplate?: string }][];
