/**
 * How data opens: a sample, or a file the reader chose or dropped, into the project or as a new
 * one. Either way the data goes through graphty-element's ordinary import, so the import report and
 * Undo work as for any file, and nothing is run on it.
 */

import { pickFiles as pickFromBrowser, useFileDrop } from "@graphty/compact-mantine";
import {
    type DatasetMeta,
    DEFAULT_DATASET_BASE_URL,
    type GeneratorDescriptor,
    type GeneratorParams,
} from "@graphty/graphty-element/catalog";
import type { AssetSource, DataSourceInput, GraphSession } from "@graphty/graphty-element/session";
import { useCallback, useRef } from "react";

import type { StartSample } from "../../data/sampleManifest";
import { siteConfig } from "../../siteConfig";
import { putModelOnNodes } from "../canvas/models";
import type { CommandContext } from "../commands/registry";
import { refusalFor } from "../data-page/words";
import { focusOpenedGraphLater } from "../frame/focus";
import { openProjectFile } from "../project/actions";
import { routeToReplace } from "../replace/commands";
import { fileStylesChoice } from "../settings/preferences";
import { newProjectId, useStoreValue, type WorkspaceStore } from "../state/store";
import { noticeFileStyles } from "../styles/noticeFileStyles";

/**
 * Opens a new project and hands its load to the workspace, which runs it once the project's
 * element has come up. Each load starts the project's history (`history: "start"`): opening is
 * not a change to undo, and Undo pressed while it loads never cancels it.
 * @param workspace - the workspace store.
 * @param name - the project's name.
 * @param load - what to load into the new element.
 */
export function openProject(
    workspace: WorkspaceStore,
    name: string,
    load: (session: GraphSession) => Promise<void>,
): void {
    workspace.set((state) => ({
        project: { name, id: newProjectId(state) },
        page: "panels",
        place: "graph",
        inspected: null,
        dialog: null,
        opening: { name, load },
        ends: null,
    }));
}

/**
 * This machine's copy, on the dev server and in the tests (vite.sample-data.ts) and in a built
 * Storybook (its staticDirs), which never read the network.
 */
const LOCAL_DATASETS =
    import.meta.env.DEV || import.meta.env.VITE_LOCAL_SAMPLE_DATA === "true"
        ? new URL(`${import.meta.env.BASE_URL}data/graph-samples/v1/`, globalThis.location.href).href
        : undefined;

/**
 * Where the datasets are read from: this machine's copy where there is one, else the site's own
 * (its site.json's `datasets`), else graph-samples' default.
 * @returns the options naming it, or none for graph-samples' default.
 */
export function datasetBase(): { readonly baseUrl?: string } {
    const baseUrl = LOCAL_DATASETS ?? siteConfig().datasets;
    return baseUrl === undefined ? {} : { baseUrl };
}

/**
 * The address of the picture graph-samples publishes of a dataset or a generator, beside the
 * datasets' files.
 * @param entry - the dataset's metadata or the generator's descriptor, from graph-samples' catalog.
 * @param entry.thumbnail - the picture's file name, when it has one.
 * @returns the address, or undefined when it has no picture.
 */
export function pictureOf(entry: Pick<DatasetMeta | GeneratorDescriptor, "thumbnail">): string | undefined {
    return entry.thumbnail === undefined
        ? undefined
        : new URL(entry.thumbnail, datasetBase().baseUrl ?? DEFAULT_DATASET_BASE_URL).href;
}

/**
 * Opens one of graph-samples' datasets as a new project named after it, with nothing run: the
 * element downloads it and loads it.
 * @param workspace - the workspace store.
 * @param dataset - the dataset's metadata, from graph-samples' catalog.
 */
export function openDataset(workspace: WorkspaceStore, dataset: DatasetMeta): void {
    openProject(workspace, dataset.title, (session) =>
        session.data.loadDataset(dataset.name, { history: "start", ...datasetBase() }),
    );
}

/**
 * Opens a generated graph as a new project named after its generator, with nothing run.
 * @param workspace - the workspace store.
 * @param generator - the generator, from graph-samples' catalog.
 * @param params - its parameters.
 */
