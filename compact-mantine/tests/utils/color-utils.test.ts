import { describe, expect, it } from "vitest";

import {
    isValidHex,
    MAX_ALPHA_HEX,
    MAX_OPACITY_PERCENT,
    opacityToAlphaHex,
    parseAlphaFromHexa,
    parseHexaColor,
    toHexaColor,
} from "../../src/utils/color-utils";

describe("color-utils constants", () => {
    it("MAX_ALPHA_HEX is 255", () => {
        expect(MAX_ALPHA_HEX).toBe(255);
    });

    it("MAX_OPACITY_PERCENT is 100", () => {
        expect(MAX_OPACITY_PERCENT).toBe(100);
    });
});

describe("parseAlphaFromHexa", () => {
    it("parses FF as 100%", () => {
        expect(parseAlphaFromHexa("FF")).toBe(100);
    });

    it("parses ff as 100% (case insensitive)", () => {
        expect(parseAlphaFromHexa("ff")).toBe(100);
    });

    it("parses 00 as 0%", () => {
        expect(parseAlphaFromHexa("00")).toBe(0);
    });

    it("parses 80 as approximately 50%", () => {
        expect(parseAlphaFromHexa("80")).toBe(50);
    });

    it("parses BF as approximately 75%", () => {
        // 0xBF = 191, 191/255 * 100 = ~75
        expect(parseAlphaFromHexa("BF")).toBe(75);
    });
});

describe("opacityToAlphaHex", () => {
    it("converts 100% to ff", () => {
        expect(opacityToAlphaHex(100)).toBe("ff");
    });

    it("converts 0% to 00", () => {
        expect(opacityToAlphaHex(0)).toBe("00");
    });

    it("converts 50% to 80", () => {
        expect(opacityToAlphaHex(50)).toBe("80");
    });

    it("pads single digit hex values with zero", () => {
        expect(opacityToAlphaHex(1)).toBe("03");
    });
});

describe("parseHexaColor", () => {
    it("parses 6-digit hex with full opacity", () => {
        const result = parseHexaColor("#ff0000");
        expect(result.hex).toBe("#ff0000");
        expect(result.opacity).toBe(100);
    });

    it("parses 8-digit hexa", () => {
        const result = parseHexaColor("#ff000080");
        expect(result.hex).toBe("#ff0000");
        expect(result.opacity).toBe(50);
    });

    it("parses 3-digit hex", () => {
        const result = parseHexaColor("#f00");
        expect(result.hex).toBe("#ff0000");
        expect(result.opacity).toBe(100);
    });

    it("parses 4-digit hexa", () => {
        const result = parseHexaColor("#f008");
        expect(result.hex).toBe("#ff0000");
        expect(result.opacity).toBe(53); // 0x88 = 136, 136/255 * 100 = ~53
    });

    it("parses color without hash", () => {
        const result = parseHexaColor("ff0000");
        expect(result.hex).toBe("#ff0000");
        expect(result.opacity).toBe(100);
    });
});

describe("toHexaColor", () => {
    it("converts hex and opacity to hexa", () => {
        expect(toHexaColor("#ff0000", 100)).toBe("#ff0000ff");
        expect(toHexaColor("#ff0000", 50)).toBe("#ff000080");
    });

    it("handles 0% opacity", () => {
        expect(toHexaColor("#ffffff", 0)).toBe("#ffffff00");
    });

    it("handles color without hash prefix", () => {
        expect(toHexaColor("ff0000", 100)).toBe("#ff0000ff");
    });
});

describe("isValidHex", () => {
    it("validates 3-digit hex colors", () => {
        expect(isValidHex("#fff")).toBe(true);
        expect(isValidHex("#abc")).toBe(true);
        expect(isValidHex("fff")).toBe(true);
    });

    it("validates 4-digit hexa colors", () => {
        expect(isValidHex("#ffff")).toBe(true);
        expect(isValidHex("abcd")).toBe(true);
    });

    it("validates 6-digit hex colors", () => {
        expect(isValidHex("#ffffff")).toBe(true);
        expect(isValidHex("#abcdef")).toBe(true);
        expect(isValidHex("ffffff")).toBe(true);
    });

    it("validates 8-digit hexa colors", () => {
        expect(isValidHex("#ffffffaa")).toBe(true);
        expect(isValidHex("abcdef12")).toBe(true);
    });

    it("rejects invalid colors", () => {
        expect(isValidHex("invalid")).toBe(false);
        expect(isValidHex("#gggggg")).toBe(false);
        expect(isValidHex("#12345")).toBe(false); // 5 digits
        expect(isValidHex("#1234567")).toBe(false); // 7 digits
        expect(isValidHex("")).toBe(false);
    });

    it("is case insensitive", () => {
        expect(isValidHex("#FFFFFF")).toBe(true);
        expect(isValidHex("#AbCdEf")).toBe(true);
    });
});
