/**
 * Counting the values a style writer writes as the nearest value its format holds, for the W_STYLE_APPROXIMATED
 * notes every writer reports.
 */

import type { LossNote } from "../../types.js";
import { STYLE_ISSUE } from "../codes.js";
import type { StyleTarget } from "../types.js";

/** Counts the values written as the nearest value a format holds, per target and property. */
export class StyleApproximations {
    readonly #seen = new Map<string, { count: number; samples: Set<string> }>();

    /**
     * Records one value written approximately.
     * @param target - nodes or edges
     * @param property - the property
     * @param value - the exact value
     */
    add(target: StyleTarget, property: string, value: unknown): void {
        const key = `${target}.${property}`;
        const a = this.#seen.get(key) ?? { count: 0, samples: new Set<string>() };
        a.count++;
        if (a.samples.size < 8) {
            a.samples.add(String(value));
        }
        this.#seen.set(key, a);
    }

    /**
     * The W_STYLE_APPROXIMATED notes, one per target and property.
     * @param holder - what holds the values, for the message ("Graphviz", "the d3 dialect of JSON")
     * @returns the notes
     */
    notes(holder: string): LossNote[] {
        return Array.from(this.#seen, ([key, a]) => {
            const [target, property] = key.split(".") as [StyleTarget, string];
            return Object.freeze({
                code: STYLE_ISSUE.APPROXIMATED,
                message: `${target} ${property} is written as the nearest value ${holder} has for ${String(a.count)} ${target}${a.count === 1 ? "" : "s"} (${[...a.samples].join(", ")}); the graphty.styles block keeps the exact value`,
                column: null,
                count: a.count,
                style: Object.freeze({ target, property: property as never }),
            });
        });
    }
}
