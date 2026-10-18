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
import type { GraphSession } from "@graphty/graphty-element/session";

import type { StartSample } from "../../data/sampleManifest";
import type { CommandContext } from "../commands/registry";
import { newProjectId, type WorkspaceStore } from "../state/store";

/**
 * Opens a new project and hands its load to the workspace, which runs it once the project's
 * element has come up.
 * @param workspace - the workspace store.
 * @param name - the project's name.
 * @param load - what to load into the new element.
 */
function openProject(workspace: WorkspaceStore, name: string, load: (session: GraphSession) => Promise<void>): void {
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
    openProject(workspace, sample.name, (session) =>
        session.data.import({ config: { url: sample.url }, name: sample.name }),
    );
}

/**
 * Where the datasets are read from: graphty.app in a build (graph-samples' default), this
 * machine's copy on the dev server and in the tests (vite.sample-data.ts).
 */
const DATASET_BASE = import.meta.env.DEV
    ? new URL(`${import.meta.env.BASE_URL}data/graph-samples/v1/`, globalThis.location.href).href
    : undefined;

/**
 * The address of the picture graph-samples publishes of a dataset, beside its file.
 * @param dataset - the dataset's metadata, from graph-samples' catalog.
 * @returns the address, or undefined when the dataset has no picture.
 */
export function pictureOf(dataset: DatasetMeta): string | undefined {
    return dataset.thumbnail === undefined
        ? undefined
        : new URL(dataset.thumbnail, DATASET_BASE ?? DEFAULT_DATASET_BASE_URL).href;
}

/**
 * Opens one of graph-samples' datasets as a new project named after it, with nothing run: the
 * element downloads it and loads it.
 * @param workspace - the workspace store.
 * @param dataset - the dataset's metadata, from graph-samples' catalog.
 */
export function openDataset(workspace: WorkspaceStore, dataset: DatasetMeta): void {
    openProject(workspace, dataset.title, (session) =>
        session.data.loadDataset(dataset.name, DATASET_BASE === undefined ? {} : { baseUrl: DATASET_BASE }),
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
    openProject(workspace, generator.plainName, (session) => session.data.generate(generator.name, params));
}

/**
 * Opens the graph file at a web address as a new project named after the file. The element reads
 * the format from the address and the file, as for any file.
 * @param workspace - the workspace store.
 * @param url - the address.
 */
export function openUrl(workspace: WorkspaceStore, url: string): void {
    const file = new URL(url).pathname.split("/").pop() ?? "";
    const name = decodeURIComponent(file).replace(/\.[^.]*$/, "") || new URL(url).hostname;
    openProject(workspace, name, (session) => session.data.import({ config: { url }, name }));
}

/**
 * Opens a file: from the start screen as a new project named after the file; inside a project it
 * is added to that project (tier1-design.md section 2.1, the File list's intake).
 * @param ctx - the command context.
 * @param ctx.workspace - the workspace store.
 * @param ctx.session - the open project's session, or null.
 * @param file - the file.
 */
export function openFile({ workspace, session }: CommandContext, file: File): void {
    const source = { config: { file }, name: file.name };
    if (workspace.get().project !== null && session !== null) {
        session.data.import(source, { mode: "merge" }).catch((error: unknown) => {
            const reason = error instanceof Error ? error.message : String(error);
            workspace.set({ notice: { message: `${file.name} could not be added. ${reason}` } });
        });
        return;
    }
    openProject(workspace, file.name.replace(/\.[^.]*$/, "") || file.name, (next) => next.data.import(source));
}

/**
 * Asks the browser for one file.
 * @returns the file, or undefined when the reader cancels.
 */
function pickFile(): Promise<File | undefined> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.addEventListener("change", () => {
            resolve(input.files?.[0]);
        });
        input.addEventListener("cancel", () => {
            resolve(undefined);
        });
        input.click();
    });
}

/**
 * Open project or file...: the browser's file picker, then the file opens.
 * @param ctx - the command context.
 */
export async function chooseAndOpenFile(ctx: CommandContext): Promise<void> {
    const file = await pickFile();
    if (file !== undefined) {
        openFile(ctx, file);
    }
}
