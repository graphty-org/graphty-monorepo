import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { findRecovered } from "./autosave/autosave";
import { createRegistry, type WorkspaceRegistration } from "./commands/registry";
import { ExportDialog } from "./export/ExportDialog";
import { HelpDialogs } from "./frame/HelpDialogs";
import { loadedFrame, loadFrame } from "./frameLoader";
import { useCommandKeys } from "./keys/useCommandKeys";
import { ReportDialog } from "./privacy/ReportDialog";
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
    // Once a project's element is up, a project opened from the start screen loads its sample or
    // file.
    useEffect(() => {
        const { session, element: host } = element;
        if (session === null || host === null) {
            return;
        }
        const { opening } = store.get();
        if (opening !== null) {
            store.set({ opening: null });
        }
        if (opening === null) {
            return;
        }
        opening.load(session, host).catch((error: unknown) => {
            const reason = error instanceof Error ? error.message : String(error);
            store.set({ notice: { message: `${opening.name} could not be opened. ${reason}` } });
        });
    }, [element, store]);
    // Work graphty-element kept from an earlier visit is offered on the start screen, once per load.
    useEffect(() => {
        const { autosave, project } = store.get();
        if (!autosave || project !== null) {
            return undefined;
        }
        let live = true;
        findRecovered()
            .then((recovered) => {
                if (live && store.get().project === null) {
                    store.set({ recovered });
                }
            })
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [store]);
    const projectOpen = useStoreValue(store, (state) => state.project !== null);
    // The frame's code, loaded on demand (frameLoader.ts); a project that opens before it has
    // loaded shows once it has.
    const [Frame, setFrame] = useState(loadedFrame);
    useEffect(() => {
        if (projectOpen && Frame === null) {
            void loadFrame().then((loaded) => {
                setFrame(() => loaded);
            });
        }
    }, [projectOpen, Frame]);

    return (
        <WorkspaceContext.Provider value={value}>
            {projectOpen ? null : <StartScreen />}
            {projectOpen && Frame !== null ? <Frame onElementReady={onElementReady} /> : null}
            <HelpDialogs />
            <ExportDialog />
            <SettingsDialog />
            <ReportDialog />
            <ProjectDialogs />
        </WorkspaceContext.Provider>
    );
}
