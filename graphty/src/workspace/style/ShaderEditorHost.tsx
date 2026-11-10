import { PopoutManager } from "@graphty/compact-mantine";
import React, { lazy, Suspense } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import type { PasteInit } from "./ShaderEditorDialog";

/** The dialog's own chunk: nothing about shaders is loaded before the menu item is used. */
const ShaderEditorDialog = lazy(() =>
    import("./ShaderEditorDialog").then((module) => ({ default: module.ShaderEditorDialog })),
);

/** The menu opens the dialog with nothing to start from. */
const MENU_INIT: PasteInit = {};

/**
 * The shader editor opened from the Main menu's Add Shader..., which has no list to write to: Add
 * joins the project only. Open while the workspace dialog is "shader-editor".
 * @returns The dialog, or nothing while closed.
 */
export function ShaderEditorHost(): React.JSX.Element | null {
    const { store, session } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "shader-editor");
    if (!opened || session === null) {
        return null;
    }
    return (
        <Suspense fallback={null}>
            <PopoutManager>
                <ShaderEditorDialog
                    session={session}
                    init={MENU_INIT}
                    onClose={() => {
                        store.set({ dialog: null });
                    }}
                />
            </PopoutManager>
        </Suspense>
    );
}
