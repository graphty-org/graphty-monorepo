import { type GraphSession, isGraphtyError, type NodeId } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration, type PaletteRow } from "../commands/registry";
import { openFilterDraft, PLUS } from "../data-place/filterCards";
import { neighborhoodKey } from "../inspector/inspected";
import { framedWords, neighborhoodWords, selectionWords, xrEntryFailureWords, xrReasonWords } from "../inspector/words";
import { noGraph, nothingDrawn } from "./disabledReasons";
import { togglePopover } from "./popover";
import { cameraViewName, tourProblemWords, viewProblemWords } from "./viewWords";

/**
 * Why Neighborhood cannot run: it acts on a selected node.
 * @param session - the element's session, or null.
 * @returns the reason, or null when a node is selected.
 */
function noNodeSelected(session: GraphSession | null): string | null {
    return nothingDrawn(session) ?? (session?.selection.nodes.length ? null : "Select a node first");
}

/**
 * How far out a node's neighbor list opens: the reach of an on "Filter to neighbors" card on that
 * node, so the list shows what the drawing keeps; one hop when no such card is on.
 * @param session - the element's session.
 * @param center - the node at the center.
 * @returns the hop count.
 */
function filteredReach(session: GraphSession, center: NodeId): number {
    const step = session.visibility.conditions.find(
        (s) =>
            s.on &&
            s.effect === "keep" &&
            s.rule.kind === "neighborhood" &&
            s.rule.seeds.length === 1 &&
            s.rule.seeds[0] === center,
    );
    const depth = step?.rule.kind === "neighborhood" ? step.rule.depth : 1;
    // A card at depth 0 keeps the center alone; the list still reaches one hop.
    return Math.max(depth, 1);
}

/**
 * Why Frame selection cannot run: nothing is selected. The element frames a selected edge's ends.
 * @param session - the element's session, or null.
 * @returns the reason, or null when a node or an edge is selected.
 */
function nothingSelected(session: GraphSession | null): string | null {
    return (
        nothingDrawn(session) ??
        (session?.selection.nodes.length || session?.selection.edges.length ? null : "Select something first")
    );
}

/**
 * The immersive session the element is presenting, from its device facts.
 * @param session - the element's session, or null.
 * @returns VR, AR, or null.
 */
export function immersiveMode(session: GraphSession | null): "vr" | "ar" | null {
    return session?.capabilities.xr.active ?? null;
}

/**
 * The Enter VR and Enter AR commands: disabled with the element's reason in the app's words;
 * running one asks the element for the session (from 2D it switches to 3D in the same step), and
 * a refusal becomes a notice.
 * @param mode - VR or AR.
 * @returns the command.
 */
function enterImmersive(mode: "vr" | "ar"): {
    id: string;
    label: string;
    group: "View";
    disabled: (ctx: CommandContext) => string | null;
    run: (ctx: CommandContext) => Promise<void>;
} {
    return {
        id: `view.enter-${mode}`,
        label: `Enter ${mode.toUpperCase()}`,
        group: "View",
        disabled: ({ session }) => {
            const reason = session?.capabilities.xr.reasons[mode] ?? null;
            const active = immersiveMode(session);
            return (
                nothingDrawn(session) ??
                (active === null ? null : `Already in ${active.toUpperCase()}`) ??
                (reason === null ? null : xrReasonWords(reason, mode))
            );
        },
        run: async ({ session, workspace }) => {
            try {
                await session?.execute({ op: "view.immersive", mode });
            } catch (error) {
                workspace.set({
                    notice: {
                        message: xrEntryFailureWords(mode, isGraphtyError(error) ? error.code : undefined),
                        error: true,
                    },
                });
            }
        },
    };
}

/**
 * The name Save view gives the camera: the first "View N" not saved yet. The reader's views are
 * the element's (`session.views`), saved with the project.
 * @param saved - the names already saved.
 * @returns the name.
 */
function nextViewName(saved: ReadonlyMap<string, unknown>): string {
    let n = 1;
    while (saved.has(`View ${String(n)}`)) {
        n += 1;
    }
    return `View ${String(n)}`;
}

/**
 * Why a camera view cannot be applied now: nothing drawn, else the element's `viewProblem`, worded.
 * @param ctx - the command context.
 * @param id - the camera view id.
 * @returns the reason, or null.
 */
