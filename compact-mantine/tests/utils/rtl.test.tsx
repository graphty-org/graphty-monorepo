import { DirectionProvider } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import {
    inlineFraction,
    inlineGradientDirection,
    inlineX,
    isRtl,
    mirrorInline,
    useDirection,
} from "../../src/utils/rtl";

describe("useDirection", () => {
    it("returns ltr with no DirectionProvider", () => {
        const { result } = renderHook(() => useDirection());

        expect(result.current).toBe("ltr");
    });

    it("returns the direction Mantine's own provider was given", () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                {children}
            </DirectionProvider>
        );

        const { result } = renderHook(() => useDirection(), { wrapper });

        expect(result.current).toBe("rtl");
    });
});

describe("isRtl", () => {
    it("says which way text runs", () => {
        expect(isRtl("rtl")).toBe(true);
        expect(isRtl("ltr")).toBe(false);
    });
});

describe("inlineFraction", () => {
    it("leaves a fraction alone when text runs left to right", () => {
        expect(inlineFraction(0, "ltr")).toBe(0);
        expect(inlineFraction(0.25, "ltr")).toBe(0.25);
        expect(inlineFraction(1, "ltr")).toBe(1);
    });

    it("measures from the other edge when text runs right to left", () => {
        expect(inlineFraction(0, "rtl")).toBe(1);
        expect(inlineFraction(0.25, "rtl")).toBe(0.75);
        expect(inlineFraction(1, "rtl")).toBe(0);
    });
});

describe("inlineX", () => {
    it("plots a series in reading order in both directions", () => {
        const extent = 100;
        const fractions = [0, 0.5, 1];

        expect(fractions.map((fraction) => inlineX(fraction, extent, "ltr"))).toStrictEqual([0, 50, 100]);
        expect(fractions.map((fraction) => inlineX(fraction, extent, "rtl"))).toStrictEqual([100, 50, 0]);
    });
});

describe("inlineGradientDirection", () => {
    it("runs the gradient the same way the labels do", () => {
        expect(inlineGradientDirection("ltr")).toBe("to right");
        expect(inlineGradientDirection("rtl")).toBe("to left");
    });
});

describe("mirrorInline", () => {
    it("adds nothing when text runs left to right", () => {
        expect(mirrorInline("ltr")).toStrictEqual({});
    });

    it("mirrors a drawing when text runs right to left", () => {
        expect(mirrorInline("rtl")).toStrictEqual({ transform: "scaleX(-1)" });
    });
});
