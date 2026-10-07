/**
 * Save, Save as, Save local copy, Close and Open for a project (tier1-design.md section T14).
 *
 * graphty-element keeps the project in this browser (`browserProjects`), writes and reads the
 * project file (`session.project.open`, `element.downloadGraph`) and decides what is unsaved
 * (`project.dirty`, the `E_UNSAVED_CHANGES` refusal). This file only asks the reader and writes
 * the words: the notices and the problem sentences.
 */

import { browserProjects, type GraphSession, isGraphtyError, projectFileName } from "@graphty/graphty-element/session";

import type { CommandContext } from "../commands/registry";
import { openDataPage } from "../data-page/request";
import { newProjectId, type WorkspaceStore } from "../state/store";
import { locateFile, readHandle } from "./files";
import { entryForHandle, forgetRecent, type RecentProject, refreshStored, rememberRecent } from "./recent";

/** The dialog ids this package opens in the workspace's one dialog slot. */
export const SAVE_AS_DIALOG = "save-as";
export const DISCARD_DIALOG = "discard";

/** Where the open project's Save goes, and what is waiting on the reader. Per workspace store. */
interface ProjectFileState {
    /** The project these belong to (`state.project.id`); anything else is a fresh project. */
    projectId: number;
    /** The `browserProjects` id Save writes again; null until the project is kept in this browser. */
    target: string | null;
    /** The project's Recent projects entry, for a file the browser keeps a handle to. */
    recentId: string | null;
    /** What Discard does in the unsaved-changes dialog. */
    onDiscard: (() => Promise<void>) | null;
    /** A file to open in the project's element once it comes up (opened from the start screen). */
    pending: PendingFile | null;
}

/** Where a file being opened came from. */
interface FileSource {
    /** Its handle, where the browser keeps them. */
    handle?: FileSystemFileHandle;
    /** Its Recent projects entry, for a remembered file. */
    recentId?: string;
    /** Its `browserProjects` id, for a project kept in this browser. */
    storedId?: string;
}

/** A file waiting to open, where it came from, and whether its project is new. */
interface PendingFile extends FileSource {
    file: File;
    /** Opened from the start screen: a data file loads as the new project, not into one. */
    fresh?: boolean;
}

const states = new WeakMap<WorkspaceStore, ProjectFileState>();

/**
 * The open project's file state, fresh for a project that has none yet.
 * @param store - the workspace store.
 * @returns the state, shared by every caller for this project.
 */
function fileState(store: WorkspaceStore): ProjectFileState {
    const projectId = store.get().project?.id ?? 0;
    let state = states.get(store);
    if (state?.projectId !== projectId) {
        state = {
            projectId,
            target: null,
            recentId: null,
            onDiscard: null,
            pending: state?.pending ?? null,
        };
        states.set(store, state);
    }
    return state;
}

/**
 * The sentence for a project file that did not save or open. graphty-element hands back a code;
 * the words are the app's.
 * @param fileName - the file's name.
 * @param error - what the element threw.
 * @returns the sentence.
 */
export function problemSentence(fileName: string, error: unknown): string {
    const code = isGraphtyError(error) ? error.code : undefined;
    switch (code) {
        case "E_UNKNOWN_FORMAT":
            return `${fileName} is not a file graphty can open.`;
        case "E_BAD_DOCUMENT":
            return `${fileName} is not a graphty project file.`;
        case "E_UNSUPPORTED_VERSION":
            return `${fileName} was saved by a newer graphty. Update graphty to open it.`;
        case "E_UNSUPPORTED":
            return `${fileName} needs a part this graphty cannot read yet.`;
        case "E_TOO_LARGE":
            return `${fileName} is too large to open.`;
        default:
            return `${fileName} could not be opened.`;
    }
}

/**
 * Why a file did not open or add, in the app's words. graphty-element refuses a file it could not
 * read whole with `E_PARSE_FAILED` and the line it broke at; nothing of it is kept.
 * @param fileName - the file's name.
 * @param error - what the element threw.
 * @param verb - "opened" or "added".
 * @returns the notice's sentence.
 */
export function notReadSentence(fileName: string, error: unknown, verb: "opened" | "added"): string {
    if (isGraphtyError(error) && error.code === "E_PARSE_FAILED") {
        const line = error.details?.line;
        const where = typeof line === "number" ? ` near line ${String(line)}` : "";
        return `${fileName} could not be ${verb}: the file is incomplete or damaged${where}, so nothing was read. Ask for the file again.`;
    }
    const reason = error instanceof Error ? error.message : String(error);
    return `${fileName} could not be ${verb}. ${reason}`;
}

