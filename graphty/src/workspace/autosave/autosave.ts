/**
 * The workspace's use of graphty-element's autosave: the key and options its element is given,
 * and what the start screen's Restore and Discard do. graphty-element keeps, lists, reopens and
 * deletes the work; nothing here reads the browser's storage.
 */

import type { AutosaveEntry } from "@graphty/graphty-element";
import { GraphtyLogger } from "@graphty/graphty-element/logging";
import { type GraphSession, listAutosaves, removeAutosave } from "@graphty/graphty-element/session";

import type { CommandContext } from "../commands/registry";
import { baseName } from "../data-page/words";
import { focusMainHeading } from "../frame/focus";
import { keptName, keptPlace, newProjectId, startOpening, stashedPlace, type WorkspaceStore } from "../state/store";
import { reopenedSentence, reopenedTabSentence } from "./words";

/** The key graphty-element keeps the workspace's work under. */
export const WORKSPACE_AUTOSAVE_KEY = "app.graphty.workspace";

/**
 * The element's autosave options: ask the browser to keep the site's storage, and reopen nothing
 * by itself, because the start screen asks the reader first.
 */
export const WORKSPACE_AUTOSAVE_OPTIONS = { persist: true, restore: "manual", keepCamera: true } as const;

/** The workspace's facts about opening and reopening projects: ids and counts, never data. */
const logger = GraphtyLogger.getLogger(["graphty", "workspace"]);

/** What graphty-element keeps for the workspace, as the start of a visit needs it. */
interface KeptWork {
    /** This tab's own entry (a reload, or a tab the browser discarded and loaded again), or null. */
    readonly own: AutosaveEntry | null;
    /**
     * The work to offer on the start screen: the newest entry no tab is writing and no project
     * replaced that holds changes never saved to a file; or null.
     */
    readonly recovered: AutosaveEntry | null;
    /** Every kept entry's id. */
    readonly ids: readonly string[];
}

/**
 * What graphty-element keeps for the workspace: this tab's own entry, which reopens by itself,
 * and other work to offer. graphty-element decides which entry is this tab's (`own`), so a
 * duplicated tab never writes the same entry as its original.
 * @returns this tab's entry and the work to offer.
 */
export async function findKept(): Promise<KeptWork> {
    const entries = await listAutosaves(WORKSPACE_AUTOSAVE_KEY);
    const own = entries.find((entry) => entry.own === true && entry.ended === undefined) ?? null;
    // The newest work holding changes: a newer visit that changed nothing does not hide it.
    const newest = [...entries].reverse().find((entry) => !entry.live && entry.ended === undefined && entry.dirty);
    return { own, recovered: newest ?? null, ids: entries.map((entry) => entry.id) };
}

/**
 * Opens a project whose element reopens an entry once it has come up.
 * @param store - the workspace store.
 * @param entry - the entry.
 * @param after - what to do once it is open, with the project's name.
 * @param focus - where focus goes once it is open; the opened graph's heading by default.
 * @param shown - the name this tab's header showed for it, for this tab's own work.
 */
function reopen(
    store: WorkspaceStore,
    entry: AutosaveEntry,
    after: (name: string, place: ReturnType<typeof stashedPlace>) => void,
    focus?: () => void,
    shown?: string,
): void {
    // An entry the reader never renamed has no name of its own: until the restore says what the
    // data is, the header keeps the new-project name.
    const name = entry.name === "" ? (shown ?? "Untitled") : entry.name;
    store.set((state) => ({
        recovered: null,
        project: { name, id: newProjectId(state) },
        page: "panels",
        place: "graph",
        inspected: null,
        dialog: null,
        ...startOpening({
            name,
            load: async (session, element) => {
                const report = await element.autosaver.restore(entry.id, { discard: true });
                // Read before the store changes again, which stashes the place shown now.
                const place = stashedPlace(element);
                // This tab's own work keeps the name its header showed; other work is named by its data.
                const opened = report.name ?? (shown === undefined ? dataName(session) : null) ?? name;
                store.set((now) => ({ project: now.project && { ...now.project, name: opened } }));
                after(opened, place);
            },
            ...(focus === undefined ? {} : { focus }),
        }),
    }));
}

/**
 * Restore: opens work kept from an earlier visit, and says so.
 * @param store - the workspace store.
 * @param entry - the entry.
 */
export function restoreRecovered(store: WorkspaceStore, entry: AutosaveEntry): void {
    logger.info("restore pressed", { entry: entry.id, nodes: entry.nodes, edges: entry.edges });
    reopen(store, entry, (_name, place) => {
        store.set({ ...place, notice: { message: reopenedSentence(entry) } });
    });
}

/**
 * Reopens this tab's own work after a reload or a discarded tab came back: straight into the
 * workspace, at the page, place, tab and row the reader left, with no offer and no notice; the
 * status line says what reopened.
 * @param store - the workspace store.
 * @param entry - this tab's entry.
 */
export function reopenOwn(store: WorkspaceStore, entry: AutosaveEntry): void {
    // Read before the project opens: opening it writes the Graph place over what was kept.
    const { inspected: row, ...where } = keptPlace();
    reopen(
        store,
        entry,
        (name) => {
            // The row is put back once the data is in, so it exists; a reader who went somewhere
            // meanwhile (a rail click while the work reopened) stays there.
            const { page, place, inspected } = store.get();
            const stayed = page === where.page && place === where.place && inspected === null;
            store.set({
                ...(stayed && row !== undefined ? { inspected: row } : {}),
                announcement: reopenedTabSentence(name),
            });
        },
        focusMainHeading,
        keptName() ?? undefined,
    );
    // The page, place and tabs need no data: they are back at once, so the frame never shows the
    // Graph place first and a place the reader left open (the Assistant) is open from the start,
    // never flipped on under a click that meant to open it.
    store.set(where);
}

/**
 * The name a new project takes from its data, as the data page names one: a file's name without
 * its extension, or a sample's or server's own name.
 * @param session - the restored session.
 * @returns the name, or null when the data has none.
 */
function dataName(session: GraphSession): string | null {
    const source = session.data.source();
    if (source?.name === undefined || source.name === "") {
        return null;
    }
    // `size` is set only when a file was read.
    return source.size === undefined ? source.name : baseName(source.name);
}

/**
 * Discard: deletes the entry, so it is not offered again.
 * @param store - the workspace store.
 * @param entry - the entry.
 * @returns settles once it is deleted, or the failure is shown.
 */
export async function discardRecovered(store: WorkspaceStore, entry: AutosaveEntry): Promise<void> {
    store.set({ recovered: null });
    try {
        await removeAutosave(WORKSPACE_AUTOSAVE_KEY, entry.id);
    } catch {
        store.set({ notice: { message: "The earlier work could not be deleted. It is offered again next time." } });
    }
}

/**
 * How to drop the open project's kept work once the reader has closed or replaced the project,
 * so a later visit does not offer what they chose to leave.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.element - the project's element, or null.
 * @returns a function that has the element delete it, or null when there is nothing to drop.
 */
export function forgetKeptWork({ workspace, element }: CommandContext): (() => Promise<void>) | null {
    if (!workspace.get().autosave || element === null) {
        return null;
    }
    return () => element.autosaver.discard().catch(() => undefined);
}
