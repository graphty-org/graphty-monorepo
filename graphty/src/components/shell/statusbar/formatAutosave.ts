/**
 * The words for graphty-element's autosave, and nothing else.
 *
 * graphty-element keeps the reader's work in the browser and reports where that stands as
 * neutral facts: a state, a problem code with its parameters, what a restore brought back,
 * and which entries it did not restore. This module turns those facts into the app's
 * sentences. It asks no question of the browser and keeps no state.
 */

import type {
    AutosaveAtRisk,
    AutosaveAvailable,
    AutosaveCode,
    AutosaveEntry,
    AutosaveRestored,
    AutosaveStatus,
} from "@graphty/graphty-element";

/** How every one of the chip's labels begins. */
export const AUTOSAVE_CHIP_PREFIX = "Autosave";

/** The chip's two strings and its ink. */
export interface AutosaveChipText {
    /** The chip's text, e.g. `Autosave: saved`. */
    readonly label: string;
    /** The chip's tooltip. */
    readonly title: string;
    /** Which ink the chip's dot takes. */
    readonly tone: "ok" | "busy" | "problem";
}

/**
 * The sentence for an autosave problem code.
 * @param problem - the code and its parameters, as graphty-element reported them.
 * @param problem.code - the code.
 * @returns the sentence.
 */
export function autosaveProblemSentence(problem: { readonly code: string }): string {
    switch (problem.code as AutosaveCode) {
        case "E_AUTOSAVE_UNAVAILABLE":
            return "This browser does not let graphty keep your work. Save a copy to a file before you close the page.";
        case "E_AUTOSAVE_QUOTA":
            return "This browser is out of room for this site, so recent changes are not kept. Free some space or save a copy to a file.";
        case "E_AUTOSAVE_STALLED":
            return "The browser's storage stopped answering. graphty keeps trying; save a copy to a file if this lasts.";
        case "E_AUTOSAVE_CONNECTION_LOST":
            return "The browser's storage stopped working. Save a copy to a file, then reload the page.";
        case "E_AUTOSAVE_TOO_LARGE":
            return "This graph is too large to keep in the browser. Save a copy to a file to keep it.";
        case "E_AUTOSAVE_FORMAT_NEWER":
            return "Work saved by a newer version of graphty is in this browser. Reload to update graphty and get it back.";
        case "E_AUTOSAVE_RESTORE_CRASHED":
            return "Your saved work stopped the page twice while it was being reopened, so it was not reopened again.";
        case "E_AUTOSAVE_KEY_AMBIGUOUS":
        case "E_AUTOSAVE_FAILED":
        default:
            return "Recent changes could not be kept in this browser. graphty tries again with the next change.";
    }
}

/**
 * The chip's words for where autosave stands, or nothing when it is off with nothing to say.
 * @param status - autosave's status, as graphty-element published it.
 * @returns the chip's label, tooltip and ink, or null.
 */
export function formatAutosaveChip(status: AutosaveStatus): AutosaveChipText | null {
    switch (status.state) {
        case "saved":
            // Nothing written yet: there is no work to speak of.
            if (status.savedAt === null) {
                return null;
            }
            return {
                label: `${AUTOSAVE_CHIP_PREFIX}: saved`,
                title: "Your work is kept in this browser and comes back when you reopen graphty.",
                tone: "ok",
            };
        case "pending":
            return {
                label: `${AUTOSAVE_CHIP_PREFIX}: saving...`,
                title: "Keeping your latest change in this browser.",
                tone: "busy",
            };
        case "failing":
            return {
                label: `${AUTOSAVE_CHIP_PREFIX}: not saved`,
                title:
                    status.problem === null
                        ? autosaveProblemSentence({ code: "E_AUTOSAVE_FAILED" })
                        : autosaveProblemSentence(status.problem),
                tone: "problem",
            };
        default:
            return status.problem === null
                ? null
                : {
                      label: `${AUTOSAVE_CHIP_PREFIX}: off`,
                      title: autosaveProblemSentence(status.problem),
                      tone: "problem",
                  };
    }
}

/**
 * How long ago an ISO time was, in words: "2 minutes ago", "yesterday", "a moment ago".
 * @param iso - the time.
 * @param now - the time now, in ms since the epoch.
 * @returns the phrase.
 */
function ago(iso: string, now: number): string {
    const seconds = Math.round((Date.parse(iso) - now) / 1000);
    const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const units: readonly [Intl.RelativeTimeFormatUnit, number][] = [
        ["day", 86_400],
        ["hour", 3600],
        ["minute", 60],
    ];
    for (const [unit, size] of units) {
        if (Math.abs(seconds) >= size) {
            return format.format(Math.trunc(seconds / size), unit);
        }
    }
    return "a moment ago";
}

/**
 * The notice that says work came back, and what else the browser still holds.
 * @param restored - what the restore brought back.
 * @param entries - every entry of this key, from `autosaver.list()`.
 * @param now - the time now, in ms since the epoch.
 * @returns the sentence.
 */
export function restoredSentence(
    restored: AutosaveRestored,
    entries: readonly AutosaveEntry[],
    now = Date.now(),
): string {
    const parts = [`Restored your work from ${ago(restored.savedAt, now)}.`];
    if (restored.others > 0) {
        const copies = restored.others === 1 ? "copy" : "copies";
        parts.push(
            `${String(restored.others)} other unsaved ${copies} of your work ${restored.others === 1 ? "is" : "are"} in this browser.`,
        );
    }
    const ended = entries.filter((entry) => entry.ended !== undefined && entry.id !== restored.entry.id).length;
    if (ended > 0) {
        parts.push(
            `${String(ended)} earlier ${ended === 1 ? "graph" : "graphs"} you replaced ${ended === 1 ? "is" : "are"} kept too.`,
        );
    }
    return parts.join(" ");
}

/**
 * The notice for work graphty-element found but did not reopen.
 * @param available - the entry and why it was not reopened.
 * @returns the sentence.
 */
export function availableSentence(available: AutosaveAvailable): string {
    switch (available.reason) {
        case "held-by-other-tab":
            return "Your latest work is open in another tab, so this tab started fresh.";
        case "page-data-changed":
            return "The data changed since your last visit, so your earlier work was kept aside.";
        case "restore-failed":
            return available.problem === null
                ? "Your saved work could not be reopened."
                : autosaveProblemSentence(available.problem);
        default:
            return "Earlier work is kept in this browser.";
    }
}

/**
 * The notice for work kept only where the browser may delete it.
 * @param fact - the at-risk fact.
 * @returns the sentence.
 */
export function atRiskSentence(fact: AutosaveAtRisk): string {
    return fact.params.ephemeral === "likely"
        ? "This looks like a private window: your work is gone when it closes. Save a copy to a file to keep it."
        : "This browser may clear what it keeps for this site. Save a copy to a file to be sure.";
}
