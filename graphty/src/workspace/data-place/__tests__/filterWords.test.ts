import { assert, describe, it } from "vitest";

import {
    applyName,
    chipWords,
    historyNotice,
    type Namer,
    outcomeWords,
    ruleWords,
    statusWords,
} from "../filterWords";

const NAMES: Namer = { attribute: (path) => path.replace("data.", ""), node: (id) => String(id) };
const SHOWING = { visibleNodes: 9, totalNodes: 22, visibleEdges: 14 };

describe("the Filters words", () => {
    it("reads each step as one sentence", () => {
        assert.equal(ruleWords({ kind: "range", attribute: "data.weight", min: 4 }, NAMES), "weight is at least 4");
        assert.equal(ruleWords({ kind: "range", attribute: "data.weight", max: 2.5 }, NAMES), "weight is at most 2.5");
        assert.equal(
            ruleWords({ kind: "range", attribute: "data.age", min: 20, max: 30, nodes: "ends" }, NAMES),
            "age is between 20 and 30",
        );
        assert.equal(
            ruleWords({ kind: "categories", attribute: "data.team", values: ["red", "blue"] }, NAMES),
            "team is red or blue",
        );
        assert.equal(ruleWords({ kind: "member", of: "largest-component" }, NAMES), "in the largest component");
        assert.equal(ruleWords({ kind: "neighborhood", seeds: ["Ava"], depth: 1 }, NAMES), "neighbors of Ava");
        assert.equal(ruleWords({ kind: "neighborhood", seeds: ["Ava", "Ben"], depth: 1 }, NAMES), "neighbors of 2 nodes");
    });

    it("gives a step's outcome, and says off in words for a step that is off", () => {
        assert.equal(outcomeWords(true, 22, 9), "22 to 9 nodes");
        assert.equal(outcomeWords(false, 22, 9), "off");
        assert.equal(outcomeWords(true, undefined, 9), "");
    });

    it("names the checkbox, the chip and the status line", () => {
        assert.equal(applyName("weight is at least 4"), "Apply step: weight is at least 4");
        assert.equal(chipWords(SHOWING), "9 of 22 nodes");
        const on = [{ id: "a", on: true, rule: { kind: "isolated" } as const }];
        assert.equal(statusWords(on, SHOWING), "Filter on: 9 of 22 nodes, 14 edges");
        assert.equal(statusWords([{ ...on[0], on: false }], SHOWING), "Filter off");
    });

    it("names the step an Undo or Redo took back", () => {
        assert.equal(
            historyNotice("visibility.step-off", "weight is at least 4", true),
            'Undid turning off "weight is at least 4".',
        );
        assert.equal(historyNotice("visibility.step-add", "weight is at least 4", false), 'Redid adding "weight is at least 4".');
        assert.isNull(historyNotice("visibility.filter", "x", true));
    });
});
