/**
 * The words for graphty-element's autosave, and nothing else.
 *
 * graphty-element keeps the reader's work in the browser and reports where that stands as
 * neutral facts: a state, a problem code with its parameters, what a restore brought back,
 * and which entries it did not restore. This module turns those facts into the app's
 * sentences. It asks no question of the browser and keeps no state.
 */

import type { AutosaveAvailable, AutosaveCode, AutosaveEntry, AutosaveStatus } from "@graphty/graphty-element";

/** How every one of the chip's labels begins. */
const AUTOSAVE_CHIP_PREFIX = "Autosave";

/** The chip's two strings and its ink. */
interface AutosaveChipText {
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
 * The notice for work graphty-element found but did not reopen: a short fact.
 * @param available - the entry and why it was not reopened.
 * @returns the fact.
 */
export function availableSentence(available: AutosaveAvailable): string {
    switch (available.reason) {
        case "held-by-other-tab":
            return "Open in another tab";
        case "page-data-changed":
            return "Data changed: earlier work kept aside";
        case "restore-failed":
            return available.problem?.code === "E_AUTOSAVE_FORMAT_NEWER"
                ? "Not reopened: saved by a newer version"
                : "Not reopened";
        default:
            return "Earlier work kept";
    }
}

/**
 * What the start screen says about work kept from an earlier visit and never saved to a file.
 * @param entry - the entry, as graphty-element listed it.
 * @param now - the time now, in ms since the epoch.
 * @returns the sentence.
 */
export function recoveredSentence(entry: AutosaveEntry, now = Date.now()): string {
    const name = entry.name === "" ? "An untitled project" : entry.name;
    const nodes = `${String(entry.nodes)} ${entry.nodes === 1 ? "node" : "nodes"}`;
    return `${name} (${nodes}), changed ${ago(entry.savedAt, now)}, was never saved to a file.`;
}

/**
 * The notice once that work is open again: a short fact.
 * @param entry - the entry.
 * @param now - the time now, in ms since the epoch.
 * @returns the fact.
 */
export function reopenedSentence(entry: AutosaveEntry, now = Date.now()): string {
    return `Restored: ${ago(entry.savedAt, now)}`;
}

/**
 * What a screen reader hears when the graph's data changes: its counts, a short fact.
 * @param nodes - the node count.
 * @param edges - the edge count.
 * @returns the fact.
 */
export function dataCountsFact(nodes: number, edges: number): string {
    return `${String(nodes)} ${nodes === 1 ? "node" : "nodes"}, ${String(edges)} ${edges === 1 ? "edge" : "edges"}`;
}

/**
 * What the status line says once this tab's own work reopened after a reload.
 * @param name - the project's name.
 * @returns the sentence.
 */
export function reopenedTabSentence(name: string): string {
    return `Reopened ${name}`;
}
