/**
 * The condition cards read back exactly the rule they write, for every card kind on both sides,
 * so a card a reader set comes back the same from the element's selector or filter step.
 */

import { assert, describe, it } from "vitest";

import {
    type Card,
    type CardField,
    cardOf,
    cardsOf,
    leafOf,
    newCard,
    ruleOf,
    selectorOf,
    selectorRule,
} from "../cards";

const FIELDS: CardField[] = [
    { path: "data.score", on: "node", kind: "number", name: "score", range: { min: 0, max: 10 } },
    { path: "data.dept", on: "node", kind: "category", name: "dept" },
    { path: "data.note", on: "node", kind: "text", name: "note" },
    { path: "data.ok", on: "node", kind: "yes-no", name: "ok" },
    { path: "data.weight", on: "edge", kind: "number", name: "weight" },
    { path: "data.my type", on: "edge", kind: "category", name: "my type" },
    { path: "data.label", on: "edge", kind: "text", name: "label" },
    { path: "data.live", on: "edge", kind: "yes-no", name: "live" },
    { path: "data.secret", on: "node", kind: "text", name: "secret", hidden: true },
];

/**
 * The field with this name.
 * @param name - the name.
 * @returns the field.
 */
const field = (name: string): CardField => {
    const found = FIELDS.find((f) => f.name === name);
    if (found === undefined) {
        throw new Error(name);
    }
    return found;
};

const CARDS: Card[] = [
    { ...newCard(field("score")), min: 2 } as Card,
    { type: "number", key: "node:data.score", field: field("score"), min: 1, max: 4.5 },
    { type: "category", key: "node:data.dept", field: field("dept"), values: ["east", "west"] },
    { type: "text", key: "node:data.note", field: field("note"), mode: "contains", text: "it's \\ odd" },
    { type: "text", key: "node:data.note", field: field("note"), mode: "is", text: "exact" },
    { type: "yes-no", key: "node:data.ok", field: field("ok"), yes: false },
    { type: "number", key: "edge:data.weight", field: field("weight"), max: 3 },
    { type: "number", key: "edge:data.weight", field: field("weight"), min: -1, max: 3 },
    { type: "category", key: "edge:data.my type", field: field("my type"), values: ["a`b", "c"] },
    { type: "text", key: "edge:data.label", field: field("label"), mode: "contains", text: "x" },
    { type: "yes-no", key: "edge:data.live", field: field("live"), yes: true },
    { type: "text", key: "node:data.secret", field: field("secret"), mode: "is", text: "s" },
];

describe("condition cards", () => {
    it("read back every card they write", () => {
        CARDS.forEach((card, at) => {
            const leaf = leafOf(card);
            assert.isNotNull(leaf, `card ${String(at)}`);
            if (leaf !== null) {
                assert.deepEqual(cardOf(leaf, FIELDS, at), card, `card ${String(at)}`);
            }
        });
    });

    it("write the element's own leaves, edge cards read on edges, never a query", () => {
        assert.deepEqual(leafOf(CARDS[5]), { kind: "flag", attribute: "data.ok", value: false });
        assert.deepEqual(leafOf(CARDS[3]), {
            kind: "text",
            attribute: "data.note",
            match: "contains",
            text: "it's \\ odd",
        });
        assert.deepEqual(leafOf(CARDS[6]), { kind: "range", attribute: "data.weight", max: 3, side: "edges" });
        assert.deepEqual(leafOf(CARDS[8]), {
            kind: "categories",
            attribute: "data.my type",
            values: ["a`b", "c"],
            side: "edges",
        });
        for (const card of CARDS) {
            const kind = leafOf(card)?.kind;
            assert.notInclude(["expression", "edges"], kind);
        }
    });

    it("start a yes/no card with no value, so it writes no rule until one is picked", () => {
        const card = newCard(field("ok"));
        assert.strictEqual(card.type, "yes-no");
        assert.isNull(leafOf(card));
        // A number card starts over the whole range: a rule at once.
        assert.deepEqual(leafOf(newCard(field("score"))), { kind: "range", attribute: "data.score", min: 0, max: 10 });
    });

    it("keep a card on a hidden field readable, not a fixed Rule", () => {
        const card = cardOf({ kind: "text", attribute: "data.secret", match: "is", text: "s" }, FIELDS, 0);
        assert.strictEqual(card.type, "text");
    });

    it("make no rule while unfinished, and AND finished cards in a selector", () => {
        assert.isNull(leafOf(newCard(field("dept"))));
        assert.isNull(leafOf(newCard(field("note"))));
        assert.deepEqual(selectorOf([newCard(field("dept"))]), { match: "everything" });
        const both = [CARDS[1], CARDS[2]];
        const selector = selectorOf(both);
        const rule = selectorRule(selector);
        assert.deepEqual(rule, ruleOf(both));
        assert.deepEqual(cardsOf(rule ?? null, FIELDS), both);
    });

    it("keep a leaf no card edits as a fixed card", () => {
        const card = cardOf({ kind: "degree", min: 2 }, FIELDS, 0);
        assert.strictEqual(card.type, "fixed");
        assert.deepEqual(leafOf(card), { kind: "degree", min: 2 });
        assert.isUndefined(selectorRule({ match: "has", path: "data.score" }));
    });
});
