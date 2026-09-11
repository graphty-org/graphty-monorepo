import type React from "react";

// One answer, for the whole package, to "this content arrives later". Before
// this module there were five: ProseBlock took a politeness level called
// `live`, ActionRow took the same three values under a name of its own and
// wrote `aria-live="off"` into the document rather than leaving it out, the
// three chart rows were announced always and could not be quietened, and
// CompoundRow and RampRow opted in through the presence of `busy`.
//
// The rule kept is CompoundRow's, because a live region has to be in the
// document before the content it announces changes: one added at the same
// moment its values arrive is announced by nothing. Supplying `busy` -- true or
// false -- is therefore the caller saying "this is fed by something that
// finishes later", which is what creates the region, well before the run ends.

/**
 * How urgently a screen reader announces content that changes on its own.
 *
 * - `"off"` -- never announced. The reader finds it by going there.
 * - `"polite"` -- announced when the reader is not busy. Right for a result.
 * - `"assertive"` -- interrupts whatever is being read. Reserve it for a
 *   failure; a page of assertive regions is unusable.
 */
export type LiveSetting = "off" | "polite" | "assertive";

/**
 * Works out how urgently a surface announces itself.
 *
 * An explicit `live` always wins. With none, a surface that was given `busy` --
 * true or false, since either is the caller saying its content is fed by
 * something that finishes later -- announces politely, and a surface that was
 * not stays silent.
 * @param live - The politeness the caller asked for, if any
 * @param busy - Whether the content is still being worked out, if the caller says at all
 * @returns The politeness in force
 */
export function resolveLive(live: LiveSetting | undefined, busy: boolean | undefined): LiveSetting {
    if (live !== undefined) {
        return live;
    }

    return busy === undefined ? "off" : "polite";
}

/**
 * The ARIA attributes that make one element a live region, or leave it silent.
 *
 * Spread the result onto the element whose content arrives late. A silent
 * surface gets no `aria-live` at all rather than `aria-live="off"`: the two
 * behave the same, and a column of rows each declaring itself silent is noise
 * in the accessibility tree.
 *
 * `aria-atomic` comes with the region because a reading that has been replaced
 * makes sense only read whole -- "98th percentile" rather than "98th".
 * @param live - The politeness the caller asked for, if any
 * @param busy - Whether the content is still being worked out, if the caller says at all
 * @returns Attributes to spread onto the announcing element
 * @example
 * ```tsx
 * <Box {...liveRegionProps(live, busy)}>{reading}</Box>
 * ```
 */
export function liveRegionProps(live: LiveSetting | undefined, busy: boolean | undefined): React.AriaAttributes {
    const level = resolveLive(live, busy);

    if (level === "off") {
        // aria-busy still goes out when the caller supplied it: a surface can
        // be marked unfinished without being announced.
        return { "aria-busy": busy };
    }

    return { "aria-live": level, "aria-atomic": true, "aria-busy": busy };
}
