import type { WorkspaceStore } from "../state/store";

/** The toolbar's popovers and menus, by the id they hold in the store's one `dialog` slot. */
export type ToolbarPopover = "analyze" | "layout" | "view" | "quick-actions";

/**
 * Opens a toolbar popover, or closes it when it is the one open. It takes the store's one
 * `dialog` slot, so opening it closes whatever else was open.
 * @param workspace - the workspace store.
 * @param id - the popover.
 */
export function togglePopover(workspace: WorkspaceStore, id: ToolbarPopover): void {
    workspace.set((state) => ({ dialog: state.dialog === id ? null : id }));
}