function cameraViewReason(ctx: CommandContext, id: string): string | null {
    const { session, element } = ctx;
    return nothingDrawn(session) ?? viewProblemWords(element?.viewProblem(id) ?? null);
}

/**
 * Why a saved view cannot be applied now: the element's judgment of the saved view itself, worded.
 * @param ctx - the command context.
 * @param name - the saved view's name.
 * @returns the reason, or null.
 */
function savedViewReason(ctx: CommandContext, name: string): string | null {
    const { session, element } = ctx;
    return nothingDrawn(session) ?? viewProblemWords(element?.viewProblem(name, { saved: true }) ?? null, true);
}

/**
 * Flies to a saved view and remembers it as where `[` and `]` step from.
 * @param ctx - the command context.
 * @param name - the saved view's name.
 */
async function goToSavedView(ctx: CommandContext, name: string): Promise<void> {
    const { element, workspace } = ctx;
    workspace.set({ lastView: name });
    await element?.applyCameraView(name, { animate: true });
}

/**
 * The saved view `[` (back) or `]` (on) goes to: the next usable one in project order after the
 * last one applied, or the first (last, going back) when none was applied or it is gone. No wrap.
 * @param ctx - the command context.
 * @param back - true for Previous view.
 * @returns the view's name, or why there is none.
 */
function stepView(ctx: CommandContext, back: boolean): { name: string } | { reason: string } {
    const names = [...(ctx.session?.views.keys() ?? [])];
    if (names.length === 0) {
        return { reason: "No saved views" };
    }
    const at = names.indexOf(ctx.workspace.get().lastView ?? "");
    const order = back ? names.slice(0, at === -1 ? names.length : at).reverse() : names.slice(at + 1);
    const name = order.find((each) => savedViewReason(ctx, each) === null);
    return name === undefined ? { reason: back ? "At the first view" : "At the last view" } : { name };
}

/**
 * The Previous view and Next view commands.
 * @param back - true for Previous view.
 * @returns the command.
 */
function stepCommand(back: boolean): {
    id: string;
    label: string;
    group: "View";
    keys: string[];
    disabled: (ctx: CommandContext) => string | null;
    run: (ctx: CommandContext) => Promise<void>;
} {
    return {
        id: back ? "view.previous" : "view.next",
        label: back ? "Previous view" : "Next view",
        group: "View",
        keys: [back ? "[" : "]"],
        disabled: (ctx) => {
            const step = stepView(ctx, back);
            return nothingDrawn(ctx.session) ?? ("reason" in step ? step.reason : null);
        },
        run: async (ctx) => {
            const step = stepView(ctx, back);
            if ("name" in step) {
                await goToSavedView(ctx, step.name);
            }
        },
    };
}

/**
 * The reader's saved views as rows, project order: each flies there, disabled with the element's
 * reason when it cannot be applied now. Quick actions lists them all; the Camera menu the first ten.
 * @param ctx - the command context.
 * @returns the rows.
 */
export function savedViewRows(ctx: CommandContext): PaletteRow[] {
    return [...(ctx.session?.views.keys() ?? [])].map((name) => ({
        id: `view.saved:${name}`,
        label: name,
        group: "Saved views",
        keywords: ["view", "camera"],
        disabled: (each) => savedViewReason(each, name),
        run: (each) => goToSavedView(each, name),
    }));
}

/**
 * The project's tours as rows: each plays the tour and puts the camera back when it finishes,
 * disabled with the element's reason (`planTour`) when it cannot play.
 * @param ctx - the command context.
 * @returns the rows.
 */
export function tourRows(ctx: CommandContext): PaletteRow[] {
    return [...(ctx.session?.tours.keys() ?? [])].map((name) => ({
        id: `tour.play:${name}`,
        label: name,
        group: "Play tour",
        keywords: ["tour", "play"],
        disabled: ({ session, element }) =>
            nothingDrawn(session) ?? (element === null ? null : tourProblemWords(element.planTour(name))),
        run: async ({ element }) => {
            await element?.playTour(name, { restoreCamera: true });
        },
    }));
}

