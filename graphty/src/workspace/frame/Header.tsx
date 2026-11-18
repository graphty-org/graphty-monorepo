import { InlineRename, TooltipShortcut } from "@graphty/compact-mantine";
import { Tooltip, UnstyledButton } from "@mantine/core";
import React from "react";

import { BrandLogo } from "../../components/BrandLogo";
import { FilterChip } from "../data-place/Filters";
import { GLYPHS } from "../glyphs";
import { formatKey } from "../keys/keys";
import { useSessionEvents } from "../sessionEvents";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { TimeChip } from "../time/TimeChip";
import { CommandButton } from "./CommandButton";
import { MainMenu } from "./menus";

/** The element's events after which Undo and Redo read its history again. */
const HISTORY_EVENTS = ["history:changed"] as const;

/**
 * The header (tier1-design.md section 2.1): the main menu, the project name (a tap or F2
 * renames it), Undo and Redo, the filter chip while a filter step is on (tier2-design.md
 * section 1), the time chip while a time window is on and, on canary and nightly, the site's name.
 * The autosave state and the privacy chip report state the reader does not act on here, so they sit
 * in the status bar (Frame).
 * @returns The header
 */
export function Header(): React.JSX.Element {
    const { store, session } = useWorkspace();
    const name = useWorkspaceState((state) => state.project?.name ?? "");
    const renaming = useWorkspaceState((state) => state.renaming);
    // An ordinary subscription, not useSyncExternalStore: that forces a sync render per history
    // step, and a burst of edits (thirty styles.add calls) then commits sync renders beside the
    // other panels' pending ones until React reports "Maximum update depth exceeded" (#8851).
    useSessionEvents(session, HISTORY_EVENTS);

    return (
        <header className="ws-header" aria-label="Project">
            <span className="ws-header-mark">
                <BrandLogo variant="mark" height={20} />
            </span>
            <MainMenu />
            {renaming ? (
                <InlineRename
                    value={name}
                    label="Project name"
                    width={240}
                    onCommit={(next) => {
                        const trimmed = next.trim();
                        store.set({ renaming: false });
                        if (trimmed === "" || trimmed === name) {
                            return;
                        }
                        if (session === null) {
                            // No element yet: the name stays the app's until a save hands it over.
                            store.set((state) => ({ project: state.project && { ...state.project, name: trimmed } }));
                            return;
                        }
                        // The name is part of the project: graphty-element holds it, and renaming
                        // is an undoable step that marks the project unsaved. The header shows the
                        // new name once the element publishes it (ProjectDialogs follows
                        // `project:status`), so a refused rename leaves the name the project holds.
                        session.project.rename(trimmed).catch(() => {
                            store.set({ notice: { message: `The project could not be renamed ${trimmed}.` } });
                        });
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
            <CommandButton id="history.undo" icon={<GLYPHS.undo size={16} aria-hidden />} keepsPopouts />
            <CommandButton id="history.redo" icon={<GLYPHS.redo size={16} aria-hidden />} keepsPopouts />
            <FilterChip />
            <TimeChip />
        </header>
    );
}
