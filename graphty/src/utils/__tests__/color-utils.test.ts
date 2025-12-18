import {describe, expect, it} from "vitest";

import {
    MAX_ALPHA_HEX,
    MAX_OPACITY_PERCENT,
    opacityToAlphaHex,
    parseAlphaFromHexa,
} from "../color-utils";

describe("color-utils", () => {
    describe("constants", () => {
        it("exports expected constants", () => {
            expect(MAX_ALPHA_HEX).toBe(255);
            expect(MAX_OPACITY_PERCENT).toBe(100);
        });
    });

    describe("parseAlphaFromHexa", () => {
        it("converts full opacity HEXA correctly", () => {
            expect(parseAlphaFromHexa("FF")).toBe(100);
        });

        it("converts half opacity HEXA correctly", () => {
            // 0x80 = 128, (128/255)*100 = 50.19...
            expect(parseAlphaFromHexa("80")).toBeCloseTo(50, 0);
        });

        it("converts zero opacity HEXA correctly", () => {
            expect(parseAlphaFromHexa("00")).toBe(0);
        });

        it("handles lowercase hex values", () => {
            expect(parseAlphaFromHexa("ff")).toBe(100);
            expect(parseAlphaFromHexa("80")).toBeCloseTo(50, 0);
        });

        it("converts quarter opacity (0x40 = 64) correctly", () => {
            // 0x40 = 64, (64/255)*100 = 25.1...
            expect(parseAlphaFromHexa("40")).toBeCloseTo(25, 0);
        });

        it("converts three-quarter opacity (0xBF = 191) correctly", () => {
            // 0xBF = 191, (191/255)*100 = 74.9...
            expect(parseAlphaFromHexa("BF")).toBeCloseTo(75, 0);
        });
    });

    describe("opacityToAlphaHex", () => {
        it("converts 100% opacity to FF", () => {
            expect(opacityToAlphaHex(100)).toBe("ff");
        });

        it("converts 0% opacity to 00", () => {
            expect(opacityToAlphaHex(0)).toBe("00");
        });

        it("converts 50% opacity to approximately 80", () => {
            // (50/100)*255 = 127.5, rounded = 128 = 0x80
            expect(opacityToAlphaHex(50)).toBe("80");
        });

        it("converts 25% opacity to approximately 40", () => {
            // (25/100)*255 = 63.75, rounded = 64 = 0x40
            expect(opacityToAlphaHex(25)).toBe("40");
        });

        it("converts 75% opacity to approximately bf", () => {
            // (75/100)*255 = 191.25, rounded = 191 = 0xBF
            expect(opacityToAlphaHex(75)).toBe("bf");
        });

        it("handles decimal opacity values", () => {
            // (33.33/100)*255 = 84.99..., rounded = 85 = 0x55
            expect(opacityToAlphaHex(33.33)).toBe("55");
        });

        it("pads single-digit hex values with leading zero", () => {
            // (1/100)*255 = 2.55, rounded = 3 = 0x03
            expect(opacityToAlphaHex(1)).toBe("03");
        });
    });

    describe("round-trip conversion", () => {
        it("parseAlphaFromHexa and opacityToAlphaHex are inverse operations for 100%", () => {
            const hex = opacityToAlphaHex(100);
            const opacity = parseAlphaFromHexa(hex);
            expect(opacity).toBe(100);
        });

        it("parseAlphaFromHexa and opacityToAlphaHex are inverse operations for 0%", () => {
            const hex = opacityToAlphaHex(0);
            const opacity = parseAlphaFromHexa(hex);
            expect(opacity).toBe(0);
        });

        it("parseAlphaFromHexa and opacityToAlphaHex are approximately inverse for 50%", () => {
            const hex = opacityToAlphaHex(50);
            const opacity = parseAlphaFromHexa(hex);
            // Due to rounding, the result may differ by 1
            expect(opacity).toBeCloseTo(50, 0);
        });
    });
});
