/**
 * @file The caveat and partial-cause codes and their parameters (#866). The element writes no
 * sentences for them: an application words each code.
 */

import { assert, describe, it } from "vitest";

import { declaredCaveats } from "../../../src/algorithms/results/types";
import { caveat, noted } from "../../../src/session/runs/caveatFacts";

describe("a caveat fact", () => {
    it("is frozen with its parameters, and survives structuredClone", () => {
        const fact = caveat("route.found", { source: "A", target: 7 });

        assert.isTrue(Object.isFrozen(fact));
        assert.isTrue(Object.isFrozen(fact.params));
        assert.deepStrictEqual(structuredClone(fact), { code: "route.found", params: { source: "A", target: 7 } });
    });

    it("hands back the facts in one order, and no notes", () => {
        const { facts, notes } = noted([caveat("weights.unread"), caveat("community.resolution", { resolution: 1.5 })]);

        assert.deepStrictEqual(
            facts.map((fact) => fact.code),
            ["weights.unread", "community.resolution"],
        );
        assert.deepStrictEqual(notes, []);
    });
});

describe("declaredCaveats", () => {
    it("keeps the facts as codes, and only an extension's own sentences as notes", () => {
        const caveats = declaredCaveats({
            method: "mine",
            direction: "undirected",
            facts: [caveat("weights.unread")],
            notes: ["My own sentence."],
        });

        assert.deepStrictEqual(
            caveats.facts.map((fact) => fact.code),
            ["weights.unread"],
        );
        assert.deepStrictEqual(caveats.notes, ["My own sentence."]);
    });

    it("gives a run that states no facts an empty list", () => {
        const caveats = declaredCaveats({ method: "mine", direction: "undirected" });

        assert.deepStrictEqual(caveats.facts, []);
        assert.deepStrictEqual(caveats.notes, []);
    });

    it("keeps the partial cause as a code", () => {
        const caveats = declaredCaveats({
            method: "mine",
            direction: "undirected",
            partialCause: { code: "partial.iteration-cap", params: {} },
        });

        assert.deepStrictEqual(caveats.partialCause, { code: "partial.iteration-cap", params: {} });
    });
});
