/**
 * How the start screen opens a project: a sample, a dataset, a generated graph or a web address
 * through graphty-element's ordinary import, or a file the reader chose or dropped through its `project.open`, the one intake verb
 * Recent projects also uses. Nothing is run on what opens.
 */

import {
    type DatasetMeta,
    DEFAULT_DATASET_BASE_URL,
    type GeneratorDescriptor,
    type GeneratorParams,
} from "@graphty/graphty-element/catalog";
import type { AssetSource, GraphSession } from "@graphty/graphty-element/session";

import type { StartSample } from "../../data/sampleManifest";
import { siteConfig } from "../../siteConfig";
import { putModelOnNodes } from "../canvas/models";
import type { CommandContext } from "../commands/registry";
import { openProjectFile } from "../project/actions";
import { fileStylesChoice } from "../settings/preferences";
import { newProjectId, type WorkspaceStore } from "../state/store";
import { noticeFileStyles } from "../styles/noticeFileStyles";

/**
 * Opens a new project and hands its load to the workspace, which runs it once the project's
 * element has come up. Each load starts the project's history (`history: "start"`): opening is
 * not a change to undo, and Undo pressed while it loads never cancels it.
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
    openProject(workspace, sample.name, async (session) => {
        await session.data.import(
            { config: { url: sample.url }, name: sample.name },
            { styles: fileStylesChoice(), history: "start" },
        );
        noticeFileStyles(workspace, session);
    });
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
 * @returns the address, or undefined for graph-samples' default.
 */
function datasetBase(): string | undefined {
    return LOCAL_DATASETS ?? siteConfig().datasets;
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
        : new URL(entry.thumbnail, datasetBase() ?? DEFAULT_DATASET_BASE_URL).href;
}

/**
 * Opens one of graph-samples' datasets as a new project named after it, with nothing run: the
 * element downloads it and loads it.
 * @param workspace - the workspace store.
 * @param dataset - the dataset's metadata, from graph-samples' catalog.
 */
export function openDataset(workspace: WorkspaceStore, dataset: DatasetMeta): void {
    const baseUrl = datasetBase();
    openProject(workspace, dataset.title, (session) =>
        session.data.loadDataset(dataset.name, {
            history: "start",
            ...(baseUrl === undefined ? {} : { baseUrl }),
        }),
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

/**
 * Opens the graph file at a web address as a new project named after the file. The element reads
 * the format from the address and the file, as for any file.
 * @param workspace - the workspace store.
 * @param url - the address.
 */
export function openUrl(workspace: WorkspaceStore, url: string): void {
    const file = new URL(url).pathname.split("/").pop() ?? "";
    const name = decodeURIComponent(file).replace(/\.[^.]*$/, "") || new URL(url).hostname;
    openProject(workspace, name, (session) => session.data.import({ config: { url }, name }, { history: "start" }));
}

/**
 * Asks the browser for one file.
 * @returns the file, or undefined when the reader cancels.
 */
export function pickFile(): Promise<File | undefined> {
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
 * Open project or file...: the browser's file picker, then the file opens through
 * graphty-element's `project.open` (see `openProjectFile`).
 * @param ctx - the command context.
 */
export async function chooseAndOpenFile(ctx: CommandContext): Promise<void> {
    const file = await pickFile();
    if (file !== undefined) {
        await openProjectFile(ctx, file);
    }
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
