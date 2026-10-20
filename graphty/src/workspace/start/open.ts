/**
 * How the start screen opens a project: a sample by URL, or a file the reader chose or dropped.
 * Either way the data goes through graphty-element's ordinary import, so the import report and
 * Undo work as for any file, and nothing is run on it.
 */

import {
    type DatasetMeta,
    DEFAULT_DATASET_BASE_URL,
    type GeneratorDescriptor,
    type GeneratorParams,
} from "@graphty/graphty-element/catalog";
import type { DataSourceInput, GraphSession, LoadDraft, LoadMapping } from "@graphty/graphty-element/session";
import { useEffect, useRef } from "react";

import type { StartSample } from "../../data/sampleManifest";
import type { CommandContext } from "../commands/registry";
import { routeToReplace } from "../replace/commands";
import { fileStylesChoice } from "../settings/preferences";
import { newProjectId, type WorkspaceStore } from "../state/store";
import { noticeFileStyles } from "../styles/noticeFileStyles";

/**
 * Opens a new project and hands its load to the workspace, which runs it once the project's
 * element has come up.
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
    }));
}

/**
 * Opens a sample as a new project named after it, with nothing run.
 * @param workspace - the workspace store.
 * @param sample - the sample.
 */
export function openSample(workspace: WorkspaceStore, sample: StartSample): void {
    openProject(workspace, sample.name, async (session) => {
        await session.data.import({ config: { url: sample.url }, name: sample.name }, { styles: fileStylesChoice() });
        noticeFileStyles(workspace, session);
    });
}

/**
 * Where the datasets are read from: graphty.app in a build (graph-samples' default), this
 * machine's copy on the dev server and in the tests (vite.sample-data.ts) and in a built
 * Storybook (its staticDirs), which never reads the network.
 */
const DATASET_BASE =
    import.meta.env.DEV || import.meta.env.VITE_LOCAL_SAMPLE_DATA === "true"
        ? new URL(`${import.meta.env.BASE_URL}data/graph-samples/v1/`, globalThis.location.href).href
        : undefined;

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
        : new URL(entry.thumbnail, DATASET_BASE ?? DEFAULT_DATASET_BASE_URL).href;
}

/**
 * Opens one of graph-samples' datasets as a new project named after it, with nothing run: the
 * element downloads it and loads it.
 * @param workspace - the workspace store.
 * @param dataset - the dataset's metadata, from graph-samples' catalog.
 */
export function openDataset(workspace: WorkspaceStore, dataset: DatasetMeta): void {
    openProject(workspace, dataset.title, (session) => session.data.loadDataset(dataset.name, datasetBase()));
}

/**
 * Where `loadDataset` reads graph-samples' datasets from (see `DATASET_BASE`).
 * @returns the options naming it, or none for graph-samples' default.
 */
export function datasetBase(): { readonly baseUrl?: string } {
    return DATASET_BASE === undefined ? {} : { baseUrl: DATASET_BASE };
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
    openProject(workspace, generator.plainName, (session) => session.data.generate(generator.name, params));
}

/** A file, a node file and an edge file, pasted text or an address, and the name the reader knows it by. */
export interface Incoming {
    readonly name: string;
    readonly source: DataSourceInput;
}

/**
 * The files the reader dropped or picked, as one source: one file, or the first two as a node file
 * and an edge file, which graphty-element reads as one load and tells apart by their columns.
 * @param files - the files, at least one.
 * @returns the source.
 */
export function incomingFiles(files: readonly File[]): Incoming {
    // ponytail: a third file and more are left out; take them as more sources if readers drop them.
    const [first, second] = files;
    return second === undefined
        ? { name: first.name, source: { config: { file: first }, name: first.name } }
        : { name: `${first.name} + ${second.name}`, source: { config: { nodeFile: first, edgeFile: second } } };
}

/**
 * The mapping a first load is given: the draft's own guess, passed on so a later reload with new
 * Fields keeps it; a single table whose edge ends are not found reads its rows as nodes; a graph
 * file keeps the roles its format sets.
 * @param draft - the draft.
 * @param ready - whether every table has the roles it needs.
 * @returns the mapping, or undefined to give none.
 */
