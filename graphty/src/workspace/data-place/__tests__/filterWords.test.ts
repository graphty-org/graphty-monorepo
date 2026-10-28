import { assert, describe, it } from "vitest";

import {
    applyName,
    applyTip,
    cancelledWords,
    chipTip,
    chipWords,
    missingTip,
    type Namer,
    notAddedWords,
    outcomeWords,
    overEdges,
    ruleWords,
    savedWords,
    saveLabel,
    statusWords,
    stepChangeWords,
} from "../filterWords";

const NAMES: Namer = { attribute: (path) => path.replace("data.", ""), node: (id) => String(id) };
const SHOWING = { visibleNodes: 9, totalNodes: 22, visibleEdges: 14, totalEdges: 30 };

describe("the Filters words", () => {
    it("names what the step editor's disabled submit waits for", () => {
        assert.equal(missingTip("attribute"), "Add a condition first");
        assert.equal(missingTip("value"), "Type a value first");
        assert.equal(missingTip("nodes"), "Select a node first");
        assert.equal(missingTip("change"), "Nothing changed since the last save");
    });

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

    it("reads every rule a condition card makes as a sentence, and an edge text step as over edges", () => {
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
        const edgeText = {
            id: "s",
            on: true,
            rule: { kind: "text", reads: "data.kind", mode: "substring", text: "a", nodes: "ends" },
        } as const;
        assert.isTrue(overEdges(edgeText));
    });

    it("says a new step left without Add step was not added", () => {
        assert.equal(
            notAddedWords("role is board"),
            'Filter step not added: "role is board". Press Add step to use a step.',
        );
        assert.equal(notAddedWords(null), "Filter step not added. Press Add step to use a step.");
    });

    it("gives a step's outcome, and says off in words for a step that is off", () => {
        const before = { nodes: 22, edges: 41 };
        const after = { nodes: 9, edges: 20 };
        assert.equal(outcomeWords(true, before, after), "22 to 9 nodes");
        assert.equal(outcomeWords(false, before, after), "off");
        assert.equal(outcomeWords(true, undefined, after), "");
        assert.equal(outcomeWords(true, before, after, true), "22 to 9 nodes, 41 to 20 edges");
    });

    it("names both counts for a step over an edge column, on its row and on the chip", () => {
        const edge = {
            id: "e",
            on: true,
            rule: { kind: "range", attribute: "data.weight", min: 3, nodes: "ends" },
        } as const;
        const node = { id: "n", on: true, rule: { kind: "range", attribute: "data.age", min: 3 } } as const;
        assert.isTrue(overEdges(edge));
        assert.isFalse(overEdges(node));
        assert.equal(chipWords(SHOWING, [edge]), "9 of 22 nodes, 14 of 30 edges");
        // A mix keeps the nodes and adds the edges; an edge step that is off does not count.
        assert.equal(chipWords(SHOWING, [edge, node]), "9 of 22 nodes, 14 of 30 edges");
        assert.equal(chipWords(SHOWING, [node]), "9 of 22 nodes");
        assert.equal(chipWords(SHOWING, [{ ...edge, on: false }, node]), "9 of 22 nodes");
        assert.equal(statusWords([edge], SHOWING), "Filter on: 9 of 22 nodes, 14 edges");
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
            'turning off the filter step "weight is at least 4"',
        );
        assert.equal(
            stepChangeWords("visibility.step-add", "weight is at least 4"),
            'adding the filter step "weight is at least 4"',
        );
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