/**
 * The project's name as the header shows it.
 * @param store - the workspace store.
 * @returns the name.
 */
function headerName(store: WorkspaceStore): string {
    return store.get().project?.name ?? "Untitled";
}

/**
 * Remembers the open project's file in Recent projects, with the node count the element reports.
 * A file the browser keeps no handle to is not remembered: nothing could reopen it.
 * @param store - the workspace store.
 * @param session - the project's session.
 * @param handle - its file, where the browser keeps handles.
 */
async function remember(store: WorkspaceStore, session: GraphSession, handle?: FileSystemFileHandle): Promise<void> {
    if (handle === undefined) {
        return;
    }
    const state = fileState(store);
    const known = await entryForHandle(handle);
    const id = known?.id ?? state.recentId ?? crypto.randomUUID();
    state.recentId = id;
    await rememberRecent({
        id,
        name: headerName(store),
        nodes: session.status.counts.nodes,
        at: Date.now(),
        handle,
    });
}

/**
 * Hands the header's name to the element before a save, so the file holds it (the name is part
 * of the project file).
 * @param store - the workspace store.
 * @param session - the project's session.
 */
async function nameTheProject(store: WorkspaceStore, session: GraphSession): Promise<void> {
    const name = headerName(store);
    if (session.project.name !== name) {
        await session.project.rename(name);
    }
}

/**
 * Why a project did not save into this browser, in the app's words.
 * @param name - the project's name.
 * @param error - what the element threw.
 * @returns the notice's sentence.
 */
export function saveProblemSentence(name: string, error: unknown): string {
    const code = isGraphtyError(error) ? error.code : undefined;
    switch (code) {
        case "E_TOO_LARGE":
            return `${name} could not be saved: this browser's storage for graphty is full.`;
        case "E_UNSUPPORTED":
            return `${name} could not be saved: this browser does not let graphty keep projects. Save a local copy instead.`;
        default:
            return `${name} could not be saved.`;
    }
}

/**
 * Keeps the project in this browser: the record `target` names again, else a new one.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the project's session.
 * @param target - the `browserProjects` id to write again, or null for a new record.
 */
async function writeProject({ workspace, session }: CommandContext, target: string | null): Promise<void> {
    if (session === null) {
        return;
    }
    await nameTheProject(workspace, session);
    const name = headerName(workspace);
    const saved = await browserProjects.save(session, target === null ? {} : { id: target });
    fileState(workspace).target = saved.id;
    await refreshStored();
    workspace.set({ notice: { message: `Saved ${name} in this browser.` } });
}

/**
 * Save (Mod+S): writes the browser-kept project again; the first Save of a project not yet kept
 * in this browser opens Save as.
 * @param ctx - the command context.
 */
export async function saveProject(ctx: CommandContext): Promise<void> {
    const { target } = fileState(ctx.workspace);
    if (target === null) {
        ctx.workspace.set({ dialog: SAVE_AS_DIALOG });
        return;
    }
    try {
        await writeProject(ctx, target);
    } catch (error) {
        ctx.workspace.set({ notice: { message: saveProblemSentence(headerName(ctx.workspace), error), error: true } });
    }
}

/**
 * Save as...: names the project and keeps it in this browser as a new project.
 * @param ctx - the command context.
 * @param name - the name the reader gave.
 */
export async function saveProjectAs(ctx: CommandContext, name: string): Promise<void> {
    const { workspace, session } = ctx;
    const before = { header: headerName(workspace), element: session?.project.name ?? null };
    workspace.set((now) => ({ project: now.project && { ...now.project, name } }));
    try {
        await writeProject(ctx, null);
    } catch (error) {
        // Nothing was saved, so the project keeps the name it had.
        workspace.set((now) => ({
            project: now.project && { ...now.project, name: before.header },
            notice: { message: saveProblemSentence(name, error), error: true },
        }));
        if (session !== null && session.project.name !== before.element) {
            await session.project.rename(before.element).catch(() => undefined);
        }
    }
}

/**
 * Save local copy...: downloads the project file. A copy: where Save goes and what is unsaved do
 * not change.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.element - the element, which downloads.
 */
export async function saveLocalCopy({ workspace, element }: CommandContext): Promise<void> {
    if (element === null) {
        return;
    }
    const name = headerName(workspace);
    try {
        await element.downloadGraph("graphty", { fileName: projectFileName(name) });
    } catch {
        workspace.set({ notice: { message: `A copy of ${name} could not be saved.`, error: true } });
    }
}

