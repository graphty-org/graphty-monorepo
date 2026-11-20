/**
 * Save, Save as, Save local copy, Close and Open for a project (tier1-design.md section T14).
 *
 * graphty-element keeps the project in this browser (`browserProjects`), writes and reads the
 * project file (`session.project.open`, `element.downloadGraph`) and decides what is unsaved
 * (`project.dirty`, the `E_UNSAVED_CHANGES` refusal). This file only asks the reader and writes
 * the words: the notices and the problem sentences.
 */

import {
    type AssetStorage,
    browserProjects,
    type GraphSession,
    isGraphtyError,
    type LoadDraft,
    type ProjectAssetChoice,
    projectFileName,
    type ProjectOpenOptions,
    type ProjectSaveReport,
} from "@graphty/graphty-element/session";

import { count, graphSizeBucket } from "../../lib/analytics";
import { forgetKeptWork } from "../autosave/autosave";
import type { CommandContext } from "../commands/registry";
import { openDataPage } from "../data-page/request";
import { saveFilesV2On } from "../features";
import { focusOpenedGraphLater } from "../frame/focus";
import { runHeld, withHeldShaders } from "../settings/heldShaders";
import { addSource, incomingFiles } from "../start/open";
import { newProjectId, type Notice, openRun, type SettleOpen, type WorkspaceStore } from "../state/store";
import { chipLine } from "../style/modelWords";
import { locateFile, readHandle } from "./files";
import { entryForHandle, forgetRecent, recentEntry, type RecentProject, refreshStored, rememberRecent } from "./recent";
// The version 2 dialogs load on first use, so the landing page does not carry them.
import type { SaveV2Choices } from "./saveV2";
import { notReadWords } from "./words";

/** The dialog ids this package opens in the workspace's one dialog slot. */
export const SAVE_AS_DIALOG = "save-as";
export const DISCARD_DIALOG = "discard";
export const KEEP_ASSETS_DIALOG = "keep-assets";

/** How to keep each model or picture a layer names by web address, by that address. */
export type AssetChoices = Record<string, AssetStorage>;

/** A save waiting on the reader: the addresses to ask about, and what to do with the answer. */
export interface AssetQuestion {
    readonly entries: readonly ProjectAssetChoice[];
    readonly answer: (choices: AssetChoices | null) => void;
}

const assetQuestions = new WeakMap<WorkspaceStore, AssetQuestion>();

/**
 * The addresses the reader already answered for, per session and the project it holds
 * (`project.id`): a later save of the same project does not ask again, and a project opened in
 * its place starts with none.
 */
const answered = new WeakMap<GraphSession, { readonly projectId: string; readonly urls: Set<string> }>();

/**
 * The addresses already answered for the project the session holds now.
 * @param session - the project's session.
 * @returns the set, empty for a project not saved with an answer yet.
 */
function answeredFor(session: GraphSession): Set<string> {
    const projectId = session.project.id;
    let held = answered.get(session);
    if (held?.projectId !== projectId) {
        held = { projectId, urls: new Set<string>() };
        answered.set(session, held);
    }
    return held.urls;
}

/**
 * The save waiting on the reader's answer, for the dialog that asks.
 * @param store - the workspace store.
 * @returns the question, or undefined.
 */
export function assetQuestion(store: WorkspaceStore): AssetQuestion | undefined {
    return assetQuestions.get(store);
}

/**
 * Asks how to keep each model or picture the layers name by web address (embed it, or keep only
 * its address), before a save. graphty-element lists what to ask about
 * (`project.assetChoices()`) and takes the answer (`save({ assets })`). It asks only about
 * addresses not answered before in this session; an answered one
 * is kept as the element reports it was last kept.
 * @param store - the workspace store.
 * @param session - the project's session.
 * @returns the choices by address, empty when there is nothing to ask, or null when the reader
 *     canceled.
 */
export function askAssetChoices(store: WorkspaceStore, session: GraphSession): Promise<AssetChoices | null> {
    const choices = session.project.assetChoices();
    const known = answeredFor(session);
    const kept: AssetChoices = Object.fromEntries(
        choices.filter((entry) => known.has(entry.url)).map((entry) => [entry.url, entry.storage]),
    );
    const entries = choices.filter((entry) => !known.has(entry.url));
    if (entries.length === 0) {
        return Promise.resolve(kept);
    }
    if (assetQuestions.has(store)) {
        // A save pressed while the question is open: the open question stays the one answered.
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        assetQuestions.set(store, {
            entries,
            answer: (given) => {
                assetQuestions.delete(store);
                if (given === null) {
                    resolve(null);
                    return;
                }
                entries.forEach((entry) => known.add(entry.url));
                resolve({ ...kept, ...given });
            },
        });
        store.set({ dialog: KEEP_ASSETS_DIALOG });
    });
}

