import { assert, describe, it } from "vitest";

import type { NodeId, Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { columnsFor, type ElementColumns, type SelectorSource, type SelectorTarget } from "../../../src/session/styles/predicate";
import { compileSelector,type Selector } from "../../../src/session/styles/selector";

/** One element's columns, as a plain bag of values keyed by the path the selector names. */
type Row = Readonly<Record<Path, unknown>>;

interface Harness {
    readonly source: SelectorSource;
    /** How many times a value column was read, so a test can prove nothing re-reads per element. */
    reads: number;
    /** How many times the presence test was answered by the source's own override. */
    presenceReads: number;
}

/**
 * A source over plain rows.
 *
 * `nodeHas` is deliberately NOT supplied unless a test asks for it, so the derived presence test
 * is what most of these exercise; the override has its own test.
 */
function makeSource(nodes: readonly Row[], edges: readonly Row[] = [], withPresence = false): Harness {
    const harness: Harness = {
        reads: 0,
        presenceReads: 0,
        source: {
            nodeValue: (index, path) => {
                harness.reads++;

                return nodes[index]?.[path];
            },
            edgeValue: (index, path) => {
                harness.reads++;

                return edges[index]?.[path];
            },
            nodeIdOf: (index) => `n${String(index)}` as NodeId,
            edgeIdOf: (index) => `e${String(index)}`,
        },
    };

    if (withPresence) {
        const source = harness.source as { nodeHas?: (index: number, path: Path) => boolean };
        source.nodeHas = (index, path) => {
            harness.presenceReads++;
            const value = nodes[index]?.[path];

            return value !== undefined && value !== null;
        };
    }

    return harness;
}

/** Which of the rows a selector paints, as a list of indices. */
function matched(selector: Selector, rows: readonly Row[], harness: Harness, target: SelectorTarget = "node"): number[] {
    const compiled = compileSelector(selector, target, harness.source);
    const hits: number[] = [];

    for (let index = 0; index < rows.length; index++) {
        if (compiled.test === null || compiled.test(index)) {
            hits.push(index);
        }
    }

    return hits;
}

/** The error a call throws, so a test can assert on its code rather than on its message. */
function refusalOf(call: () => unknown): { code: string; message: string; details: Record<string, unknown> } {
    let thrown: unknown;

    try {
        call();
    } catch (error) {
        thrown = error;
    }

    assert.isTrue(isGraphtyError(thrown), `expected a GraphtyError, got ${String(thrown)}`);
    if (!isGraphtyError(thrown)) {
        return assert.fail("expected the call to be refused");
    }

    return { code: thrown.code, message: thrown.message, details: { ...thrown.details } };
}

describe("selector shapes", () => {
    it("matches everything with no test at all", () => {
        const harness = makeSource([{}, {}, {}]);
        const compiled = compileSelector({ match: "everything" }, "node", harness.source);

        assert.strictEqual(compiled.test, null, "everything must be no test, not a test that always answers true");
        assert.deepStrictEqual([...compiled.paths], []);
        assert.strictEqual(harness.reads, 0);
    });

    it("matches the elements carrying a column value", () => {
        const rows: Row[] = [{ "results.louvain.group": 0 }, {}, { "results.louvain.group": null }, { "results.louvain.group": 7 }];
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "has", path: "results.louvain.group" }, rows, harness), [0, 3]);
    });

    it("reports the column a has selector reads", () => {
        const harness = makeSource([{}]);
        const compiled = compileSelector({ match: "has", path: "results.r1.value" }, "node", harness.source);

        assert.deepStrictEqual([...compiled.paths], ["results.r1.value"]);
    });

    it("uses a supplied presence test rather than reading the value", () => {
        const rows: Row[] = [{ "data.rank": 1 }, {}];
        const harness = makeSource(rows, [], true);

        assert.deepStrictEqual(matched({ match: "has", path: "data.rank" }, rows, harness), [0]);
        assert.strictEqual(harness.presenceReads, 2, "the override answers every element");
        assert.strictEqual(harness.reads, 0, "and the value column is never read");
    });

    it("matches the ids a node layer names, and ignores the edge list", () => {
        const rows: Row[] = [{}, {}, {}, {}];
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "ids", nodes: ["n1", "n3"], edges: ["e0"] }, rows, harness), [1, 3]);
    });

    it("matches the ids an edge layer names, and ignores the node list", () => {
        const rows: Row[] = [{}, {}, {}];
        const harness = makeSource([], rows);

        assert.deepStrictEqual(matched({ match: "ids", nodes: ["n0"], edges: ["e2"] }, rows, harness, "edge"), [2]);
    });

    it("paints nothing when an ids selector names nothing", () => {
        const rows: Row[] = [{}, {}];
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "ids" }, rows, harness), []);
    });

    it("reads the id per element, so a remap cannot leave it painting the wrong rows", () => {
        const ids: NodeId[] = ["a", "b", "c"];
        const source: SelectorSource = {
            nodeValue: () => undefined,
            edgeValue: () => undefined,
            nodeIdOf: (index) => ids[index],
        };
        const compiled = compileSelector({ match: "ids", nodes: ["b"] }, "node", source);

        assert.deepStrictEqual([0, 1, 2].filter((index) => compiled.test?.(index)), [1]);

        // The graph is re-frozen and "b" moves to row 2, which is what a removal does.
        ids[1] = "c";
        ids[2] = "b";

        assert.deepStrictEqual([0, 1, 2].filter((index) => compiled.test?.(index)), [2]);
    });
});

