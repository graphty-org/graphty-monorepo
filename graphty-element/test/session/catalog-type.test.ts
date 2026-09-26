/**
 * @file `session.catalog` against the published catalogue type.
 *
 * `CatalogApi` names six methods nothing implements; they are deprecated and listed in
 * `DeprecatedCatalogMethod`. What a session hands out must be exactly the rest -- no method the
 * type promises and the object lacks, and no method the object has that the type does not name.
 * The type assertions are checked by `tsc`, the key assertion by running.
 */

import { assert, describe, expectTypeOf, it } from "vitest";

import type { CatalogApi, DeprecatedCatalogMethod } from "../../src/catalog/types";
import { createSessionCatalog } from "../../src/session/catalog";
import type { GraphSession, SessionCatalogApi } from "../../src/session/types";

/** The catalogue methods a session implements, written out rather than derived. */
const IMPLEMENTED = [
    "algorithms",
    "cameras",
    "formats",
    "layouts",
    "logSinks",
    "metrics",
    "palettes",
    "scales",
] as const satisfies readonly (keyof SessionCatalogApi)[];

describe("session.catalog", () => {
    it("is typed as the catalogue minus the deprecated methods", () => {
        expectTypeOf<GraphSession["catalog"]>().toEqualTypeOf<Omit<CatalogApi, DeprecatedCatalogMethod>>();
        expectTypeOf<keyof SessionCatalogApi>().toEqualTypeOf<Exclude<keyof CatalogApi, DeprecatedCatalogMethod>>();
        expectTypeOf<(typeof IMPLEMENTED)[number]>().toEqualTypeOf<keyof SessionCatalogApi>();
    });

    it("carries every method its type names, and nothing else", () => {
        const catalog = createSessionCatalog({ algorithms: () => [], estimate: () => ({}) as never, runs: () => [] });

        assert.sameMembers(Object.keys(catalog), [...IMPLEMENTED]);
        for (const name of IMPLEMENTED) {
            assert.isFunction(catalog[name], name);
        }
    });
});
