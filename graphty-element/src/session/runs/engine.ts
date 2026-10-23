/**
 * @file Which versions produced a number.
 *
 * Every run record carries the versions of the three packages that could have changed its result,
 * because "this value disagrees with the one in my saved document" has no answer without them. A
 * centrality that was normalised differently two releases ago, a layout whose seeding changed, a
 * convergence threshold that moved -- each is invisible in the number itself and obvious beside a
 * version.
 *
 * A manifest is not reachable from a module that has to resolve in a browser, in Node and inside a
 * bundle with no file system, so graphty-element's own version is written in at build time: Vite's
 * `define` replaces `__GRAPHTY_ELEMENT_VERSION__` with `package.json`'s version (`vite.config.ts`,
 * `vite.bundle.config.ts`, `vitest.config.ts`). Source compiled without that define reports
 * `0.0.0`. The other two are stated here; keep them in step with `algorithms/package.json` and
 * `layout/package.json`. A session built by a host that knows better passes its own through
 * `createGraphSession`.
 */

import type { EngineVersions } from "./types";

/** graphty-element's version, from `package.json`, written in by the build's `define`. */
declare const __GRAPHTY_ELEMENT_VERSION__: string | undefined;

/** The versions a run reports when nothing told the session otherwise. */
export const ENGINE_VERSIONS: EngineVersions = Object.freeze({
    element: typeof __GRAPHTY_ELEMENT_VERSION__ === "string" ? __GRAPHTY_ELEMENT_VERSION__ : "0.0.0",
    algorithms: "1.4.0",
    layout: "1.3.0",
});
