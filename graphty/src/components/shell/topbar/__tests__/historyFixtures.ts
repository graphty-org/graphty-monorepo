/**
 * Steps shaped the way graphty-element's `session.history.steps` hands them over, for the boards
 * that draw the History pop-out.
 */

import type { HistoryStep, HistoryStepId, ProjectSlice } from "@graphty/graphty-element/session";

import type { PrimaryActivityId } from "../../types";

/** The name each panel's header prints. */
export const PANEL_TITLES: Readonly<Record<PrimaryActivityId, string>> = {
    data: "Data",
    explore: "Explore",
    analyze: "Analyze",
    style: "Style",
    present: "Present",
    ai: "AI",
};

/**
 * One frozen step.
 * @param id - the step's id.
 * @param label - what the pop-out prints.
 * @param slices - what the step changed.
 * @param at - when, in epoch milliseconds.
 * @param provenance - where the step came from.
 * @returns the step.
 */
export function makeStep(
    id: string,
    label: string,
    slices: readonly ProjectSlice[],
    at: number,
    provenance: Readonly<Record<string, string>> = {},
): HistoryStep {
    return Object.freeze({
        id: id as HistoryStepId,
        label,
        at: new Date(at).toISOString(),
        ops: [],
        slices,
        bytes: 0,
        provenance,
    });
}