export function openGenerated(
    workspace: WorkspaceStore,
    generator: GeneratorDescriptor,
    params: GeneratorParams,
): void {
    openProject(workspace, generator.plainName, (session) =>
        session.data.generate(generator.name, params, { history: "start" }),
    );
}

/** A file, a node file and an edge file, pasted text or an address, and the name the reader knows it by. */
export interface Incoming {
    readonly name: string;
    readonly source: DataSourceInput;
}

/**
 * The files the reader dropped or picked, as one source: one file, or the first two as a node file
 * and an edge file, which graphty-element reads as one load and tells apart by their columns,
 * named after both.
 * @param files - the files, at least one.
 * @returns the source.
 */
export function incomingFiles(files: readonly File[]): Incoming {
    const [first, second] = files;
    if (second === undefined) {
        return { name: first.name, source: { config: { file: first }, name: first.name } };
    }
    const name = `${first.name} + ${second.name}`;
    return { name, source: { config: { nodeFile: first, edgeFile: second }, name } };
}

/**
 * Draws the first source of a graph at once (spec section 2.1). graphty-element guesses the roles,
 * reading the values where no header names them. A table it reads as edges without finding their
 * ends cannot load as edges, so its rows load as nodes and Fields opens on Rows are: edges with
 * Source and Target to pick, which reads the load again as edges. A file with problems, or with
 * ends to pick, opens the table dock: maximized only when the load could not draw (ends to pick),
 * beside the Data place; a file that drew with problems opens it docked, its warnings in the
 * headers.
 * @param workspace - the workspace store.
 * @param session - the project's session.
 * @param source - what to load.
 * @param fresh - whether it is a new project's first load, which starts its history.
 */
async function drawFirst(
    workspace: WorkspaceStore,
    session: GraphSession,
    source: DataSourceInput,
    fresh = false,
): Promise<void> {
    const draft = await session.data.prepare(source, { guess: "values" });
    const fixed = draft.tables.every((table) => table.fixed);
    const ready = Object.values(draft.missing()).every((roles) => roles.length === 0);
    const lone = draft.tables.length === 1 && !ready;
    const mapping = lone ? { rowsAre: "nodes" as const } : draft.mapping;
    // A graph file keeps the roles its format sets.
    await draft.load({
        styles: fileStylesChoice(),
        ...(fixed ? {} : { mapping }),
        ...(fresh ? { history: "start" as const } : {}),
    });
    noticeFileStyles(workspace, session);
    const load = session.data.sources().at(-1);
    if (lone && load !== undefined) {
        workspace.set({ ends: { load: load.key, source: null, target: null } });
    }
    if (!ready) {
        workspace.set({ dockOpen: true, dockMaximized: true, place: "data" });
    } else if (session.data.issues().length > 0) {
        workspace.set({ dockOpen: true });
    }
}

/**
 * A second source while the graph holds data (spec sections 2.1, 3.6 and 3.7): a copy of a loaded
 * source replaces it; anything else is read as a table to join and waits for the join screen.
 * @param workspace - the workspace store.
 * @param session - the project's session.
 * @param incoming - the source.
 */
async function takeIn(workspace: WorkspaceStore, session: GraphSession, incoming: Incoming): Promise<void> {
    if (await routeToReplace(workspace, session, incoming)) {
        return;
    }
    const draft = await session.data.prepare(incoming.source, { onto: "graph", guess: "values" });
    workspace.set({ joining: { name: incoming.name, draft, source: incoming.source } });
}

/**
 * Opens a source as a new project of its own, drawn as a first file is (the join screen's Open as
 * a separate graph).
 * @param workspace - the workspace store.
 * @param incoming - the source.
 */
export function openSeparate(workspace: WorkspaceStore, incoming: Incoming): void {
    openProject(workspace, incoming.name.replace(/\.[^.]*$/, "") || incoming.name, (next) =>
        drawFirst(workspace, next, incoming.source, true),
    );
}

/**
 * Opens one of the app's own samples as a new project named after it, drawn as a first file is.
 * @param workspace - the workspace store.
 * @param sample - the sample.
 */
export function openSample(workspace: WorkspaceStore, sample: StartSample): void {
    openSeparate(workspace, { name: sample.name, source: { config: { url: sample.url }, name: sample.name } });
}

