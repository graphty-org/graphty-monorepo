import { describe, expect, it } from "vitest";

import { feedbackComponentExtensions } from "../../src/theme/components/feedback";

describe("feedbackComponentExtensions", () => {
    it("exports Loader extension", () => {
        expect(feedbackComponentExtensions.Loader).toBeDefined();
    });

    it("exports Progress extension", () => {
        expect(feedbackComponentExtensions.Progress).toBeDefined();
    });

    it("exports RingProgress extension", () => {
        expect(feedbackComponentExtensions.RingProgress).toBeDefined();
    });

    it("exports exactly 3 feedback components", () => {
        const components = Object.keys(feedbackComponentExtensions);
        expect(components).toHaveLength(3);
        expect(components).toContain("Loader");
        expect(components).toContain("Progress");
        expect(components).toContain("RingProgress");
    });
});
