import { describe, expect, it } from "vitest";

import { keyed, titleCase } from "../text";

// Shared by the algorithm catalog's and the layout metadata's category labels.
describe("titleCase", () => {
    it("capitalises each hyphen-separated word", () => {
        expect(titleCase("link-prediction")).toBe("Link Prediction");
        expect(titleCase("centrality")).toBe("Centrality");
        expect(titleCase("")).toBe("");
    });
});

// The React keys of the assistant's source lists and approval lines, where a value may repeat.
describe("keyed", () => {
    it("numbers a repeated value so every key is unique, and keeps the order", () => {
        expect(keyed(["a", "b", "a"], (value) => value)).toEqual([
            { key: "a#0", item: "a" },
            { key: "b#0", item: "b" },
            { key: "a#1", item: "a" },
        ]);
    });
});
