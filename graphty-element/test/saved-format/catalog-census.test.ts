/**
 * @file The catalog census: every catalog of built-ins the session lists, and every fixed list a
 * module declares through `builtInIdsForTesting()`, has been decided -- it is a self-contained
 * kind (a row of `SELF_CONTAINED_KINDS`), a known exception whose `catalogs` name it, or a
 * catalog a file never names (`notSaved`, with the reason). A new catalog fails here until
 * someone decides where it belongs (design/architecture/self-contained-save-files.md, section 2.3).
 */

import { assert, describe, it } from "vitest";

import { SESSION_CATALOG_TABLES } from "../../src/session/catalog";
import { builtInModuleIds } from "./builtInIds";
import { SELF_CONTAINED_KINDS } from "./kinds";
import lists from "./saved-format-lists.json";

describe("the catalog census", () => {
    it("places every catalog in exactly one of the self-contained kinds, the exceptions and notSaved", async () => {
        const catalogs = new Set([
            ...Object.keys(SESSION_CATALOG_TABLES).filter((key) => key !== "fixed" && key !== "source"),
            ...(await builtInModuleIds()).map((each) => each.kind),
        ]);
        const placed = [
            ...SELF_CONTAINED_KINDS.map((row) => row.kind),
            ...lists.exceptions.flatMap((each) => each.catalogs),
            ...Object.keys(lists.notSaved),
        ];
        const undecided = [...catalogs].filter((kind) => !placed.includes(kind));
        assert.deepEqual(undecided, [], "decide where each new catalog belongs in saved-format-lists.json");
        const twice = placed.filter((kind, at) => placed.indexOf(kind) !== at);
        assert.deepEqual(twice, [], "a catalog is placed once");
        const unknown = placed.filter((kind) => !catalogs.has(kind));
        assert.deepEqual(unknown, [], "every placed catalog exists");
    });

    it("gives every exception a finding and a tracking issue, and every reason a sentence", () => {
        for (const each of lists.exceptions) {
            assert.isAbove(each.finding.length, 0, each.kind);
            // Only an entry that is not a defect (its finding says so) goes without an issue.
            if (!each.finding.startsWith("Not a dependency")) {
                assert.isNumber(each.issue, `${each.kind} has a tracking issue`);
            }
        }

        for (const [kind, reason] of Object.entries(lists.notSaved)) {
            assert.isAbove(reason.length, 0, kind);
        }
    });
});
