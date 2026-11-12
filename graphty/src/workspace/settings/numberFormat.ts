/**
 * The one number spelling the app shares (Settings > General > Number format): the table, the
 * inspector, the legends and every count in the app's words format through here, so the reader's
 * choice reaches all of them at once. graphty-element hands over raw numbers; spelling them is the
 * app's.
 */

import { useSyncExternalStore } from "react";

import { NUMBER_FORMAT, readPreference, writePreference } from "./preferences";

/** A Number format choice. */
export type NumberFormatChoice = (typeof NUMBER_FORMAT.values)[number];

/** The locale whose grouping and decimal marks each choice stands for; system is the browser's. */
const LOCALES: Record<NumberFormatChoice, string | undefined> = {
    system: undefined,
    period: "en-US",
    comma: "de-DE",
    space: "fr-FR",
};

/** The formatters for one choice. */
export interface NumberFormats {
    readonly choice: NumberFormatChoice;
    /** A measured value: four significant digits, grouped, never fewer than its whole part's digits. */
    readonly number: (value: number) => string;
    /** A count, exact and grouped: 12,345, never 12,350. */
    readonly count: (value: number) => string;
}

/**
 * The formatters for a choice.
 * @param choice - the reader's choice.
 * @returns its formatters.
 */
function formatsFor(choice: NumberFormatChoice): NumberFormats {
    const locale = LOCALES[choice];
    const significant = new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 });
    const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const exact = new Intl.NumberFormat(locale);
    return {
        choice,
        number: (value) => (Math.abs(value) >= 1000 ? whole.format(value) : significant.format(value)),
        count: (value) => exact.format(value),
    };
}

let current = formatsFor(readPreference(NUMBER_FORMAT));
const listeners = new Set<() => void>();

/**
 * Keeps the reader's choice and redraws everything that spells numbers.
 * @param choice - the new choice.
 */
export function setNumberFormat(choice: NumberFormatChoice): void {
    writePreference(NUMBER_FORMAT, choice);
    current = formatsFor(choice);
    for (const listener of listeners) {
        listener();
    }
}

/**
 * The current formatters, redrawing the caller when the reader picks another format. A panel
 * calls it once at its root so everything it draws respells; a memoized child (the table) takes
 * `number` as a prop, whose identity changes with the choice.
 * @returns the formatters.
 */
export function useNumberFormats(): NumberFormats {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => current,
    );
}

/**
 * A measured value in the reader's format.
 * @param value - the number.
 * @returns the text.
 */
export function formatNumber(value: number): string {
    return current.number(value);
}

/**
 * A count in the reader's format.
 * @param value - the count.
 * @returns the text.
 */
export function formatCount(value: number): string {
    return current.count(value);
}
