import { InlineRename, TooltipShortcut } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Tooltip, UnstyledButton } from "@mantine/core";
import React, { useCallback, useSyncExternalStore } from "react";

import { FilterChip } from "../data-place/Filters";
import { GLYPHS } from "../glyphs";
import { formatKey } from "../keys/keys";
import { PrivacyChip } from "../privacy/PrivacyChip";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { CommandButton } from "./CommandButton";
import { MainMenu } from "./menus";

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
 * The header (tier1-design.md section 2.1): the main menu, the project name (a tap or F2
 * renames it), Undo and Redo, the filter chip while a filter step is on (tier2-design.md
 * section 1), and the privacy chip.
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
                        // The name is part of the project: graphty-element holds it, and renaming
                        // is an undoable step that marks the project unsaved.
                        if (session !== null && trimmed !== "" && trimmed !== name) {
                            session.project.rename(trimmed).catch(() => {
                                store.set({ notice: { message: `The project could not be renamed ${trimmed}.` } });
                            });
                        }
                    }}
                    onCancel={() => {
                        store.set({ renaming: false });
                    }}
                />
            ) : (
                <Tooltip label={<TooltipShortcut label="Rename" shortcut={formatKey("F2")} />}>
                    <UnstyledButton
                        className="ws-project-name"
                        aria-label={`Project: ${name}`}
                        onClick={() => {
                            store.set({ renaming: true });
                        }}
                    >
                        <span className="ws-project-text">{name}</span>
                    </UnstyledButton>
                </Tooltip>
            )}
            <CommandButton id="history.undo" icon={<GLYPHS.undo size={16} aria-hidden />} />
            <CommandButton id="history.redo" icon={<GLYPHS.redo size={16} aria-hidden />} />
            <FilterChip />
            <PrivacyChip />
        </header>
    );
}