/**
 * Asks before throwing away unsaved changes: the unsaved-changes dialog, whose Discard runs this.
 * @param store - the workspace store.
 * @param onDiscard - what Discard does.
 */
function askToDiscard(store: WorkspaceStore, onDiscard: () => Promise<void>): void {
    fileState(store).onDiscard = onDiscard;
    store.set({ dialog: DISCARD_DIALOG });
}

/**
 * Discard, in the unsaved-changes dialog: does what was waiting.
 * @param store - the workspace store.
 */
export async function discardAndContinue(store: WorkspaceStore): Promise<void> {
    const state = fileState(store);
    const { onDiscard } = state;
    state.onDiscard = null;
    store.set({ dialog: null });
    await onDiscard?.();
}

/**
 * Closes the project now and returns to the start screen.
 * @param store - the workspace store.
 */
function closeNow(store: WorkspaceStore): void {
    states.delete(store);
    store.set({ project: null, page: "panels", inspected: null, dialog: null, renaming: false, notice: null });
}

/**
 * Whether the open project has changes that are not saved, as the element reports.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the project's session, or null.
 * @returns true when replacing the project would lose changes.
 */
function hasUnsaved({ workspace, session }: CommandContext): boolean {
    return workspace.get().project !== null && session?.project.dirty === true;
}

/**
 * Runs something that replaces or closes the open project (New project, Back to start), asking
 * first when that would throw away unsaved changes.
 * @param ctx - the command context.
 * @param proceed - what replaces the project.
 */
export function unlessUnsaved(ctx: CommandContext, proceed: () => void): void {
    if (hasUnsaved(ctx)) {
        askToDiscard(ctx.workspace, () => {
            proceed();
            return Promise.resolve();
        });
        return;
    }
    proceed();
}

/**
 * Back to start: closes the project and shows the start screen, asking first when the element reports unsaved changes.
 * @param ctx - the command context.
 */
export function closeProject(ctx: CommandContext): void {
    unlessUnsaved(ctx, () => {
        closeNow(ctx.workspace);
    });
}

/**
 * A file's name without its extension: the name of a project opened from a data file, which the
 * file itself does not name.
 * @param fileName - the file's name.
 * @returns the name.
 */
function withoutExtension(fileName: string): string {
    return fileName.replace(/\.[^.]*$/, "") || fileName;
}

/**
 * Opens a file in the session through graphty-element's one intake verb, `project.open`. A
 * project file replaces the project (refused over unsaved changes until the reader says Discard);
 * the header takes the project's name, and Save writes the browser-kept project it came from
 * again. A data file loads as a new project's graph, or opens the Data page to add it to an open
 * project.
 * @param ctx - the command context, with the project's session.
 * @param session - the session.
 * @param pending - the file and where it came from.
 * @param discard - open over unsaved changes.
 * @returns false when the element refused the file.
 */
async function openInSession(
    ctx: CommandContext,
    session: GraphSession,
    pending: PendingFile,
    discard: boolean,
): Promise<boolean> {
    const { workspace } = ctx;
    const { file, handle, recentId, storedId, fresh = false } = pending;
    try {
        const report = await session.project.open(file, { discard, fileName: file.name });
        if (report.opened === "graph" && !fresh) {
            // A data file added to an open project goes through the Data page, where its roles
            // and weight are chosen like any other load; the page reads the file itself.
            report.draft?.dispose();
            openDataPage(workspace, { intent: "add", files: [file] });
            return true;
        }
        if (report.opened === "graph") {
            await report.draft?.load({ mode: "replace" });
        }
        if (report.opened !== "project") {
            if (!fresh) {
                workspace.set({ notice: { message: `Added ${file.name} to this project` } });
            }
            return true;
        }
        const name = report.name ?? headerName(workspace);
        workspace.set((state) => ({ project: state.project && { ...state.project, name } }));
        const state = fileState(workspace);
        state.target = storedId ?? null;
        state.recentId = recentId ?? null;
        await remember(workspace, session, handle);
        const lost = report.problems.length;
        const parts = lost === 1 ? "part" : "parts";
        workspace.set({
            notice: {
                message: lost === 0 ? `Opened ${name}` : `Opened ${name}. ${String(lost)} ${parts} did not come back.`,
            },
        });
    } catch (error) {
        if (isGraphtyError(error) && error.code === "E_UNSAVED_CHANGES") {
            askToDiscard(workspace, async () => {
                await openInSession(ctx, session, pending, true);
            });
            return true;
        }
        const message =
            isGraphtyError(error) && error.code === "E_PARSE_FAILED"
                ? notReadSentence(withoutExtension(file.name), error, fresh ? "opened" : "added")
                : problemSentence(file.name, error);
        workspace.set({ notice: { message, error: true } });
        return false;
    }
    return true;
}

