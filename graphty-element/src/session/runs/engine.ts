/**
 * @file Which versions produced a number.
 *
 * Every run record carries the versions of the three packages that could have changed its result,
 * because "this value disagrees with the one in my saved document" has no answer without them. A
 * centrality that was normalised differently two releases ago, a layout whose seeding changed, a
 * convergence threshold that moved -- each is invisible in the number itself and obvious beside a
 * version.
 *
 * The versions are stated here rather than read from the package manifests because a manifest is
 * not reachable from a module that has to resolve in a browser, in Node and inside a bundle with
 * no file system. Keep them in step with `graphty-element/package.json`,
 * `algorithms/package.json` and `layout/package.json`; a session built by a host that knows
 * better passes its own through `createGraphSession`.
 */

import type { EngineVersions } from "./types";

/** The versions a run reports when nothing told the session otherwise. */
export const ENGINE_VERSIONS: EngineVersions = Object.freeze({
    element: "1.10.0",
    algorithms: "1.4.0",
    layout: "1.3.0",
});
