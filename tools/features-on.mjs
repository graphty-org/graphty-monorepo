/**
 * features-on.mjs -- the "On" test configuration: the same tests again with every declared experiment
 * switched on (design/ci/channels-pipeline/features.md, section 7).
 *
 * The switch is a setup file per package that calls graphty-element's own `setDefaultFeatures(["all"])`
 * (no environment variable, no build constant). This file holds the two pieces the configs and the CI
 * matrix share:
 *   FEATURES_DECLARED  whether graphty-element declares any experiment; while it declares none, On would
 *                      equal Off, so no On project and no On shard exists at all.
 *   withFeaturesOn()   a vitest projects list plus a "<name>-features-on" twin of each named project,
 *                      with the On setup file appended to its setupFiles.
 * Node imports the registry's TypeScript directly (type stripping, Node 22.18 and later); Vite's config
 * loader bundles it.
 */

import { FEATURES } from "../graphty-element/src/features/registry.ts";

/** True when graphty-element declares at least one experiment. */
export const FEATURES_DECLARED = FEATURES.length > 0;

/** The suffix of an On twin's vitest project name and CI shard name. */
export const ON_SUFFIX = "features-on";

/**
 * The variable the On shards set (GRAPHTY_FEATURES_ON=1): only then do the vitest configs hold the twins, so
 * a run with no --project filter (npm run test:run, coverage) never runs them.
 */
export const ON_ENV = "GRAPHTY_FEATURES_ON";

/**
 * One project's On twin: renamed, with `setupFile` last in its setupFiles. The browser config, its instances
 * and the define object are copied, because vitest writes into (or deletes from) the objects it is handed.
 * @param project a vitest inline project config
 * @param setupFile the setup file that switches every experiment on
 * @returns the twin
 */
export function featuresOnTwin(project, setupFile) {
    const { test } = project;
    const twin = {
        ...test,
        name: `${test.name}-${ON_SUFFIX}`,
        setupFiles: [...[test.setupFiles ?? []].flat(), setupFile],
    };
    if (test.browser) {
        twin.browser = { ...test.browser, instances: test.browser.instances?.map((i) => ({ ...i })) };
    }
    const copy = { ...project, test: twin };
    // vitest deletes the keys of the define object it is handed, so a shared one empties the second project's
    if (project.define) copy.define = { ...project.define };
    return copy;
}

/**
 * A projects list with an On twin of each named project appended, or the list unchanged unless an
 * experiment is declared and the run asked for the On configuration (GRAPHTY_FEATURES_ON=1).
 * @param projects vitest inline project configs
 * @param names the names of the projects to twin
 * @param setupFile the setup file that switches every experiment on
 * @param [declared] whether to add the twins (for tests)
 * @returns the projects to run
 */
export function withFeaturesOn(
    projects,
    names,
    setupFile,
    declared = FEATURES_DECLARED && process.env[ON_ENV] === "1",
) {
    if (!declared) {
        return projects;
    }
    const twins = projects.filter((p) => names.includes(p?.test?.name)).map((p) => featuresOnTwin(p, setupFile));
    return [...projects, ...twins];
}
