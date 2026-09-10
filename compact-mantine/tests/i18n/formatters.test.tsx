import { renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import {
    LabelsProvider,
    parseLocaleNumber,
    useCollator,
    useNumberFormatter,
    useNumberParser,
    useOrdinalFormatter,
} from "../../src/i18n";

/**
 * A wrapper that pins the locale, and optionally the ordinal spelling, so a test
 * does not depend on the machine's own locale.
 * @param locale - The BCP 47 language tag to render under
 * @param ordinal - An ordinal spelling to override the English default with
 * @returns A wrapper component for renderHook
 */
function localeWrapper(
    locale: string,
    ordinal?: (value: string, rule: Intl.LDMLPluralRule) => string,
): ({ children }: { children: React.ReactNode }) => React.JSX.Element {
    return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
        return (
            <LabelsProvider locale={locale} labels={ordinal === undefined ? undefined : { ordinal }}>
                {children}
            </LabelsProvider>
        );
    };
}

describe("useNumberFormatter", () => {
    it("formats for the provider's locale", () => {
        const { result } = renderHook(() => useNumberFormatter({ maximumFractionDigits: 2 }), {
            wrapper: localeWrapper("de-DE"),
        });

        expect(result.current.format(1234.5)).toBe("1.234,5");
    });

    it("formats the same number differently in another locale", () => {
        const { result } = renderHook(() => useNumberFormatter({ maximumFractionDigits: 2 }), {
            wrapper: localeWrapper("en-US"),
        });

        expect(result.current.format(1234.5)).toBe("1,234.5");
    });

    it("keeps the same formatter across renders that change nothing", () => {
        const { result, rerender } = renderHook(() => useNumberFormatter({ maximumFractionDigits: 2 }), {
            wrapper: localeWrapper("en-US"),
        });
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });
});

describe("useOrdinalFormatter", () => {
    it("spells English ordinals, exceptions included", () => {
        const { result } = renderHook(() => useOrdinalFormatter(), { wrapper: localeWrapper("en-US") });
        const ordinal = result.current;

        expect(ordinal(1)).toBe("1st");
        expect(ordinal(2)).toBe("2nd");
        expect(ordinal(3)).toBe("3rd");
        expect(ordinal(4)).toBe("4th");
        expect(ordinal(11)).toBe("11th");
        expect(ordinal(12)).toBe("12th");
        expect(ordinal(13)).toBe("13th");
        expect(ordinal(21)).toBe("21st");
        expect(ordinal(98)).toBe("98th");
    });

    it("reads the plural category from the locale, not from English", () => {
        // French has one ordinal category for 1 and a single "other" for the
        // rest, where English distinguishes 2 and 3. With the English default
        // spelling still in place, the difference in category is what proves
        // the locale reached Intl.PluralRules.
        const english = renderHook(() => useOrdinalFormatter(), { wrapper: localeWrapper("en-US") });
        const french = renderHook(() => useOrdinalFormatter(), { wrapper: localeWrapper("fr-FR") });

        expect(english.result.current(2)).toBe("2nd");
        expect(french.result.current(2)).not.toBe("2nd");
    });

    it("spells French ordinals when the ordinal label is translated", () => {
        const frenchOrdinal = (value: string, rule: Intl.LDMLPluralRule): string =>
            rule === "one" ? `${value}er` : `${value}e`;
        const { result } = renderHook(() => useOrdinalFormatter(), {
            wrapper: localeWrapper("fr-FR", frenchOrdinal),
        });
        const ordinal = result.current;

        expect(ordinal(1)).toBe("1er");
        expect(ordinal(2)).toBe("2e");
        expect(ordinal(98)).toBe("98e");
    });

    it("formats the number itself for the locale", () => {
        const { result } = renderHook(() => useOrdinalFormatter(), { wrapper: localeWrapper("de-DE", () => "x") });

        expect(result.current(1000)).toBe("x");
    });
});

describe("useCollator", () => {
    it("sorts the way a reader of the locale expects", () => {
        const { result } = renderHook(() => useCollator({ numeric: true, sensitivity: "base" }), {
            wrapper: localeWrapper("en-US"),
        });
        const names = ["item 10", "item 9", "Item 2"];

        expect([...names].sort((a, b) => result.current.compare(a, b))).toStrictEqual([
            "Item 2",
            "item 9",
            "item 10",
        ]);
    });

    it("sorts accented words beside their unaccented spelling", () => {
        const { result } = renderHook(() => useCollator(), { wrapper: localeWrapper("sv-SE") });

        // Swedish sorts a-ring after z, which a code-unit comparison never does.
        expect(result.current.compare("\u00e5ngstrom", "zebra")).toBeGreaterThan(0);
    });
});

describe("parseLocaleNumber", () => {
    it("reads a comma decimal separator", () => {
        expect(parseLocaleNumber("3,14", "de-DE")).toBe(3.14);
        expect(parseLocaleNumber("3,14", "fr-FR")).toBe(3.14);
        expect(parseLocaleNumber("-0,5", "de-DE")).toBe(-0.5);
    });

    it("is what parseFloat is not", () => {
        expect(parseFloat("3,14")).toBe(3);
        expect(parseLocaleNumber("3,14", "de-DE")).toBe(3.14);
    });

    it("discards group separators", () => {
        expect(parseLocaleNumber("1.234,56", "de-DE")).toBe(1234.56);
        expect(parseLocaleNumber("1,234.56", "en-US")).toBe(1234.56);
        expect(parseLocaleNumber("1\u202f234,56", "fr-FR")).toBe(1234.56);
    });

    it("reads a period decimal separator in English", () => {
        expect(parseLocaleNumber("3.14", "en-US")).toBe(3.14);
        expect(parseLocaleNumber("  42  ", "en-US")).toBe(42);
        expect(parseLocaleNumber("1e3", "en-US")).toBe(1000);
    });

    it("reads the locale's own digits", () => {
        const arabic = new Intl.NumberFormat("ar-EG", { useGrouping: false }).format(42);

        expect(parseLocaleNumber(arabic, "ar-EG")).toBe(42);
        // A Latin keyboard still works in a locale that does not use one.
        expect(parseLocaleNumber("42", "ar-EG")).toBe(42);
    });

    it("stops at anything that is not part of a number", () => {
        expect(parseLocaleNumber("12px", "en-US")).toBe(12);
        expect(parseLocaleNumber("1.5rem", "en-US")).toBe(1.5);
    });

    it("returns NaN when the text holds no number", () => {
        expect(parseLocaleNumber("abc", "en-US")).toBeNaN();
        expect(parseLocaleNumber("", "en-US")).toBeNaN();
        expect(parseLocaleNumber("-", "en-US")).toBeNaN();
    });
});

describe("useNumberParser", () => {
    it("parses in the provider's locale", () => {
        const { result } = renderHook(() => useNumberParser(), { wrapper: localeWrapper("de-DE") });

        expect(result.current("3,14")).toBe(3.14);
    });

    it("parses in a different locale under a different provider", () => {
        const { result } = renderHook(() => useNumberParser(), { wrapper: localeWrapper("en-US") });

        expect(result.current("3.14")).toBe(3.14);
    });
});
