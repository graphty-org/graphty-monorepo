/**
 * The warning a lazily loaded part gives when it has not loaded after STALL_MS (see src/lazy.ts for why it can
 * never load).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadPart, STALL_MS } from "../src/lazy";

describe("loadPart", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("warns once a part has not loaded after STALL_MS, and still hands over the same promise", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const never = new Promise<never>(() => undefined);
        expect(loadPart(never, "graphtyImport")).toBe(never);
        await vi.advanceTimersByTimeAsync(STALL_MS - 1);
        expect(warn).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toMatch(
            /^graphty: graphtyImport has waited 5 s .* awaits graphtyImport at its top level/,
        );
    });

    it("stays quiet when the part loads or fails to load in time", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        await loadPart(Promise.resolve(1), "graphtyGenerate");
        await expect(loadPart(Promise.reject(new Error("offline")), "graphtyDataset")).rejects.toThrow("offline");
        await vi.advanceTimersByTimeAsync(2 * STALL_MS);
        expect(warn).not.toHaveBeenCalled();
    });
});
