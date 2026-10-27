/** The replace receipt's words (spec section 3.7): labels and counts, never sentences. */

import type { ReplaceReport, ReplaceUnboundCode } from "@graphty/graphty-element/session";

import { formatNumber } from "../inspector/words";

/** What each unbound code is called on the receipt: one word, made plural by an s. */
const UNBOUND_WORDS: Readonly<Record<ReplaceUnboundCode, string>> = {
    "style-layer": "style",
    filter: "filter",
    join: "join",
};

/**
 * The receipt's unbound counts, one per code, in the element's order: "1 style unbound".
 * @param report - what the element counted.
 * @returns the words, empty when nothing came unbound.
 */
export function unboundWords(report: ReplaceReport): string[] {
    const counts = new Map<ReplaceUnboundCode, number>();
    for (const fact of report.unbound) {
        counts.set(fact.code, (counts.get(fact.code) ?? 0) + 1);
    }
    return [...counts].map(([code, n]) => {
        const word = UNBOUND_WORDS[code] ?? code;
        const plural = n === 1 ? word : `${word}s`;
        return `${formatNumber(n)} ${plural} unbound`;
    });
}

/**
 * The receipt's chips for one kind: +added, -removed, changed; zero counts are left out.
 * @param counts - the kind's counts.
 * @param counts.added - how many the copy added.
 * @param counts.removed - how many went.
 * @param counts.changed - how many changed a value.
 * @returns the chips' words.
 */
export function countWords(counts: ReplaceReport["nodes"]): string[] {
    return [
        counts.added > 0 ? `+${formatNumber(counts.added)}` : "",
        counts.removed > 0 ? `-${formatNumber(counts.removed)}` : "",
        counts.changed > 0 ? `${formatNumber(counts.changed)} changed` : "",
    ].filter(Boolean);
}
