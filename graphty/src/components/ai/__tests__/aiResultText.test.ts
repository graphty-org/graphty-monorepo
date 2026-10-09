import { describe, expect, it } from "vitest";

import { aiResultText } from "../aiResultText";

describe("aiResultText", () => {
    it("shows the answer of a completed command", () => {
        expect(aiResultText({ success: true, message: "Laid out.", code: "AI_COMPLETED", params: {} })).toBe(
            "Laid out.",
        );
    });

    it("says what went wrong in the app's words, keyed by code", () => {
        const missing = { success: false, message: "Error: API key", code: "AI_KEY_MISSING" as const, params: {} };
        expect(aiResultText(missing)).toBe("Add an API key for this provider in Settings first.");
        expect(aiResultText({ success: false, message: "x", code: "AI_TOOL_FAILED", params: { tool: "t" } })).toBe(
            "The assistant could not answer.",
        );
    });

    it("falls back to the general text for a result with no code", () => {
        expect(aiResultText({ success: false, message: "x" })).toBe("The assistant could not answer.");
        expect(aiResultText({ success: true, message: "Laid out." })).toBe("Laid out.");
    });

    it("shows the error when the request itself threw", () => {
        const error = new Error("AI Manager not initialized");
        expect(aiResultText({ success: false, message: "", code: "AI_NOT_ENABLED", params: {}, error })).toBe(
            "AI Manager not initialized",
        );
    });
});