describe("the readers a selector is compiled against", () => {
    const source: SelectorSource = {
        nodeValue: (index, path) => (path === "data.rank" ? index : undefined),
        edgeValue: () => "edge",
        edgeHas: () => true,
    };

    it("reads the half of the source its target names", () => {
        const nodes: ElementColumns = columnsFor(source, "node");
        const edges: ElementColumns = columnsFor(source, "edge");

        assert.strictEqual(nodes.value(3, "data.rank"), 3);
        assert.strictEqual(edges.value(3, "data.rank"), "edge");
    });

    it("derives the presence test when the source supplies none", () => {
        const nodes: ElementColumns = columnsFor(source, "node");

        assert.isTrue(nodes.has(3, "data.rank"));
        assert.isFalse(nodes.has(3, "data.missing"));
    });

    it("prefers the source's own presence test when it supplies one", () => {
        const edges: ElementColumns = columnsFor(source, "edge");

        assert.isTrue(edges.has(0, "data.anything"));
    });

    it("answers null for the id reader a session cannot provide", () => {
        assert.strictEqual(columnsFor(source, "node").idOf, null);
    });
});

describe("selector refusals", () => {
    it("refuses a bare selector string, naming the object to write instead", () => {
        const harness = makeSource([]);
        const refusal = refusalOf(() =>
            compileSelector("data.type == 'host'" as unknown as Selector, "node", harness.source),
        );

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.include(refusal.message, 'match: "expression"');
    });

    it("refuses the empty string with the code that names the defect", () => {
        const harness = makeSource([]);
        const refusal = refusalOf(() => compileSelector("" as unknown as Selector, "node", harness.source));

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.include(refusal.message, 'match: "everything"');
    });

    it("refuses an empty expression rather than matching every element", () => {
        const harness = makeSource([]);
        const refusal = refusalOf(() => compileSelector({ match: "expression", where: "   " }, "node", harness.source));

        assert.strictEqual(refusal.code, "E_SELECTOR_EMPTY");
    });

    it("refuses an empty path", () => {
        const harness = makeSource([]);
        const refusal = refusalOf(() => compileSelector({ match: "has", path: "" }, "node", harness.source));

        assert.strictEqual(refusal.code, "E_SELECTOR_EMPTY");
    });

    it("refuses a match this union does not contain", () => {
        const harness = makeSource([]);
        const refusal = refusalOf(() =>
            compileSelector({ match: "all" } as unknown as Selector, "node", harness.source),
        );

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.deepStrictEqual(refusal.details.kinds, ["everything", "expression", "has", "ids"]);
    });

    it("refuses an id list that is not a list of ids", () => {
        const harness = makeSource([]);
        const refusal = refusalOf(() =>
            compileSelector({ match: "ids", nodes: [{ id: "n1" }] } as unknown as Selector, "node", harness.source),
        );

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.strictEqual(refusal.details.at, 0);
    });

    it("refuses an ids selector on a session that cannot say which id sits at which row", () => {
        const source: SelectorSource = { nodeValue: () => undefined, edgeValue: () => undefined };
        const refusal = refusalOf(() => compileSelector({ match: "ids", nodes: ["n1"] }, "node", source));

        assert.strictEqual(refusal.code, "E_UNSUPPORTED");
    });
});

