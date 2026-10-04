import { assert, describe, it } from "vitest";

import { loadSetDefinition, parseSetDefinition } from "../../../src/catalog/sets/parse";
import type { EdgeReading, Scope, SetCombine, SetCreatedFrom, SetDefinition } from "../../../src/catalog/types";
import type { RuleTree } from "../../../src/session/visibility/filter";

// Each record is typed by the union it lists, so the compiler fails this file when a union gains
// or loses a member and the list here is not updated with it.
const DEFINITION_KINDS: Record<SetDefinition["kind"], true> = { fixed: true, rule: true, path: true };
const LEAF_KINDS: Record<RuleTree["kind"], true> = {
    expression: true,
    range: true,
    categories: true,
    degree: true,
    component: true,
    neighborhood: true,
    isolated: true,
    edges: true,
    member: true,
    item: true,
    threshold: true,
    all: true,
    any: true,
    not: true,
};
const SCOPE_KEYWORDS: Record<Extract<Scope, string>, true> = {
    visible: true,
    graph: true,
    selection: true,
    "largest-component": true,
};
const CREATED_FROM_KINDS: Record<SetCreatedFrom["kind"], true> = {
    user: true,
    selection: true,
    scope: true,
    result: true,
    combine: true,
};
const READINGS: Record<EdgeReading, true> = { induced: true, listed: true, clipped: true };
const COMBINES: Record<SetCombine, true> = {
    union: true,
    intersection: true,
    difference: true,
    "symmetric-difference": true,
};

describe("the colon rule: no built-in kind contains a colon, and a plugin's kind is <package>:<kind>", () => {
    it.each([
        ["definition kinds", DEFINITION_KINDS],
        ["leaf kinds", LEAF_KINDS],
        ["Scope keywords", SCOPE_KEYWORDS],
        ["created-from kinds", CREATED_FROM_KINDS],
        ["readings", READINGS],
        ["combine operations", COMBINES],
    ])("keeps every one of the built-in %s colon-free", (_what, kinds) => {
        for (const kind of Object.keys(kinds)) {
            assert.notInclude(kind, ":", `"${kind}" is built in, so it must not contain a colon`);
        }
    });

    it("refuses a plugin leaf in door mode and keeps it opaque in load mode", () => {
        const value = {
            kind: "rule",
            reading: "clipped",
            where: { kind: "not", of: { kind: "acme-graph:fuzzy", score: 0.5 } },
        };

        assert.throws(() => parseSetDefinition(value), /acme-graph:fuzzy/);
        assert.deepEqual(loadSetDefinition(value).opaque, { first: "acme-graph:fuzzy" });
    });

    it("refuses a plugin definition kind in door mode and keeps it opaque in load mode", () => {
        const value = { kind: "acme-graph:bag", items: [1] };

        assert.throws(() => parseSetDefinition(value), /acme-graph:bag/);
        assert.deepEqual(loadSetDefinition(value).opaque, { first: "acme-graph:bag" });
    });
});
