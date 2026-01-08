import { describe, expect, it } from "vitest";

import { calculatePopoutPosition } from "../../src/components/popout/utils/position";
import { POPOUT_GAP } from "../../src/constants/popout";

// Common test fixtures
const createAnchorRect = (overrides: Partial<DOMRect> = {}): DOMRect =>
    ({
        left: 300,
        top: 100,
        right: 340,
        bottom: 140,
        width: 40,
        height: 40,
        ...overrides,
    }) as DOMRect;

const panelWidth = 280;
const panelHeight = 200;

describe("calculatePopoutPosition", () => {
    describe("legacy API (backwards compatibility)", () => {
        it("positions panel to the left of trigger with 8px gap", () => {
            const triggerRect = createAnchorRect();

            const position = calculatePopoutPosition(triggerRect, panelWidth);

            // Panel should be positioned: triggerRect.left - panelWidth - gap
            expect(position.left).toBe(300 - 280 - POPOUT_GAP); // 12
        });

        it("aligns top of panel with top of trigger", () => {
            const triggerRect = createAnchorRect();

            const position = calculatePopoutPosition(triggerRect, panelWidth);

            expect(position.top).toBe(100); // Same as trigger top
        });

        it("uses default gap of 8px", () => {
            const triggerRect = createAnchorRect({ left: 500, right: 540, top: 200, bottom: 240 });

            const position = calculatePopoutPosition(triggerRect, 200);

            // 500 - 200 - 8 = 292
            expect(position.left).toBe(292);
        });

        it("accepts custom gap value", () => {
            const triggerRect = createAnchorRect({ left: 500, right: 540, top: 200, bottom: 240 });
            const customGap = 16;

            const position = calculatePopoutPosition(triggerRect, 200, customGap);

            // 500 - 200 - 16 = 284
            expect(position.left).toBe(284);
        });
    });

    describe("placement: left", () => {
        it("positions panel to the left of anchor with gap", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "left",
            });

            expect(position.left).toBe(300 - 280 - POPOUT_GAP); // 12
        });

        it("alignment: start - aligns top of panel with top of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "left",
                alignment: "start",
            });

            expect(position.top).toBe(100);
        });

        it("alignment: center - centers panel vertically on anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "left",
                alignment: "center",
                panelHeight,
            });

            // anchor center = 100 + 40/2 = 120
            // panel top = 120 - 200/2 = 20
            expect(position.top).toBe(20);
        });

        it("alignment: end - aligns bottom of panel with bottom of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "left",
                alignment: "end",
                panelHeight,
            });

            // anchor bottom = 140
            // panel top = 140 - 200 = -60
            expect(position.top).toBe(-60);
        });
    });

    describe("placement: right", () => {
        it("positions panel to the right of anchor with gap", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "right",
            });

            // panel left = anchor right + gap = 340 + 8 = 348
            expect(position.left).toBe(348);
        });

        it("alignment: start - aligns top of panel with top of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "right",
                alignment: "start",
            });

            expect(position.top).toBe(100);
        });

        it("alignment: center - centers panel vertically on anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "right",
                alignment: "center",
                panelHeight,
            });

            expect(position.top).toBe(20);
        });

        it("alignment: end - aligns bottom of panel with bottom of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "right",
                alignment: "end",
                panelHeight,
            });

            expect(position.top).toBe(-60);
        });
    });

    describe("placement: top", () => {
        it("positions panel above anchor with gap", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "top",
                panelHeight,
            });

            // panel top = anchor top - panelHeight - gap = 100 - 200 - 8 = -108
            expect(position.top).toBe(-108);
        });

        it("alignment: start - aligns left of panel with left of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "top",
                alignment: "start",
                panelHeight,
            });

            expect(position.left).toBe(300);
        });

        it("alignment: center - centers panel horizontally on anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "top",
                alignment: "center",
                panelHeight,
            });

            // anchor center = 300 + 40/2 = 320
            // panel left = 320 - 280/2 = 180
            expect(position.left).toBe(180);
        });

        it("alignment: end - aligns right of panel with right of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "top",
                alignment: "end",
                panelHeight,
            });

            // panel left = anchor right - panelWidth = 340 - 280 = 60
            expect(position.left).toBe(60);
        });
    });

    describe("placement: bottom", () => {
        it("positions panel below anchor with gap", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "bottom",
            });

            // panel top = anchor bottom + gap = 140 + 8 = 148
            expect(position.top).toBe(148);
        });

        it("alignment: start - aligns left of panel with left of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "bottom",
                alignment: "start",
            });

            expect(position.left).toBe(300);
        });

        it("alignment: center - centers panel horizontally on anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "bottom",
                alignment: "center",
            });

            expect(position.left).toBe(180);
        });

        it("alignment: end - aligns right of panel with right of anchor", () => {
            const anchorRect = createAnchorRect();

            const position = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "bottom",
                alignment: "end",
            });

            expect(position.left).toBe(60);
        });
    });

    describe("defaults", () => {
        it("defaults to placement: left, alignment: start", () => {
            const anchorRect = createAnchorRect();

            const positionWithDefaults = calculatePopoutPosition(anchorRect, panelWidth);
            const positionExplicit = calculatePopoutPosition(anchorRect, panelWidth, POPOUT_GAP, {
                placement: "left",
                alignment: "start",
            });

            expect(positionWithDefaults).toEqual(positionExplicit);
        });
    });

    describe("nested panels (Phase 6)", () => {
        it("uses 4px gap for nested panels", () => {
            const parentPanelRect = createAnchorRect({
                left: 400,
                top: 100,
                right: 680,
                bottom: 300,
                width: 280,
                height: 200,
            });
            const nestedPanelWidth = 200;
            const nestedGap = 4; // POPOUT_NESTED_GAP

            const position = calculatePopoutPosition(parentPanelRect, nestedPanelWidth, nestedGap, {
                placement: "left",
                alignment: "start",
            });

            // Panel should be: parentPanelRect.left - nestedPanelWidth - 4px gap
            // 400 - 200 - 4 = 196
            expect(position.left).toBe(196);
            expect(position.top).toBe(100); // aligned to parent top
        });

        it("positions relative to parent panel edge with placement: left", () => {
            const parentPanelRect = createAnchorRect({
                left: 500,
                top: 150,
                right: 780,
                bottom: 350,
                width: 280,
                height: 200,
            });
            const nestedPanelWidth = 180;
            const nestedGap = 4;

            const position = calculatePopoutPosition(parentPanelRect, nestedPanelWidth, nestedGap, {
                placement: "left",
                alignment: "start",
            });

            // Child panel should be to the left of parent: 500 - 180 - 4 = 316
            expect(position.left).toBe(316);
        });

        it("positions relative to parent panel edge with placement: right", () => {
            const parentPanelRect = createAnchorRect({
                left: 100,
                top: 150,
                right: 380,
                bottom: 350,
                width: 280,
                height: 200,
            });
            const nestedPanelWidth = 180;
            const nestedGap = 4;

            const position = calculatePopoutPosition(parentPanelRect, nestedPanelWidth, nestedGap, {
                placement: "right",
                alignment: "start",
            });

            // Child panel should be to the right of parent: 380 + 4 = 384
            expect(position.left).toBe(384);
        });

        it("supports center alignment for nested panels", () => {
            const parentPanelRect = createAnchorRect({
                left: 400,
                top: 100,
                right: 680,
                bottom: 300,
                width: 280,
                height: 200,
            });
            const nestedPanelWidth = 200;
            const nestedPanelHeight = 150;
            const nestedGap = 4;

            const position = calculatePopoutPosition(parentPanelRect, nestedPanelWidth, nestedGap, {
                placement: "left",
                alignment: "center",
                panelHeight: nestedPanelHeight,
            });

            // Parent center Y = 100 + 200/2 = 200
            // Nested panel top = 200 - 150/2 = 125
            expect(position.top).toBe(125);
        });
    });
});
