/**
 * @file The layout ops: which layout draws the graph and in how many dimensions, and the two
 * exempt controls beside them.
 *
 * - `layout.set`: choose the layout (a catalogue id, the engine that draws it, its options). One
 *   undoable step.
 * - `view.dimension`: draw in 2D or 3D. One undoable step. The dimension lives in the `layout`
 *   slice and nowhere else: the merged `Styles.config` computes `graph.viewMode` and `graph.twoD`
 *   from it, and the renderer's `layout` hook writes `scene.metadata.twoD` from it.
 * - `layout.transport`: play or pause the layout. Exempt: coordinates while a layout moves are
 *   in-flight computation, and where it comes to rest is sealed into the top step.
 * - `view.immersive`: enter or leave VR or AR. Exempt: a device session, not the document.
 *
 * `layout.set` and `view.dimension` are slot-holding writers (design/undo/undo-design.md section
 * 4.7): they take the arrangement they began from, write the slice, then have the renderer build
 * the engine and spend its pre-steps inside their slot. Cancelled or made obsolete while the
 * pre-steps run, they publish nothing, and the rollback puts the previous layout and the previous
 * coordinates back. See design sections 3.2, 4.7, 6.4 and 11.4.
 */

import { layoutDescriptor, layoutIdForEngine } from "../../catalog/layouts";
import type { LayoutId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { ExemptDefinition, UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import type { LayoutChoice } from "../project/state";

/** `layout.set`: choose the layout that draws the graph. */
export interface LayoutSetCommand {
    readonly op: "layout.set";
    /** The catalogue id, such as `"force"`. A registered engine name is read as the id it serves. */
    readonly id: LayoutId;
    /** The engine that draws it, such as `"d3"`; the catalogue's default engine for `id` when absent. */
    readonly engine?: string;
    /** The engine's options. */
    readonly options?: Readonly<Record<string, unknown>>;
    /** Choices with the same key coalesce while the first waits its turn (the element's property pair). */
    readonly coalesce?: string;
    /** Declared at construction: while the baseline window is open it becomes the baseline. */
    readonly setup?: boolean;
}

/** `view.dimension`: draw the graph in two or three dimensions. */
interface ViewDimensionCommand {
    readonly op: "view.dimension";
    readonly dimension: "2d" | "3d";
    /** Declared at construction: while the baseline window is open it becomes the baseline. */
    readonly setup?: boolean;
}

/** `layout.transport`: let the layout move, or hold it still. */
interface LayoutTransportCommand {
    readonly op: "layout.transport";
    readonly action: "play" | "pause";
}

/** `view.immersive`: enter VR or AR, or leave it with `null`. */
interface ViewImmersiveCommand {
    readonly op: "view.immersive";
    readonly mode: "vr" | "ar" | null;
}

/** Every layout op. */
export type LayoutCommand = LayoutSetCommand | ViewDimensionCommand | LayoutTransportCommand | ViewImmersiveCommand;

/** The renderer's layout, as the layout ops reach it. A session that draws nothing has none. */
export interface LayoutService {
    /**
     * Build or reconfigure the engine for a choice just written, and spend its pre-steps, inside
     * the command's slot: the `layout` hook, run inline.
     * @param choice - The choice, as the slice now holds it.
     * @param signal - Fires when the command is cancelled or made obsolete; the pre-steps then
     *     stop without publishing anything.
     * @returns Settles once the pre-steps have landed.
     */
    apply(choice: LayoutChoice, signal: AbortSignal): Promise<void>;
    /**
     * Play or pause the layout.
     * @param action - Which.
     */
    transport(action: "play" | "pause"): void;
    /**
     * Enter or leave an immersive session.
     * @param mode - VR, AR, or null to leave.
     * @returns Settles once the device session has started or ended; rejects when it cannot.
     */
    immersive(mode: "vr" | "ar" | null): Promise<void>;
}

/** Which layout suits the graph the session holds now: what `data.import` with a recommended layout asks. */
export type LayoutAdvice = () => { readonly id: LayoutId; readonly engine: string } | undefined;

/** The layout a graph is drawn with before one is chosen: the element's own default. */
export const DEFAULT_LAYOUT: LayoutChoice = Object.freeze({
    id: "force",
    engine: "ngraph",
    options: Object.freeze({}),
    dimension: "3d",
});

/**
 * The choice a `layout.set` makes, over the one the slice holds.
 * @param command - The command.
 * @param current - The slice.
 * @returns The new choice, frozen.
 */
function choiceOf(command: LayoutSetCommand, current: LayoutChoice | null): LayoutChoice {
    // 1.x callers name an engine where an id belongs: "ngraph" is the engine behind "force".
    const known = layoutDescriptor(command.id);
    const id = known === undefined ? (layoutIdForEngine(command.id) ?? command.id) : command.id;
    const engine = command.engine ?? known?.engine ?? command.id;

    return Object.freeze({
        id,
        engine,
        options: Object.freeze({ ...command.options }),
        dimension: (current ?? DEFAULT_LAYOUT).dimension,
    });
}

/**
 * Build the engine for a choice just written, when the session draws.
 * @param choice - The choice.
 * @param ctx - The command's context.
 * @returns Settles once the renderer has taken it.
 */
async function applyChoice(choice: LayoutChoice, ctx: UndoableContext): Promise<void> {
    await ctx.services.layout?.apply(choice, ctx.signal);
}

const layoutSet: UndoableDefinition<LayoutSetCommand> = {
    op: "layout.set",
    // Takes the arrangement it began from: the new layout moves every node.
    moves: true,
    draws: true,
    keys: () => ["layout"],
    lane: { kind: "queued", category: "layout-set", coalesce: (command) => command.coalesce ?? null },
    undo: {
        kind: "undoable",
        label: (command) => `Changed the layout to ${choiceOf(command, null).id}`,
    },
    execute: async (command, ctx) => {
        const choice = choiceOf(command, ctx.state.layout);
        ctx.draft.layout = choice;
        await applyChoice(choice, ctx);
    },
};

const viewDimension: UndoableDefinition<ViewDimensionCommand> = {
    op: "view.dimension",
    moves: true,
    draws: true,
    keys: () => ["layout"],
    // Its own category, not `layout-set`: a new layout cancels a pending layout, and must not
    // cancel a pending switch to 2D (see `OperationQueueManager`'s "view-mode" category).
    lane: { kind: "queued", category: "view-mode" },
    undo: {
        kind: "undoable",
        label: (command) => `Switched to ${command.dimension.toUpperCase()}`,
    },
    execute: async (command, ctx) => {
        const current = ctx.state.layout ?? DEFAULT_LAYOUT;
        if (current.dimension === command.dimension) {
            return;
        }

        const choice = Object.freeze({ ...current, dimension: command.dimension });
        ctx.draft.layout = choice;
        await applyChoice(choice, ctx);
    },
};

/**
 * The renderer's layout, or the refusal of a session that draws nothing.
 * @param service - The session's layout service.
 * @param what - What was asked, for the message.
 * @returns It.
 */
function serviceOf(service: LayoutService | undefined, what: string): LayoutService {
    if (service === undefined) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: `This session draws nothing, so it has no layout to ${what}.`,
            source: "layout",
        });
    }

    return service;
}

const layoutTransport: ExemptDefinition<LayoutTransportCommand> = {
    op: "layout.transport",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => [],
    undo: {
        kind: "exempt",
        reason: "A moving layout is in-flight computation; where it comes to rest is sealed into the step on top.",
    },
    execute: (command, ctx) => {
        serviceOf(ctx.services.layout, command.action).transport(command.action);
        return Promise.resolve();
    },
};

const viewImmersive: ExemptDefinition<ViewImmersiveCommand> = {
    op: "view.immersive",
    moves: false,
    lane: { kind: "immediate" },
    keys: () => [],
    undo: { kind: "exempt", reason: "Entering or leaving VR or AR is a device session, not the document." },
    execute: (command, ctx) => serviceOf(ctx.services.layout, "take into VR or AR").immersive(command.mode),
};

/** The layout ops' definitions. */
export const LAYOUT_DEFINITIONS = [layoutSet, viewDimension, layoutTransport, viewImmersive] as const;
