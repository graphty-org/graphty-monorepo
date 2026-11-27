/**
 * @file The saved-view ops: `view.save` keeps fixed cameras or followed camera views under names,
 * `view.remove` forgets them, `view.rename` and `view.move` rename and reorder them (a rename
 * rewrites every tour stop naming the view), `view.key` moves a key chord between them,
 * `view.starting` writes the session's starting cameras once into a project, and `view.camera`
 * moves the camera.
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

import { isCameraViewName } from "../../camera/names";
import type { CameraState, Vec3 } from "../../camera/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { Dispatcher, ExemptDefinition, UndoableDefinition } from "../project/Dispatcher";
import type { Draft } from "../project/draft";
import type { ProjectState } from "../project/state";
import type { SavedView, StartingCamera } from "../types";
import { renameTourStops } from "./tour";

/**
 * One view to save: a name, a fixed camera or the camera view it follows, and the parts it keeps
 * beside it, already read from the session.
 */
interface ViewEntry extends Omit<SavedView, "key"> {
    readonly name: string;
    /** Its key chord; absent keeps the key a view already under the name has, null clears it. */
    readonly key?: string | null;
}

/** The parts a saved view can keep beside its camera, in the order `views.open` restores them. */
export const SAVED_VIEW_PARTS = Object.freeze(["filters", "layers", "hidden", "positions", "legend"] as const);

/** `view.save`: keep views under names, replacing any view already under one. */
interface ViewSaveCommand {
    readonly op: "view.save";
    readonly views: readonly ViewEntry[];
}

/** `view.key`: give a saved view a key chord, taking it from any other view; null clears it. */
interface ViewKeyCommand {
    readonly op: "view.key";
    readonly name: string;
    readonly key: string | null;
}

/**
 * `view.starting`: write the starting cameras into the project after its own views, once: a name
 * already saved is skipped, a held key dropped, an unregistered `follows` skipped, and
 * `startingCamerasWritten` set.
 */
interface ViewStartingCommand {
    readonly op: "view.starting";
    readonly views: readonly StartingCamera[];
}

/** `view.remove`: forget saved views. */
interface ViewRemoveCommand {
    readonly op: "view.remove";
    readonly names: readonly string[];
}

/** `view.camera`: move the camera to a named view, to a camera state, or to a position and target. */
interface ViewCameraCommand {
    readonly op: "view.camera";
    /** A camera view or a saved view, by name. Wins over `position` and `target`. */
    readonly preset?: string;
    readonly position?: Vec3;
    readonly target?: Vec3;
    /** A whole camera state, as `setCameraState` takes it. Wins over `position` and `target`; `preset` wins over it. */
    readonly camera?: CameraState;
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
export type ViewCommand =
    | ViewSaveCommand
    | ViewRemoveCommand
    | ViewCameraCommand
    | ViewRenameCommand
    | ViewMoveCommand
    | ViewKeyCommand
    | ViewStartingCommand;

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
    /**
     * A reader of the poses camera views give now for whatever is drawn, as following saved views
     * resolve. The drawing is measured on its first call and shared by every call after, so a save
     * that writes many following views measures every node once.
     * @returns Takes the camera view id; gives the state, or undefined when it cannot be computed
     *     in the drawing mode now.
     */
    poser?(): (follows: string) => CameraState | undefined;
    /**
     * Where the camera is now, as `Graph.getCameraState` reads it: what a save writes.
     * @returns The camera state.
     */
    state?(): CameraState;
}

/**
 * The refusal for a saved view name nothing is saved under.
 * @param missing - The names not saved.
 * @param available - The saved names.
 * @returns The error.
 */
export function unknownView(missing: readonly string[], available: readonly string[]): GraphtyError {
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
function assertViewName(name: string): void {
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

/**
 * Refuse an empty key chord.
 * @param key - The key, or null to clear.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` `{ reason: "empty-key" }`.
 */
function assertKey(key: string | null | undefined): void {
    if (typeof key === "string" && key === "") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "A key chord has something in it; null clears one.",
            source: "view",
            details: { reason: "empty-key" },
        });
    }
}

/**
 * The refusal for a `follows` no camera view answers to.
 * @param name - The id followed.
 * @returns The error.
 */
export function unknownFollowed(name: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_CAMERA",
        message: `No camera view is named "${name}", so no saved view can follow it.`,
        source: "view",
        details: { name },
    });
}

/**
 * Refuse a view to save that is neither or both of a fixed camera and a followed view, or follows
 * a camera view nothing answers to.
 * @param view - The view.
 */
function assertViewEntry(view: ViewEntry): void {
    assertViewName(view.name);
    if (view.camera !== undefined && view.follows !== undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "A saved view is a fixed camera or a camera view it follows, not both.",
            source: "view",
            details: { reason: "conflict", options: ["camera", "follows"] },
        });
    }
    if (view.camera === undefined && view.follows === undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "A saved view needs a camera or a camera view to follow.",
            source: "view",
            details: { reason: "missing-option", options: ["camera", "follows"] },
        });
    }
    if (view.follows !== undefined && !isCameraViewName(view.follows)) {
        throw unknownFollowed(view.follows);
    }
    assertKey(view.key);
    assertParts(view);
}

