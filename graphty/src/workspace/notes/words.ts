/**
 * The Notes place's reads and words: what a new note is about (whatever the inspector shows),
 * and how a note's targets, time and state are said. graphty-element stores the notes and says
 * what each target points at now (`session.notes.status`); every word here is the app's.
 */

import type { GraphSession, NoteTarget, NoteTargetInput, NoteTargetStatus } from "@graphty/graphty-element/session";

import type { Resolved } from "../inspector/inspected";
import { count, edgeName } from "../inspector/words";
import { runName } from "../runWords";

/** The most targets one note may name (graphty-element's limit). */
export const MAX_TARGETS = 64;

/**
 * What a note opened on this inspector view is about: the node, the edge, every selected node
 * and edge, the run's result, or the graph when the inspector shows the graph or a row a note
 * cannot name.
 * @param session - the session.
 * @param resolved - what the inspector shows.
 * @returns the targets, one or more.
 */
export function targetsOf(session: GraphSession, resolved: Resolved): NoteTargetInput[] {
    switch (resolved.kind) {
        case "node":
            return [{ node: resolved.node }];
        case "edge":
            return [{ edge: resolved.edge }];
        case "several":
        case "neighborhood":
        case "selection-row":
            return [
                ...session.selection.nodes.map((node) => ({ node })),
                ...session.selection.edges.map((edge) => ({ edge })),
            ];
        case "measure-row":
        case "run-row":
            return [{ result: resolved.run }];
        default:
            return [{ graph: true }];
    }
}

/**
 * One target's name, as a chip shows it.
 * @param session - the session.
 * @param target - the target, as saved or as a door built it.
 * @returns the words: "Ava", "Ava -> Ben", "Graph", a run's name.
 */
export function targetWords(session: GraphSession, target: NoteTarget | NoteTargetInput): string {
    if ("graph" in target) {
        return "Graph";
    }
    if ("node" in target) {
        return String(target.node);
    }
    if ("edge" in target) {
        const edge = typeof target.edge === "string" ? session.data.edge(target.edge) : target.edge;
        return edge === undefined ? "Edge" : edgeName(session, edge);
    }
    if ("set" in target) {
        return target.name ?? "Set";
    }
    if ("result" in target) {
        const run = session.runs.get(target.result);
        return run === undefined ? "Result" : runName(session, run);
    }
    return "Group";
}

/**
 * What a note is about, in the status line: "Ava", "the graph", "3 nodes, 1 edge".
 * @param session - the session.
 * @param targets - the note's targets.
 * @returns the words.
 */
export function aboutWords(session: GraphSession, targets: readonly NoteTargetInput[]): string {
    if (targets.length === 1) {
        return "graph" in targets[0] ? "the graph" : targetWords(session, targets[0]);
    }
    const nodes = targets.filter((target) => "node" in target).length;
    const edges = targets.filter((target) => "edge" in target).length;
    return [nodes > 0 ? count(nodes, "node") : null, edges > 0 ? count(edges, "edge") : null]
        .filter((part) => part !== null)
        .join(", ");
}

/**
 * The words beside a chip whose target is not drawn, or null when it is there.
 * @param state - what the target points at now.
 * @returns the words, or null.
 */
export function targetStateWords(state: NoteTargetStatus["state"] | undefined): string | null {
    switch (state) {
        case "filtered":
            return "Not in the current graph";
        case "missing":
            return "Not in the data";
        case "earlier-run":
            return "From an earlier run";
        default:
            return null;
    }
}

/**
 * A note's meta line: when it was written, and ", edited" once it changed.
 * @param time - when it was written (ISO).
 * @param edited - when it last changed (ISO), if it did.
 * @returns the words, such as "Oct 7, 3:04 PM, edited".
 */
export function noteTimeWords(time: string, edited: string | undefined): string {
    const when = new Date(time).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
    return edited === undefined ? when : `${when}, edited`;
}

/** The inspector kinds whose header counts the notes about them: the ones a note can name. */
const COUNTED = new Set<Resolved["kind"]>(["graph", "node", "edge", "several", "measure-row", "run-row"]);

/**
 * How many notes are about what the inspector shows, exactly (a note about a node is not counted
 * under a selection that holds it plus others).
 * @param session - the session.
 * @param resolved - what the inspector shows.
 * @returns the count.
 */
export function notesAbout(session: GraphSession, resolved: Resolved): number {
    if (!COUNTED.has(resolved.kind)) {
        return 0;
    }
    const targets = targetsOf(session, resolved);
    return targets.length === 0 ? 0 : session.notes.list({ target: targets }).length;
}
