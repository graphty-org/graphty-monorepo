import { useCallback, useMemo } from "react";

import { useLabels, useLocale } from "./LabelsProvider";

// Section 2.2 of the hardening contract: numbers through Intl.NumberFormat,
// ordinals through Intl.PluralRules with ordinal type, sorting through
// Intl.Collator, and never parseFloat on what a person typed.
//
// Every hook here memoises its Intl object. Constructing one is expensive
// enough that doing it per render of a dense panel is measurable, and the
// objects are immutable, so caching them is free of risk.

// The sample the group and decimal separators are read off. It has a group
// break and a fraction, so both parts are present for every locale.
const SEPARATOR_SAMPLE = 1234.5;

// The digits nine down to zero, in that order, which is what formatting
// 9876543210 in a locale's own numbering system spells out.
const DESCENDING_ASCII_DIGITS = "9876543210";

// The number whose formatting reveals a locale's own digits.
const DESCENDING_DIGIT_SAMPLE = 9876543210;

// Separators a locale may put between groups of digits, beyond the one
// Intl reports: a plain space, a no-break space, a narrow no-break space, a
// thin space and the apostrophe Swiss German uses.
const GROUP_SEPARATORS = new Set([" ", "\u00a0", "\u202f", "\u2009", "'", "\u2019"]);

// The typographic minus a locale may format a negative sign with, which is not
// the ASCII character Number() understands.
const UNICODE_MINUS = "\u2212";

// The leading run of a normalised string that is actually a number. Anything
// after it -- a stray exponent marker, a unit a person typed -- is discarded,
// which is the one behaviour of parseFloat worth keeping.
const LEADING_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/iu;

/**
 * The characters one locale spells numbers with.
 */
interface NumberSymbols {
    /** The character that separates the whole part from the fraction. */
    decimal: string;
    /** Each of the locale's own digits, mapped to its ASCII equivalent. */
    digits: ReadonlyMap<string, string>;
    /** The character that breaks the whole part into groups, or an empty string when the locale uses none. */
    group: string;
}

// Reading these off Intl costs two formatter constructions, so each locale is
// worked out once for the lifetime of the page.
const symbolCache = new Map<string, NumberSymbols>();

/**
 * Works out how one locale spells numbers.
 * @param locale - A BCP 47 language tag
 * @returns The locale's decimal separator, group separator and digits
 */
function numberSymbolsFor(locale: string): NumberSymbols {
    const cached = symbolCache.get(locale);
    if (cached !== undefined) {
        return cached;
    }

    const parts = new Intl.NumberFormat(locale).formatToParts(SEPARATOR_SAMPLE);
    const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
    const group = parts.find((part) => part.type === "group")?.value ?? "";

    const digits = new Map<string, string>();
    // ASCII digits are always accepted: a person with a Latin keyboard types
    // them whatever the locale of the interface is.
    for (const digit of "0123456789") {
        digits.set(digit, digit);
    }

    const localDigits = new Intl.NumberFormat(locale, { useGrouping: false }).format(DESCENDING_DIGIT_SAMPLE);
    Array.from(localDigits).forEach((character, index) => {
        digits.set(character, DESCENDING_ASCII_DIGITS[index]);
    });

    const symbols: NumberSymbols = { decimal, digits, group };
    symbolCache.set(locale, symbols);
    return symbols;
}

/**
 * Reads a number out of text a person typed, in the conventions of one locale.
 *
 * `parseFloat` understands only a period as the decimal separator and only
 * ASCII digits, so it silently mangles what most of the world types: it reads
 * the German `3,14` as 3. This reads the decimal separator, the group separator
 * and the digits from the locale itself, so `3,14` in German is 3.14 and Eastern
 * Arabic digits are numbers rather than nonsense.
 *
 * Group separators are discarded rather than validated, so `1,234` in English is
 * 1234. Anything that is not part of a number ends the reading, so `12px` is 12
 * and `abc` is `NaN`.
 * @param text - What the person typed
 * @param locale - The BCP 47 language tag whose conventions to read it by
 * @returns The number, or `NaN` when the text holds none
 */