/**
 * The saved notice, with what of the models the save could not keep as asked.
 * @param message - the notice's sentence.
 * @param report - what the save reported, when it reported.
 * @returns the notice's words.
 */
function withModelsLeftOut(message: string, report: ProjectSaveReport | undefined): string {
    const lines = (report?.leftOut ?? []).filter((fact) => /^[EW]_MODEL_/.test(fact.code)).map(chipLine);
    return [message, ...lines].join(" ");
}

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
    /** Whether that file is being read now, so the workspace leaves focus to the read. */
    reading: boolean;
    /** What the reader chose in the version 2 Save as, which Save writes again; null until chosen. */
    v2: SaveV2Choices | null;
}

/** Where a file being opened came from, and what to do when graphty-element reads it as data. */
export interface FileSource {
    /** Its handle, where the browser keeps them. */
    handle?: FileSystemFileHandle;
    /** Its Recent projects entry, when opened from there. */
    recentId?: string;
    /** Its `browserProjects` id, for a project kept in this browser. */
    storedId?: string;
    /** The new project's name until the file names it, when it opens from the start screen. */
    name?: string;
    /**
     * Loads the file when `project.open` reads it as data (`opened: "graph"`) rather than a
     * project: the draft it was read into (read onto the graph when the graph holds data), or, for
     * a file the element could not read as data, the element's refusal (`refused`), for the caller
     * to say why without reading the file again; `fresh` when it opens a new project from the
     * start screen.
     */
    onData?: (ctx: CommandContext, fresh: boolean, draft?: LoadDraft, refused?: unknown) => Promise<void>;
}

/** A file waiting to open, and whether it opens a new project from the start screen. */
interface PendingFile extends FileSource {
    file: File;
    fresh?: boolean;
    /** What the reader chose in the version 2 Open dialog, kept for an open again after Discard. */
    v2?: { readonly options: ProjectOpenOptions; readonly names: ReadonlyMap<string, string> };
    /** Settles the store's `opened` for a file that opens a new project. */
    settle?: SettleOpen;
}

/** The codes `project.open` refuses a data file with, as `session.data.prepare` does. */
const DATA_REFUSALS: ReadonlySet<string> = new Set(["E_UNKNOWN_FORMAT", "E_PARSE_FAILED"]);

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
            reading: false,
            v2: null,
        };
        states.set(store, state);
    }
    return state;
}

/**
 * The sentence for a project file that did not open. graphty-element hands back a code; the words
 * are the app's.
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
        default:
            return notReadWords(fileName, error, "opened");
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
    const picture = (known ?? recentEntry(id))?.thumbnail;
    await rememberRecent({
        id,
        name: headerName(store),
        nodes: session.status.counts.nodes,
        at: Date.now(),
        handle,
        ...(picture === undefined ? {} : { thumbnail: picture }),
    });
}

/**
 * Names the project in the element before a save, so the file holds a name: `name` when given
 * (Save as), else the shown name when the element holds none yet (a project named by its data).
 * A name the element already holds is kept, since an Undo or the assistant may have set it.
 * @param store - the workspace store.
 * @param session - the project's session.
 * @param name - the name Save as gave, or null.
 */
