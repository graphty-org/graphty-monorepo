/**
 * A new card's letter: after the last letter in use, never one a deleted card left free, so a card
 * added at the bottom never reads as the card that was deleted from the top.
 */

import type { UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { addBranch, duplicateBranch, removeBranch } from "../model";

const empty: UnionLeaf = { kind: "union", side: "nodes", within: "graph", branches: [] };

const names = (rule: UnionLeaf): (string | undefined)[] => rule.branches.map((branch) => branch.name);

/**
 * Adds cards one by one.
 * @param count - how many.
 * @returns the selection.
 */
function cards(count: number): UnionLeaf {
    let rule = empty;
    for (let at = 0; at < count; at++) {
        ({ rule } = addBranch(rule));
    }
    return rule;
}

describe("card letters", () => {
    it("a card added after deleting A of A, B, C is D, at the bottom", () => {
        const three = cards(3);
        assert.deepEqual(names(three), ["A", "B", "C"]);
        const left = removeBranch(three, three.branches[0].id ?? "");
        assert.deepEqual(names(addBranch(left).rule), ["B", "C", "D"]);
    });

    it("a copy takes the letter after the last one in use", () => {
        const three = cards(3);
        const left = removeBranch(three, three.branches[0].id ?? "");
        assert.deepEqual(names(duplicateBranch(left, left.branches[0].id ?? "").rule), ["B", "D", "C"]);
    });

    it("letters run on past Z", () => {
        assert.deepEqual(names(cards(28)).slice(-3), ["Z", "AA", "AB"]);
    });
});
