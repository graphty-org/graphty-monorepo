/**
 * @file Which code produced a number.
 *
 * Every run record, and the layout, carries the packages whose code could have changed its result,
 * at the versions that ran, because "this value disagrees with the one in my saved document" has no
 * answer without them. A centrality that was normalized differently two releases ago, a layout
 * whose seeding changed, a convergence threshold that moved -- each is invisible in the number
 * itself and obvious beside a version. A seed reproduces a result only under the same engine.
 *
 * Every version is read from the package itself, never typed in here. A manifest is not reachable
 * from a module that has to resolve in a browser, in Node and inside a bundle with no file system,
 * so graphty-element's own version is written in at build time: Vite's `define` replaces
 * `__GRAPHTY_ELEMENT_VERSION__` with `package.json`'s version (`vite.config.ts`,
 * `vite.bundle.config.ts`, `vitest.config.ts`). The sibling packages export `VERSION`, which their
 * own builds stamp (`tools/stamp-package-version.mjs`). Source compiled without either reports
 * `0.0.0`. A session built by a host that knows better passes its own through `createGraphSession`.
 */

import { VERSION as ALGORITHMS_VERSION } from "@graphty/algorithms";
import { VERSION as LAYOUT_VERSION } from "@graphty/layout";

import type { GraphAccelerator } from "../../acceleration/types";
import type { EngineVersions } from "./types";

/** graphty-element's version, from `package.json`, written in by the build's `define`. */
declare const __GRAPHTY_ELEMENT_VERSION__: string | undefined;

/** graphty-element's version, from its `package.json`; `0.0.0` from source built without it. */
export const ELEMENT_VERSION: string =
    typeof __GRAPHTY_ELEMENT_VERSION__ === "string" ? __GRAPHTY_ELEMENT_VERSION__ : "0.0.0";

/** The packages an algorithm run reports when nothing told the session otherwise. */
export const RUN_ENGINE: EngineVersions = Object.freeze({
    packages: Object.freeze({
        "@graphty/graphty-element": ELEMENT_VERSION,
        "@graphty/algorithms": ALGORITHMS_VERSION,
    }),
});

/** The packages a layout reports when nothing told the session otherwise. */
export const LAYOUT_ENGINE: EngineVersions = Object.freeze({
    packages: Object.freeze({
        "@graphty/graphty-element": ELEMENT_VERSION,
        "@graphty/layout": LAYOUT_VERSION,
    }),
});

/**
 * An engine with the attached accelerator's package added, when that accelerator names one.
 * @param base - The engine without it.
 * @param accelerator - The attached accelerator, or null when none is attached.
 * @returns The engine.
 */
export function withAcceleratorPackage(base: EngineVersions, accelerator: GraphAccelerator | null): EngineVersions {
    const pkg = accelerator?.package;
    return pkg === undefined ? base : { ...base, packages: { ...base.packages, [pkg.name]: pkg.version } };
}
