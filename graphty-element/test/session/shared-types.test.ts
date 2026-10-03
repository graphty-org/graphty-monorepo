/**
 * @file The shared vocabulary the tier 1 element items build on: a column named literally, a
 * run's result addressed by run and optional field, the one text matcher, the per-revision cache,
 * the progress event, and the unknown-element code. The `{ ids }` and `{ top }`/`{ above }`
 * widenings are in `selection/targets.test.ts`.
 */

import { assert, describe, it } from "vitest";

import type { AttributeDescriptor } from "../../src/catalog/types";
import { GRAPHTY_ERROR_CODES, isGraphtyError } from "../../src/errors";
import {
    type CodedFact,
    type ColumnRef,
    createGraphSession,
    type ProgressChange,
    type ResultRef,
} from "../../src/session";
import { resolveColumn } from "../../src/session/columns";
import { RevisionCache } from "../../src/session/revision";
import { quotePath } from "../../src/session/styles";
import { matchText, normalizeText } from "../../src/session/text";
import { makeSession } from "./helpers";

/** The code a call refused with, or null when it did not refuse. */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("ColumnRef", () => {
    it("is what data.attributes() already hands out, so a descriptor passes as is", () => {
        const harness = makeSession();
        harness.add([{ id: "a", department: "ops" }]);
        const attribute: AttributeDescriptor | undefined = harness.session.data
            .attributes()
            .find((candidate) => candidate.name === "department");
        assert.isDefined(attribute);
        const ref: ColumnRef = attribute;

        assert.strictEqual(resolveColumn(harness.session.data.attributes(), ref), attribute);
        assert.strictEqual(
            resolveColumn(harness.session.data.attributes(), { kind: "node", name: "department" }),
            attribute,
            "a literal name finds the same column",
        );
        harness.session.dispose();
    });

    it("refuses an unknown column with E_UNKNOWN_ATTRIBUTE and the nearest names", () => {
        const harness = makeSession();
        harness.add([{ id: "a", department: "ops" }], [{ src: "a", dst: "a", trips: 3 }]);
        const attributes = harness.session.data.attributes();

        try {
            resolveColumn(attributes, { kind: "node", name: "departmnt" });
            assert.fail("an unknown column must throw");
        } catch (error) {
            assert.isTrue(isGraphtyError(error));
            if (isGraphtyError(error)) {
                assert.strictEqual(error.code, "E_UNKNOWN_ATTRIBUTE");
                assert.deepInclude(error.details, { kind: "node", name: "departmnt" });
                assert.include(error.details?.candidates as readonly string[], "department");
            }
        }

        assert.strictEqual(
            codeOf(() => resolveColumn(attributes, { kind: "node", name: "trips" })),
            "E_UNKNOWN_ATTRIBUTE",
            "an edge column is not a node column of the same name",
        );
        harness.session.dispose();
    });
});

describe("an attribute's path reads back as the column it names", () => {
    // A spreadsheet header is not an identifier. Every name below must reach the same column
    // through attributes().path and quotePath(), and a name shaped like an expression must not
    // read some other column.
    const NAMES = ["shared chapters", "a.b", "min-cut", "w || data.secret", "say \"hi\""];

    for (const name of NAMES) {
        it(`selects by the column ${JSON.stringify(name)}`, async () => {
            const harness = makeSession();
            harness.add([
                { id: "x", [name]: "yes", secret: "no" },
                { id: "y", [name]: "no", secret: "yes" },
            ]);
            const attribute = harness.session.data.attributes().find((candidate) => candidate.name === name);
            assert.isDefined(attribute);

            await harness.session.selection.apply({ where: `${quotePath(attribute?.path ?? "")} == 'yes'` });

            assert.deepStrictEqual([...harness.session.selection.nodes], ["x"]);
            harness.session.dispose();
        });
    }
});

describe("ResultRef", () => {
    it("names a run and, optionally, one of its fields", () => {
        const primary: ResultRef = { run: "degree" };
        const named: ResultRef = { run: "louvain", field: "group" };

        assert.isUndefined(primary.field);
        assert.strictEqual(named.field, "group");
    });
});