function firstMapping(draft: LoadDraft, ready: boolean): LoadMapping | undefined {
    if (draft.tables.every((table) => table.fixed)) {
        return undefined;
    }
    if (ready) {
        return draft.mapping;
    }
    return draft.tables.length === 1 ? { rowsAre: "nodes" } : undefined;
}

/**
 * Draws the first source of a graph at once (spec section 2.1). graphty-element guesses the roles,
 * reading the values where no header names them; a table whose edge ends it cannot find draws its
 * rows as nodes until the reader picks the ends in Fields. A file with problems, or with ends to
 * pick, also opens the table dock maximized.
 * @param workspace - the workspace store.
 * @param session - the project's session.
 * @param source - what to load.
 */
async function drawFirst(workspace: WorkspaceStore, session: GraphSession, source: DataSourceInput): Promise<void> {
    const draft = await session.data.prepare(source, { guess: "values" });
    const ready = Object.values(draft.missing()).every((roles) => roles.length === 0);
    const mapping = firstMapping(draft, ready);
    await draft.load({ styles: fileStylesChoice(), ...(mapping === undefined ? {} : { mapping }) });
    noticeFileStyles(workspace, session);
    if (!ready || session.data.issues().length > 0) {
        workspace.set({ dockOpen: true, dockMaximized: true });
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
        drawFirst(workspace, next, incoming.source),
    );
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
        const reason = error instanceof Error ? error.message : String(error);
        workspace.set({ notice: { message: `${incoming.name} could not be added. ${reason}` } });
    });
}

/**
 * Opens dropped or picked files (see {@link addSource}).
 * @param ctx - the command context.
 * @param files - the files; nothing happens without one.
 */
export function openFiles(ctx: CommandContext, files: readonly File[]): void {
    if (files.length > 0) {
        addSource(ctx, incomingFiles(files));
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
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.addEventListener("change", () => {
            resolve([...(input.files ?? [])]);
        });
        input.addEventListener("cancel", () => {
            resolve([]);
        });
        input.click();
    });
}

/**
 * Open project or file... and File...: the browser's file picker, then the files open.
 * @param ctx - the command context.
 */
export async function chooseAndOpenFile(ctx: CommandContext): Promise<void> {
    openFiles(ctx, await pickFiles());
}

/**
 * Paste: the clipboard's text, read by graphty-element as any file is (CSV, TSV, JSON, a graph
 * format), added as a source; a web address opens the graph file there.
 * @param ctx - the command context.
 */
export async function pasteSource(ctx: CommandContext): Promise<void> {
    const text = await navigator.clipboard.readText();
    if (text.trim() === "") {
        ctx.workspace.set({ notice: { message: "Clipboard empty" } });
        return;
    }
    const pasted = text.trim();
    // A pasted web address opens the graph file there, named after the file.
    if (/^https?:\/\/\S+$/.test(pasted)) {
        const name = decodeURIComponent(new URL(pasted).pathname.split("/").pop() ?? "") || new URL(pasted).hostname;
        addSource(ctx, { name, source: { config: { url: pasted }, name } });
        return;
    }
    addSource(ctx, { name: "Pasted data", source: { config: { data: text }, name: "Pasted data" } });
}

/**
 * Drop anywhere in a project: the same as File... (spec section 3.2). The start screen keeps its
 * own drop target; a drop a part of the page already took (the Data page's) is left to it.
 * @param ctx - the workspace context.
 */
export function useDropToOpen(ctx: CommandContext): void {
    const latest = useRef(ctx);
    latest.current = ctx;
    useEffect(() => {
        const inProject = (): boolean => latest.current.workspace.get().project !== null;
        const over = (event: DragEvent): void => {
            if (inProject()) {
                event.preventDefault();
            }
        };
        const drop = (event: DragEvent): void => {
            if (!inProject() || event.defaultPrevented) {
                return;
            }
            event.preventDefault();
            openFiles(latest.current, [...(event.dataTransfer?.files ?? [])]);
        };
        globalThis.addEventListener("dragover", over);
        globalThis.addEventListener("drop", drop);
        return () => {
            globalThis.removeEventListener("dragover", over);
            globalThis.removeEventListener("drop", drop);
        };
    }, []);
}