/**
 * The graph file at a web address as a source, named after the file (or the host when the address
 * names no file).
 * @param url - the address.
 * @returns the source.
 */
function urlSource(url: string): Incoming {
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "") || new URL(url).hostname;
    return { name, source: { config: { url }, name } };
}

/**
 * Opens the graph file at a web address as a new project named after the file, drawn as a first
 * file is. The element reads the format from the address and the file.
 * @param workspace - the workspace store.
 * @param url - the address.
 */
export function openUrl(workspace: WorkspaceStore, url: string): void {
    openSeparate(workspace, urlSource(url));
}

/**
 * Loads a source the reader brought by any door (drop, File..., Paste, Samples): from the start
 * screen as a new project named after it; into an empty project as its first source; into a graph
 * that holds data as a replacement or a join.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the open project's session, or null.
 * @param incoming - the source.
 */
export function addSource({ workspace, session }: CommandContext, incoming: Incoming): void {
    if (workspace.get().project === null || session === null) {
        openSeparate(workspace, incoming);
        return;
    }
    const work =
        session.data.sources().length === 0
            ? drawFirst(workspace, session, incoming.source)
            : takeIn(workspace, session, incoming);
    work.catch((error: unknown) => {
        workspace.set({ notice: { message: refusalFor(error, incoming.name).what } });
    });
}

/**
 * Loads a file opened from the start screen into its new project, drawn as a first file is. The
 * graph starts its history (Undo never unloads it) and focus goes to its heading, as for a sample.
 * A file the element refuses was never really opened: back to the start screen, with the reason
 * staying until it is dismissed.
 * @param ctx - the command context, with the new project's session.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the new project's session.
 * @param incoming - the source.
 */
async function openFirst({ workspace, session }: CommandContext, incoming: Incoming): Promise<void> {
    if (session === null) {
        return;
    }
    const focusLater = focusOpenedGraphLater();
    try {
        await drawFirst(workspace, session, incoming.source, true);
        focusLater();
    } catch (error) {
        focusLater(false);
        workspace.set({
            project: null,
            page: "panels",
            inspected: null,
            dialog: null,
            renaming: false,
            notice: { message: refusalFor(error, incoming.name).what, error: true },
        });
    }
}

/**
 * How a whole graph loads into a session: replacing what it holds, or added to it, and, for a new
 * project, as where its history starts.
 */
export type GraphLoad = (
    session: GraphSession,
    load: { readonly mode: "replace" | "merge"; readonly history?: "start" },
) => Promise<void>;

/**
 * Adds a whole graph (a server sample, a dataset, a generated graph) by the same rule as
 * {@link addSource}: from the start screen as a new project named after it; into an empty project
 * as its first source; into a graph that holds data as one more source, added to it.
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the open project's session, or null.
 * @param name - the graph's name.
 * @param load - loads it.
 */
export function addGraph({ workspace, session }: CommandContext, name: string, load: GraphLoad): void {
    if (workspace.get().project === null || session === null) {
        openProject(workspace, name, (next) => load(next, { mode: "replace", history: "start" }));
        return;
    }
    load(session, { mode: session.data.sources().length === 0 ? "replace" : "merge" }).catch((error: unknown) => {
        workspace.set({ notice: { message: refusalFor(error, name).what } });
    });
}

/**
 * Opens dropped or picked files. One file goes through graphty-element's `project.open`, which
 * decides what it is: a saved project opens as the project (in place of the open one, asking
 * first over unsaved changes), and a data file loads as any source does (see {@link addSource}).
 * Two files are a node file and an edge file.
 * @param ctx - the command context.
 * @param files - the files; nothing happens without one.
 */
export function openFiles(ctx: CommandContext, files: readonly File[]): void {
    const incoming = files.length > 0 ? incomingFiles(files) : undefined;
    if (files.length === 1 && incoming !== undefined) {
        void openProjectFile(ctx, files[0], {
            name: incoming.name.replace(/\.[^.]*$/, "") || incoming.name,
            onData: (next, fresh) => {
                if (fresh) {
                    return openFirst(next, incoming);
                }
                addSource(next, incoming);
                return Promise.resolve();
            },
        });
    } else if (incoming !== undefined) {
        addSource(ctx, incoming);
    }
    if (files.length > 2) {
        // A load reads one node file and one edge file; the rest are named, not dropped silently.
        const rest = files.slice(2).map((file) => file.name);
        ctx.workspace.set({ notice: { message: `Not added: ${rest.join(", ")}` } });
    }
}