async function nameTheProject(store: WorkspaceStore, session: GraphSession, name: string | null): Promise<void> {
    const wanted = name ?? session.project.name ?? headerName(store);
    if (session.project.name !== wanted) {
        await session.project.rename(wanted);
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
 * @param newName - the name Save as gives the project, or null to keep its name.
 * @param v2 - with version 2 files on, what the reader chose in Save as; null to save as last chosen.
 * @returns false when the reader canceled the question about files from the web.
 */
async function writeProject(
    { workspace, session }: CommandContext,
    target: string | null,
    newName: string | null = null,
    v2: SaveV2Choices | null = null,
): Promise<boolean> {
    if (session === null) {
        return true;
    }
    const assets = await askAssetChoices(workspace, session);
    if (assets === null) {
        return false;
    }
    await nameTheProject(workspace, session, newName);
    const name = session.project.name ?? headerName(workspace);
    const state = fileState(workspace);
    // With version 2 files on, the browser keeps a version 2 file: the sections and sources as
    // the reader last chose them in Save as, else as graphty-element saves by default.
    const on = saveFilesV2On(session);
    const choices = on ? await stillNamed(session, v2 ?? state.v2) : null;
    const saved = await browserProjects.save(session, {
        ...(target === null ? {} : { id: target }),
        ...(Object.keys(assets).length === 0 ? {} : { assets }),
        ...(on ? { format: 2 as const } : {}),
        ...(on && choices !== null ? { sections: choices.sections, embed: choices.embed } : {}),
    });
    count("project_saved", { kind: "browser", as: target === null ? "new" : "again" });
    state.target = saved.id;
    if (on && v2 !== null) {
        state.v2 = v2;
    }
    await refreshStored();
    workspace.set({ notice: { message: withModelsLeftOut(`Saved ${name} in this browser.`, saved.report) } });
    // Save as reports what the save left out; a later Save says only that it saved.
    if (on && v2 !== null) {
        await reportSave(workspace, session, `Saved ${name}`, saved.report);
    }
    return true;
}

/**
 * The reader's last Save as choices, without the sources the project no longer holds (removed or
 * replaced since), which graphty-element would refuse.
 * @param session - the project's session.
 * @param choices - the choices, or null.
 * @returns the choices for the sources graphty-element lists now, or null.
 */
async function stillNamed(session: GraphSession, choices: SaveV2Choices | null): Promise<SaveV2Choices | null> {
    if (choices === null || Object.keys(choices.embed).length === 0) {
        return choices;
    }
    const ids = new Set((await session.project.describe()).sources.map((source) => source.id));
    return { ...choices, embed: Object.fromEntries(Object.entries(choices.embed).filter(([id]) => ids.has(id))) };
}

/**
 * Shows what a version 2 save reported, naming its sources by what graphty-element says of them.
 * @param workspace - the workspace store.
 * @param session - the project's session.
 * @param title - the report's title.
 * @param report - what the save reported.
 */
async function reportSave(
    workspace: WorkspaceStore,
    session: GraphSession,
    title: string,
    report: ProjectSaveReport | undefined,
): Promise<void> {
    const leftOut = report?.leftOut ?? [];
    const names = leftOut.some((fact) => fact.code.startsWith("W_SOURCE_"))
        ? new Map((await session.project.describe()).sources.map((source) => [source.id, source.name]))
        : new Map<string, string>();
    (await import("./saveV2Lazy")).showReport(workspace, session, title, leftOut, names);
}

/**
 * Save as... with version 2 files on: a full file of every section the project needs is kept in
 * this browser as the project, as Save as keeps it; any other choice (some sections, or a section
 * file) is a copy, downloaded under the name graphty-element gives it, and changes neither where
 * Save goes nor what is unsaved.
 * @param ctx - the command context.
 * @param name - the name the reader gave.
 * @param choices - the sections, the file's form and copy or reference per source.
 * @param whole - whether the choice is the whole project.
 */
export async function saveProjectAsV2(
    ctx: CommandContext,
    name: string,
    choices: SaveV2Choices,
    whole: boolean,
): Promise<void> {
    if (whole) {
        await saveAs(ctx, name, () => writeProject(ctx, null, name, choices));
        return;
    }
    const { workspace, element, session } = ctx;
    if (element === null || session === null) {
        return;
    }
    const [one] = choices.sections;
    const fileName = projectFileName(name, choices.form === "section" ? { section: one } : {});
    try {
        const assets = await askAssetChoices(workspace, session);
        if (assets === null) {
            return;
        }
        const report = await element.downloadProject({
            format: 2,
            sections: choices.sections,
            form: choices.form,
            embed: choices.embed,
            fileName,
            markSaved: false,
            ...(Object.keys(assets).length === 0 ? {} : { assets }),
        });
        count("project_saved", { kind: "file", as: "new" });
        workspace.set({ notice: { message: withModelsLeftOut(`Saved ${fileName}`, report) } });
        await reportSave(workspace, session, `Saved ${fileName}`, report);
    } catch {
        workspace.set({ notice: { message: `${fileName} could not be saved.`, error: true } });
    }
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
    await saveAs(ctx, name, () => writeProject(ctx, null, name));
}

/**
 * Runs a Save as write, renaming the project back when it fails.
 * @param ctx - the command context.
 * @param name - the name the reader gave.
 * @param write - the write.
 */
async function saveAs(ctx: CommandContext, name: string, write: () => Promise<boolean>): Promise<void> {
    const { workspace, session } = ctx;
    const before = session?.project.name ?? null;
    try {
        // Canceled, it returns before naming the project, which keeps the name it had.
        await write();
    } catch (error) {
        workspace.set({ notice: { message: saveProblemSentence(name, error), error: true } });
        // Nothing was saved, so the project keeps the name it had.
        if (session !== null && session.project.name !== before) {
            await session.project.rename(before).catch(() => undefined);
        }
    }
}

/**
 * Save local copy...: downloads the project file (with version 2 files on, a version 2 file as
 * Save writes it). A copy: where Save goes and what is unsaved do not change.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.element - the element, which downloads.
 * @param ctx.session - the project's session, which says what to ask before the copy.
 */
export async function saveLocalCopy({ workspace, element, session }: CommandContext): Promise<void> {
    if (element === null) {
        return;
    }
    const name = headerName(workspace);
    try {
        const assets = session === null ? {} : await askAssetChoices(workspace, session);
        if (assets === null) {
            return;
        }
        const fileName = projectFileName(name);
        if (session !== null && saveFilesV2On(session)) {
            // A version 2 file, of the sections and sources as the reader last chose them in Save as.
            const choices = await stillNamed(session, fileState(workspace).v2);
            await element.downloadProject({
                format: 2,
                ...(choices === null ? {} : { sections: choices.sections, embed: choices.embed }),
                ...(Object.keys(assets).length === 0 ? {} : { assets }),
                fileName,
                markSaved: false,
            });
        } else if (Object.keys(assets).length === 0) {
            await element.downloadGraph("graphty", { fileName });
        } else {
            await element.downloadProject({ assets, fileName, markSaved: false });
        }
        count("export_done", { kind: "project", destination: "download" });
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

/** What the element said of a file it opened. */
type OpenReport = Awaited<ReturnType<GraphSession["project"]["open"]>>;

/**
 * A data file the element opened: from the start screen it goes through the Data page, into an
 * open project it is added as File... adds it; read into the graph, it starts a new graph's
 * history or says it was added.
 * @param workspace - the workspace store.
 * @param session - the session.
 * @param report - what the element said of the file.
 * @param file - the file.
 * @param fresh - whether it opens as a new graph, from the start screen.
 * @param focusLater - moves focus to the opened graph, unless the reader moved it meanwhile.
 */
function openedData(
    workspace: CommandContext["workspace"],
    session: GraphSession,
    report: OpenReport,
    file: File,
    fresh: boolean,
    focusLater: (focus?: boolean) => void,
): void {
    if (report.opened === "graph") {
        // From the start screen a data file goes through the Data page as a new graph, as New
        // from data... does, so Cancel goes back to the start screen. Into an open project it is
        // added as File... adds it: onto a graph that holds data, through the join screen.
        report.draft?.dispose();
        focusLater(false);
        if (fresh) {
            workspace.set({ project: null });
            openDataPage(workspace, { intent: "new", files: [file] });
        } else {
            addSource({ workspace, session, element: null }, incomingFiles([file]));
        }
        return;
    }
    // A graphty document that is not a project (styles, notes, a graph) is the reader's own file too.
    count("own_file_opened", { format: "graphty", via: "file" });
    // Opened as a new graph, it started its history (`history: "start"`).
    focusLater(fresh);
    if (!fresh) {
        workspace.set({ notice: heldNotice(workspace, session, { message: `Added ${file.name} to this project` }) });
    }
}

/**
 * A project file the element opened: the header takes the project's name, focus goes to its
 * heading, and Save writes the browser-kept project it came from again.
 * @param workspace - the workspace store.
 * @param session - the session.
 * @param report - what the element said of the file.
 * @param pending - the file and where it came from.
 * @param focusLater - moves focus to the opened graph, unless the reader moved it meanwhile.
 */
async function openedProject(
    workspace: CommandContext["workspace"],
    session: GraphSession,
    report: OpenReport,
    pending: PendingFile,
    focusLater: (focus?: boolean) => void,
): Promise<void> {
    const name = report.name ?? headerName(workspace);
    // The inspector shows the project that opened, and focus goes to its heading: whatever
    // row or control held focus belonged to the graph it replaced.
    workspace.set((state) => ({ project: state.project && { ...state.project, name }, inspected: null }));
    // On the next frame, once the inspector shows the project; awaited below, so an open settles
    // only after this hand-off (the store's `opened`).
    const focused = new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            focusLater();
            resolve();
        });
    });
    // A file the reader picked or dropped counts as their own file; a Recent or browser-kept project is a reopen.
    if (pending.storedId === undefined && pending.recentId === undefined) {
        count("own_file_opened", {
            format: "graphty",
            via: "file",
            size: graphSizeBucket(session.data.statistics({ scope: "all" }).nodeCount),
        });
    } else {
        count("project_reopened", { from: pending.recentId === undefined ? "browser" : "recent" });
    }
    const state = fileState(workspace);
    state.target = pending.storedId ?? null;
    // The choices of the project it replaced are not this one's.
    state.v2 = null;
    state.recentId = pending.recentId ?? null;
    await remember(workspace, session, pending.handle);
    if (pending.v2 !== undefined) {
        // Version 2: what did not come back is listed in the report, by what it is.
        workspace.set({ notice: heldNotice(workspace, session, { message: `Opened ${name}` }) });
        (await import("./saveV2Lazy")).showReport(
            workspace,
            session,
            `Opened ${name}`,
            report.problems,
            pending.v2.names,
        );
        await focused;
        return;
    }
    const lost = report.problems.length;
    const parts = lost === 1 ? "part" : "parts";
    workspace.set({
        notice: heldNotice(workspace, session, {
            message: lost === 0 ? `Opened ${name}` : `Opened ${name}. ${String(lost)} ${parts} did not come back.`,
        }),
    });
    await focused;
}

