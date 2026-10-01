/**
 * @file The dependency walk of design/sets/sets-design.md section 5.2, for the `scope` leaf and
 * every other leaf kind, and the chains that find cycles through kept sets, saved scopes and the
 * visibility filter.
 */

import { assert, describe, it } from "vitest";

import type { Path, RuleTree, Scope, SetDefinition } from "../../../src/catalog/types";
import {
    dependenciesOf,
    type DependencySources,
    selectionChain,
    setCycle,
    visibilityCycle,
} from "../../../src/session/sets/dependencies";
import { compileExpressionPredicate, type ElementColumns } from "../../../src/session/styles/predicate";

const rule = (where: RuleTree | string, reading: "induced" | "listed" | "clipped" = "clipped"): SetDefinition => ({
    kind: "rule",
    where,
    reading,
});

/**
 * The paths the compiled expression reads: the compiler the query engine and the style layers use.
 * @returns The reader.
 */
function compiledPaths(): (where: string) => readonly Path[] {
    const columns: ElementColumns = { value: () => undefined, has: () => false, idOf: null };

    return (where) => compileExpressionPredicate(where, columns).paths;
}

describe("what a definition reads", () => {
    const pathsOf = compiledPaths();

    it("reads each leaf kind's dependency, one of each", () => {
        const tree: RuleTree = {
            kind: "all",
            of: [
                { kind: "expression", where: "data.score > `1` && results.pr.rank < `3`" },
                { kind: "edges", where: "data.weight > `0.5`" },
                { kind: "range", attribute: "data.score", min: 0 },
                { kind: "categories", attribute: "data.type.name", values: ["x"] },
                { kind: "degree", min: 1 },
                { kind: "component", id: 0 },
                { kind: "neighborhood", seeds: ["a"], depth: 1 },
                { kind: "not", of: { kind: "member", of: { set: "set_core" } } },
                {
                    kind: "any",
                    of: [
                        { kind: "member", of: "visible" },
                        { kind: "member", of: "selection" },
                    ],
                },
                { kind: "member", of: "largest-component" },
                { kind: "member", of: { where: "results.louvain.community == `3`" } },
                { kind: "member", of: { define: rule({ kind: "member", of: { set: "set_inner" } }) } },
            ],
        };

        assert.deepStrictEqual(dependenciesOf(rule(tree), pathsOf), [
            { kind: "attribute", field: "score" },
            { kind: "run", run: "pr" },
            { kind: "attribute", field: "weight" },
            { kind: "attribute", field: "type" },
            { kind: "topology" },
            { kind: "set", id: "set_core" },
            { kind: "visible" },
            { kind: "selection" },
            { kind: "run", run: "louvain" },
            { kind: "set", id: "set_inner" },
        ]);
    });

    it("records an item without execution as following its run, and one with it as holding that execution", () => {
        const tree: RuleTree = {
            kind: "any",
            of: [
                { kind: "item", item: { result: "louvain", key: { field: "group", value: 3 }, run: "s1:7" } },
                { kind: "item", item: { result: "route", key: { field: "onPath", value: true } } },
                { kind: "threshold", path: "results.pr.rank", top: 10 },
                { kind: "threshold", path: "data.revenue.usd", above: 5 },
            ],
        };

        assert.deepStrictEqual(dependenciesOf(rule(tree), pathsOf), [
            { kind: "run", run: "louvain", execution: "s1:7" },
            { kind: "run", run: "route" },
            { kind: "run", run: "pr" },
            { kind: "attribute", field: "revenue" },
        ]);
    });

    it("reads a query rule's paths, and nothing for a fixed set or a path", () => {
        assert.deepStrictEqual(dependenciesOf(rule("results.pr.rank > `0.1`"), pathsOf), [{ kind: "run", run: "pr" }]);
        assert.deepStrictEqual(dependenciesOf({ kind: "fixed", nodes: ["a"], reading: "induced" }, pathsOf), []);
        assert.deepStrictEqual(dependenciesOf({ kind: "path", nodes: ["a", "b"] }, pathsOf), []);
    });

    it("reads a scope and a visibility filter the same way", () => {
        assert.deepStrictEqual(dependenciesOf({ set: "set_a" }), [{ kind: "set", id: "set_a" }]);
        assert.deepStrictEqual(dependenciesOf("selection"), [{ kind: "selection" }]);
        assert.deepStrictEqual(dependenciesOf({ kind: "member", of: "visible" }), [{ kind: "visible" }]);
    });
});

