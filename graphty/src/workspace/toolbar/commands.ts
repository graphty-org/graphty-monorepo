import type { GraphSession } from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration } from "../commands/registry";
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

/** The element's standard 3D views the View flyout offers, with their keys (tier1-design.md 2.3). */
const STANDARD_VIEWS = [
    { id: "view.front", label: "Front", camera: "frontView", key: "1" },
    { id: "view.side", label: "Side", camera: "sideView", key: "3" },
    { id: "view.top", label: "Top", camera: "topView", key: "7" },
    { id: "view.isometric", label: "Isometric", camera: "isometric" },
] as const;

/**
 * The Toolbar package's commands (tier1-design.md 2.3): the View flyout and what it holds, the
 * legend switch, Quick actions and the selection bar's Neighborhood.
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
            run: async ({ session }) => {
                if (session !== null) {
                    await session.selection.apply({ neighborsOf: session.selection.nodes });
                }
            },
        },
    ],
});
