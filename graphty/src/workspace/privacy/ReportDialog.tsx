import type React from "react";

import { FeedbackModal } from "../../components/FeedbackModal";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/**
 * Help > Report a problem: the feedback widget the usage data card lists, open while the
 * workspace dialog is "report".
 * @returns The dialog
 */
export function ReportDialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "report");
    return (
        <FeedbackModal
            opened={opened}
            onClose={() => {
                store.set({ dialog: null });
            }}
        />
    );
}
