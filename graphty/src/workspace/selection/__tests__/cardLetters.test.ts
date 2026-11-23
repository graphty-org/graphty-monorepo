/**
 * A new card's letter: after the last letter in use, never one a deleted card left free, so a card
 * added at the bottom never reads as the card that was deleted from the top.
 */

import type { UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { addBranch, duplicateBranch, editBranch, removeBranch } from "../model";

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

    it("a name the reader typed is kept when it is the last card, and never sets the next letter", () => {
        const two = cards(2);
        const typed = editBranch(two, two.branches[1].id ?? "", { name: "X" });
        assert.isUndefined(typed.branches[1].autoName, "a typed name is not automatic");
        assert.deepEqual(names(addBranch(typed).rule), ["A", "X", "B"]);
        assert.deepEqual(names(removeBranch(typed, typed.branches[0].id ?? "")), ["X"]);
        assert.deepEqual(names(removeBranch(typed, typed.branches[1].id ?? "")), [undefined]);
    });

    it("letters run on past Z", () => {
        assert.deepEqual(names(cards(28)).slice(-3), ["Z", "AA", "AB"]);
    });
});
