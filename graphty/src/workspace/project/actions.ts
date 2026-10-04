/**
 * Save, Save as, Close and Open for a project (tier1-design.md section T14).
 *
 * graphty-element writes and reads the project file (`session.project.save` and `.open`,
 * `element.downloadProject`) and decides what is unsaved (`project.dirty`, the
 * `E_UNSAVED_CHANGES` refusal). This file only decides where the file goes, asks the reader, and
 * writes the words: the notices and the problem sentences.
 */

import { type GraphSession, isGraphtyError } from "@graphty/graphty-element/session";

import type { CommandContext } from "../commands/registry";
import type { WorkspaceStore } from "../state/store";
import {
    chooseSaveFile,
    isCancel,
    keepsFileHandles,
    locateFile,
    nameFromFileName,
    projectFileName,
    readHandle,
    writeFile,
} from "./files";
import { entryForHandle, forgetRecent, type RecentProject, rememberRecent } from "./recent";

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
    /** A file to open in the project's element once it comes up (opened from the start screen). */
    pending: { file: File; handle?: FileSystemFileHandle; recentId?: string } | null;
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
        state = { projectId, target: null, recentId: null, onDiscard: null, pending: state?.pending ?? null };
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
 */
async function remember(store: WorkspaceStore, session: GraphSession, handle?: FileSystemFileHandle): Promise<void> {
    const state = fileState(store);
    const known = handle === undefined ? undefined : await entryForHandle(handle);
    const id = known?.id ?? state.recentId ?? crypto.randomUUID();
    state.recentId = id;
    await rememberRecent({
        id,
        name: headerName(store),
        nodes: session.status.counts.nodes,
        at: Date.now(),
        ...(handle === undefined ? {} : { handle }),
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
    if (target === "download") {
        await element.downloadProject({ fileName: projectFileName(name) });
    } else {
        await writeFile(target, (await session.project.save()).text);
    }
    fileState(workspace).target = target;
    await remember(workspace, session, target === "download" ? undefined : target);
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
    let target: FileSystemFileHandle | "download" = "download";
    if (keepsFileHandles()) {
        try {
            target = await chooseSaveFile(name);
        } catch (error) {
            if (isCancel(error)) {
                return false;
            }
            throw error;
        }
    }
    ctx.workspace.set((state) => ({ project: state.project && { ...state.project, name } }));
    fileState(ctx.workspace).recentId = null;
    try {
        await writeProject(ctx, target, "Saved as");
    } catch {
        ctx.workspace.set({ notice: { message: `${name} could not be saved.` } });
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
 * Close project: back to the start screen, asking first when the element reports unsaved changes.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the project's session, or null.
 */
export function closeProject({ workspace, session }: CommandContext): void {
    if (session?.project.dirty === true) {
        askToDiscard(workspace, () => {
            closeNow(workspace);
            return Promise.resolve();
        });
        return;
    }
    closeNow(workspace);
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
    pending: NonNullable<ProjectFileState["pending"]>,
    discard: boolean,
): Promise<void> {
    const { workspace } = ctx;
    const { file, handle, recentId } = pending;
    try {
        const report = await session.project.open(file, { discard, fileName: file.name });
        if (report.opened !== "project") {
            workspace.set({ notice: { message: `Added ${file.name} to this project` } });
            return;
        }
        const name = report.name ?? nameFromFileName(file.name);
        workspace.set((state) => ({ project: state.project && { ...state.project, name } }));
        const state = fileState(workspace);
        state.target = handle ?? "download";
        state.recentId = recentId ?? null;
        await remember(workspace, session, handle);
        const lost = report.problems.length;
        workspace.set({
            notice: {
                message:
                    lost === 0
                        ? `Opened ${name}`
                        : `Opened ${name}. ${String(lost)} ${lost === 1 ? "part" : "parts"} did not come back.`,
            },
        });
    } catch (error) {
        if (isGraphtyError(error) && error.code === "E_UNSAVED_CHANGES") {
            askToDiscard(workspace, () => openInSession(ctx, session, pending, true));
            return;
        }
        workspace.set({ notice: { message: problemSentence(file.name, error) } });
    }
}

/**
 * Opens a project file: inside an open project it opens in its place (asking first over unsaved
 * changes); from the start screen it opens a project whose element reads the file once it is up.
 * @param ctx - the command context.
 * @param file - the file.
 * @param handle - its handle, where the browser keeps them.
 * @param recentId - its Recent projects entry, when opened from there.
 */
async function openProjectFile(
    ctx: CommandContext,
    file: File,
    handle?: FileSystemFileHandle,
    recentId?: string,
): Promise<void> {
    const pending = { file, ...(handle === undefined ? {} : { handle }), ...(recentId === undefined ? {} : { recentId }) };
    if (ctx.workspace.get().project !== null && ctx.session !== null) {
        await openInSession(ctx, ctx.session, pending, false);
        return;
    }
    fileState(ctx.workspace).pending = pending;
    ctx.workspace.set((state) => ({
        project: { name: nameFromFileName(file.name), id: (state.project?.id ?? 0) + 1 },
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
type RecentOutcome = "opened" | "missing" | "cancelled";

/**
 * Opens a Recent projects entry: its file where the browser keeps the handle; otherwise, or when
 * that file can no longer be read, the caller offers Locate....
 * @param ctx - the command context.
 * @param entry - the entry.
 * @returns "missing" when the browser could not read the file.
 */
export async function openRecent(ctx: CommandContext, entry: RecentProject): Promise<RecentOutcome> {
    if (entry.handle === undefined) {
        return locateRecent(ctx, entry);
    }
    const file = await readHandle(entry.handle);
    if (file === null) {
        return "missing";
    }
    await openProjectFile(ctx, file, entry.handle, entry.id);
    return "opened";
}

/**
 * Locate...: asks the reader for the entry's file and opens it, keeping its handle for next time
 * where the browser has one.
 * @param ctx - the command context.
 * @param entry - the entry.
 * @returns "cancelled" when the reader closed the picker.
 */
export async function locateRecent(ctx: CommandContext, entry: RecentProject): Promise<RecentOutcome> {
    const located = await locateFile();
    if (located === undefined) {
        return "cancelled";
    }
    await openProjectFile(ctx, located.file, located.handle, entry.id);
    return "opened";
}

/**
 * Remove from list.
 * @param entry - the entry.
 * @returns settles once removed.
 */
export function removeRecent(entry: RecentProject): Promise<void> {
    return forgetRecent(entry.id);
}