/** The element's standard 3D views the Camera menu offers, with their keys (tier1-design.md 2.3). */
const STANDARD_VIEWS = [
    { id: "view.front", camera: "frontView", key: "1" },
    { id: "view.side", camera: "sideView", key: "3" },
    { id: "view.top", camera: "topView", key: "7" },
    { id: "view.isometric", camera: "isometric" },
] as const;

/**
 * The Toolbar package's commands (tier1-design.md 2.3): the Camera and Mode menus and what they
 * hold, the legend switch, Quick actions, and Neighborhood for the selection.
 *
 * The camera moves (Fit, Frame selection, the standard views, zoom) are view state, so they go
 * through the element's camera methods and record no step, as Auto-rotate (a view preference)
 * does; Switch to 2D or 3D is a project change
 * and goes through the session.
 */
export const registration = defineRegistration({
    owner: "toolbar",
    commands: [
        {
            // The Mode tool: 2D, 3D, VR, AR.
            id: "view.open",
            label: "Mode",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                togglePopover(workspace, "view");
            },
        },
        {
            id: "view.camera",
            label: "Camera",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                togglePopover(workspace, "camera");
            },
        },
        {
            id: "view.auto-rotate",
            label: "Auto-rotate",
            group: "View",
            // graphty-element tells no caller whether auto-rotate turns the drawing now (it turns
            // only the 3D view); the 2D check stays until it does (design/ui/camera-views-tours-
            // and-capture.md, section 10). Reduced motion is the element's answer.
            disabled: ({ session, element }) =>
                nothingDrawn(session) ??
                (session?.layout.dimension === "2d" ? "Only in 3D" : null) ??
                (element?.isMotionReduced() === true ? "Reduced motion is on" : null),
            run: ({ workspace }) => {
                workspace.set((state) => ({ autoRotate: !state.autoRotate }));
            },
        },
        {
            id: "view.follow-selection",
            label: "Follow selection",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                workspace.set((state) => ({ followSelection: !state.followSelection }));
            },
        },
        {
            // Keeps the camera under a name; Camera lists it to go back to. One undoable step: the
            // element saves the camera on screen.
            id: "view.save",
            label: "Save view",
            group: "View",
            keys: ["V"],
            // The element refuses to save while immersive: the headset's camera is no 2D or 3D state.
            disabled: ({ session }) => {
                const active = immersiveMode(session);
                return nothingDrawn(session) ?? (active === null ? null : `Not in ${active.toUpperCase()}`);
            },
            run: async ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                const name = nextViewName(session.views);
                await session.views.save([{ name }]);
                workspace.set({ announcement: `Saved ${name}` });
            },
        },
        stepCommand(true),
        stepCommand(false),
        {
            // Escape while a tour plays, taken from Clear selection, after inner controls had their
            // turn (the key dispatcher gives it to a menu, a list, a dialog or a field first).
            id: "tour.stop",
            label: "Stop tour",
            group: "View",
            whileShownKeys: ["Escape"],
            shown: ({ workspace }) => workspace.get().tourProgress !== null,
            run: ({ element }) => {
                element?.cancelCameraAnimation();
            },
        },
        {
            id: "view.legend",
            label: "Legend",
            group: "View",
            keys: ["L"],
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                // The toggle reads pressed while a key is drawn or the reader asked for it, so a
                // press while it reads unpressed turns the key on, as the button says it will.
                workspace.set((state) => {
                    const on = state.legendShown && (state.keyHasEntries || state.legendAsked);
                    return { legendShown: !on, legendAsked: !on };
                });
            },
        },
        {
            id: "view.fit",
            label: cameraViewName("fitToGraph"),
            group: "View",
            keys: ["0"],
            disabled: (ctx) => cameraViewReason(ctx, "fitToGraph"),
            run: async ({ element }) => {
                await element?.applyCameraView("fitToGraph", { animate: true });
            },
        },
        {
            id: "view.frame-selection",
            label: "Frame selection",
            group: "View",
            keys: ["F"],
            disabled: ({ session }) => nothingSelected(session),
            run: async ({ element, session, workspace }) => {
                // Keep the angle the reader looks from: framing moves the target and the distance only.
                await element?.applyCameraView("fitToGraph", {
                    scope: "selection",
                    params: { keepAngle: true },
                    animate: true,
                });
                // The camera moving is seen, never heard, so what it framed is said.
                if (session !== null) {
                    workspace.set({ announcement: framedWords(session) });
                }
            },
        },
        ...STANDARD_VIEWS.map(({ id, camera, ...rest }) => ({
            id,
            label: cameraViewName(camera),
            group: "View" as const,
            keys: "key" in rest ? [rest.key] : undefined,
            disabled: (ctx: CommandContext) => cameraViewReason(ctx, camera),
            run: async ({ element }: CommandContext) => {
                await element?.applyCameraView(camera, { animate: true });
            },
        })),
        {
            id: "view.zoom-in",
            label: "Zoom in",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ element }) => {
                await element?.zoomStep("in");
            },
        },
        {
            id: "view.zoom-out",
            label: "Zoom out",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ element }) => {
                await element?.zoomStep("out");
            },
        },
        {
            id: "view.toggle-dimension",
            label: "Switch between 2D and 3D",
            group: "View",
            keys: ["5"],
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ session }) => {
                await session?.layout.setDimension(session.layout.dimension === "3d" ? "2d" : "3d");
            },
        },
        {
            id: "view.mode-2d",
            label: "Switch to 2D",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ session }) => {
                await session?.layout.setDimension("2d");
            },
        },
        {
            id: "view.mode-3d",
            label: "Switch to 3D",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ session }) => {
                if (immersiveMode(session) !== null) {
                    await session?.execute({ op: "view.immersive", mode: null });
                    return;
                }
                await session?.layout.setDimension("3d");
            },
        },
        enterImmersive("vr"),
        enterImmersive("ar"),
        {
            id: "view.exit-xr",
            label: "Exit VR or AR",
            group: "View",
            disabled: ({ session }) => (immersiveMode(session) === null ? "Not in VR or AR" : null),
            run: async ({ session }) => {
                await session?.execute({ op: "view.immersive", mode: null });
            },
        },
        {
            // A way to Filters from the canvas: the Data place, its "+" list open.
            id: "filters.open",
            label: "Filters",
            group: "Data",
            disabled: ({ session }) => noGraph(session),
            run: ({ workspace }) => {
                openFilterDraft(workspace, PLUS);
            },
        },
        {
            id: "quick-actions.open",
            label: "Quick actions",
            group: "Settings and help",
            keys: ["Mod+K"],
            run: ({ workspace }) => {
                togglePopover(workspace, "quick-actions");
            },
        },
        {
            id: "selection.neighborhood",
            label: "Neighborhood",
            group: "Selection",
            keys: ["G"],
            disabled: ({ session }) => noNodeSelected(session),
            run: async ({ session, workspace }) => {
                if (session === null) {
                    return;
                }
                const centers = session.selection.nodes;
                const depth = centers.length === 1 ? filteredReach(session, centers[0]) : 1;
                await session.selection.apply({ neighborsOf: centers, depth }, "replace", { cause: "user" });
                // The selection changed under the reader, so the change is said: "Ava and 14
                // connections" for one center, the selection's size for several.
                const { nodes } = session.selection;
                // One node's neighborhood opens in the inspector as a neighborhood, as the
                // inspector's own connections link does, at the reach its filter keeps.
                if (centers.length === 1) {
                    const [center] = centers;
                    workspace.set({
                        inspected: { kind: "neighborhood", id: neighborhoodKey(center, depth) },
                        announcement: neighborhoodWords(
                            session.data.nodeName(center).name,
                            nodes.filter((node) => node !== center).length,
                            depth,
                        ),
                    });
                } else {
                    workspace.set({ announcement: selectionWords(nodes.length, 0) });
                }
            },
        },
        {
            id: "selection.endpoints",
            label: "Select endpoints",
            group: "Selection",
            disabled: ({ session }) =>
                nothingDrawn(session) ?? (session?.selection.edges.length ? null : "Select an edge first"),
            run: async ({ session }) => {
                if (session === null) {
                    return;
                }
                const ends = session.selection.edges.flatMap((id) => {
                    const edge = session.data.edge(id);
                    return edge === undefined ? [] : [edge.source, edge.target];
                });
                await session.selection.apply({ nodes: [...new Set(ends)] }, "replace", { cause: "user" });
            },
        },
    ],
    paletteRows: (ctx) => [...savedViewRows(ctx), ...tourRows(ctx)],
});