/**
 * Opens a project or data file (Open project or file..., a dropped file, Recent projects): inside
 * an open project a project file opens in its place (asking first over unsaved changes) and a
 * data file opens the Data page to be added; from the start screen it opens a project whose element reads the file once
 * it is up.
 * @param ctx - the command context.
 * @param file - the file.
 * @param source - where it came from: its handle, Recent projects entry or browser-kept project.
 */
export async function openProjectFile(ctx: CommandContext, file: File, source: FileSource = {}): Promise<void> {
    const pending: PendingFile = { file, ...source };
    if (ctx.workspace.get().project !== null && ctx.session !== null) {
        await openInSession(ctx, ctx.session, pending, false);
        return;
    }
    fileState(ctx.workspace).pending = { ...pending, fresh: true };
    ctx.workspace.set((state) => ({
        project: { name: withoutExtension(file.name), id: newProjectId(state) },
        page: "panels",
        place: "graph",
        inspected: null,
        dialog: null,
    }));
}

/**
 * Opens the file waiting for a project's element, once that element has come up.
 * @param ctx - the command context, with the new project's session.
 */
export async function openPending(ctx: CommandContext): Promise<void> {
    const state = fileState(ctx.workspace);
    const { pending } = state;
    if (pending === null || ctx.session === null) {
        return;
    }
    state.pending = null;
    if (!(await openInSession(ctx, ctx.session, pending, true))) {
        // Refused: the project was never opened, so back to the start screen, keeping the reason.
        const { notice } = ctx.workspace.get();
        closeNow(ctx.workspace);
        ctx.workspace.set({ notice });
    }
}

/** What happened when the reader clicked a Recent projects entry. */
type RecentOutcome = "opened" | "missing" | "cancelled" | "failed";

/**
 * Runs a Recent projects step, turning a failure other than a cancel (a picker the browser
 * refused, a file that would not read) into a notice.
 * @param ctx - the command context.
 * @param entry - the entry.
 * @param step - the step.
 * @returns what the step returned, or "failed".
 */
async function noticeFailure(
    ctx: CommandContext,
    entry: RecentProject,
    step: () => Promise<RecentOutcome>,
): Promise<RecentOutcome> {
    try {
        return await step();
    } catch {
        ctx.workspace.set({ notice: { message: `${entry.name} could not be opened.` } });
        return "failed";
    }
}

/**
 * Opens a Recent projects entry: a project kept in this browser, or its file where the browser
 * keeps the handle; otherwise, or when that file can no longer be read, the caller offers
 * Locate....
 * @param ctx - the command context.
 * @param entry - the entry.
 * @returns "missing" when the browser could not read the file or no longer keeps the project.
 */
export function openRecent(ctx: CommandContext, entry: RecentProject): Promise<RecentOutcome> {
    if (entry.stored === true) {
        return noticeFailure(ctx, entry, async () => {
            const file = await browserProjects.get(entry.id);
            if (file === undefined) {
                await refreshStored();
                return "missing";
            }
            await openProjectFile(ctx, file, { storedId: entry.id });
            return "opened";
        });
    }
    const { handle } = entry;
    if (handle === undefined) {
        return locateRecent(ctx, entry);
    }
    return noticeFailure(ctx, entry, async () => {
        const file = await readHandle(handle);
        if (file === null) {
            return "missing";
        }
        await openProjectFile(ctx, file, { handle, recentId: entry.id });
        return "opened";
    });
}

/**
 * Locate...: asks the reader for the entry's file and opens it, keeping its handle for next time
 * where the browser has one.
 * @param ctx - the command context.
 * @param entry - the entry.
 * @returns "cancelled" when the reader closed the picker.
 */
export function locateRecent(ctx: CommandContext, entry: RecentProject): Promise<RecentOutcome> {
    return noticeFailure(ctx, entry, async () => {
        const located = await locateFile();
        if (located === undefined) {
            return "cancelled";
        }
        await openProjectFile(ctx, located.file, {
            ...(located.handle === undefined ? {} : { handle: located.handle }),
            recentId: entry.id,
        });
        return "opened";
    });
}

/**
 * Remove from list, or, for a project kept in this browser, Remove from this browser: deletes it.
 * @param entry - the entry.
 * @returns settles once removed.
 */
export async function removeRecent(entry: RecentProject): Promise<void> {
    if (entry.stored !== true) {
        await forgetRecent(entry.id);
        return;
    }
    await browserProjects.remove(entry.id);
    await refreshStored();
}