/**
 * A file the element refused: over unsaved changes it asks to discard them and opens again;
 * else it says why.
 * @param ctx - the command context.
 * @param session - the session.
 * @param pending - the file and where it came from.
 * @param error - what the element threw.
 * @returns false when the element refused the file.
 */
function openFailed(ctx: CommandContext, session: GraphSession, pending: PendingFile, error: unknown): boolean {
    const { workspace } = ctx;
    const { file, fresh = false } = pending;
    if (isGraphtyError(error) && error.code === "E_UNSAVED_CHANGES") {
        askToDiscard(workspace, async () => {
            await openInSession(ctx, session, pending, true);
        });
        return true;
    }
    const verb = fresh ? "opened" : "added";
    const message =
        isGraphtyError(error) && error.code === "E_PARSE_FAILED"
            ? notReadWords(withoutExtension(file.name), error, verb)
            : problemSentence(file.name, error);
    workspace.set({ notice: { message, error: true } });
    return false;
}

/**
 * A load's notice, naming the shaders the element held from the file, with Run, which runs each
 * through its checks and says how many did not pass.
 * @param workspace - the workspace store.
 * @param session - the session.
 * @param notice - the load's notice.
 * @returns the notice.
 */
function heldNotice(workspace: WorkspaceStore, session: GraphSession, notice: Notice): Notice {
    return withHeldShaders(session, notice, () => {
        void runHeld(session).then((failed) => {
            if (failed > 0) {
                const shaders = failed === 1 ? "1 shader" : `${String(failed)} shaders`;
                workspace.set({ notice: { message: `${shaders} did not pass the checks`, error: true } });
            }
        });
    });
}

