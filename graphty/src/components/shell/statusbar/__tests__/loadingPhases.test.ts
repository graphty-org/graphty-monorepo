import { describe, expect, it } from "vitest";

import {
    buildingPhaseLabel,
    CANCEL_LABEL,
    cancelledPhaseLabel,
    formatBytes,
    formatPercent,
    formatSeconds,
    LOAD_CANCEL_DISABLED_TITLE,
    loadCompleteMessage,
    PARSING_PHASE_LABEL,
    readingPhaseLabel,
    RUN_CANCEL_DISABLED_TITLE,
} from "../loadingPhases";

const MB = 1024 * 1024;

describe("loadingPhases", () => {
    describe("phase 1, Reading", () => {
        it("writes bytes, which are always known", () => {
            expect(readingPhaseLabel("fraud.csv", 48 * MB, 210 * MB)).toBe("Reading fraud.csv, 48 MB of 210 MB");
        });

        it("steps the unit ladder", () => {
            expect(formatBytes(0)).toBe("0 B");
            expect(formatBytes(512)).toBe("512 B");
            expect(formatBytes(4 * 1024)).toBe("4 KB");
            expect(formatBytes(3 * 1024 * MB)).toBe("3.0 GB");
        });
    });

    describe("phase 2, Parsing", () => {
        it("is indeterminate and carries no numbers", () => {
            expect(PARSING_PHASE_LABEL).toBe("Parsing...");
        });
    });

    describe("phase 3, Building", () => {
        it("writes the count form when the total is known", () => {
            expect(buildingPhaseLabel({ nodes: 12400, totalNodes: 51000, secondsLeft: 8 })).toBe(
                "Building graph: 12,400 of 51,000 nodes (24%), about 8 s left",
            );
        });

        it("hedges an estimated total, as ExplorerLoading draws it", () => {
            expect(
                buildingPhaseLabel({ nodes: 48000, totalNodes: 120000, totalEstimated: true, secondsLeft: 12 }),
            ).toBe("Building graph: 48,000 of about 120,000 nodes (40%), about 12 s left");
        });

        it("writes no percentage and no estimate when the total is unknown", () => {
            expect(buildingPhaseLabel({ nodes: 12400, edges: 98000 })).toBe(
                "Building graph: 12,400 nodes, 98,000 edges so far",
            );
        });

        it("drops the estimate clause when no time is left to name", () => {
            expect(buildingPhaseLabel({ nodes: 12400, totalNodes: 51000 })).toBe(
                "Building graph: 12,400 of 51,000 nodes (24%)",
            );
        });
    });

    describe("cancelling", () => {
        it("keeps the verb's own text in every form", () => {
            expect(CANCEL_LABEL).toBe("Cancel");
        });

        it("states the reason it cannot act on a load", () => {
            expect(LOAD_CANCEL_DISABLED_TITLE).toBe("Cannot cancel this load");
        });

        it("states the reason it cannot act on a run", () => {
            expect(RUN_CANCEL_DISABLED_TITLE).toBe("Cannot cancel this run");
        });

        it("leaves the point the load stopped at", () => {
            expect(cancelledPhaseLabel(0.24)).toBe("Cancelled at 24%");
        });
    });

    describe("the completion toast", () => {
        it("reports what was loaded and how long it took", () => {
            expect(loadCompleteMessage({ nodes: 51000, edges: 212000, seconds: 34 })).toBe(
                "Loaded 51,000 nodes and 212,000 edges in 34 s.",
            );
        });

        it("names the roles that were guessed or changed", () => {
            expect(
                loadCompleteMessage({
                    nodes: 200,
                    edges: 612,
                    seconds: 1,
                    mappings: [
                        { column: "amount", role: "weight" },
                        { column: "ts", role: "time" },
                    ],
                }),
            ).toBe("Loaded 200 nodes and 612 edges in 1 s. Mapped amount to weight, ts to time.");
        });
    });

    describe("units", () => {
        it("keeps a decimal place under ten seconds", () => {
            expect(formatSeconds(1.8)).toBe("1.8 s");
        });

        it("reads whole seconds at ten and above", () => {
            expect(formatSeconds(34)).toBe("34 s");
            expect(formatSeconds(12.4)).toBe("12 s");
        });

        it("writes whole percentages", () => {
            expect(formatPercent(0.4)).toBe("40%");
            expect(formatPercent(0.243)).toBe("24%");
            expect(formatPercent(2)).toBe("100%");
        });
    });
});
