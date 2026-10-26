/** True when graphty-element declares at least one experiment (tools/features-on.mjs). */
export declare const FEATURES_DECLARED: boolean;
/** The suffix of an On twin's vitest project name and CI shard name. */
export declare const ON_SUFFIX: "features-on";
/** The variable the On shards set (GRAPHTY_FEATURES_ON=1); only then do the vitest configs hold the twins. */
export declare const ON_ENV: "GRAPHTY_FEATURES_ON";
/**
 * One project's "<name>-features-on" twin, with `setupFile` last in its setupFiles.
 * @param project - a vitest inline project config
 * @param setupFile - the setup file that switches every experiment on
 */
export declare function featuresOnTwin<P>(project: P, setupFile: string): P;
/**
 * A projects list with an On twin of each named project appended, or the list unchanged unless an
 * experiment is declared and the run sets GRAPHTY_FEATURES_ON=1.
 * @param projects - vitest inline project configs
 * @param names - the names of the projects to twin
 * @param setupFile - the setup file that switches every experiment on
 * @param declared - whether to add the twins (for tests)
 */
export declare function withFeaturesOn<P>(
    projects: P[],
    names: readonly string[],
    setupFile: string,
    declared?: boolean,
): P[];
