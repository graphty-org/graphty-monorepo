import { assert, describe, it } from "vitest";

import type { OptionDescriptor, Scope } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import {
    algorithmSlug,
    assertRunId,
    canonicalIdentity,
    canonicalize,
    canonicalizeParams,
    computeScopeDigest,
    deriveRunId,
    RUN_ID_PATTERN,
    type RunIdentity,
    stableDigest,
} from "../../../src/session/runs";

const OPTIONS: readonly OptionDescriptor[] = [
    { name: "resolution", plainName: "Resolution", type: "number", default: 1 },
    { name: "iterations", plainName: "Iterations", type: "integer", default: 100 },
];

function identity(overrides: Partial<RunIdentity> = {}): RunIdentity {
    return {
        algorithm: "louvain",
        params: canonicalizeParams({}, OPTIONS),
        scope: "visible",
        seed: null,
        sample: null,
        exact: null,
        ...overrides,
    };
}

describe("canonicalize", () => {
    it("writes the same text whatever order the keys came in", () => {
        assert.strictEqual(canonicalize({ a: 1, b: 2 }), canonicalize({ b: 2, a: 1 }));
    });

    it("sorts nested keys too", () => {
        assert.strictEqual(canonicalize({ x: { p: 1, q: 2 } }), canonicalize({ x: { q: 2, p: 1 } }));
    });

    it("drops a key whose value is undefined", () => {
        assert.strictEqual(canonicalize({ a: 1, b: undefined }), canonicalize({ a: 1 }));
    });

    it("keeps array order, because an ordering is a parameter", () => {
        assert.notStrictEqual(canonicalize([1, 2]), canonicalize([2, 1]));
    });

    it("folds negative zero into zero", () => {
        assert.strictEqual(canonicalize(-0), canonicalize(0));
    });

    it("tells a number apart from the string that looks like it", () => {
        assert.notStrictEqual(canonicalize(1), canonicalize("1"));
    });

    it("writes NaN rather than the null JSON would have produced", () => {
        assert.strictEqual(canonicalize(Number.NaN), "NaN");
    });

    it("writes a date by its instant", () => {
        assert.strictEqual(canonicalize(new Date("2026-09-19T00:00:00.000Z")), "Date(2026-09-19T00:00:00.000Z)");
    });

    it("refuses a value it cannot write down rather than collapsing it to nothing", () => {
        try {
            canonicalize(() => undefined);
            assert.fail("a function should have no canonical form");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_BAD_COMMAND");
        }
    });
});

describe("canonicalizeParams", () => {
    it("fills in the declared defaults, so spelling one out changes nothing", () => {
        const left = canonicalizeParams({}, OPTIONS);
        const right = canonicalizeParams({ resolution: 1 }, OPTIONS);

        assert.deepStrictEqual(left, right);
        assert.strictEqual(left.resolution, 1);
        assert.strictEqual(left.iterations, 100);
    });

    it("puts the keys in a fixed order whatever order they arrived in", () => {
        const left = canonicalizeParams({ resolution: 2, iterations: 5 }, OPTIONS);
        const right = canonicalizeParams({ iterations: 5, resolution: 2 }, OPTIONS);

        assert.deepStrictEqual(Object.keys(left), Object.keys(right));
        assert.deepStrictEqual(Object.keys(left), ["iterations", "resolution"]);
    });

    it("keeps a parameter the descriptor does not declare, so a plugin's option still counts", () => {
        const params = canonicalizeParams({ custom: "yes" }, OPTIONS);

        assert.strictEqual(params.custom, "yes");
    });

    it("drops a parameter explicitly passed as undefined", () => {
        assert.deepStrictEqual(canonicalizeParams({ custom: undefined }, OPTIONS), canonicalizeParams({}, OPTIONS));
    });

    it("is frozen, so a caller cannot edit the parameters a run reports", () => {
        assert.isTrue(Object.isFrozen(canonicalizeParams({}, OPTIONS)));
    });
});