/**
 * Refuse a kept part of the wrong shape.
 * @param view - The view.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` `{ option }` naming the part.
 */
function assertParts(view: ViewEntry): void {
    const { filters, layers, hidden, positions, legend } = view;
    const wrong =
        (filters !== undefined && !Array.isArray(filters) && "filters") ||
        (layers !== undefined && (typeof layers !== "object" || layers === null) && "layers") ||
        (hidden !== undefined && !Array.isArray(hidden) && "hidden") ||
        (positions !== undefined &&
            !(
                Array.isArray(positions.order) &&
                Array.isArray(positions.xyz) &&
                positions.xyz.length === positions.order.length * 3
            ) &&
            "positions") ||
        (legend !== undefined && typeof legend !== "boolean" && "legend");
    if (wrong !== false) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `A saved view's "${wrong}" is not what that part holds.`,
            source: "view",
            details: { option: wrong },
        });
    }
}

/**
 * A saved view with its key set or cleared.
 * @param view - The view.
 * @param key - The key, or undefined for none.
 * @returns The view.
 */
function withKey(view: SavedView, key: string | undefined): SavedView {
    const { key: _old, ...rest } = view;
    return Object.freeze(key === undefined ? rest : { ...rest, key });
}

/**
 * The names of the views other than `name` that hold one of the keys.
 * @param views - The saved views.
 * @param keys - The keys.
 * @param names - The views that take them.
 * @returns The names that lose a key.
 */
function holdersOf(views: ProjectState["views"], keys: readonly string[], names: readonly string[]): string[] {
    return [...views]
        .filter(([other, view]) => !names.includes(other) && view.key !== undefined && keys.includes(view.key))
        .map(([other]) => other);
}

/**
 * Write into a working copy of the views: `key` on `name`, taken from any other view.
 * @param views - The working copy.
 * @param name - The view taking the key.
 * @param key - The key, or undefined for none.
 */
function giveKey(views: Map<string, SavedView>, name: string, key: string | undefined): void {
    if (key !== undefined) {
        for (const [other, view] of views) {
            if (other !== name && view.key === key) {
                views.set(other, withKey(view, undefined));
            }
        }
    }
    const view = views.get(name);
    if (view !== undefined) {
        views.set(name, withKey(view, key));
    }
}

/**
 * Write the views of a working copy that changed into a draft.
 * @param draft - The draft.
 * @param before - The views before.
 * @param after - The working copy.
 */
function writeChanged(draft: Draft, before: ProjectState["views"], after: ReadonlyMap<string, SavedView>): void {
    for (const [name, view] of after) {
        if (before.get(name) !== view) {
            draft.views.set(name, view);
        }
    }
}

/**
 * The starting cameras a project would get now: none once it has had them; else, in order, each
 * whose name is free and whose `follows` is still registered, with its key unless another view
 * holds it.
 * @param state - Project state.
 * @param list - The starting cameras.
 * @returns The views to append, by name.
 */
export function startingViews(state: ProjectState, list: readonly StartingCamera[]): [string, SavedView][] {
    if (state.config.get("startingCamerasWritten") === true) {
        return [];
    }

    const held = new Set([...state.views.values()].flatMap((view) => (view.key === undefined ? [] : [view.key])));
    const taken = new Set([...state.views.keys(), ...state.viewOrder]);
    const written: [string, SavedView][] = [];
    for (const { name, follows, key } of list) {
        if (typeof name !== "string" || name.trim() === "" || taken.has(name) || isCameraViewName(name)) {
            continue;
        }
        if (!isCameraViewName(follows)) {
            continue;
        }
        const keep = typeof key === "string" && key !== "" && !held.has(key);
        if (keep) {
            held.add(key);
        }
        taken.add(name);
        written.push([name, Object.freeze(keep ? { follows, key } : { follows })]);
    }
    return written;
}

/**
 * Write the starting cameras into a draft: append them, and record that the project has had them.
 * @param state - Project state.
 * @param list - The starting cameras.
 * @param draft - The draft.
 * @returns The names written.
 */
export function writeStartingViews(state: ProjectState, list: readonly StartingCamera[], draft: Draft): string[] {
    if (state.config.get("startingCamerasWritten") === true) {
        return [];
    }

    const written = startingViews(state, list);
    for (const [name, view] of written) {
        draft.views.set(name, view);
    }
    if (written.length > 0) {
        draft.viewOrder = [...state.viewOrder, ...written.map(([name]) => name)];
    }
    draft.config.set("startingCamerasWritten", true);
    return written.map(([name]) => name);
}

/** The starting cameras each session's dispatcher holds: a session option, never saved. */
const STARTING = new WeakMap<Dispatcher, readonly StartingCamera[]>();

/**
 * The starting cameras a session holds.
 * @param dispatcher - The session's dispatcher.
 * @returns The list, or null for none.
 */