/**
 * Opens one file (see {@link addSource}).
 * @param ctx - the command context.
 * @param file - the file.
 */
export function openFile(ctx: CommandContext, file: File): void {
    openFiles(ctx, [file]);
}

/**
 * Asks the browser for files: one, or a node file and an edge file.
 * @returns the files, empty when the reader cancels.
 */
export function pickFiles(): Promise<File[]> {
    return pickFromBrowser({ multiple: true });
}

/**
 * Asks the browser for one file.
 * @returns the file, or undefined when the reader cancels.
 */
export async function pickFile(): Promise<File | undefined> {
    const [file] = await pickFiles();
    return file;
}

/**
 * A file's contents as a `data:` address, for a setting that takes an image address (a background,
 * a map), so an image from this computer is kept in the project with it.
 * @param file - the file.
 * @returns the address.
 */
export function readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            resolve(typeof reader.result === "string" ? reader.result : "");
        });
        reader.addEventListener("error", () => {
            reject(reader.error ?? new Error(`${file.name} could not be read`));
        });
        reader.readAsDataURL(file);
    });
}

/**
 * Open project or file... and File...: the browser's file picker, then the files open.
 * @param ctx - the command context.
 */
export async function chooseAndOpenFile(ctx: CommandContext): Promise<void> {
    openFiles(ctx, await pickFiles());
}

/** What Paste read from the clipboard: a web address, or text to read as data. */
export type Pasted = { readonly kind: "url"; readonly url: string } | { readonly kind: "text"; readonly text: string };

/**
 * Paste, wherever it is offered: the clipboard's text, as a web address when it is one (the graph
 * file there opens), else as data graphty-element reads as any file (CSV, TSV, JSON, a graph format).
 * @returns what was pasted, or null when the clipboard holds no text.
 */
export async function readPasted(): Promise<Pasted | null> {
    const text = await navigator.clipboard.readText();
    const pasted = text.trim();
    if (pasted === "") {
        return null;
    }
    return /^https?:\/\/\S+$/.test(pasted) ? { kind: "url", url: pasted } : { kind: "text", text };
}

/**
 * Paste on the Sources "+": what {@link readPasted} read, added as a source.
 * @param ctx - the command context.
 */
export async function pasteSource(ctx: CommandContext): Promise<void> {
    const pasted = await readPasted();
    if (pasted === null) {
        ctx.workspace.set({ notice: { message: "Clipboard empty" } });
        return;
    }
    addSource(
        ctx,
        pasted.kind === "url"
            ? urlSource(pasted.url)
            : { name: "Pasted data", source: { config: { data: pasted.text }, name: "Pasted data" } },
    );
}

/**
 * Drop anywhere in a project: the same as File... (spec section 3.2). The start screen keeps its
 * own drop target; a drop a part of the page already took (the Data page's) is left to it.
 * @param ctx - the workspace context.
 */
export function useDropToOpen(ctx: CommandContext): void {
    const latest = useRef(ctx);
    latest.current = ctx;
    const inProject = useStoreValue(ctx.workspace, (state) => state.project !== null);
    const open = useCallback((files: File[]) => {
        openFiles(latest.current, files);
    }, []);
    useFileDrop("window", open, { disabled: !inProject });
}

/**
 * Opens a new project, named after a model file dropped on the start screen, that draws every node
 * as that model: the model is added to the project and one undoable layer names it, so the graph
 * data the reader adds next is drawn with it.
 * @param workspace - the workspace store.
 * @param fileName - the model's main file name.
 * @param source - the model's files.
 */
export function openModel(workspace: WorkspaceStore, fileName: string, source: AssetSource): void {
    openProject(workspace, fileName.replace(/\.[^.]*$/, "") || fileName, async (session) => {
        await putModelOnNodes(session, workspace, source);
    });
}
