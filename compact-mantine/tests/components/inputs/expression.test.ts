import { describe, expect, it } from "vitest";

import { clamp, evaluateExpression, tidy } from "../../../src/components/inputs/expression";

describe("evaluateExpression (Figma's number-field arithmetic)", () => {
    it.each([
        ["40", 40],
        ["40*2", 80],
        ["1800/2", 900],
        ["1 + 2 * 3", 7],
        ["(1 + 2) * 3", 9],
        ["-5", -5],
        ["--5", 5],
        ["2*-3", -6],
        ["+4", 4],
        ["1.5*2", 3],
        [" 12 ", 12],
    ])("%s is %d", (text, value) => {
        expect(evaluateExpression(text)).toBe(value);
    });

    it.each(["", "abc", "1+", "10/0", "(1", "1)", "==", "2 3", "*2"])("%s is not an expression", (text) => {
        expect(evaluateExpression(text)).toBeNull();
    });

    it("reads each number with the locale parser it is given", () => {
        const german = (text: string): number => Number(text.replace(",", "."));
        expect(evaluateExpression("1,5*2", german)).toBe(3);
    });

    it("tidy drops floating-point noise", () => {
        expect(tidy(0.1 + 0.2)).toBe(0.3);
    });

    it("clamp pulls into range and leaves open ends open", () => {
        expect(clamp(5, 10, 20)).toBe(10);
        expect(clamp(25, 10, 20)).toBe(20);
        expect(clamp(-5)).toBe(-5);
    });
});
