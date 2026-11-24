import { InlineRename, TooltipShortcut } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Tooltip, UnstyledButton } from "@mantine/core";
import React, { useMemo, useSyncExternalStore } from "react";

import { BrandLogo } from "../../components/BrandLogo";
import { FilterChip } from "../data-place/Filters";
import { GLYPHS } from "../glyphs";
import { formatKey } from "../keys/keys";
import { RenderCount } from "../renderCount";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { TimeChip } from "../time/TimeChip";
import { CommandButton } from "./CommandButton";
import { historyTip } from "./historyWords";
import { MainMenu } from "./menus";

/**
 * How many history steps in one task re-render the header at once; the rest of a burst re-render
 * it once, on the next task.
 * ponytail: a fixed budget, well under React's 50 nested updates (a step costs about two); make it
 * adaptive only if a burst of other events joins in.
 */
const SYNC_STEPS_PER_TASK = 8;

/**
 * Re-renders the header when the element's undo history changes, so Undo and Redo follow it.
 * Each step re-renders it at once, as the step is reported, so Undo names a step before the call
 * that made it returns. A burst of steps in one task (thirty styles.add calls) re-renders it at
 * once only for the first few and once more on the next task: a sync render per step, beside the
 * other panels' pending ones, made React report "Maximum update depth exceeded" (#8851).
 * @param session - the element's session, or null.
 */
function useHistoryVersion(session: GraphSession | null): void {
    const store = useMemo(() => {
        // What Undo and Redo show, so a step that leaves them as they were (an animation's style
        // update, once a frame, merged into one step) does not draw the header again (#9423).
        const shown = (): string =>
            session === null
                ? ""
                : JSON.stringify([
                      session.canUndo,
                      historyTip(session, true),
                      session.canRedo,
                      historyTip(session, false),
                  ]);
        let seen = "";
        return {
            read: (): string => seen,
            subscribe: (changed: () => void): (() => void) => {
                if (session === null) {
                    return () => undefined;
                }
                let budget = SYNC_STEPS_PER_TASK;
                let later: ReturnType<typeof setTimeout> | undefined;
                const notify = (): void => {
                    seen = shown();
                    changed();
                };
                // A step taken between the render and this subscription (the load's clear) is read here.
                seen = shown();
                const off = session.on("history:changed", () => {
                    if (budget > 0) {
                        budget--;
                        notify();
                    }
                    later ??= setTimeout(() => {
                        later = undefined;
                        budget = SYNC_STEPS_PER_TASK;
                        notify();
                    }, 0);
                });
                return () => {
                    off();
                    clearTimeout(later);
                };
            },
        };
    }, [session]);
    useSyncExternalStore(store.subscribe, store.read);
}

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
    useHistoryVersion(session);

    return (
        <RenderCount id="header">
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
                                store.set((state) => ({
                                    project: state.project && { ...state.project, name: trimmed },
                                }));
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
        </RenderCount>
    );
}