/**
 * With version 2 files on, asks about a version 2 file from anywhere but the reader's own
 * browser-kept projects before it opens (those open at once); the answer is kept on the pending
 * file, for an open again after Discard.
 * @param workspace - the workspace store.
 * @param session - the session.
 * @param pending - the file and where it came from.
 * @returns false when the reader canceled.
 */
async function askBeforeOpen(workspace: WorkspaceStore, session: GraphSession, pending: PendingFile): Promise<boolean> {
    if (!saveFilesV2On(session) || pending.v2 !== undefined) {
        return true;
    }
    if (pending.storedId !== undefined) {
        // The reader's own project opens at once, and what it reports is listed as any version 2
        // open's is.
        const facts = await session.project.inspect(pending.file).catch(() => undefined);
        if (facts !== undefined) {
            pending.v2 = { options: {}, names: new Map(facts.sources.map((source) => [source.id, source.name])) };
        }
        return true;
    }
    const asked = await (await import("./saveV2Lazy")).askOpenV2(workspace, session, pending.file);
    if (asked === null) {
        return false;
    }
    if (asked.facts !== undefined) {
        pending.v2 = {
            options: asked.options,
            names: new Map(asked.facts.sources.map((source) => [source.id, source.name])),
        };
    }
    return true;
}

/**
 * Opens a file in the session through graphty-element's one intake verb, `project.open`. A
 * project file replaces the project (refused over unsaved changes until the reader says Discard);
 * the header takes the project's name, and Save writes the browser-kept project it came from
 * again. A data file opens the Data page as a new graph from the start screen, and is added as
 * File... adds it to an open project.
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
    const { file, onData, fresh = false } = pending;
    if (!(await askBeforeOpen(ctx.workspace, session, pending))) {
        return false;
    }
    const focusLater = focusOpenedGraphLater();
    try {
        // From the start screen a document opens as a new graph, so it starts the history. A data
        // file is read as the caller loads one: its roles guessed from the values too, and onto the
        // graph when the graph holds data.
        const onto = !fresh && session.data.sources().length > 0;
        const report = await session.project.open(file, {
            discard,
            fileName: file.name,
            // A project this app kept in the browser is the reader's own work: its loads stay live.
            ...(pending.storedId === undefined ? {} : { ownWork: true }),
            ...(fresh ? { history: "start" as const } : {}),
            draft: { guess: "values", ...(onto ? { onto: "graph" as const } : {}) },
            ...pending.v2?.options,
        });
        if (report.opened === "graph" && onData !== undefined) {
            focusLater(false);
            await onData(ctx, fresh, report.draft);
            return true;
        }
        if (report.opened !== "project") {
            openedData(ctx.workspace, session, report, file, fresh, focusLater);
            if (pending.v2 !== undefined) {
                (await import("./saveV2Lazy")).showReport(
                    ctx.workspace,
                    session,
                    `Added ${file.name}`,
                    report.problems,
                    pending.v2.names,
                );
            }
            return true;
        }
        await openedProject(ctx.workspace, session, report, pending, focusLater);
    } catch (error) {
        focusLater(false);
        if (onData !== undefined && isGraphtyError(error) && DATA_REFUSALS.has(error.code)) {
            // A data file the element could not read: the data import says why, in its own words,
            // from this refusal. Read once: a second read would fail, and count, a second time.
            await onData(ctx, fresh, undefined, error);
            return true;
        }
        return openFailed(ctx, session, pending, error);
    }
    return true;
}

/**
 * Opens a project or data file (Open project or file..., a dropped file, Recent projects): inside
 * an open project a project file opens in its place (asking first over unsaved changes) and a
 * data file is added as File... adds it; from the start screen it opens a project whose element
 * reads the file once it is up, and a data file then opens the Data page as a new graph.
 * @param ctx - the command context.
 * @param file - the file.
 * @param source - where it came from: its handle, Recent projects entry or browser-kept project;
 *     the new project's name; and how to import it as data (`onData`), in place of the Data page.
 */