describe("deriveRunId", () => {
    it("matches the pattern a selector, a filename and a saved document all accept", () => {
        assert.match(deriveRunId(identity()), RUN_ID_PATTERN);
    });

    it("gives the same id to two calls that mean the same thing", () => {
        const left = deriveRunId(identity({ params: canonicalizeParams({ resolution: 1, iterations: 100 }, OPTIONS) }));
        const right = deriveRunId(identity({ params: canonicalizeParams({ iterations: 100 }, OPTIONS) }));

        assert.strictEqual(left, right);
    });

    it("is not a counter: deriving the same identity again gives the same id", () => {
        const first = deriveRunId(identity());
        const second = deriveRunId(identity({ params: canonicalizeParams({ resolution: 2 }, OPTIONS) }));
        const third = deriveRunId(identity());

        assert.strictEqual(first, third);
        assert.notStrictEqual(first, second);
    });

    it("changes when a parameter changes", () => {
        assert.notStrictEqual(
            deriveRunId(identity()),
            deriveRunId(identity({ params: canonicalizeParams({ resolution: 1.2 }, OPTIONS) })),
        );
    });

    it("changes when the scope changes", () => {
        assert.notStrictEqual(deriveRunId(identity()), deriveRunId(identity({ scope: "largest-component" })));
    });

    it("changes when the seed changes", () => {
        assert.notStrictEqual(deriveRunId(identity()), deriveRunId(identity({ seed: 7 })));
    });

    it("changes when the sample size or exactness changes", () => {
        assert.notStrictEqual(deriveRunId(identity()), deriveRunId(identity({ sample: 500 })));
        assert.notStrictEqual(deriveRunId(identity()), deriveRunId(identity({ exact: true })));
    });

    it("produces a usable id from a plugin key carrying a namespace", () => {
        assert.match(deriveRunId(identity({ algorithm: "acme:Triangles" })), RUN_ID_PATTERN);
    });

    it("does not confuse two plugin keys that share a slug", () => {
        assert.notStrictEqual(
            deriveRunId(identity({ algorithm: "acme:triangles" })),
            deriveRunId(identity({ algorithm: "acme-triangles" })),
        );
    });
});

describe("canonicalIdentity", () => {
    it("is equal exactly when two calls are the same run", () => {
        assert.strictEqual(canonicalIdentity(identity()), canonicalIdentity(identity()));
        assert.notStrictEqual(canonicalIdentity(identity()), canonicalIdentity(identity({ seed: 1 })));
    });
});

describe("algorithmSlug", () => {
    it("reduces a key to the run-id character class", () => {
        assert.strictEqual(algorithmSlug("acme:Triangles"), "acme-triangles");
        assert.strictEqual(algorithmSlug("shortest-path"), "shortest-path");
    });

    it("never starts with something a run id may not start with", () => {
        assert.strictEqual(algorithmSlug("2-hop"), "hop");
        assert.strictEqual(algorithmSlug("---"), "run");
        assert.strictEqual(algorithmSlug("123"), "run");
    });
});

describe("assertRunId", () => {
    it("accepts an id a person would write", () => {
        assert.strictEqual(assertRunId("my_run-1"), "my_run-1");
    });

    for (const bad of ["1run", "Run", "", "has space", "run.1", "-run"]) {
        it(`refuses ${JSON.stringify(bad)}`, () => {
            try {
                assertRunId(bad);
                assert.fail(`${JSON.stringify(bad)} should not be a run id`);
            } catch (error) {
                assert.isTrue(isGraphtyError(error));
                assert.strictEqual(isGraphtyError(error) ? error.code : "", "E_BAD_COMMAND");
            }
        });
    }
});

describe("computeScopeDigest", () => {
    const spec: Scope = "visible";

    it("does not depend on the order the members came out in", () => {
        assert.strictEqual(
            computeScopeDigest(spec, ["a", "b", "c"], []),
            computeScopeDigest(spec, ["c", "a", "b"], []),
        );
    });

    it("changes when a member arrives", () => {
        assert.notStrictEqual(computeScopeDigest(spec, ["a", "b"], []), computeScopeDigest(spec, ["a", "b", "c"], []));
    });

    it("changes when the specification changes even though the members do not", () => {
        assert.notStrictEqual(computeScopeDigest("visible", ["a"], []), computeScopeDigest("graph", ["a"], []));
    });

    it("tells the node 1 apart from the node \"1\"", () => {
        assert.notStrictEqual(computeScopeDigest(spec, [1], []), computeScopeDigest(spec, ["1"], []));
    });

    it("notices a swap that an exclusive-or on its own would cancel out", () => {
        assert.notStrictEqual(computeScopeDigest(spec, ["a", "b"], []), computeScopeDigest(spec, ["c", "d"], []));
    });

    it("keeps the node half and the edge half apart", () => {
        assert.notStrictEqual(computeScopeDigest(spec, ["a"], []), computeScopeDigest(spec, [], ["a"]));
    });
});

describe("stableDigest", () => {
    it("answers the same for the same text", () => {
        assert.strictEqual(stableDigest("betweenness"), stableDigest("betweenness"));
    });

    it("uses only characters a run id may carry", () => {
        assert.match(`x_${stableDigest("anything at all")}`, RUN_ID_PATTERN);
    });
});
