/**
 * The join workspace's shared state, which the shell provides and each build's body reads: the
 * element's recipe draft (`session.data.prepareJoins()`), the step whose result the panes show,
 * and Before or After. Every edit to the draft goes through `edit`, so the panes draw it again.
 */

import type { GraphSession, JoinRegion, JoinRowFate, JoinsDraft } from "@graphty/graphty-element/session";
import { createContext, useContext } from "react";

/** Which graph the preview draws: the one before the shown step, or the one it leaves. */
export type JoinSide = "before" | "after";

/** What the shell hands the body and the panes. */
export interface JoinWorkspaceApi {
    /** The element's session. */
    readonly session: GraphSession;
    /** The recipe, held by the element until Done or Cancel. */
    readonly draft: JoinsDraft;
    /** Moves on every edit: read the draft again after it. */
    readonly version: number;
    /**
     * Makes an edit to the draft (a step added, changed, removed, moved; undo; redo) and draws the
     * panes again.
     * @param change - the edit.
     */
    readonly edit: (change: (draft: JoinsDraft) => void) => void;
    /** The step the panes show, or null for the whole recipe (its last step). */
    readonly step: string | null;
    /**
     * Shows a step in the panes.
     * @param step - the step, or null for the whole recipe.
     */
    readonly select: (step: string | null) => void;
    /** Before or After. */
    readonly side: JoinSide;
    /**
     * Switches Before and After.
     * @param side - the side.
     */
    readonly setSide: (side: JoinSide) => void;
    /**
     * Reads a file, or the file at a URL, and holds it in the recipe as a table, apart from the graph.
     * @param from - the file, or its URL.
     * @returns the held table's key, an input of the draft.
     */
    readonly addTable: (from: File | string) => Promise<string>;
    /** The row fate the rows pane shows only, or null for every row. */
    readonly fate: JoinRowFate | null;
    /**
     * Shows only the rows of one fate in the rows pane.
     * @param fate - the fate, or null for every row.
     */
    readonly setFate: (fate: JoinRowFate | null) => void;
    /**
     * The regions each compare step keeps, by step: Done keeps only them, with a filter on the
     * step's membership column. A step absent keeps every region.
     */
    readonly keeps: ReadonlyMap<string, readonly JoinRegion[]>;
    /**
     * Sets the regions a compare step keeps.
     * @param step - the step.
     * @param regions - the regions, or null for every one.
     */
    readonly setKeep: (step: string, regions: readonly JoinRegion[] | null) => void;
}

/** The workspace's state, provided by the shell. */
export const JoinWorkspaceContext = createContext<JoinWorkspaceApi | null>(null);

/**
 * The join workspace's state, for a component drawn inside the workspace.
 * @returns the state.
 */
export function useJoinWorkspace(): JoinWorkspaceApi {
    const api = useContext(JoinWorkspaceContext);
    if (api === null) {
        throw new Error("useJoinWorkspace is called outside the join workspace");
    }
    return api;
}

/**
 * The step the panes show: the one picked, else the recipe's last, else none.
 * @param api - the workspace's state.
 * @returns the step's id, or undefined when the recipe has none.
 */
export function shownStep(api: Pick<JoinWorkspaceApi, "draft" | "step">): string | undefined {
    const { steps } = api.draft;
    return steps.find((each) => each.id === api.step)?.id ?? steps.at(-1)?.id;
}
