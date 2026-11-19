import { type GraphSession, isGraphtyError, type NodeId } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration, type PaletteRow } from "../commands/registry";
import { openFilterDraft, PLUS } from "../data-place/filterCards";
import { cameraViewsOn } from "../features";
import { neighborhoodKey } from "../inspector/inspected";
import { framedWords, neighborhoodWords, selectionWords, xrEntryFailureWords } from "../inspector/words";
import { noGraph, nothingDrawn } from "./disabledReasons";
import { togglePopover } from "./popover";
import { cameraViewName, isFixedCamera, tourProblemWords, viewProblemWords } from "./viewWords";

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
 * Why Fit selection cannot run: nothing is selected. The element frames a selected edge's ends.
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
 * The Enter VR and Enter AR commands: disabled, saying only "Not available", when the element
 * gives a reason the mode cannot be entered;
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
                (reason === null ? null : "Not available")
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
 * The name a new view, camera or tour gets: the first "View N" (or "Camera N", "Tour N") not saved
 * yet. The reader's cameras and tours are the element's (`session.views`, `session.tours`), saved
 * with the project.
 * @param saved - the names already saved.
 * @param word - what it is: "View" (Save view), "Camera" or "Tour".
 * @returns the name.
 */
export function nextName(saved: ReadonlyMap<string, unknown>, word: "View" | "Camera" | "Tour"): string {
    let n = 1;
    while (saved.has(`${word} ${String(n)}`)) {
        n += 1;
    }
    return `${word} ${String(n)}`;
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
export function savedViewReason(ctx: CommandContext, name: string): string | null {
    const { session, element } = ctx;
    return (
        nothingDrawn(session) ??
        viewProblemWords(element?.viewProblem(name, { saved: true }) ?? null, isFixedCamera(name, element))
    );
}

/**
 * Flies to a saved camera and remembers it as the last one applied (the Views place marks its card).
 * @param ctx - the command context.
 * @param name - the saved view's name.
 */
export async function goToSavedView(ctx: CommandContext, name: string): Promise<void> {
    const { element, workspace } = ctx;
    workspace.set({ lastView: name });
    await element?.applyCameraView(name, { animate: true });
}

/**
 * The reader's saved cameras as rows, project order, each with its key: each flies there, disabled
 * with the element's reason when it cannot be applied now. Quick actions lists them all; the Camera
 * menu the first twelve.
 * @param ctx - the command context.
 * @returns the rows.
 */
export function savedViewRows(ctx: CommandContext): PaletteRow[] {
    return [...(ctx.session?.views ?? [])].map(([name, view]) => ({
        id: `view.saved:${name}`,
        label: name,
        group: "Cameras",
        keys: view.key === undefined ? undefined : [view.key],
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
        label: `Play tour: ${name}`,
        group: "Video tours",
        keywords: ["tour", "play"],
        disabled: ({ session, element }) =>
            nothingDrawn(session) ?? (element === null ? null : tourProblemWords(element.planTour(name), element)),
        run: async ({ element }) => {
            await element?.playTour(name, { restoreCamera: true });
        },
    }));
}

/** The element's standard 3D views the Camera menu offers, with their keys (tier1-design.md 2.3). */
const STANDARD_VIEWS = [
    { id: "view.front", label: "Front", camera: "frontView", key: "1" },
    { id: "view.side", label: "Side", camera: "sideView", key: "3" },
    { id: "view.top", label: "Top", camera: "topView", key: "7" },
    { id: "view.isometric", label: "Isometric", camera: "isometric" },
] as const;

/**
 * Master's camera commands that the camera-views experiment replaces (the standard views, Save
 * view): with it on they have no door and their keys pass on to the camera keys.
 * @param ctx - the command context.
 * @returns false while the experiment is on.
 */
function withoutCameraViews(ctx: CommandContext): boolean {
    return !cameraViewsOn(ctx.session);
}

/**
 * The Toolbar package's commands (tier1-design.md 2.3): the Camera and Mode menus and what they
 * hold, the legend switch, Quick actions, and Neighborhood for the selection.
 *
 * The camera moves (Fit, Fit selection, zoom) are view state, so they go
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
            keys: ["9"],
            // graphty-element tells no caller whether auto-rotate turns the drawing now (it turns
            // only the 3D view); the 2D check stays until it does (graphty-element defect, issue
            // #8850). Reduced motion is the element's answer.
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
            label: "Focus selected",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                workspace.set((state) => ({ followSelection: !state.followSelection }));
            },
        },
        {
            // Escape while a tour plays, taken from Clear selection, after inner controls had their
            // turn (the key dispatcher gives it to a menu, a list, a dialog or a field first).
            id: "tour.stop",
            label: "Stop tour",
            group: "View",
            whileShownKeys: ["Escape"],
            experiment: true,
            feature: "camera-views",
            shown: ({ session, workspace }) => cameraViewsOn(session) && workspace.get().tourProgress !== null,
            run: ({ element }) => {
                element?.cancelCameraAnimation();
            },
        },
        {
            // Keeps the camera under a name; Camera lists it to go back to. One undoable step.
            id: "view.save",
            label: "Save view",
            group: "View",
            experiment: true,
            shown: withoutCameraViews,
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ element, session, workspace }) => {
                if (element === null || session === null) {
                    return;
                }
                const name = nextName(session.views, "View");
                await session.views.save([{ name, camera: element.getCameraState() }]);
                workspace.set({ announcement: `Saved ${name}` });
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
                await element?.applyCameraView("fitToGraph", { params: { keepAngle: true }, animate: true });
            },
        },
        {
            id: "view.frame-selection",
            label: "Fit selection",
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
        ...STANDARD_VIEWS.map(({ id, label, camera, ...rest }) => ({
            id,
            label,
            group: "View" as const,
            keys: "key" in rest ? [rest.key] : undefined,
            experiment: true,
            shown: withoutCameraViews,
            disabled: ({ session }: CommandContext) =>
                nothingDrawn(session) ?? (session?.layout.dimension === "2d" ? "Only in 3D" : null),
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
    paletteRows: (ctx) => (cameraViewsOn(ctx.session) ? [...savedViewRows(ctx), ...tourRows(ctx)] : []),
});