export function startingCamerasOf(dispatcher: Dispatcher): readonly StartingCamera[] | null {
    return STARTING.get(dispatcher) ?? null;
}

/**
 * Hold a session's starting cameras, after checking them.
 * @param dispatcher - The session's dispatcher.
 * @param list - The list, or null for none.
 * @returns The list held, frozen.
 * @throws A `GraphtyError` with `E_UNKNOWN_CAMERA` `{ name }` for a `follows` no camera view
 *     answers to, `E_PROTECTED` or `E_BAD_COMMAND` for a name a saved view cannot have, and
 *     `E_BAD_COMMAND` `{ reason: "empty-key" }` for an empty key.
 */
export function holdStartingCameras(
    dispatcher: Dispatcher,
    list: readonly StartingCamera[] | null,
): readonly StartingCamera[] | null {
    if (list === null) {
        STARTING.delete(dispatcher);
        return null;
    }

    for (const entry of list) {
        assertViewName(entry.name);
        if (!isCameraViewName(entry.follows)) {
            throw unknownFollowed(entry.follows);
        }
        assertKey(entry.key);
    }
    const held = Object.freeze(
        list.map(({ name, follows, key }) =>
            Object.freeze(key === undefined ? { name, follows } : { name, follows, key }),
        ),
    );
    STARTING.set(dispatcher, held);
    return held;
}

const viewSave: UndoableDefinition<ViewSaveCommand> = {
    op: "view.save",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command, state) => {
        const names = command.views.map((view) => view.name);
        const keys = command.views.flatMap((view) => (typeof view.key === "string" ? [view.key] : []));
        return [...[...names, ...holdersOf(state.views, keys, names)].map((name) => `views/${name}`), "viewOrder"];
    },
    undo: {
        kind: "undoable",
        fact: (command) => ({ code: "view.save", params: { names: command.views.map((view) => view.name) } }),
    },
    execute: (command, ctx) => {
        for (const view of command.views) {
            assertViewEntry(view);
        }

        const order = [...ctx.state.viewOrder];
        const views = new Map(ctx.state.views);
        for (const view of command.views) {
            if (!views.has(view.name) && !order.includes(view.name)) {
                order.push(view.name);
            }
            const before = views.get(view.name);
            const kept = Object.fromEntries(
                SAVED_VIEW_PARTS.flatMap((part) => (view[part] === undefined ? [] : [[part, view[part]]])),
            );
            const saved: SavedView = {
                ...(view.follows === undefined ? { camera: view.camera } : { follows: view.follows }),
                ...kept,
            };
            views.set(view.name, Object.freeze(saved));
            giveKey(views, view.name, view.key === undefined ? before?.key : (view.key ?? undefined));
        }
        writeChanged(ctx.draft, ctx.state.views, views);
        if (order.length !== ctx.state.viewOrder.length) {
            ctx.draft.viewOrder = order;
        }
    },
};

const viewKey: UndoableDefinition<ViewKeyCommand> = {
    op: "view.key",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command, state) => [
        ...[command.name, ...(command.key === null ? [] : holdersOf(state.views, [command.key], [command.name]))].map(
            (name) => `views/${name}`,
        ),
    ],
    undo: {
        kind: "undoable",
        fact: (command, state) => {
            const from = command.key === null ? [] : holdersOf(state.views, [command.key], [command.name]);
            return {
                code: "view.key",
                // `from` is the view the key was taken from, null when none held it.
                params: { name: command.name, key: command.key, from: from[0] ?? null },
            };
        },
    },
    execute: (command, ctx) => {
        if (!ctx.state.views.has(command.name)) {
            throw unknownView([command.name], ctx.state.viewOrder);
        }
        assertKey(command.key);

        const views = new Map(ctx.state.views);
        giveKey(views, command.name, command.key ?? undefined);
        writeChanged(ctx.draft, ctx.state.views, views);
    },
};

const viewStarting: UndoableDefinition<ViewStartingCommand> = {
    op: "view.starting",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command, state) => [
        ...startingViews(state, command.views).map(([name]) => `views/${name}`),
        "viewOrder",
        "config/startingCamerasWritten",
    ],
    undo: {
        kind: "undoable",
        fact: (command, state) => ({
            code: "view.starting",
            params: { names: startingViews(state, command.views).map(([name]) => name) },
        }),
    },
    execute: (command, ctx) => {
        writeStartingViews(ctx.state, command.views, ctx.draft);
    },
};

const viewRemove: UndoableDefinition<ViewRemoveCommand> = {
    op: "view.remove",
    moves: false,
    lane: { kind: "immediate" },
    keys: (command) => [...command.names.map((name) => `views/${name}`), "viewOrder"],
    undo: {
        kind: "undoable",
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
        const view = ctx.state.views.get(command.from);
        if (view === undefined) {
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
        ctx.draft.views.set(command.to, view);
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
export const VIEW_DEFINITIONS = [
    viewSave,
    viewRemove,
    viewRename,
    viewMove,
    viewKey,
    viewStarting,
    viewCamera,
] as const;
