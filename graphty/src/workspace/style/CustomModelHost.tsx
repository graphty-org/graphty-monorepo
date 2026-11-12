import React from "react";

import { modelName } from "../canvas/models";
import { nodeModelsOn } from "../features";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { CustomModelDialog } from "./CustomModelDialog";
import { CUSTOM_MODEL } from "./words";

/**
 * The Load custom model dialog opened from the Main menu's Custom model..., which has no layer to
 * write to: Add to project only adds the model to the project, where the Models pop-over shows it,
 * and says so in a notice the reader sees.
 * Open while the workspace dialog is "custom-model" and the node-models experiment is on.
 * @returns The dialog, or nothing while closed.
 */
export function CustomModelHost(): React.JSX.Element | null {
    const { store, session } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "custom-model");
    if (!opened || session === null || !nodeModelsOn(session)) {
        return null;
    }
    return (
        <CustomModelDialog
            forLayer={false}
            onAdd={(ref) => {
                store.set({ dialog: null, notice: { message: CUSTOM_MODEL.added(modelName(session, ref)) } });
            }}
            onClose={() => {
                store.set({ dialog: null });
            }}
        />
    );
}
