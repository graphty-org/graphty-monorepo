import { assert, describe, it } from "vitest";

import { chipName, chipWords, filterChangeWords, type Namer, ruleWords, statusWords } from "../filterWords";

const NAMES: Namer = { attribute: (path) => path.replace("data.", ""), node: (id) => String(id) };
const SHOWING = { visibleNodes: 9, totalNodes: 22, visibleEdges: 14, totalEdges: 30 };

describe("the Filters words", () => {
    it("reads each step as one sentence", () => {
        assert.equal(ruleWords({ kind: "range", attribute: "data.weight", min: 4 }, NAMES), "weight is at least 4");
        assert.equal(ruleWords({ kind: "range", attribute: "data.weight", max: 2.5 }, NAMES), "weight is at most 2.5");
        // A tier 4 degree leaf reads as its step's row does, never "a rule".
        assert.equal(ruleWords({ kind: "degree", min: 4 }, NAMES), "Degree min 4");
        assert.equal(ruleWords({ kind: "degree", min: 3, max: 7, direction: "in" }, NAMES), "In degree 3 to 7");
        assert.equal(ruleWords({ kind: "isolated" }, NAMES), "Isolated");
        assert.equal(
            ruleWords({ kind: "range", attribute: "data.age", min: 20, max: 30, nodes: "ends" }, NAMES),
            "age is between 20 and 30",
        );
        assert.equal(
            ruleWords({ kind: "categories", attribute: "data.team", values: ["red", "blue"] }, NAMES),
            "team is red or blue",
        );
        assert.equal(ruleWords({ kind: "member", of: "largest-component" }, NAMES), "in the largest component");
        // A neighborhood leads with its hop count, so a cut row still tells two steps apart.
        assert.equal(ruleWords({ kind: "neighborhood", seeds: ["Ava"], depth: 1 }, NAMES), "within 1 hop of Ava");
        assert.equal(
            ruleWords({ kind: "neighborhood", seeds: ["Ava", "Ben"], depth: 1 }, NAMES),
            "within 1 hop of 2 nodes",
        );
        assert.equal(ruleWords({ kind: "neighborhood", seeds: ["Ava"], depth: 2 }, NAMES), "within 2 hops of Ava");
    });

    it("reads every rule a condition card makes as a sentence", () => {
        const text = (mode: "substring" | "starts-with" | "ends-with" | "exact") =>
            ruleWords({ kind: "text", reads: "data.name", mode, text: "Mme" }, NAMES);
        assert.equal(text("substring"), "name contains Mme");
        assert.equal(text("starts-with"), "name starts with Mme");
        assert.equal(text("ends-with"), "name ends with Mme");
        assert.equal(text("exact"), "name is Mme");
        const has = { kind: "text", reads: "data.email", mode: "regex", text: "" } as const;
        assert.equal(ruleWords(has, NAMES), "email has a value");
        assert.equal(ruleWords({ kind: "not", of: has }, NAMES), "email has no value");
        assert.equal(
            ruleWords(
                {
                    kind: "any",
                    of: [
                        { kind: "categories", attribute: "data.role", values: ["board"] },
                        { kind: "not", of: { ...has, reads: "data.role" } },
                    ],
                },
                NAMES,
            ),
            "role is board or role has no value",
        );
        assert.equal(
            ruleWords({ kind: "threshold", path: "data.donations", top: 5, ties: "all" }, NAMES),
            "donations is among the highest 5",
        );
    });

    it("names the chip and the status line, the edges too when a card hides by an edge value", () => {
        assert.equal(chipWords(SHOWING), "9 of 22 nodes");
        assert.equal(chipWords(SHOWING, true), "9 of 22 nodes, 14 of 30 edges");
        assert.equal(statusWords(true, SHOWING), "Filter on: 9 of 22 nodes, 14 edges");
        assert.equal(statusWords(false, SHOWING), "Filter off");
    });

    it("names the card an Undo or Redo took back, for a condition's codes and a step's", () => {
        assert.equal(
            filterChangeWords("visibility.condition-off", "weight is at least 4"),
            'turning off the filter "weight is at least 4"',
        );
        assert.equal(
            filterChangeWords("visibility.condition-add", "weight is at least 4"),
            'adding the filter "weight is at least 4"',
        );
        assert.equal(filterChangeWords("visibility.step-edit", "x"), 'editing the filter "x"');
        assert.isNull(filterChangeWords("visibility.filter", "x"));
    });

    it("names the cards that are on in the chip's name and tooltip", () => {
        assert.equal(
            chipName("9 of 22 nodes", ["weight is at least 4"]),
            'Filter: 9 of 22 nodes, showing only "weight is at least 4"',
        );
        assert.equal(
            chipName("9 of 22 nodes", ["weight is at least 4", "in the largest component"]),
            'Filter: 9 of 22 nodes, showing only "weight is at least 4", "in the largest component"',
        );
    });
});