describe("the dependency graph: kept sets, saved scopes, the visibility filter and the selection", () => {
    /**
     * Sources over plain maps.
     * @param referents - What each id names.
     * @param filter - The visibility filter in force.
     * @returns The sources.
     */
    const sourcesOf = (
        referents: readonly (readonly [string, SetDefinition | Scope])[],
        filter: RuleTree | null = null,
    ): DependencySources => ({
        referent: (id) => new Map(referents).get(id),
        visibility: () => filter,
    });

    it("finds a set reaching itself through other sets and saved scopes", () => {
        const sources = sourcesOf([
            ["set_a", rule({ kind: "member", of: { set: "saved_b" } })],
            ["saved_b", { define: rule({ kind: "member", of: { set: "set_a" } }) }],
        ]);

        assert.deepStrictEqual(setCycle("set_a", rule({ kind: "member", of: { set: "saved_b" } }), sources), [
            "saved_b",
            "set_a",
        ]);
        assert.isNull(
            setCycle("set_c", rule({ kind: "member", of: { set: "saved_b" } }), sources),
            "a ring elsewhere is not this set's cycle",
        );
    });

    it("follows visible into the visibility filter when a set is written", () => {
        const sources = sourcesOf([], { kind: "member", of: { set: "set_a" } });

        assert.deepStrictEqual(setCycle("set_a", rule({ kind: "member", of: "visible" }), sources), [
            "visible",
            "set_a",
        ]);
    });

    it("finds a filter reaching visible or search through any chain", () => {
        const sources = sourcesOf([
            ["set_a", rule({ kind: "member", of: { set: "set_b" } })],
            [
                "set_b",
                rule({
                    kind: "any",
                    of: [
                        { kind: "degree", min: 1 },
                        { kind: "member", of: "search" as Scope },
                    ],
                }),
            ],
            ["set_c", rule({ kind: "member", of: "visible" })],
        ]);

        assert.deepStrictEqual(visibilityCycle({ kind: "member", of: { set: "set_a" } }, sources), [
            "set_a",
            "set_b",
            "search",
        ]);
        assert.deepStrictEqual(
            visibilityCycle({ kind: "not", of: { kind: "member", of: { set: "set_c" } } }, sources),
            ["set_c", "visible"],
        );
        assert.isNull(visibilityCycle({ kind: "degree", min: 1 }, sources));
    });

    it("finds a live selection, but not through the visible graph", () => {
        const sources = sourcesOf(
            [
                ["saved_sel", "selection"],
                ["set_v", rule({ kind: "member", of: "visible" })],
            ],
            { kind: "member", of: "selection" },
        );

        assert.deepStrictEqual(selectionChain(rule({ kind: "member", of: { set: "saved_sel" } }), sources), [
            "saved_sel",
            "selection",
        ]);
        assert.isNull(
            selectionChain(rule({ kind: "member", of: { set: "set_v" } }), sources),
            "a set may follow what is visible",
        );
    });

    it("terminates on a ring it meets on the way", () => {
        const sources = sourcesOf([
            ["set_a", rule({ kind: "member", of: { set: "set_b" } })],
            ["set_b", rule({ kind: "member", of: { set: "set_a" } })],
        ]);

        assert.isNull(visibilityCycle({ kind: "member", of: { set: "set_a" } }, sources));
    });
});
