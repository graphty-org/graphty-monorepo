import { describe, expect, it } from "vitest";

import { calculatePopoutPosition } from "../../src/components/popout/utils/position";
import { POPOUT_GAP } from "../../src/constants/popout";

describe("calculatePopoutPosition", () => {
    it("positions panel to the left of trigger with 8px gap", () => {
        const triggerRect = {
            left: 300,
            top: 100,
            right: 340,
            bottom: 140,
            width: 40,
            height: 40,
        } as DOMRect;
        const panelWidth = 280;

        const position = calculatePopoutPosition(triggerRect, panelWidth);

        // Panel should be positioned: triggerRect.left - panelWidth - gap
        expect(position.left).toBe(300 - 280 - POPOUT_GAP); // 12
    });

    it("aligns top of panel with top of trigger", () => {
        const triggerRect = {
            left: 300,
            top: 100,
            right: 340,
            bottom: 140,
            width: 40,
            height: 40,
        } as DOMRect;
        const panelWidth = 280;

        const position = calculatePopoutPosition(triggerRect, panelWidth);

        expect(position.top).toBe(100); // Same as trigger top
    });

    it("uses default gap of 8px", () => {
        const triggerRect = {
            left: 500,
            top: 200,
            right: 540,
            bottom: 240,
            width: 40,
            height: 40,
        } as DOMRect;
        const panelWidth = 200;

        const position = calculatePopoutPosition(triggerRect, panelWidth);

        // 500 - 200 - 8 = 292
        expect(position.left).toBe(292);
    });

    it("accepts custom gap value", () => {
        const triggerRect = {
            left: 500,
            top: 200,
            right: 540,
            bottom: 240,
            width: 40,
            height: 40,
        } as DOMRect;
        const panelWidth = 200;
        const customGap = 16;

        const position = calculatePopoutPosition(triggerRect, panelWidth, customGap);

        // 500 - 200 - 16 = 284
        expect(position.left).toBe(284);
    });
});
