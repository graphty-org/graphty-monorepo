/**
 * The History pop-out's rows, drawn from the element's undo history.
 *
 * graphty-element owns the history: `session.history.steps` is every undoable step, oldest
 * first, and `session.history.position` is how many of them are applied. Everything here is
 * presentation over one `HistoryStep` -- which panel owns it, what its title opens, and how the
 * steps taken inside one XR session draw as a single group -- and holds no state of its own.
 */

import type { HistoryStep, HistoryStepId, ProjectSlice, SessionHistory } from "@graphty/graphty-element/session";

import type { PrimaryActivityId } from "../types";
import { formatHistoryTime } from "./topBarStrings";

/**
 * One step, as the History pop-out draws it.
 */
export interface HistoryEntry {
    /** The step's id in `session.history.steps`, which `history.restoreTo` takes. */
    readonly id: HistoryStepId;
    /** What the step is called, in the element's words, e.g. `Changed colour of Hubs`. */
    readonly title: string;
    /** The panel that owns the step; a title click opens it there. */
    readonly activity: PrimaryActivityId;
    /** That panel's name, as the row's activity column prints it, e.g. `Analyze`. */
    readonly activityLabel: string;
    /** When the step was last written to, in epoch milliseconds. */
    readonly at: number;
    /** The title's own tooltip, naming where a click on it lands. */
    readonly destinationTitle: string;
    /** A second line under the title, e.g. `by voice, in VR`. */
    readonly provenance?: string;
    /** The XR session the step was taken inside; those steps draw as one group. */
    readonly xrSessionId?: string;
}

/**
 * One step row of the pop-out.
 */
export interface HistoryEntryRow {
    /** Discriminator. */
    readonly kind: "entry";
    /** The step. */
    readonly entry: HistoryEntry;
    /** Whether the step has been undone, which the row marks by striking it through. */
    readonly undone: boolean;
    /** Whether the step is the last one applied. */
    readonly current: boolean;
}

/**
 * An XR session, which the pop-out draws as ONE collapsible group rather than as loose steps.
 *
 * One arm of {@link HistoryRow}, so a caller drawing the pop-out can tell the two rows apart.
 * @public
 */
export interface HistoryXrSessionRow {
    /** Discriminator. */
    readonly kind: "xrSession";
    /** The session's id: the step's `provenance.xr`, `<mode>:<start>`. */
    readonly sessionId: string;
    /** The session's name, e.g. `VR session 14:21 - 14:39`. */
    readonly label: string;
    /** The session's steps, newest first. */
    readonly children: readonly HistoryEntryRow[];
    /** Whether every step in the session has been undone. */
    readonly undone: boolean;
    /** The newest step's time, which the group header prints. */
    readonly at: number;
}

/**
 * One row of the History pop-out.
 */
export type HistoryRow = HistoryEntryRow | HistoryXrSessionRow;

/**
 * Which panel owns a step, by the first slice it wrote in this order. A run and the layers it
 * painted are one step, and the reader looks for it in Analyze, so `runs` comes first.
 */
const SLICE_ACTIVITY: readonly (readonly [ProjectSlice, PrimaryActivityId])[] = [
    ["runs", "analyze"],
    ["graph", "data"],
    ["visibility", "explore"],
    ["scopes", "explore"],
    ["views", "present"],
    ["styles", "style"],
    ["layout", "style"],
    ["arrangement", "style"],
    ["pins", "style"],
    ["config", "style"],
];

/**
 * One step as a pop-out entry.
 * @param step - the element's step.
 * @param titles - the name each panel's header prints.
 * @returns the entry.
 */
function entryOf(step: HistoryStep, titles: Readonly<Record<PrimaryActivityId, string>>): HistoryEntry {
    const activity = SLICE_ACTIVITY.find(([slice]) => step.slices.includes(slice))?.[1] ?? "data";
    const activityLabel = titles[activity];
    const { via, xr } = step.provenance;
    const mode = xr?.split(":")[0].toUpperCase();
    const provenance = via === undefined ? undefined : `by ${via}${mode === undefined ? "" : `, in ${mode}`}`;

    return {
        id: step.id,
        title: step.label,
        activity,
        activityLabel,
        at: Date.parse(step.at),
        destinationTitle: `${step.label}. Opens ${activityLabel}`,
        ...(provenance === undefined ? {} : { provenance }),
        ...(xr === undefined ? {} : { xrSessionId: xr }),
    };
}

/**
 * The history as the pop-out draws it: newest first, every step past `position` marked undone,
 * and each XR session collapsed into one group.
 * @param steps - `session.history.steps`, oldest first.
 * @param position - `session.history.position`, how many steps are applied.
 * @param titles - the name each panel's header prints.
 * @returns the rows, newest first.
 */
export function historyRows(
    steps: readonly HistoryStep[],
    position: number,
    titles: Readonly<Record<PrimaryActivityId, string>>,
): readonly HistoryRow[] {
    const rows: HistoryRow[] = [];
    const sessions = new Map<string, HistoryEntryRow[]>();

    for (let index = steps.length - 1; index >= 0; index -= 1) {
        const entry = entryOf(steps[index], titles);
        const row: HistoryEntryRow = { kind: "entry", entry, undone: index >= position, current: index === position - 1 };
        const { xrSessionId } = entry;

        if (xrSessionId === undefined) {
            rows.push(row);
            continue;
        }

        const existing = sessions.get(xrSessionId);

        if (existing !== undefined) {
            existing.push(row);
            continue;
        }

        const children: HistoryEntryRow[] = [row];
        const [mode, ...start] = xrSessionId.split(":");

        sessions.set(xrSessionId, children);
        rows.push({
            kind: "xrSession",
            sessionId: xrSessionId,
            label: `${mode.toUpperCase()} session ${formatHistoryTime(Date.parse(start.join(":")))} - ${formatHistoryTime(entry.at)}`,
            children,
            undone: false,
            at: entry.at,
        });
    }

    return rows.map((row) =>
        row.kind === "xrSession" ? { ...row, undone: row.children.every((child) => child.undone) } : row,
    );
}

/**
 * What the next Undo will do, in the words its tooltip prints: undo the newest applied step,
 * cancel work still pending, or nothing.
 * @param nextUndo - `session.history.nextUndo`.
 * @returns e.g. `Undo Ran Degree`, `Cancel Degree`, or undefined when there is nothing to undo.
 */
export function undoVerb(nextUndo: SessionHistory["nextUndo"]): string | undefined {
    if (nextUndo === null) {
        return undefined;
    }

    return nextUndo.kind === "undo" ? `Undo ${nextUndo.step.label}` : `Cancel ${nextUndo.pending[0]?.label ?? ""}`.trim();
}
