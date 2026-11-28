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
    // What the reader typed is kept with the workspace, so a reload reopens on it.
    const draft = useWorkspaceState((state) => state.feedbackDraft) ?? undefined;
    return (
        <FeedbackModal
            opened={opened}
            draft={draft}
            onDraftChange={(next) => {
                store.set({ feedbackDraft: next.name + next.email + next.message === "" ? null : next });
            }}
            onClose={() => {
                store.set({ dialog: null });
            }}
        />
    );
}
