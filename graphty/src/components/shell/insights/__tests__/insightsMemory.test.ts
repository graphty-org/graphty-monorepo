import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    DEFAULT_INSIGHTS_MEMORY,
    INSIGHTS_MEMORY_STORAGE_KEY,
    readPersistedInsightsMemory,
    resolveInsightsMemory,
    withRetiredCapability,
    writePersistedInsightsMemory,
} from "../insightsMemory";

describe("insightsMemory", () => {
    beforeEach(() => {
        window.localStorage.removeItem(INSIGHTS_MEMORY_STORAGE_KEY);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("the guarded read", () => {
        it("returns nothing when the key is absent", () => {
            expect(readPersistedInsightsMemory()).toEqual({});
        });

        it("returns nothing when the value is empty", () => {
            window.localStorage.setItem(INSIGHTS_MEMORY_STORAGE_KEY, "");

            expect(readPersistedInsightsMemory()).toEqual({});
        });

        it("returns nothing when the value is not JSON", () => {
            window.localStorage.setItem(INSIGHTS_MEMORY_STORAGE_KEY, "{not json");

            expect(readPersistedInsightsMemory()).toEqual({});
        });

        it("returns nothing when the value is an array", () => {
            window.localStorage.setItem(INSIGHTS_MEMORY_STORAGE_KEY, '["community-detection"]');

            expect(readPersistedInsightsMemory()).toEqual({});
        });

        it("returns nothing when the value is not an object", () => {
            window.localStorage.setItem(INSIGHTS_MEMORY_STORAGE_KEY, "42");

            expect(readPersistedInsightsMemory()).toEqual({});
        });

        it("drops the field when it is not an array", () => {
            window.localStorage.setItem(
                INSIGHTS_MEMORY_STORAGE_KEY,
                JSON.stringify({ retiredCapabilities: "community-detection" }),
            );

            expect(readPersistedInsightsMemory()).toEqual({});
        });

        it("keeps the string members of the list and drops the rest", () => {
            window.localStorage.setItem(
                INSIGHTS_MEMORY_STORAGE_KEY,
                JSON.stringify({ retiredCapabilities: ["community-detection", 7, null, "search", { a: 1 }] }),
            );

            expect(readPersistedInsightsMemory()).toEqual({
                retiredCapabilities: ["community-detection", "search"],
            });
        });

        it("reads nothing that the insights layer does not own", () => {
            window.localStorage.setItem(
                INSIGHTS_MEMORY_STORAGE_KEY,
                JSON.stringify({ retiredCapabilities: ["search"], insightsDismissed: true, cards: 4 }),
            );

            expect(readPersistedInsightsMemory()).toEqual({ retiredCapabilities: ["search"] });
        });

        it("survives an unreadable store", () => {
            vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
                throw new Error("site data disabled");
            });

            expect(readPersistedInsightsMemory()).toEqual({});
        });
    });

    describe("the round trip", () => {
        it("writes and reads back the retired list", () => {
            writePersistedInsightsMemory({ retiredCapabilities: ["community-detection", "search"] });

            expect(readPersistedInsightsMemory()).toEqual({
                retiredCapabilities: ["community-detection", "search"],
            });
        });

        it("writes and reads back an empty list", () => {
            writePersistedInsightsMemory(DEFAULT_INSIGHTS_MEMORY);

            expect(readPersistedInsightsMemory()).toEqual({ retiredCapabilities: [] });
        });

        it("swallows a full or unavailable store", () => {
            vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
                throw new Error("quota exceeded");
            });

            expect(() => {
                writePersistedInsightsMemory({ retiredCapabilities: ["search"] });
            }).not.toThrow();
        });
    });

    describe("resolveInsightsMemory", () => {
        it("starts with nothing retired", () => {
            expect(resolveInsightsMemory({})).toEqual({ retiredCapabilities: [] });
        });

        it("takes the stored list when there is one", () => {
            expect(resolveInsightsMemory({ retiredCapabilities: ["community-detection"] })).toEqual({
                retiredCapabilities: ["community-detection"],
            });
        });
    });

    describe("withRetiredCapability", () => {
        it("retires a capability", () => {
            expect(withRetiredCapability(DEFAULT_INSIGHTS_MEMORY, "community-detection")).toEqual({
                retiredCapabilities: ["community-detection"],
            });
        });

        it("preserves the order capabilities were run in", () => {
            const first = withRetiredCapability(DEFAULT_INSIGHTS_MEMORY, "search");
            const second = withRetiredCapability(first, "community-detection");

            expect(second.retiredCapabilities).toEqual(["search", "community-detection"]);
        });

        it("is idempotent, and returns the same record when nothing changed", () => {
            const once = withRetiredCapability(DEFAULT_INSIGHTS_MEMORY, "community-detection");
            const twice = withRetiredCapability(once, "community-detection");

            expect(twice).toBe(once);
            expect(twice.retiredCapabilities).toEqual(["community-detection"]);
        });

        it("does not mutate the memory it was given", () => {
            const before = DEFAULT_INSIGHTS_MEMORY.retiredCapabilities.length;

            withRetiredCapability(DEFAULT_INSIGHTS_MEMORY, "search");

            expect(DEFAULT_INSIGHTS_MEMORY.retiredCapabilities.length).toBe(before);
        });
    });
});