export async function openProjectFile(ctx: CommandContext, file: File, source: FileSource = {}): Promise<void> {
    const { name = withoutExtension(file.name), ...from } = source;
    const pending: PendingFile = { file, ...from };
    if (ctx.workspace.get().project !== null && ctx.session !== null) {
        await openInSession(ctx, ctx.session, pending, false);
        return;
    }
    const { opened, settle } = openRun();
    fileState(ctx.workspace).pending = { ...pending, fresh: true, settle };
    ctx.workspace.set((state) => ({
        opened,
        project: { name, id: newProjectId(state) },
        page: "panels",
        place: "graph",
        inspected: null,
        dialog: null,
    }));
}

/**
 * Whether the project's element is reading the file it was opened with, or will once it is up.
 * @param store - the workspace store.
 * @returns true while that file is not yet read.
 */
export function openingFile(store: WorkspaceStore): boolean {
    const state = fileState(store);
    return state.pending !== null || state.reading;
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
    state.reading = true;
    const opened = await openInSession(ctx, ctx.session, pending, true)
        .catch((error: unknown) => {
            pending.settle?.({ error });
            throw error;
        })
        .finally(() => {
            state.reading = false;
        });
    if (!opened) {
        // Refused: the project was never opened, so back to the start screen, keeping the reason.
        const { notice } = ctx.workspace.get();
        closeNow(ctx.workspace);
        ctx.workspace.set({ notice });
    }
    // A data file the element refused also goes back to the start screen (openFirst), with its reason.
    const { project, notice } = ctx.workspace.get();
    pending.settle?.(project === null && notice?.error === true ? { error: new Error(notice.message) } : undefined);
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