describe("the expression subset: the shapes the element ships", () => {
    const rows: Row[] = [
        { "results.dijkstra.isInPath": true, "data.type": "host", "data.weight": 3 },
        { "results.dijkstra.isInPath": false, "data.type": "router", "data.weight": 9 },
        { "data.type": "host", "data.weight": 0 },
        { "results.dijkstra.isInPath": true, "data.weight": 12 },
    ];

    it("reads a presence test written as an expression", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "results.dijkstra.isInPath != `null`" }, rows, harness), [0, 1, 3]);
    });

    it("reads an equality against a literal", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "results.dijkstra.isInPath == `true`" }, rows, harness), [0, 3]);
    });

    it("reads a raw-string comparison", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "data.type == 'host'" }, rows, harness), [0, 2]);
    });

    it("reads a quoted attribute name, which is how a dashed run id is addressed", () => {
        const dashed: Row[] = [{ "results.min-cut.inCut": true }, { "results.min-cut.inCut": false }];
        const harness = makeSource(dashed);
        const selector: Selector = { match: "expression", where: 'results."min-cut".inCut == `true`' };

        assert.deepStrictEqual(matched(selector, dashed, harness), [0]);
        assert.deepStrictEqual([...compileSelector(selector, "node", harness.source).paths], ["results.min-cut.inCut"]);
    });

    it("treats a measured zero as a value, not as false", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "data.weight != `null`" }, rows, harness), [0, 1, 2, 3]);
        assert.deepStrictEqual(matched({ match: "expression", where: "data.weight" }, rows, harness), [0, 1, 2, 3]);
    });

    it("routes a null comparison through the presence test a columnar store can answer cheaply", () => {
        const harness = makeSource(rows, [], true);

        assert.deepStrictEqual(matched({ match: "expression", where: "results.dijkstra.isInPath != `null`" }, rows, harness), [0, 1, 3]);
        assert.strictEqual(harness.presenceReads, rows.length);
        assert.strictEqual(harness.reads, 0);
    });

    it("reads the column once per element and no more", () => {
        const harness = makeSource(rows);
        matched({ match: "expression", where: "data.weight > `2`" }, rows, harness);

        assert.strictEqual(harness.reads, rows.length, "one read per element means nothing is re-parsed or re-read");
    });
});

describe("the expression subset: semantics", () => {
    const rows: Row[] = [
        { "data.a": 1, "data.b": "x", "data.list": [1, 2] },
        { "data.a": 5, "data.b": "y", "data.list": [] },
        { "data.a": null, "data.b": "x", "data.list": [1, 2] },
        { "data.b": "x" },
    ];

    it("orders numbers and answers false for anything else", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "data.a > `1`" }, rows, harness), [1]);
        assert.deepStrictEqual(matched({ match: "expression", where: "data.a >= `1`" }, rows, harness), [0, 1]);
        assert.deepStrictEqual(matched({ match: "expression", where: "data.b > `1`" }, rows, harness), []);
    });

    it("combines with && and ||, and && binds tighter", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "data.a > `0` && data.b == 'x'" }, rows, harness), [0]);
        assert.deepStrictEqual(
            matched({ match: "expression", where: "data.a == `5` || data.b == 'x' && data.a == `1`" }, rows, harness),
            [0, 1],
        );
    });

    it("negates a parenthesised expression", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "!(data.b == 'x')" }, rows, harness), [1]);
    });

    it("weighs an empty list as false and a non-empty one as true, the way JMESPath does", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "data.list" }, rows, harness), [0, 2]);
    });

    it("compares a list literal structurally", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "data.list == `[1, 2]`" }, rows, harness), [0, 2]);
    });

    it("reads an absent column as null, which is what JMESPath calls a missing field", () => {
        const harness = makeSource(rows);

        assert.deepStrictEqual(matched({ match: "expression", where: "data.a == `null`" }, rows, harness), [2, 3]);
    });

    it("reports every column an expression reads, once each, in the order it names them", () => {
        const harness = makeSource(rows);
        const compiled = compileSelector(
            { match: "expression", where: "data.b == 'x' && data.a > `0` || data.b == 'y'" },
            "node",
            harness.source,
        );

        assert.deepStrictEqual([...compiled.paths], ["data.b", "data.a"]);
    });
});