export function parseLocaleNumber(text: string, locale: string): number {
    const symbols = numberSymbolsFor(locale);
    let normalized = "";

    for (const character of text.trim()) {
        const digit = symbols.digits.get(character);
        if (digit !== undefined) {
            normalized += digit;
            continue;
        }

        if (character === symbols.decimal) {
            normalized += ".";
            continue;
        }

        if (character === symbols.group || GROUP_SEPARATORS.has(character)) {
            continue;
        }

        if (character === "-" || character === UNICODE_MINUS) {
            normalized += "-";
            continue;
        }

        if (character === "+") {
            normalized += "+";
            continue;
        }

        if (character === "e" || character === "E") {
            normalized += character;
            continue;
        }

        break;
    }

    const match = LEADING_NUMBER.exec(normalized);
    return match === null ? Number.NaN : Number(match[0]);
}

/**
 * A number formatter for the active locale.
 *
 * Give it the same options you would give `Intl.NumberFormat`; the locale comes
 * from the nearest `LabelsProvider`, or from the document and the browser when
 * there is none. The formatter is rebuilt only when the locale or the options
 * change, so it is safe to call on every row of a long list.
 * @param options - Formatting options, passed straight to `Intl.NumberFormat`
 * @returns A memoised `Intl.NumberFormat` for the active locale
 * @example
 * ```tsx
 * const formatter = useNumberFormatter({maximumFractionDigits: 2});
 * return <PanelField label="Weight" value={formatter.format(weight)} />;
 * ```
 */
export function useNumberFormatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const locale = useLocale();
    // An options object written inline is a new object on every render, so the
    // memo is keyed on its contents rather than its identity.
    const optionsKey = JSON.stringify(options ?? {});

    return useMemo(() => new Intl.NumberFormat(locale, options), [locale, optionsKey]);
}

/**
 * A formatter that spells a whole number as an ordinal in the active locale.
 *
 * The plural category comes from `Intl.PluralRules` with ordinal rules and the
 * spelling comes from the `ordinal` label, so a translation chooses a form per
 * category instead of inheriting English's "st/nd/rd/th". That is what makes
 * "1st", "1er" and "1." all reachable from the same component.
 * @returns A function that spells one whole number as an ordinal
 * @example
 * ```tsx
 * const ordinal = useOrdinalFormatter();
 * const labels = useLabels();
 * const name = labels.percentile(ordinal(98));
 * ```
 */
export function useOrdinalFormatter(): (value: number) => string {
    const locale = useLocale();
    const labels = useLabels();
    const numberFormatter = useNumberFormatter();
    const pluralRules = useMemo(() => new Intl.PluralRules(locale, { type: "ordinal" }), [locale]);

    return useCallback(
        (value: number): string => labels.ordinal(numberFormatter.format(value), pluralRules.select(value)),
        [labels, numberFormatter, pluralRules],
    );
}

/**
 * A string comparator for the active locale.
 *
 * Sorting with `<` compares UTF-16 code units, which puts every accented word
 * after every unaccented one and sorts "item 10" before "item 9". A collator
 * sorts the way a reader of that language expects.
 * @param options - Collation options, passed straight to `Intl.Collator`; `{numeric: true}` is usually what a column of values wants
 * @returns A memoised `Intl.Collator` for the active locale
 * @example
 * ```tsx
 * const collator = useCollator({numeric: true});
 * const sorted = useMemo(() => [...rows].sort((a, b) => collator.compare(a.name, b.name)), [rows, collator]);
 * ```
 */
export function useCollator(options?: Intl.CollatorOptions): Intl.Collator {
    const locale = useLocale();
    const optionsKey = JSON.stringify(options ?? {});

    return useMemo(() => new Intl.Collator(locale, options), [locale, optionsKey]);
}

/**
 * A parser that reads a number out of text a person typed, in the active
 * locale.
 *
 * Use this in place of `parseFloat` on anything typed into a control. See
 * `parseLocaleNumber` for exactly what it accepts.
 * @returns A function that reads one number, returning `NaN` when the text holds none
 * @example
 * ```tsx
 * const parse = useNumberParser();
 * const handleChange = (text: string): void => {
 *     const value = parse(text);
 *     if (!Number.isNaN(value)) {
 *         onChange(value);
 *     }
 * };
 * ```
 */
export function useNumberParser(): (text: string) => number {
    const locale = useLocale();

    return useCallback((text: string): number => parseLocaleNumber(text, locale), [locale]);
}
