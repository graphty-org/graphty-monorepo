/** True when graphty-element declares at least one experiment (tools/features-on.mjs). */
export declare const FEATURES_DECLARED: boolean;
/** The suffix of an On twin's vitest project name and CI shard name. */
export declare const ON_SUFFIX: "features-on";
/**
 * One project's "<name>-features-on" twin, with `setupFile` last in its setupFiles.
 * @param project - a vitest inline project config
 * @param setupFile - the setup file that switches every experiment on
 */
export declare function featuresOnTwin<P>(project: P, setupFile: string): P;
/**
 * A projects list with an On twin of each named project appended, or the list unchanged when no
 * experiment is declared.
 * @param projects - vitest inline project configs
 * @param names - the names of the projects to twin
 * @param setupFile - the setup file that switches every experiment on
 * @param declared - whether any experiment is declared (for tests)
 */
export declare function withFeaturesOn<P>(
    projects: P[],
    names: readonly string[],
    setupFile: string,
    declared?: boolean,
): P[];
