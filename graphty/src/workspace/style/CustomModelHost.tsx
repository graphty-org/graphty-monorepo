import React from "react";

import { modelName } from "../canvas/models";
import { nodeModelsOn } from "../features";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { CustomModelDialog } from "./CustomModelDialog";
import { CUSTOM_MODEL, failureWords } from "./words";

/**
 * The Load custom model dialog opened from the Main menu's Add custom model..., which has no layer to
 * write to: Add to project adds the model to the project, where the Models pop-over shows it, with
 * the settings chosen in the dialog as its own (one undo step), and says so in a notice.
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
            onAdd={(ref, _settings, refs, saveDefaults) => {
                const name = modelName(session, ref);
                const message = refs.length > 1 ? CUSTOM_MODEL.addedMany(refs.length) : CUSTOM_MODEL.added(name);
                store.set({ dialog: null, notice: { message } });
                // The dialog's settings are the model's own: every layer drawing it starts from them.
                if (saveDefaults !== undefined) {
                    session.transaction(CUSTOM_MODEL.settingsStep(name), saveDefaults).catch((error: unknown) => {
                        store.set({ notice: { message: failureWords("Model settings", "kept", error), error: true } });
                    });
                }
            }}
            onClose={() => {
                store.set({ dialog: null });
            }}
        />
    );
}
