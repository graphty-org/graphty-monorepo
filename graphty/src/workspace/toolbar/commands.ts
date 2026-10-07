import { type GraphSession, isGraphtyError } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration } from "../commands/registry";
import { neighborhoodKey, resolveInspected } from "../inspector/inspected";
import { xrEntryFailureWords, xrReasonWords } from "../inspector/words";
import { togglePopover } from "./popover";
import { nothingDrawn } from "./useSessionVersion";

/**
 * Why Frame selection and Neighborhood cannot run: they act on a selected node.
 * @param session - the element's session, or null.
 * @returns the reason, or null when a node is selected.
 */
function noNodeSelected(session: GraphSession | null): string | null {
    return nothingDrawn(session) ?? (session?.selection.nodes.length ? null : "Select a node first");
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

/** The element's standard 3D views the View flyout offers, with their keys (tier1-design.md 2.3). */
const STANDARD_VIEWS = [
    { id: "view.front", label: "Front", camera: "frontView", key: "1" },
    { id: "view.side", label: "Side", camera: "sideView", key: "3" },
    { id: "view.top", label: "Top", camera: "topView", key: "7" },
    { id: "view.isometric", label: "Isometric", camera: "isometric" },
] as const;

/**
 * The Toolbar package's commands (tier1-design.md 2.3): the View flyout and what it holds, the
 * legend switch, Quick actions, and Neighborhood and Grow by one hop for the selection.
 *
 * The camera moves (Fit, Frame selection, the standard views, zoom) are view state, so they go
 * through the element's camera methods and record no step; Switch to 2D or 3D is a project change
 * and goes through the session.
 */
export const registration = defineRegistration({
    owner: "toolbar",
    commands: [
        {
            id: "view.open",
            label: "View",
            group: "View",
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                togglePopover(workspace, "view");
            },
        },
        {
            id: "view.legend",
            label: "Legend",
            group: "View",
            keys: ["L"],
            disabled: ({ session }) => nothingDrawn(session),
            run: ({ workspace }) => {
                workspace.set((state) => ({ legendShown: !state.legendShown }));
            },
        },
        {
            id: "view.fit",
            label: "Fit",
            group: "View",
            keys: ["0"],
            disabled: ({ session }) => nothingDrawn(session),
            run: async ({ element }) => {
                await element?.applyCameraView("fitToGraph", { animate: true });
            },
        },
        {
            id: "view.frame-selection",
            label: "Frame selection",
            group: "View",
            keys: ["F"],
            disabled: ({ session }) => noNodeSelected(session),
            run: async ({ element }) => {
                await element?.applyCameraView("fitToGraph", { scope: "selection", animate: true });
            },
        },
        ...STANDARD_VIEWS.map(({ id, label, camera, ...rest }) => ({
            id,
            label,
            group: "View" as const,
            keys: "key" in rest ? [rest.key] : undefined,
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
                await session.selection.apply({ neighborsOf: centers });
                // One node's neighborhood opens in the inspector as a neighborhood, as the
                // inspector's own connections link does.
                if (centers.length === 1) {
                    workspace.set({ inspected: { kind: "neighborhood", id: neighborhoodKey(centers[0]) } });
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
                await session.selection.apply({ nodes: [...new Set(ends)] });
            },
        },
        {
            id: "selection.grow-neighborhood",
            label: "Grow by one hop",
            group: "Selection",
            disabled: ({ session, workspace }) =>
                noNodeSelected(session) ??
                (workspace.get().inspected?.kind === "neighborhood" ? null : "Open a neighborhood first"),
            run: async ({ session, workspace }) => {
                const shown = resolveInspected(workspace.get().inspected, null);
                if (session === null || shown.kind !== "neighborhood") {
                    return;
                }
                await session.selection.apply({ neighborsOf: session.selection.nodes });
                // The selection change closes the open row; the grown selection is the same
                // center's neighborhood, one hop further out.
                workspace.set({ inspected: { kind: "neighborhood", id: neighborhoodKey(shown.node, shown.hops + 1) } });
            },
        },
    ],
});
