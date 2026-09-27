import { assert, describe, it } from "vitest";

import {
    createGraphSession,
    type EdgeMember,
    type EdgeReading,
    type EdgeRef,
    type ElementSet,
    type ItemKey,
    parseScope,
    parseSetDefinition,
    type PathKind,
    type ResultItem,
    type ScopeInput,
    type SessionEventMap,
    type SetChange,
    type SetCombine,
    type SetCreatedFrom,
    type SetDefinition,
    type SetDefinitionInput,
    type SetId,
    type SetOperand,
    type SetsApi,
} from "../../session";

/**
 * The set vocabulary the entry point publishes so far, named once so that a missing export fails
 * the type check. The rest of the list (status, users, memberships, offers, layout options, the
 * scoped input) is added by the change that builds each.
 */
type PublishedSetTypes = [
    SetsApi,
    ElementSet,
    SetId,
    SetDefinition,
    EdgeReading,
    EdgeMember,
    EdgeRef,
    SetDefinitionInput,
    ScopeInput,
    ResultItem,
    ItemKey,
    SetCreatedFrom,
    SetOperand,
    PathKind,
    SetChange,
    SetCombine,
];

describe("the ./session entry point", () => {
    it("hands a consumer a working graph with one import and no renderer", () => {
        // This is the whole promise of the entry point: `import { createGraphSession } from
        // "@graphty/graphty-element/session"` in Node, and a graph that answers. The packaging
        // test proves no 3D engine is in the import graph; this one proves the module is useful.
        const session = createGraphSession();

        assert.isFunction(createGraphSession);
        assert.strictEqual(session.status.ready, true);
        assert.strictEqual(session.status.counts.nodes, 0);
        assert.isAbove(session.catalog.algorithms().length, 0);
        assert.strictEqual(session.data.statistics().components.count, 0);
        session.dispose();
    });

    it("publishes the set vocabulary, the two validators and the set:changed event", () => {
        const names: PublishedSetTypes["length"] = 16;
        const event: keyof SessionEventMap = "set:changed";
        const session = createGraphSession();

        assert.strictEqual(names, 16);
        assert.strictEqual(event, "set:changed");
        assert.isFunction(parseScope);
        assert.isFunction(parseSetDefinition);
        assert.deepStrictEqual(session.sets.list(), []);
        session.dispose();
    });
});
