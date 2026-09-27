/**
 * @file `{ define }`: a scope carrying a set definition inline, accepted at every write position
 * that takes a scope, validated by `parseScope`, and given the run id of the older form it equals
 * (design/sets/sets-design.md sections 15.1 and 15.2).
 */

import { assert, describe, it } from "vitest";

import { parseScope } from "../../../src/catalog/sets/parse";
import type { Scope, SetDefinition } from "../../../src/catalog/types";
import { type GraphtyError, isGraphtyError } from "../../../src/errors";
import { scopeResolverOfSession } from "../../../src/session/GraphSession";
import { deriveRunId, type RunIdentity } from "../../../src/session/runs/runId";
import { edgeBetween, type Harness, makeSession } from "../helpers";

/**
 * The refusal a call throws.
 * @param call - The call.
 * @returns The error.
 */
function refusal(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        if (isGraphtyError(error)) {
            return error;
        }

        throw error;
    }

    throw new Error("the call did not refuse");
}

/**
 * A path a-b-c-d with a type on a and b.
 * @returns The harness.
 */
function harnessOf(): Harness {
    const harness = makeSession({ directed: false });
    harness.add(
        [{ id: "a", type: "host" }, { id: "b", type: "host" }, { id: "c" }, { id: "d" }],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
        ],
    );

    return harness;
}

const PAIR: SetDefinition = { kind: "fixed", nodes: ["b", "a"], reading: "induced" };

describe("parseScope, door mode", () => {
    it("returns every form older than { define } as it was given", () => {
        for (const scope of [
            "visible",
            "graph",
            "selection",
            "largest-component",
            { set: "set_a" },
            { where: "data.x > `1`" },
            { nodes: ["b", "a"] },
        ] as Scope[]) {
            assert.strictEqual(parseScope(scope), scope);
        }
    });

    it("canonicalises an inline definition", () => {
        assert.deepStrictEqual(parseScope({ define: PAIR }), {
            define: { kind: "fixed", nodes: ["a", "b"], reading: "induced" },
        });
        assert.deepStrictEqual(
            parseScope({
                define: { kind: "rule", where: { kind: "expression", where: "data.x > `1`" }, reading: "induced" },
            }),
            {
                define: { kind: "rule", where: "data.x > `1`", reading: "induced" },
            },
        );
    });

    it("refuses the reserved keyword search, and names it", () => {
        const error = refusal(() => parseScope("search"));
        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.deepStrictEqual(error.details, { field: "search", reserved: true });
    });

    it("refuses an unknown keyword, an unknown form, a reserved field and a malformed form", () => {
        for (const value of [
            "everything",
            { within: "graph" },
            { set: "set_a", graph: "g" },
            { set: "" },
            { where: " " },
            { nodes: "a" },
            3,
            null,
        ]) {
            assert.strictEqual(refusal(() => parseScope(value)).code, "E_BAD_COMMAND", JSON.stringify(value));
        }
    });

    it("refuses an inline rule read induced that holds an edge-speaking leaf", () => {
        const error = refusal(() =>
            parseScope({ define: { kind: "rule", where: { kind: "member", of: "visible" }, reading: "induced" } }),
        );
        assert.strictEqual(error.details?.reason, "induced-edge-leaf");
    });
});

describe("{ define } at every write position", () => {
    it("scope.resolve and scope.count", async () => {
        const harness = harnessOf();
        const resolved = await harness.session.scope.resolve({ define: PAIR });
        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...resolved.edges], [edgeBetween(harness, "a", "b")]);
        assert.deepStrictEqual(await harness.session.scope.count({ define: PAIR }), {
            nodes: 2,
            edges: 1,
            exact: true,
        });
        assert.strictEqual(
            refusal(() =>
                harness.session.scope.count({ define: { kind: "fixed", nodes: "a" } as unknown as SetDefinition }),
            ).code,
            "E_BAD_COMMAND",
        );
    });

    it("accepts session edge ids inside an inline definition and resolves their edges", async () => {
        const harness = harnessOf();
        const bc = edgeBetween(harness, "b", "c");
        const resolved = await harness.session.scope.resolve({
            define: { kind: "fixed", nodes: [], edges: [bc], reading: "listed" },
        });

        assert.deepStrictEqual([...resolved.nodes].sort(), ["b", "c"]);
        assert.deepStrictEqual([...resolved.edges], [bc]);
        assert.deepStrictEqual(
            resolved.spec,
            {
                define: {
                    kind: "fixed",
                    nodes: [],
                    edges: [{ source: "b", target: "c", id: `graphty:e${bc}` }],
                    reading: "listed",
                },
            },
            "the getter holds the stable form",
        );
    });

    it("camera framing reads the node ids of an inline definition", () => {
        const harness = harnessOf();
        assert.deepStrictEqual([...scopeResolverOfSession(harness.session).nodeIdsOf({ define: PAIR })].sort(), [
            "a",
            "b",
        ]);
    });

    it("selection targets", async () => {
        const harness = harnessOf();
        await harness.session.selection.apply({
            scope: { define: { kind: "rule", where: "data.type == 'host'", reading: "induced" } },
        });

        assert.isTrue(harness.session.selection.has("a"));
        assert.isTrue(harness.session.selection.has("b"));
        assert.isFalse(harness.session.selection.has("c"));
    });

    it("run options, under the id of the older form the definition equals", async () => {
        const harness = harnessOf();
        const inline = harness.session.runs.start("degree", undefined, { scope: { define: PAIR } });
        const legacy = harness.session.runs.start("degree", undefined, { scope: { nodes: ["a", "b"] } });
        assert.strictEqual(inline.id, legacy.id);

        // The scope was accepted: the run fails only because this session has no executor.
        const error = await inline.then(
            () => null,
            (failure: unknown) => failure,
        );
        assert.isTrue(isGraphtyError(error));
        assert.strictEqual(isGraphtyError(error) ? error.code : null, "E_UNSUPPORTED");
    });
});

describe("derived run ids", () => {
    const identity = (scope: Scope): RunIdentity => ({
        algorithm: "degree",
        params: {},
        scope,
        seed: null,
        sample: null,
        exact: null,
    });

    it("give an inline definition the id of the older form it equals", () => {
        assert.strictEqual(deriveRunId(identity({ define: PAIR })), deriveRunId(identity({ nodes: ["a", "b"] })));
        assert.strictEqual(
            deriveRunId(
                identity({
                    define: { kind: "rule", where: { kind: "expression", where: "data.x > `1`" }, reading: "induced" },
                }),
            ),
            deriveRunId(identity({ where: "data.x > `1`" })),
        );
    });

    it("keep a definition that equals no older form apart", () => {
        const listed = deriveRunId(identity({ define: { ...PAIR, reading: "listed" } }));
        assert.notStrictEqual(listed, deriveRunId(identity({ nodes: ["a", "b"] })));
        assert.notStrictEqual(
            deriveRunId(identity({ define: { kind: "rule", where: "data.x > `1`", reading: "clipped" } })),
            deriveRunId(identity({ where: "data.x > `1`" })),
        );
        assert.strictEqual(
            listed,
            deriveRunId(identity({ define: { kind: "fixed", nodes: ["a", "b", "a"], reading: "listed" } })),
            "canonical first",
        );
    });
});
