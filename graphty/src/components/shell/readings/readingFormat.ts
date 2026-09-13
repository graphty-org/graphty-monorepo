/**
 * The number and list formatting every plain-language reading shares.
 *
 * Spec section 7.5 ("Plain-language readings", lines 5791-5871) makes two demands of
 * the numbers inside a reading and this module is where both live, once:
 *
 * 1. **Prose rounds, Counts do not.** "counts above 100,000 round to three
 *    significant figures in prose and stay exact in the Counts rows" (spec 5853). So
 *    {@link formatCount} is the exact form the Counts rows use and
 *    {@link formatProseCount} is the rounded form a sentence uses. A reading that
 *    reaches for the wrong one is the defect this split exists to prevent.
 * 2. **Modularity is banded, never bare.** "above 0.3 'clearly separated', 0.1 to 0.3
 *    'weakly separated; treat with caution', below 0.1 'barely separated; the
 *    grouping may not be meaningful'" (spec 2544-2550). The three phrases below are
 *    those words and nothing else: a paraphrase changes what the reading claims.
 *
 * Everything here is pure and free of React, of a clock and of the AI seam -- spec
 * 5869: "Readings are generated from result statistics by templates, not by AI."
 *
 * Grouping runs through `toLocaleString("en-US")` rather than the ambient locale so
 * the separator is an ASCII comma on every machine, which is what the artboards draw
 * ("1,104,206 events", ExplorerLargeGraph.dc.html:3328).
 */

/** Below this, a prose count is exact; at or above it, three significant figures (spec 5853). */
const PROSE_EXACT_CEILING = 100000;

/** "three significant figures" (spec 5853). */
const PROSE_SIGNIFICANT_FIGURES = 3;

/** Above this modularity the groups are "clearly separated" (spec 2546). */
const MODULARITY_CLEAR_FLOOR = 0.3;

/** At or above this, and at or below {@link MODULARITY_CLEAR_FLOOR}, "weakly separated" (spec 2546). */
const MODULARITY_WEAK_FLOOR = 0.1;

/** How many decimals a modularity value is drawn to (ExplorerAfterCard.dc.html:938, "0.447"). */
const MODULARITY_DECIMALS = 3;

/**
 * The exact count the Counts rows and the caveats line use: grouped, never rounded.
 * @param value - the count. Rounded to an integer; a non-finite value reads "0".
 * @returns the count with ASCII comma groups, e.g. 1104 -> "1,104".
 */
export function formatCount(value: number): string {
    if (!Number.isFinite(value)) {
        return "0";
    }

    return Math.round(value).toLocaleString("en-US");
}

/**
 * The count a SENTENCE uses: exact below 100,000, three significant figures above it,
 * because a novice cannot hold "10,412,318" but can hold "10,400,000" (spec 5853).
 * @param value - the count. A non-finite value reads "0".
 * @returns the prose count, e.g. 61234 -> "61,234" and 120418 -> "120,000".
 */
export function formatProseCount(value: number): string {
    if (!Number.isFinite(value)) {
        return "0";
    }

    const rounded = Math.round(value);
    if (Math.abs(rounded) < PROSE_EXACT_CEILING) {
        return formatCount(rounded);
    }

    const exponent = Math.floor(Math.log10(Math.abs(rounded))) - (PROSE_SIGNIFICANT_FIGURES - 1);
    const magnitude = 10 ** exponent;

    return formatCount(Math.round(rounded / magnitude) * magnitude);
}

/**
 * A share as the whole percent the readings draw ("One connected part holds 93% of
 * nodes", ExplorerLargeGraph.dc.html:3328). No decimal: a reading states a
 * proportion, not a measurement.
 * @param fraction - the share, 0 to 1. A non-finite value reads "0%".
 * @returns the percent with its sign, e.g. 0.913 -> "91%".
 */
export function formatPercent(fraction: number): string {
    if (!Number.isFinite(fraction)) {
        return "0%";
    }

    return `${Math.round(fraction * 100)}%`;
}

/**
 * The list form every board draws: no serial comma, "and" before the last item
 * ("96 accounts, 48 devices, 34 phone numbers and 22 merchants",
 * AllStatistics.dc.html:940).
 * @param items - the already-worded items, in the order they are read.
 * @returns "", "a", "a and b" or "a, b and c".
 */
export function joinList(items: readonly string[]): string {
    if (items.length === 0) {
        return "";
    }

    if (items.length === 1) {
        return items[0];
    }

    const head = items.slice(0, -1).join(", ");

    return `${head} and ${items[items.length - 1]}`;
}

/**
 * Modularity as the boards draw it: three decimals, so 0.447 and 0.44 are
 * distinguishable (ExplorerAfterCard.dc.html:938).
 * @param value - the modularity. A non-finite value reads "0.000".
 * @returns the value to three decimals, e.g. 0.4471 -> "0.447".
 */
export function formatModularity(value: number): string {
    if (!Number.isFinite(value)) {
        return (0).toFixed(MODULARITY_DECIMALS);
    }

    return value.toFixed(MODULARITY_DECIMALS);
}

/**
 * The three bands spec 7.5 names, and no fourth: a band a reading cannot phrase is a
 * band a reading may not claim.
 * @public
 */
export type ModularityBand = "barely" | "clear" | "weak";

/**
 * Which band a modularity value falls in. Above 0.3 is "clear"; 0.1 to 0.3 inclusive
 * of both ends is "weak"; below 0.1 is "barely" (spec 2546). The boundaries are
 * exactly where the spec puts them: 0.3 itself is "weak", not "clear".
 * @param value - the modularity the grouping method reported.
 * @returns the band its phrase is read from.
 */
export function modularityBand(value: number): ModularityBand {
    if (value > MODULARITY_CLEAR_FLOOR) {
        return "clear";
    }

    if (value >= MODULARITY_WEAK_FLOOR) {
        return "weak";
    }

    return "barely";
}

/**
 * The band's words, exactly as spec 2546 writes them. A lookup rather than a switch so
 * a new band cannot compile without its phrase.
 */
const MODULARITY_BAND_PHRASES: Readonly<Record<ModularityBand, string>> = {
    barely: "barely separated; the grouping may not be meaningful",
    clear: "clearly separated",
    weak: "weakly separated; treat with caution",
};

/**
 * The band's exact words. Never paraphrased: the phrase carries the caution, and a
 * softer wording would make a weak grouping read as a finding.
 * @param band - the band from {@link modularityBand}.
 * @returns the phrase the reading drops after "The groups are ".
 */
export function modularityBandPhrase(band: ModularityBand): string {
    return MODULARITY_BAND_PHRASES[band];
}

/**
 * The scale sentence 6.7 puts behind the info circle beside every modularity value,
 * in the reading and in the result body alike (spec 2547-2551).
 *
 * It ships unused by design. `ResultInspector`'s `reading` prop is typed `string`, so
 * a mid-sentence info circle would mean widening a built presentation component's prop
 * to `ReactNode`; the band word and the number are in the sentence instead, which is
 * what the W14 comprehension criterion needs (spec 7.6). Whoever draws the circle
 * reads its title from here -- the string the artboards already carry
 * (ExplorerAfterCard.dc.html:938).
 */
export const MODULARITY_SCALE_EXPLANATION =
    "Modularity scores how separated the groups are. Above 0.3 counts as well separated.";
