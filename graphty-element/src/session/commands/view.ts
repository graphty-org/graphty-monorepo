/**
 * @file The saved-view ops: `view.save` keeps camera states under names, `view.remove` forgets
 * them, and `view.camera` moves the camera.
 *
 * Saved views are the `views` slice of project state, so saving and removing them are undoable
 * steps on the immediate lane. Where the camera is looking is view state, not saved in a project
 * file, so `view.camera` is exempt: it changes no slice, and a renderer carries it out. See
 * design/undo/undo-design.md sections 3.1, 3.2, 10.5 and 11.4.
 */

import { cameraViewIds, isCameraViewName } from "../../camera/resolve";
import type { CameraState, Vec3 } from "../../camera/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ExemptDefinition, UndoableDefinition } from "../project/Dispatcher";

/** One view to save: a name and the camera state it holds. */
interface SavedView {
    readonly name: string;
    readonly camera: CameraState;
}

/** `view.save`: keep camera states under names, replacing any view already under one. */
interface ViewSaveCommand {
    readonly op: "view.save";
    readonly views: readonly SavedView[];
}

/** `view.remove`: forget saved views. */
interface ViewRemoveCommand {
    readonly op: "view.remove";
    readonly names: readonly string[];
}

/** `view.camera`: move the camera to a named view, or to a position and target. */
interface ViewCameraCommand {
    readonly op: "view.camera";
    /** A camera view or a saved view, by name. Wins over `position` and `target`. */
    readonly preset?: string;
    readonly position?: Vec3;
    readonly target?: Vec3;
    /** Animate the move instead of jumping. */
    readonly animate?: boolean;
}

/** Every view op. */
export type ViewCommand = ViewSaveCommand | ViewRemoveCommand | ViewCameraCommand;

/** The renderer's camera, as `view.camera` reaches it. */
export interface CameraService {
    /**
     * Move the camera.
     * @param command - Where to.
     * @returns Settles once the camera has arrived.
     */
    move(command: ViewCameraCommand): Promise<void>;
}

/**
 * Refuse a view name a camera view already answers to, or no name at all.
 * @param name - The name being claimed.
 * @throws A `GraphtyError` with `E_PROTECTED` for a camera view's name, `E_BAD_COMMAND` for an
 *     empty one.
 */
export function assertViewName(name: string): void {
    if (typeof name !== "string" || name.trim() === "") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "A saved view needs a name, because the name is what a person finds it by.",
            source: "view",
            details: { name },
        });
    }

    if (isCameraViewName(name)) {
        throw new GraphtyError({
            code: "E_PROTECTED",
            message:
                `"${name}" is a camera view, and a view recomputes itself for whatever is on screen. ` +
                "Saving a fixed position under the same name would silently replace a rule with a snapshot.",
            source: "view",
            details: { name, available: cameraViewIds() },
        });
    }
}

const viewSave: UndoableDefinition<ViewSaveCommand> = {
    op: "view.save",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => command.views.map((view) => `views/${view.name}`),
    undo: {
        kind: "undoable",
        label: (command) =>
            command.views.length === 1 ? `Saved the view "${command.views[0].name}"` : `Saved ${command.views.length} views`,
    },
    execute: (command, ctx) => {
        for (const view of command.views) {
            assertViewName(view.name);
        }

        for (const view of command.views) {
            ctx.draft.views.set(view.name, view.camera);
        }
    },
};

const viewRemove: UndoableDefinition<ViewRemoveCommand> = {
    op: "view.remove",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => command.names.map((name) => `views/${name}`),
    undo: {
        kind: "undoable",
        label: (command) =>
            command.names.length === 1 ? `Removed the view "${command.names[0]}"` : `Removed ${command.names.length} views`,
    },
    execute: (command, ctx) => {
        const missing = command.names.filter((name) => !ctx.state.views.has(name));
        if (missing.length > 0) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `No view is saved as "${missing[0]}", so there is nothing to remove.`,
                source: "view",
                details: { missing, available: [...ctx.state.views.keys()] },
            });
        }

        for (const name of command.names) {
            ctx.draft.views.delete(name);
        }
    },
};

const viewCamera: ExemptDefinition<ViewCameraCommand> = {
    op: "view.camera",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => [],
    undo: { kind: "exempt", reason: "Where the camera is looking is view state, not saved in a project file." },
    execute: (command, ctx) => {
        const { camera } = ctx.services;
        if (camera === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session draws nothing, so it has no camera to move.",
                source: "view",
            });
        }

        return camera.move(command);
    },
};

/** The view ops' definitions. */
export const VIEW_DEFINITIONS = [viewSave, viewRemove, viewCamera] as const;
