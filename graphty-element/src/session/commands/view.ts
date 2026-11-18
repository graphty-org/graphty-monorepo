/**
 * @file The saved-view ops: `view.save` keeps camera states under names, `view.remove` forgets
 * them, `view.rename` and `view.move` rename and reorder them (a rename rewrites every tour stop
 * naming the view), and `view.camera` moves the camera.
 *
 * The views are kept in project order (the `viewOrder` value, reported as the `views` slice):
 * a save appends, a removal takes out, a rename keeps the place and a move rewrites it, and each
 * undo puts the whole order back.
 *
 * Saved views are the `views` slice of project state, so saving and removing them are undoable
 * steps on the immediate lane. Where the camera is looking is view state, not saved in a project
 * file, so `view.camera` is exempt: it changes no slice, and a renderer carries it out. See
 * design/undo/undo-design.md sections 3.1, 3.2, 10.5 and 11.4.
 */

import { isCameraViewName } from "../../camera/resolve";
import type { CameraState, Vec3 } from "../../camera/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ExemptDefinition, UndoableDefinition } from "../project/Dispatcher";
import { renameTourStops } from "./tour";

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

/** `view.rename`: give a saved view a new name, keeping its place in the order. */
interface ViewRenameCommand {
    readonly op: "view.rename";
    readonly from: string;
    readonly to: string;
}

/** `view.move`: put a saved view at a place in the order. */
interface ViewMoveCommand {
    readonly op: "view.move";
    readonly name: string;
    /** The 0-based place, clamped to the order. */
    readonly index: number;
}

/** Every view op. */
export type ViewCommand = ViewSaveCommand | ViewRemoveCommand | ViewCameraCommand | ViewRenameCommand | ViewMoveCommand;

/** The renderer's camera, as `view.camera` reaches it. */
export interface CameraService {
    /**
     * Move the camera.
     * @param command - Where to.
     * @returns Settles once the camera has arrived.
     */
    move(command: ViewCameraCommand): Promise<void>;
    /**
     * Where the camera stands now, for a view saved with no camera of its own.
     * @returns The state.
     * @throws A `GraphtyError` with `E_UNSUPPORTED` `{ reason: "xr", mode }` while immersive.
     */
    current(): CameraState;
}

/**
 * The refusal for a saved view name nothing is saved under.
 * @param missing - The names not saved.
 * @param available - The saved names.
 * @returns The error.
 */
function unknownView(missing: readonly string[], available: readonly string[]): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `No view is saved as "${missing[0]}".`,
        source: "view",
        details: { missing: [...missing], available: [...available] },
    });
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
            details: { reason: "empty-name" },
        });
    }

    if (isCameraViewName(name)) {
        throw new GraphtyError({
            code: "E_PROTECTED",
            message:
                `"${name}" is a camera view, and a view recomputes itself for whatever is on screen. ` +
                "Saving a fixed position under the same name would silently replace a rule with a snapshot.",
            source: "view",
            details: { name },
        });
    }
}

const viewSave: UndoableDefinition<ViewSaveCommand> = {
    op: "view.save",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [...command.views.map((view) => `views/${view.name}`), "viewOrder"],
    undo: {
        kind: "undoable",
        label: (command) =>
            command.views.length === 1
                ? `Saved the view "${command.views[0].name}"`
                : `Saved ${command.views.length} views`,
        fact: (command) => ({ code: "view.save", params: { names: command.views.map((view) => view.name) } }),
    },
    execute: (command, ctx) => {
        for (const view of command.views) {
            assertViewName(view.name);
        }

        const order = [...ctx.state.viewOrder];
        for (const view of command.views) {
            if (!ctx.state.views.has(view.name) && !order.includes(view.name)) {
                order.push(view.name);
            }
            ctx.draft.views.set(view.name, view.camera);
        }
        if (order.length !== ctx.state.viewOrder.length) {
            ctx.draft.viewOrder = order;
        }
    },
};

const viewRemove: UndoableDefinition<ViewRemoveCommand> = {
    op: "view.remove",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [...command.names.map((name) => `views/${name}`), "viewOrder"],
    undo: {
        kind: "undoable",
        label: (command) =>
            command.names.length === 1
                ? `Removed the view "${command.names[0]}"`
                : `Removed ${command.names.length} views`,
        fact: (command) => ({ code: "view.remove", params: { names: [...command.names] } }),
    },
    execute: (command, ctx) => {
        const missing = command.names.filter((name) => !ctx.state.views.has(name));
        if (missing.length > 0) {
            throw unknownView(missing, ctx.state.viewOrder);
        }

        for (const name of command.names) {
            ctx.draft.views.delete(name);
        }
        ctx.draft.viewOrder = ctx.state.viewOrder.filter((name) => !command.names.includes(name));
    },
};

const viewRename: UndoableDefinition<ViewRenameCommand> = {
    op: "view.rename",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [`views/${command.from}`, `views/${command.to}`, "viewOrder", "tours"],
    undo: {
        kind: "undoable",
        fact: (command, state) => ({
            code: "view.rename",
            params: {
                from: command.from,
                to: command.to,
                // The tours whose stops name the view, which the rename rewrites; read before it.
                tours: renameTourStops(state.tours, command.from, command.to).changed,
            },
        }),
    },
    execute: (command, ctx) => {
        const camera = ctx.state.views.get(command.from);
        if (camera === undefined) {
            throw unknownView([command.from], ctx.state.viewOrder);
        }
        if (command.to === command.from) {
            return;
        }
        assertViewName(command.to);
        if (ctx.state.views.has(command.to)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A view is already saved as "${command.to}".`,
                source: "view",
                details: { reason: "name-taken", name: command.to },
            });
        }

        const order = ctx.state.viewOrder.map((name) => (name === command.from ? command.to : name));
        ctx.draft.views.delete(command.from);
        ctx.draft.views.set(command.to, camera);
        ctx.draft.viewOrder = order;
        // Every tour stop naming the view follows it, in the same step.
        const renamed = renameTourStops(ctx.state.tours, command.from, command.to);
        if (renamed.changed.length > 0) {
            ctx.draft.tours = renamed.tours;
        }
    },
};

const viewMove: UndoableDefinition<ViewMoveCommand> = {
    op: "view.move",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => ["viewOrder"],
    undo: {
        kind: "undoable",
        fact: (command) => ({ code: "view.move", params: { name: command.name, index: command.index } }),
    },
    execute: (command, ctx) => {
        if (!ctx.state.views.has(command.name)) {
            throw unknownView([command.name], ctx.state.viewOrder);
        }
        if (!Number.isInteger(command.index)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: "A view's place is a whole number.",
                source: "view",
                details: { option: "index" },
            });
        }

        const order = ctx.state.viewOrder.filter((name) => name !== command.name);
        order.splice(Math.max(0, Math.min(order.length, command.index)), 0, command.name);
        ctx.draft.viewOrder = order;
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
export const VIEW_DEFINITIONS = [viewSave, viewRemove, viewRename, viewMove, viewCamera] as const;