describe("the expression subset: what it refuses", () => {
    const harness = makeSource([{}]);

    function refuse(where: string): { code: string; message: string; details: Record<string, unknown> } {
        return refusalOf(() => compileSelector({ match: "expression", where }, "node", harness.source));
    }

    it("refuses every construct outside the subset by name", () => {
        const cases: readonly [string, string][] = [
            ["data.tags[0]", "index, slice, wildcard and filter expressions"],
            ["data.items[?x > `1`]", "index, slice, wildcard and filter expressions"],
            ["data.*", "wildcards"],
            ["{a: data.a}", "multi-select hashes"],
            ["data.a, data.b", "multi-select lists"],
            ["data.a | data.b", "pipe expressions"],
            ["@", "the current-node reference"],
            ["&data.a", "expression references"],
        ];

        for (const [where, construct] of cases) {
            const refusal = refuse(where);
            assert.strictEqual(refusal.code, "E_BAD_SELECTOR", where);
            assert.include(refusal.message, construct, where);
            assert.isNumber(refusal.details.position, where);
        }
    });

    it("refuses a function call, naming the function", () => {
        const refusal = refuse("length(data.tags) > `2`");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.strictEqual(refusal.details.function, "length");
    });

    it("refuses ! on a dotted path, because JMESPath would not read it the obvious way", () => {
        const refusal = refuse("!data.flag");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.include(refusal.message, "!(data.flag)");
    });

    it("refuses a trailing dot, which jmespath 0.16.0 accepts in silence", () => {
        assert.strictEqual(refuse("data.").code, "E_BAD_SELECTOR");
        assert.strictEqual(refuse("data..a").code, "E_BAD_SELECTOR");
    });

    it("refuses a comparison with nothing on its right", () => {
        const refusal = refuse("data.a ==");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.strictEqual(refusal.details.position, 9);
    });

    it("refuses an unknown operator rather than crashing inside a parser", () => {
        assert.strictEqual(refuse("data.a === `1`").code, "E_BAD_SELECTOR");
    });

    it("refuses a bare number, and says where the backticks go", () => {
        const refusal = refuse("data.a == 5");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.include(refusal.message, "backticks");
        assert.strictEqual(refusal.details.position, 10);
    });

    it("refuses a literal that is not JSON rather than guessing it was a string", () => {
        const refusal = refuse("data.a == `host`");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.include(refusal.message, '`"host"`');
    });

    it("refuses an unterminated literal, an unterminated string and an unclosed paren", () => {
        assert.strictEqual(refuse("data.a == `1").code, "E_BAD_SELECTOR");
        assert.strictEqual(refuse("data.a == 'host").code, "E_BAD_SELECTOR");
        assert.strictEqual(refuse("(data.a == `1`").code, "E_BAD_SELECTOR");
    });

    it("refuses a quoted name carrying a dot, which no column key could tell apart", () => {
        const refusal = refuse('data."a.b" == `1`');

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.strictEqual(refusal.details.segment, "a.b");
    });

    it("refuses leftover input at the end", () => {
        const refusal = refuse("data.a `1`");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.strictEqual(refusal.details.position, 7);
    });

    it("carries the offending expression on every refusal, so a form can show it", () => {
        assert.strictEqual(refuse("data.tags[0]").details.where, "data.tags[0]");
    });
});

describe("the expression subset: expressions that ignore the element", () => {
    const harness = makeSource([{}]);

    function refuse(where: string): { code: string; message: string; details: Record<string, unknown> } {
        return refusalOf(() => compileSelector({ match: "expression", where }, "node", harness.source));
    }

    it("refuses a whole expression wrapped in single quotes, which is a string and always true", () => {
        const refusal = refuse("'algorithmResults.graphty.bipartite.inMatching == false'");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.include(refusal.message, "quoted string literal");
        assert.include(refusal.message, "always true");
        assert.include(refusal.message, "outer quotes");
    });

    it("refuses a literal true, and names the match-all selector instead", () => {
        const refusal = refuse("`true`");

        assert.strictEqual(refusal.code, "E_BAD_SELECTOR");
        assert.include(refusal.message, '{ match: "everything" }');
    });

    it("refuses any expression that reads no attribute, however it is dressed", () => {
        for (const where of ["(`true`)", "'a' == 'a'", "!(`false`)", "`1` > `0` && 'x'", "''"]) {
            assert.strictEqual(refuse(where).code, "E_BAD_SELECTOR", where);
        }
    });

    it("accepts a comparison against a literal, because it reads the element", () => {
        const rows: Row[] = [{ "data.a": false }, { "data.a": true }];

        assert.deepStrictEqual(matched({ match: "expression", where: "data.a == `false`" }, rows, makeSource(rows)), [0]);
    });
});
