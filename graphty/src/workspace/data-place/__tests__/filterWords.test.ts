import { assert, describe, it } from "vitest";

import {
    applyName,
    applyTip,
    cancelledWords,
    chipTip,
    chipWords,
    type Namer,
    outcomeWords,
    ruleWords,
    savedWords,
    saveLabel,
    statusWords,
    stepChangeWords,
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
        // A neighborhood leads with its hop count, so a cut row still tells two steps apart.
        assert.equal(ruleWords({ kind: "neighborhood", seeds: ["Ava"], depth: 1 }, NAMES), "within 1 hop of Ava");
        assert.equal(
            ruleWords({ kind: "neighborhood", seeds: ["Ava", "Ben"], depth: 1 }, NAMES),
            "within 1 hop of 2 nodes",
        );
        assert.equal(ruleWords({ kind: "neighborhood", seeds: ["Ava"], depth: 2 }, NAMES), "within 2 hops of Ava");
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
            stepChangeWords("visibility.step-off", "weight is at least 4"),
            'turning off "weight is at least 4"',
        );
        assert.equal(stepChangeWords("visibility.step-add", "weight is at least 4"), 'adding "weight is at least 4"');
        assert.isNull(stepChangeWords("visibility.filter", "x"));
    });

    it("says a save, which turns the step on", () => {
        assert.equal(savedWords("weight is at least 4"), 'Saved "weight is at least 4". The step is on.');
        assert.equal(cancelledWords(null), "Step not added.");
        assert.equal(cancelledWords("weight is at least 4"), 'Not saved: "weight is at least 4" is as it was.');
    });

    it("says what the checkbox and the save button do", () => {
        assert.equal(applyTip(true), "Turn this step off");
        assert.equal(applyTip(false), "Turn this step on");
        assert.equal(saveLabel(true), "Save step");
        assert.equal(saveLabel(false), "Save and turn on");
    });

    it("names the steps that are on in the chip's tooltip", () => {
        assert.equal(
            chipTip(["weight is at least 4"]),
            'Showing only: "weight is at least 4". Click to open Filters, where you can turn it off.',
        );
        assert.equal(
            chipTip(["weight is at least 4", "in the largest component"]),
            'Showing only: "weight is at least 4", "in the largest component". Click to open Filters, where you can turn them off.',
        );
    });
});
