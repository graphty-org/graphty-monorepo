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
import { fileNameWithoutExtension, openProjectFile } from "../project/actions";
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
 * Opens a file through graphty-element's `project.open`, which decides what it is: a project file
 * opens as the project (in place of the open one, asking first over unsaved changes); a data file
 * opens from the start screen as a new project named after the file, and inside a project is
 * added to it (tier1-design.md section 2.1, the File list's intake).
 * @param ctx - the command context.
 * @param file - the file.
 */
export function openFile(ctx: CommandContext, file: File): void {
    void openProjectFile(ctx, file, { name: fileNameWithoutExtension(file.name), intake: true });
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
