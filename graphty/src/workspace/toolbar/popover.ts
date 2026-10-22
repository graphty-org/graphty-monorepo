import type { WorkspaceStore } from "../state/store";

/** The toolbar's popovers and menus, by the id they hold in the store's one `dialog` slot. */
export type ToolbarPopover = "analyze" | "path" | "layout" | "view" | "quick-actions";

/**
 * Where focus goes back to when a popover opened by a key or a menu closes, by popover; a popover
 * opened from its own button goes back to that button.
 */
export const openers: Partial<Record<ToolbarPopover, HTMLElement>> = {};

/**
 * Opens a toolbar popover, or closes it when it is the one open. It takes the store's one
 * `dialog` slot, so opening it closes whatever else was open.
 * @param workspace - the workspace store.
 * @param id - the popover.
 */
export function togglePopover(workspace: WorkspaceStore, id: ToolbarPopover): void {
    workspace.set((state) => ({ dialog: state.dialog === id ? null : id }));
}
