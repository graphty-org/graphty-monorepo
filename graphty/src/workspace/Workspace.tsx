import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createRegistry, type WorkspaceRegistration } from "./commands/registry";
import { ExportDialog } from "./export/ExportDialog";
import { focusIsLost } from "./frame/focus";
import { Frame } from "./frame/Frame";
import { HelpDialogs } from "./frame/HelpDialogs";
import { useCommandKeys } from "./keys/useCommandKeys";
import { ReportDialog } from "./privacy/ReportDialog";
import { notReadSentence } from "./project/actions";
import { ProjectDialogs } from "./project/ProjectDialogs";
import { REGISTRATIONS } from "./registrations";
import { SettingsDialog } from "./settings/SettingsDialog";
import { StartScreen } from "./start/StartScreen";
import { createWorkspaceStore, useStoreValue, type WorkspaceState, type WorkspaceStore } from "./state/store";
import { makeWorkspaceValue, WorkspaceContext } from "./state/WorkspaceContext";

/** Props for Workspace. */
interface WorkspaceProps {
    /** Chrome state to start from: a story's or a test's. */
    initialState?: Partial<WorkspaceState>;
    /** A store made outside, so a story or test can change the chrome state; one is made by default. */
    store?: WorkspaceStore;
    /** The registrations; every package's by default. */
    registrations?: readonly WorkspaceRegistration[];
}

/**
 * The reader's workspace: the new graphty app shell (design/ui/tier1-real-app/tier1-design.md).
 * The start screen while no project is open, else the frame around one graphty-element; the
 * dialogs on top; every command's keys live.
 * @param props - Component props
 * @param props.initialState - Chrome state to start from
 * @param props.store - A store made outside
 * @param props.registrations - The registrations
 * @returns The workspace
 */
export function Workspace({
    initialState,
    store: given,
    registrations = REGISTRATIONS,
}: Readonly<WorkspaceProps>): React.JSX.Element {
    const [store] = useState(() => given ?? createWorkspaceStore(initialState));
    const registry = useMemo(() => createRegistry(registrations), [registrations]);
    const [element, setElement] = useState<{ element: GraphtyElement | null; session: GraphSession | null }>({
        element: null,
        session: null,
    });
    const onElementReady = useCallback((next: GraphtyElement | null, session: GraphSession | null) => {
        setElement({ element: next, session });
    }, []);
    const value = useMemo(
        () => makeWorkspaceValue(store, registry, element.session, element.element),
        [store, registry, element],
    );
    useCommandKeys(value);
    // A project opened from the start screen loads its sample or file once its element is up. If
    // the load fails, the project was never really opened: back to the start screen, with the
    // reason staying until it is dismissed.
    useEffect(() => {
        const { opening, project } = store.get();
        const { session } = element;
        if (opening === null || session === null) {
            return;
        }
        store.set({ opening: null });
        opening.load(session).catch((error: unknown) => {
            const notice = { message: notReadSentence(opening.name, error, "opened"), error: true };
            store.set((state) =>
                state.project?.id === project?.id
                    ? { project: null, page: "panels", inspected: null, dialog: null, renaming: false, notice }
                    : { notice },
            );
        });
    }, [element, store]);
    const projectOpen = useStoreValue(store, (state) => state.project !== null);
    // Focus after the control that held it goes away. The project the workspace started with (a
    // story's, a test's) is left alone; every project opened since (a sample, a file, a recent
    // project, New project) hands focus to its drawing as its element comes up, where the load is
    // announced and keyboard node walking starts. Its element is keyed by project, so this runs
    // once per project. Closing a project hands focus to the start screen's first way in.
    const [startProjectId] = useState(() => store.get().project?.id);
    const startDoor = useRef<HTMLButtonElement>(null);
    const projectWasOpen = useRef(false);
    useEffect(() => {
        if (element.element !== null && store.get().project?.id !== startProjectId) {
            element.element.focus();
        }
    }, [element, store, startProjectId]);
    useEffect(() => {
        if (projectOpen) {
            projectWasOpen.current = true;
        } else if (projectWasOpen.current && focusIsLost()) {
            startDoor.current?.focus();
        }
    }, [projectOpen]);

    return (
        <WorkspaceContext.Provider value={value}>
            {projectOpen ? <Frame onElementReady={onElementReady} /> : <StartScreen openRef={startDoor} />}
            <HelpDialogs />
            <ExportDialog />
            <SettingsDialog />
            <ReportDialog />
            <ProjectDialogs />
        </WorkspaceContext.Provider>
    );
}
