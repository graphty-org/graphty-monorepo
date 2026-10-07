/**
 * How the start screen opens a project: a sample by URL through graphty-element's ordinary
 * import, or a file the reader chose or dropped through its `project.open`, the one intake verb
 * Recent projects also uses. Nothing is run on what opens.
 */

import type { GraphSession } from "@graphty/graphty-element/session";

import type { StartSample } from "../../data/sampleManifest";
import type { CommandContext } from "../commands/registry";
import { openProjectFile } from "../project/actions";
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
