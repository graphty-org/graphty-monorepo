/**
 * How the start screen opens a project: a sample by URL, or a file the reader chose or dropped.
 * Either way the data goes through graphty-element's ordinary import, so the import report and
 * Undo work as for any file, and nothing is run on it.
 */

import type { GraphSession } from "@graphty/graphty-element/session";

import type { StartSample } from "../../data/sampleManifest";
import type { CommandContext } from "../commands/registry";
import type { WorkspaceStore } from "../state/store";

/**
 * Opens a new project and hands its load to the workspace, which runs it once the project's
 * element has come up.
 * @param workspace - the workspace store.
 * @param name - the project's name.
 * @param load - what to load into the new element.
 */
function openProject(workspace: WorkspaceStore, name: string, load: (session: GraphSession) => Promise<void>): void {
    workspace.set((state) => ({
        project: { name, id: (state.project?.id ?? 0) + 1 },
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
