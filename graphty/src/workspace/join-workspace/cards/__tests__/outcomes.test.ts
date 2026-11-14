/**
 * The join cards' answers: how a step's choices read as an answer, which answer a suggestion
 * tags, and a card's title and match line.
 */

import type { JoinInput, JoinReduce } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { cardTitle, countOf, guessOf, isNewKey, listOf, matchLine, outcomeOf, perPair } from "../outcomes";

const INPUTS: readonly JoinInput[] = [
    { key: "held:1", name: "door_entries.csv", held: true, columns: ["entry_id", "person_id"], rows: 3 },
];

describe("join card answers", () => {
    it("reads each shape as its answer", () => {
        assert.strictEqual(outcomeOf({ keys: [], shape: "node-values" }), "fields");
        assert.strictEqual(outcomeOf({ keys: [], shape: "merge" }), "fields");
        assert.strictEqual(outcomeOf({ keys: [], shape: "edges" }), "edge");
        assert.strictEqual(outcomeOf({ keys: [], shape: "row-nodes" }), "node");
        assert.strictEqual(outcomeOf({ keys: [], shape: "link" }), "links");
    });

    it("tags any of the four answers as the guess, never one with no key", () => {
        const key = { file: "person_id", graph: "id" };
        assert.strictEqual(guessOf({ shape: "edges", keys: [key, key], confident: true }), "edge");
        assert.strictEqual(guessOf({ shape: "node-values", keys: [key], confident: true }), "fields");
        assert.strictEqual(guessOf({ shape: "row-nodes", keys: [key, key, key], confident: true }), "node");
        assert.strictEqual(guessOf({ shape: "link", keys: [key], confident: true }), "links");
        assert.isUndefined(guessOf({ shape: "rows", keys: [], confident: false }));
    });

    it("words Per pair, List and Count as the element's reductions", () => {
        assert.deepEqual(perPair([{ file: "person_id", graph: "id" }]), {
            aggregate: Object.fromEntries<JoinReduce>([["person_id", "count"]]),
            names: { "person_id (count)": "count" },
        });
        assert.deepEqual(perPair([]), {});
        assert.deepEqual(listOf(["phone", "email"]), { phone: "list", email: "list" });
        assert.deepEqual(countOf("account_id", "logins"), {
            aggregate: Object.fromEntries<JoinReduce>([["account_id", "count"]]),
            names: { "account_id (count)": "logins count" },
            columns: [],
        });
    });

    it("titles a card by its table and answer, and lines up its matches", () => {
        assert.strictEqual(cardTitle({ from: "held:1" }, INPUTS), "door_entries -> ?");
        const choices = {
            shape: "row-nodes" as const,
            keys: [
                { file: "person_id", graph: "id" },
                { file: "door", graph: "id", unknown: "add" as const, kind: "door" },
            ],
        };
        assert.strictEqual(cardTitle({ from: "held:1", choices }, INPUTS), "door_entries -> nodes");
        assert.strictEqual(matchLine(choices), "person_id = id, door new");
        assert.isTrue(isNewKey(choices.keys[1]));
        assert.isFalse(isNewKey(choices.keys[0]));
    });
});
