import { imageKey } from "../canvas/legendWords";
import { type CommandContext, defineRegistration } from "../commands/registry";
import type { WorkspaceState } from "../state/store";
import { nothingDrawn } from "../toolbar/useSessionVersion";
import { DEFAULT_IMAGE, DEFAULT_VIDEO, failureWords, fileName, IMAGE_EXTENSIONS, screenshotOptions } from "./choices";

/** The longest a Camera > Record video recording runs before it stops on its own, in milliseconds. */
const LONGEST_RECORDING = 5 * 60 * 1000;

/**
 * Why the canvas cannot be captured now: nothing is drawn, or the element is not up.
 * @param ctx - the command context.
 * @returns the reason, or null.
 */
function noCapture(ctx: CommandContext): string | null {
    const { session, element } = ctx;
    return nothingDrawn(session) ?? (element === null ? "The graph is still loading" : null);
}

/**
 * Camera > Export image: the canvas as it is now, saved as the Export dialog's Image output saves
 * it with its first preset and the current view, through graphty-element's `captureScreenshot`.
 * @param ctx - the command context.
 */
async function exportImage(ctx: CommandContext): Promise<void> {
    const { element, session, workspace } = ctx;
    if (element === null) {
        return;
    }
    const state = workspace.get();
    const name = fileName(state.project?.name ?? "untitled", "Current view", IMAGE_EXTENSIONS[DEFAULT_IMAGE.format]);
    try {
        // What is on screen now: a layout still moving is taken as it stands.
        await element.captureScreenshot({
            ...screenshotOptions(DEFAULT_IMAGE, { download: true }, name),
            legend: state.legendShown ? imageKey(session) : [],
            timing: { waitForSettle: false },
        });
        workspace.set({ notice: { message: `Exported ${name}` } });
    } catch (error) {
        workspace.set({ notice: { message: failureWords(error), error: true } });
    }
}

/**
 * Camera > Record video: starts recording the canvas as the Export dialog's Video output records a
 * still camera, through graphty-element's `captureAnimation`; run again, it stops and the element
 * saves what was recorded (`stopAnimationCapture`).
 * @param ctx - the command context.
 */
async function recordVideo(ctx: CommandContext): Promise<void> {
    const { element, workspace } = ctx;
    if (element === null) {
        return;
    }
    if (workspace.get().recording) {
        element.stopAnimationCapture();
        return;
    }
    workspace.set({ recording: true });
    const name = fileName(workspace.get().project?.name ?? "untitled", "view", "webm");
    try {
        const result = await element.captureAnimation({
            duration: LONGEST_RECORDING,
            fps: DEFAULT_VIDEO.fps,
            format: "auto",
            cameraMode: "stationary",
            download: true,
            downloadFilename: name,
        });
        workspace.set({ notice: { message: `Exported ${name.replace(/\.webm$/, `.${result.metadata.format}`)}` } });
    } catch (error) {
        // Stop in the Export dialog cancels it: nothing was saved, and nothing went wrong.
        if (!(error instanceof Error && error.name === "AnimationCancelledError")) {
            workspace.set({ notice: { message: failureWords(error), error: true } });
        }
    } finally {
        workspace.set({ recording: false });
    }
}

/**
 * Where Export... opens (tier 4, R14, tier 1's rule): on Data with the table that is showing
 * whenever the table dock is open, else on Image.
 * @param state - the workspace state.
 * @returns the store's `exportOn`.
 */
function exportTarget(state: Pick<WorkspaceState, "dockOpen" | "dockTab">): WorkspaceState["exportOn"] {
    if (!state.dockOpen) {
        return "image";
    }
    return state.dockTab === "edges" ? "edges" : "nodes";
}

/**
 * The Export dialog package's commands: Export... (the File list), which opens the dialog on Data
 * while a table is showing and on Image otherwise; a Sources row's Export..., which opens it on
 * Data with that source's records; and the Camera menu's Export image and Record video, which
 * capture the canvas without the dialog.
 */
export const registration = defineRegistration({
    owner: "export",
    commands: [
        {
            id: "file.export",
            label: "Export...",
            group: "Project",
            keys: ["Mod+E"],
            keywords: ["image", "picture", "screenshot", "png", "csv", "spreadsheet", "data", "download"],
            disabled: ({ workspace, element }) => {
                if (workspace.get().project === null) {
                    return "No project is open";
                }
                return element === null ? "The graph is still loading" : null;
            },
            run: ({ workspace }) => {
                workspace.set({ dialog: "export", exportOn: exportTarget(workspace.get()), exportSource: null });
            },
        },
        {
            id: "view.export-image",
            label: "Export image",
            group: "View",
            keys: ["Shift+I"],
            keywords: ["screenshot", "picture", "png"],
            disabled: noCapture,
            run: exportImage,
        },
        {
            id: "view.record-video",
            label: "Record video",
            group: "View",
            keys: ["Shift+R"],
            keywords: ["video", "screen recording", "stop recording", "webm"],
            disabled: noCapture,
            run: recordVideo,
        },
    ],
    sourceRow: [
        {
            id: "source.export",
            label: "Export...",
            order: 70,
            run: (ctx, source) => {
                ctx.workspace.set({ dialog: "export", exportOn: "nodes", exportSource: source.key });
            },
        },
    ],
});
