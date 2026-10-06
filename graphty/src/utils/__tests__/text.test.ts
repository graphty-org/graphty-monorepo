import { describe, expect, it } from "vitest";

import { titleCase } from "../text";

// Shared by the algorithm catalog's and the layout metadata's category labels.
describe("titleCase", () => {
    it("capitalises each hyphen-separated word", () => {
        expect(titleCase("link-prediction")).toBe("Link Prediction");
        expect(titleCase("centrality")).toBe("Centrality");
        expect(titleCase("")).toBe("");
    });
});
