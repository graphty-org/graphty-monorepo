/**
 * Save, Save as, Close and Open for a project (tier1-design.md section T14).
 *
 * graphty-element writes and reads the project file (`session.project.save` and `.open`,
 * `element.downloadProject`) and decides what is unsaved (`project.dirty`, the
 * `E_UNSAVED_CHANGES` refusal). This file only decides where the file goes, asks the reader, and
 * writes the words: the notices and the problem sentences.
 */

import { type GraphSession, isGraphtyError } from "@graphty/graphty-element/session";

import { forgetKeptWork } from "../autosave/autosave";
import type { CommandContext } from "../commands/registry";
import { fileStylesChoice } from "../settings/preferences";
import { newProjectId, type WorkspaceStore } from "../state/store";
import { noticeFileStyles } from "../styles/noticeFileStyles";
import { chooseSaveFile, isCancel, keepsFileHandles, locateFile, readHandle, writeFile } from "./files";
import { entryForHandle, forgetRecent, recentEntry, type RecentProject, rememberRecent } from "./recent";

/** The dialog ids this package opens in the workspace's one dialog slot. */
export const SAVE_AS_DIALOG = "save-as";
export const DISCARD_DIALOG = "discard";

/** Where the open project's Save goes, and what is waiting on the reader. Per workspace store. */
interface ProjectFileState {
    /** The project these belong to (`state.project.id`); anything else is a fresh project. */
    projectId: number;
    /** The file Save writes again, where the browser keeps handles; "download" once saved elsewhere. */
    target: FileSystemFileHandle | "download" | null;
    /** The project's Recent projects entry. */
    recentId: string | null;
    /** What Discard does in the unsaved-changes dialog. */
    onDiscard: (() => Promise<void>) | null;
    /**
     * The last Save failed to write the file. Temporary: `session.project.save()` clears `dirty`
     * before the file is written, so after a failed write the element reports nothing unsaved
     * (#918). Delete this once the element clears `dirty` only after the write.
     */
    writeFailed: boolean;
    /** A file to open in the project's element once it comes up (opened from the start screen). */
    pending: PendingFile | null;
}

/** Where a file being opened came from. */
export interface FileSource {
    /** Its handle, where the browser keeps them. */
    handle?: FileSystemFileHandle;
    /** Its Recent projects entry, when opened from there. */
    recentId?: string;
    /** The new project's name until the file names it, when it opens from the start screen. */
    name?: string;
    /** The reader picked it with Open a file, so it may be graph data rather than a project. */
    intake?: boolean;
}

