import { describe, expect, it } from "vitest";

import {
    LAYOUT_FROM_FILE_LABEL,
    LAYOUT_FROM_FILE_TITLE,
    LAYOUT_QUICK_GRID_FALLBACK_LABEL,
    LAYOUT_QUICK_GRID_LABEL,
    layoutChipTitle,
    layoutComputingLabel,
    layoutScopedLabel,
    layoutSettledLabel,
    layoutSteppingLabel,
    layoutStoppedLabel,
} from "../layoutStates";

describe("layoutStates", () => {
    describe("the five states", () => {
        it("names positions that came from the file", () => {
            expect(LAYOUT_FROM_FILE_LABEL).toBe("Positions from file");
        });

        it("names the quick grid and its fallback", () => {
            expect(LAYOUT_QUICK_GRID_LABEL).toBe("Quick grid (Performance mode)");
            expect(LAYOUT_QUICK_GRID_FALLBACK_LABEL).toBe("Random (seeded)");
        });

        it("names the step a run is on, with separators", () => {
            expect(layoutSteppingLabel("Force directed", 120, 1000)).toBe(
                "Force directed - step 120 of 1,000, Stop",
            );
        });

        it("says settled only of convergence", () => {
            expect(layoutSettledLabel("Force directed")).toBe("Force directed - settled");
        });

        it("says stopped after N steps when the cap ended the run", () => {
            expect(layoutStoppedLabel("Force directed", 1000)).toBe("Force directed - stopped after 1,000 steps");
        });

        it("keeps the two endings apart", () => {
            expect(layoutStoppedLabel("Force directed", 1000)).not.toContain("settled");
        });
    });

    describe("the two spec examples", () => {
        it("names a narrower scope", () => {
            expect(layoutScopedLabel("Radial", 37, 200)).toBe("Radial on 37 of 200 nodes");
        });

        it("offers Cancel while a run has no steps to report", () => {
            expect(layoutComputingLabel("Kamada-Kawai")).toBe("Computing Kamada-Kawai... Cancel");
        });
    });

    describe("the chip's tooltip", () => {
        it("is the only place the technical name appears", () => {
            expect(layoutChipTitle("Force directed (ngraph)", "settled")).toBe("Force directed (ngraph) - settled");
        });

        it("gives the state a noun where it needs one", () => {
            expect(LAYOUT_FROM_FILE_TITLE).toBe("Layout. Positions from file");
        });
    });
});
