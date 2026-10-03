import { InlineRename } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Redo2, Undo2 } from "lucide-react";
import React, { useCallback, useSyncExternalStore } from "react";

import { PrivacyChip } from "../privacy/PrivacyChip";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { CommandButton } from "./CommandButton";
import { MainMenu, ProjectMenu } from "./menus";

/**
 * Re-renders on every change of the element's undo history, so Undo and Redo follow it.
 * @param session - the element's session, or null.
 */
function useHistoryVersion(session: GraphSession | null): void {
    const subscribe = useCallback(
        (changed: () => void) => session?.on("history:changed", changed) ?? (() => undefined),
        [session],
    );
    useSyncExternalStore(subscribe, () => session?.history.version ?? -1);
}

/**
 * The header (tier1-design.md section 2.1): main menu, project name with its menu (double-click
 * or F2 renames), Undo and Redo, and the privacy chip.
 * @returns The header
 */
export function Header(): React.JSX.Element {
    const { store, session } = useWorkspace();
    const name = useWorkspaceState((state) => state.project?.name ?? "");
    const renaming = useWorkspaceState((state) => state.renaming);
    useHistoryVersion(session);

    return (
        <header className="ws-header" aria-label="Project">
            <MainMenu />
            {renaming ? (
                <InlineRename
                    value={name}
                    label="Project name"
                    width={240}
                    onCommit={(next) => {
                        const trimmed = next.trim();
                        store.set((state) => ({
                            renaming: false,
                            project:
                                state.project && trimmed !== "" ? { ...state.project, name: trimmed } : state.project,
                        }));
                    }}
                    onCancel={() => {
                        store.set({ renaming: false });
                    }}
                />
            ) : (
                <ProjectMenu
                    name={name}
                    onDoubleClick={() => {
                        store.set({ renaming: true });
                    }}
                />
            )}
            <CommandButton id="history.undo" icon={<Undo2 size={16} aria-hidden />} />
            <CommandButton id="history.redo" icon={<Redo2 size={16} aria-hidden />} />
            <PrivacyChip />
        </header>
    );
}