/** A file waiting to open, and whether it opens a new project from the start screen. */
interface PendingFile extends FileSource {
    file: File;
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
            writeFailed: false,
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
        case "E_PARSE_FAILED":
        case "E_UNKNOWN_FORMAT":
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
 * What the reader is told when a file picked with Open a file cannot be opened or added: the
 * element's own reason after the file's name.
 * @param fileName - the file's name.
 * @param fresh - whether it was to open a new project from the start screen.
 * @param error - what the element refused it with.
 * @returns the sentence.
 */
function intakeProblem(fileName: string, fresh: boolean, error: unknown): string {
    const reason = error instanceof Error ? error.message : String(error);
    const what = fresh
        ? `${fileNameWithoutExtension(fileName)} could not be opened.`
        : `${fileName} could not be added.`;
    return `${what} ${reason}`;
}

/**
 * A file's name without its extension.
 * @param name - the file's name.
 * @returns the name, or the whole name when that would leave nothing.
 */
export function fileNameWithoutExtension(name: string): string {
    return name.replace(/\.[^.]*$/, "") || name;
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
 * Remembers the open project in Recent projects, with the node count the element reports.
 * @param store - the workspace store.
 * @param session - the project's session.
 * @param handle - its file, where the browser keeps handles.
 * @param thumbnail - a picture of the graph as saved; absent, the entry keeps the one it had.
 */
async function remember(
    store: WorkspaceStore,
    session: GraphSession,
    handle?: FileSystemFileHandle,
    thumbnail?: Blob,
): Promise<void> {
    const state = fileState(store);
    const known = handle === undefined ? undefined : await entryForHandle(handle);
    const id = known?.id ?? state.recentId ?? crypto.randomUUID();
    state.recentId = id;
    const picture = thumbnail ?? (known ?? recentEntry(id))?.thumbnail;
    await rememberRecent({
        id,
        name: headerName(store),
        nodes: session.status.counts.nodes,
        at: Date.now(),
        ...(handle === undefined ? {} : { handle }),
        ...(picture === undefined ? {} : { thumbnail: picture }),
    });
}

/**
 * A small picture of the graph for Recent projects, taken by the element. A project saves
 * without one when the capture fails.
 * @param element - the project's element.
 * @returns the picture, or undefined.
 */
async function thumbnailOf(element: NonNullable<CommandContext["element"]>): Promise<Blob | undefined> {
    try {
        const shot = await element.captureScreenshot({
            format: "jpeg",
            quality: 0.8,
            width: 320,
            height: 180,
            destination: { blob: true },
            timing: { waitForSettle: false },
        });
        return shot.blob;
    } catch {
        return undefined;
    }
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
 * Writes the project where Save goes now: the same file where the browser keeps it, else a new
 * download. The notice says which.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the project's session.
 * @param ctx.element - the element, which downloads.
 * @param target - the file, or "download".
 * @param verb - "Saved" or "Saved as", for a file the browser keeps.
 */
async function writeProject(
    { workspace, session, element }: CommandContext,
    target: FileSystemFileHandle | "download",
    verb: "Saved" | "Saved as",
): Promise<void> {
    if (session === null || element === null) {
        return;
    }
    await nameTheProject(workspace, session);
    const name = headerName(workspace);
    const state = fileState(workspace);
    try {
        if (target === "download") {
            await element.downloadProject();
        } else {
            await writeFile(target, (await session.project.save()).text);
        }
    } catch (error) {
        state.writeFailed = true;
        throw error;
    }
    state.writeFailed = false;
    state.target = target;
    await remember(workspace, session, target === "download" ? undefined : target, await thumbnailOf(element));
    workspace.set({ notice: { message: `${target === "download" ? "Downloaded" : verb} ${name}` } });
}

/**
 * Save (Mod+S): writes the file this project came from or was last saved to; the first Save of a
 * project with no file opens Save as.
 * @param ctx - the command context.
 */
export async function saveProject(ctx: CommandContext): Promise<void> {
    const { target } = fileState(ctx.workspace);
    if (target === null) {
        ctx.workspace.set({ dialog: SAVE_AS_DIALOG });
        return;
    }
    try {
        await writeProject(ctx, target, "Saved");
    } catch {
        ctx.workspace.set({ notice: { message: `${headerName(ctx.workspace)} could not be saved.` } });
    }
}

/**
 * Save as...: names the project, then asks where to save where the browser keeps file handles,
 * else downloads it.
 * @param ctx - the command context.
 * @param name - the name the reader gave.
 * @returns false when the reader cancelled the browser's save picker, so the dialog stays.
 */
export async function saveProjectAs(ctx: CommandContext, name: string): Promise<boolean> {
    const { workspace, session } = ctx;
    let target: FileSystemFileHandle | "download" = "download";
    if (keepsFileHandles()) {
        try {
            target = await chooseSaveFile(name);
        } catch (error) {
            if (isCancel(error)) {
                return false;
            }
            workspace.set({ notice: { message: `${name} could not be saved.` } });
            return true;
        }
    }
    const before = { header: headerName(workspace), element: session?.project.name ?? null };
    const state = fileState(workspace);
    const { recentId } = state;
    workspace.set((now) => ({ project: now.project && { ...now.project, name } }));
    state.recentId = null;
    try {
        await writeProject(ctx, target, "Saved as");
    } catch {
        // Nothing was saved, so the project keeps the name it had.
        state.recentId = recentId;
        workspace.set((now) => ({
            project: now.project && { ...now.project, name: before.header },
            notice: { message: `${name} could not be saved.` },
        }));
        if (session !== null && session.project.name !== before.element) {
            await session.project.rename(before.element).catch(() => undefined);
        }
    }
    return true;
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
 * Whether the open project has changes that are not in a file: what the element reports, or a
 * Save whose write failed (#918).
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the project's session, or null.
 * @returns true when replacing the project would lose changes.
 */
function hasUnsaved({ workspace, session }: CommandContext): boolean {
    return workspace.get().project !== null && (session?.project.dirty === true || fileState(workspace).writeFailed);
}

/**
 * Runs something that replaces or closes the open project (New project, Close project), asking
 * first when that would throw away unsaved changes.
 * @param ctx - the command context.
 * @param proceed - what replaces the project.
 */
export function unlessUnsaved(ctx: CommandContext, proceed: () => void): void {
    // The work left behind is the reader's choice, so it is not offered back on a later visit.
    const kept = forgetKeptWork(ctx);
    const leave = (): Promise<void> => {
        if (kept === null) {
            proceed();
            return Promise.resolve();
        }
        return kept().then(proceed);
    };
    if (hasUnsaved(ctx)) {
        askToDiscard(ctx.workspace, leave);
        return;
    }
    void leave();
}

/**
 * Close project: back to the start screen, asking first when the element reports unsaved changes.
 * @param ctx - the command context.
 */
export function closeProject(ctx: CommandContext): void {
    unlessUnsaved(ctx, () => {
        closeNow(ctx.workspace);
    });
}

/**
 * Opens a project file in the session: refused over unsaved changes until the reader says
 * Discard. The header takes the project's name, and Save writes the same file again where the
 * browser keeps its handle.
 * @param ctx - the command context, with the project's session.
 * @param session - the session.
 * @param pending - the file, its handle and its Recent projects entry.
 * @param discard - open over unsaved changes.
 */
async function openInSession(
    ctx: CommandContext,
    session: GraphSession,
    pending: PendingFile,
    discard: boolean,
): Promise<void> {
    const { workspace } = ctx;
    const { file, handle, recentId, intake = false, fresh = false } = pending;
    if (!discard && fileState(workspace).writeFailed) {
        askToDiscard(workspace, () => openInSession(ctx, session, pending, true));
        return;
    }
    try {
        const report = await session.project.open(file, { discard, fileName: file.name });
        if (report.opened === "graph") {
            // A data file: a new project's graph, or added to the open one.
            await report.draft?.load({ ...(fresh ? {} : { mode: "merge" as const }), styles: fileStylesChoice() });
            noticeFileStyles(workspace, session);
            return;
        }
        if (report.opened !== "project") {
            workspace.set({ notice: { message: `Added ${file.name} to this project` } });
            return;
        }
        const name = report.name ?? headerName(workspace);
        workspace.set((state) => ({ project: state.project && { ...state.project, name } }));
        const state = fileState(workspace);
        state.target = handle ?? "download";
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
            askToDiscard(workspace, () => openInSession(ctx, session, pending, true));
            return;
        }
        workspace.set({
            notice: { message: intake ? intakeProblem(file.name, fresh, error) : problemSentence(file.name, error) },
        });
    }
}

/**
 * Opens a file through graphty-element's `project.open`, which decides what it is: inside an open
 * project a project file opens in its place (asking first over unsaved changes) and a data file is
 * added to it; from the start screen it opens a project whose element reads the file once it is up.
 * @param ctx - the command context.
 * @param file - the file.
 * @param source - its handle, its Recent projects entry, and whether Open a file picked it.
 */
export async function openProjectFile(ctx: CommandContext, file: File, source: FileSource = {}): Promise<void> {
    const { name = file.name, ...from } = source;
    const pending: PendingFile = { file, ...from };
    if (ctx.workspace.get().project !== null && ctx.session !== null) {
        await openInSession(ctx, ctx.session, pending, false);
        return;
    }
    fileState(ctx.workspace).pending = { ...pending, fresh: true };
    ctx.workspace.set((state) => ({
        project: { name, id: newProjectId(state) },
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
    await openInSession(ctx, ctx.session, pending, true);
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
 * Opens a Recent projects entry: its file where the browser keeps the handle; otherwise, or when
 * that file can no longer be read, the caller offers Locate....
 * @param ctx - the command context.
 * @param entry - the entry.
 * @returns "missing" when the browser could not read the file.
 */
export function openRecent(ctx: CommandContext, entry: RecentProject): Promise<RecentOutcome> {
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
 * Remove from list.
 * @param entry - the entry.
 * @returns settles once removed.
 */
export function removeRecent(entry: RecentProject): Promise<void> {
    return forgetRecent(entry.id);
}