describe("CodedFact", () => {
    it("carries a code and plain parameters, and nothing a reader would read as words", () => {
        const fact: CodedFact<"legend.higher"> = {
            code: "legend.higher",
            params: { channel: "node.color", field: "value", ascending: true, channels: ["a", "b"] },
        };

        assert.deepStrictEqual(Object.keys(fact).sort(), ["code", "params"]);
        assert.doesNotThrow(() => structuredClone(fact));
    });
});

describe("the text matcher", () => {
    it("normalizes case, accents and spacing", () => {
        assert.strictEqual(normalizeText("  Cr\u00e8me   BRULEE "), "creme brulee");
        assert.strictEqual(normalizeText("\ufb01le"), "file", "compatibility forms fold too");
    });

    it("ranks a whole value first, then the start of a word, then anywhere", () => {
        const query = normalizeText("brokers");

        assert.strictEqual(matchText(query, normalizeText("Brokers")), "whole");
        assert.strictEqual(matchText(query, normalizeText("information brokers list")), "word-start");
        assert.strictEqual(matchText(query, normalizeText("power-brokers")), "word-start", "a hyphen starts a word");
        assert.strictEqual(matchText(query, normalizeText("stockbrokers")), "anywhere");
        assert.isNull(matchText(query, normalizeText("broker")));
        assert.isNull(matchText("", "anything"), "an empty query matches nothing");
    });

    it("finds a later word start when an earlier occurrence is mid-word", () => {
        assert.strictEqual(matchText("art", normalizeText("smart art")), "word-start");
    });
});

describe("RevisionCache", () => {
    it("builds once per revision and key, and starts over when the revision moves", () => {
        let revision = 1;
        let builds = 0;
        const cache = new RevisionCache<number>(() => revision);
        const build = (): number => ++builds;

        assert.strictEqual(cache.get("a", build), 1);
        assert.strictEqual(cache.get("a", build), 1, "same revision, same key: no rebuild");
        assert.strictEqual(cache.get("b", build), 2, "another key builds its own");

        revision = 2;
        assert.strictEqual(cache.get("a", build), 3, "a new revision drops every key");
        assert.strictEqual(builds, 3);
    });
});

describe("E_UNKNOWN_ELEMENT", () => {
    it("is one of the element's error codes", () => {
        assert.include(GRAPHTY_ERROR_CODES, "E_UNKNOWN_ELEMENT");
    });
});

describe("progress:changed", () => {
    it("reports a load on a session with no renderer, and says when it ends", async () => {
        const session = createGraphSession();
        const seen: ProgressChange[] = [];
        session.on("progress:changed", (change) => {
            seen.push(change);
        });

        const data = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });
        await session.data.import({ type: "json", config: { data } });

        assert.isAbove(seen.length, 1, "at least one step and the end");
        assert.isTrue(seen.every((change) => change.task === "load"));
        const last = seen.at(-1);
        assert.strictEqual(last?.phase, "end");
        assert.strictEqual(last?.completed, 3, "two node records and one edge record");
        assert.doesNotThrow(() => structuredClone(seen));
        session.dispose();
    });

    it("reports a run's progress under the run's id", async () => {
        const harness = makeSession({
            runs: {
                execute: async (context) => {
                    context.report({ phase: "measuring", completed: 1, total: 2 });
                    await Promise.resolve();
                    throw new Error("stop here: only the progress is under test");
                },
            },
        });
        harness.add([{ id: "a" }]);
        const seen: ProgressChange[] = [];
        harness.session.on("progress:changed", (change) => {
            seen.push(change);
        });

        await harness.session.runs.start("degree", undefined, { as: "deg" }).then(
            () => undefined,
            () => undefined,
        );

        const progress = seen.find((change) => change.phase === "progress" && change.completed === 1);
        assert.deepInclude(progress, { task: "run", run: "deg", completed: 1, total: 2, fraction: 0.5 });
        assert.strictEqual(seen.at(-1)?.phase, "end");
        harness.session.dispose();
    });
});
