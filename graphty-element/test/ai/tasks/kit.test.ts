/**
 * @file The task suite's answer checks: only the model's final words count, numbers match as
 * whole tokens, a yes/no fact is not affirmed by its negation, and a color word is graded by hue.
 */

import { assert, describe, it } from "vitest";

import { answered, assertAffirmed, isColorNamed, type MessageRecord } from "./kit";

/**
 * One message with a final text and a tool result.
 * @param text - The model's final words.
 * @param data - What a tool call read.
 * @returns The messages.
 */
function said(text: string, data?: unknown): MessageRecord[] {
    return [
        {
            prompt: "",
            calls: [],
            results: [{ tool: "query", outcome: "AI_COMPLETED", body: { code: "AI_OK", data } }],
            text,
            code: "AI_COMPLETED",
            inputTokens: 0,
            outputTokens: 0,
            turns: 1,
        },
    ];
}

describe("answered", () => {
    it("reads the final words, never a tool result", () => {
        assert.isFalse(answered(said("It has some nodes.", { nodes: 34 }), 34));
        assert.isTrue(answered(said("It has 34 nodes."), 34));
    });

    it("matches a number only as a whole token", () => {
        assert.isFalse(answered(said("329 genes"), 2));
        assert.isFalse(answered(said("a mean of 1.25"), 2));
        assert.isFalse(answered(said("12 of them"), 2));
        assert.isTrue(answered(said("2 genes."), 2));
        assert.isTrue(answered(said("degrees from 1 to 36."), 36));
        assert.isTrue(answered(said("about 1,234 edges"), 1234));
        assert.isTrue(answered(said("a mean of 6.60"), 6.597403));
    });

    it("matches a word at its start, so a prefix still serves", () => {
        assert.isFalse(answered(said("It is unweighted."), "weighted"));
        assert.isTrue(answered(said("The colors are communities."), "communit"));
    });
});

describe("assertAffirmed", () => {
    it("accepts the fact stated plainly", () => {
        assertAffirmed(said("Yes, it is directed, and the connections are weighted."), "directed");
        assertAffirmed(said("Yes, it is directed, and the connections are weighted."), "weighted");
    });

    it("rejects the opposite polarity, however it is said", () => {
        for (const text of ["It is undirected.", "It is not directed.", "It isn't directed.", "a non-directed graph"]) {
            assert.throws(() => assertAffirmed(said(text, { directed: true }), "directed"), /directed/, text);
        }

        assert.throws(() => assertAffirmed(said("The edges are unweighted."), "weighted"));
        assert.throws(() => assertAffirmed(said("No, they are not weighted."), "weighted"));
    });
});

describe("isColorNamed", () => {
    it("takes any blue a model may pick, in any spelling, and nothing else (#8836)", () => {
        for (const blue of [
            "#0000ff",
            "#2563EB",
            "#00f",
            "blue",
            "royalblue",
            "dodgerblue",
            "navy",
            { hex: "#2563eb" },
        ]) {
            assert.isTrue(isColorNamed(blue, "blue"), JSON.stringify(blue));
        }

        for (const other of ["#ff0000", "#808080", "#ffffff", "#000000", "#e0e8ff", "purple", "teal", undefined, 3]) {
            assert.isFalse(isColorNamed(other, "blue"), JSON.stringify(other));
        }
    });

    it("grades the other words the tasks ask for", () => {
        assert.isTrue(isColorNamed("#dc2626", "red"));
        assert.isTrue(isColorNamed("crimson", "red"));
        assert.isFalse(isColorNamed("#ffa500", "red"));
        assert.isTrue(isColorNamed("#f97316", "orange"));
        assert.isTrue(isColorNamed("gold", "gold"));
        assert.isTrue(isColorNamed("#eab308", "gold"));
        assert.isFalse(isColorNamed("#0000ff", "gold"));
        assert.isTrue(isColorNamed("#111111", "black"));
        assert.isTrue(isColorNamed("black", "black"));
        assert.isFalse(isColorNamed("#333333", "black"));
    });
});
