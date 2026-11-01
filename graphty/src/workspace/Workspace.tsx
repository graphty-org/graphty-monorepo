import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { VisuallyHidden } from "@mantine/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { findKept, reopenOwn } from "./autosave/autosave";
import { createRegistry, type WorkspaceRegistration } from "./commands/registry";
import { ExportDialog } from "./export/ExportDialog";
import { focusIsLost, focusOpenedGraph, focusOpenedGraphLater, installFocusGuard } from "./frame/focus";
import { HelpDialogs } from "./frame/HelpDialogs";
import { NoticeSlot } from "./frame/NoticeSlot";
import { loadedFrame, loadFrame } from "./frameLoader";
import { useCommandKeys } from "./keys/useCommandKeys";
import { ReportDialog } from "./privacy/ReportDialog";
import { notReadSentence, openingFile } from "./project/actions";
import { ProjectDialogs } from "./project/ProjectDialogs";
import { REGISTRATIONS } from "./registrations";
import { SettingsDialog } from "./settings/SettingsDialog";
import { NetworkDataDialog } from "./start/NetworkDataDialog";
import { useDropToOpen } from "./start/open";
import { SamplesDialog } from "./start/SamplesDialog";
import { StartScreen } from "./start/StartScreen";
import {
    createWorkspaceStore,
    keepPlace,
    useStoreValue,
    type WorkspaceState,
    type WorkspaceStore,
} from "./state/store";
import { makeWorkspaceValue, WorkspaceContext } from "./state/WorkspaceContext";

/** The look a new project gives a pinned node: a thin gray ring. */
const PINNED_LOOK = { color: "#868e96", scale: 1.3, opacity: 1 } as const;

/** Props for Workspace. */
interface WorkspaceProps {
    /** Chrome state to start from: a story's or a test's. */
    initialState?: Partial<WorkspaceState>;
    /** A store made outside, so a story or test can change the chrome state; one is made by default. */
    store?: WorkspaceStore;
    /** The registrations; every package's by default. */
    registrations?: readonly WorkspaceRegistration[];
}

/** The start screen's first way in (Resume, else Open a file), read when focus goes to it. */
const firstDoor = {
    get current(): HTMLElement | null {
        return document.querySelector<HTMLElement>(".ws-land-go, .ws-land-tint");
    },
};

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
    // The project the workspace started with (a story's, a test's) is left as its maker set it.
    const [startProjectId] = useState(() => store.get().project?.id);
    // Set while a just-opened project's sample is read, so focus waits for it.
    const loading = useRef(false);
    // A project opened from the start screen loads its sample or file once its element is up. If
    // the load fails, the project was never really opened: back to the start screen, with the
    // reason staying until it is dismissed.
    useDropToOpen(value);
    useEffect(() => {
        const { opening, project } = store.get();
        const { session, element: host } = element;
        if (session === null || host === null) {
            return;
        }
        // The app's choice for every project it opens (graphty-element's defaults stay neutral):
        // the style tree starts with Everything, Selected, Pinned and Hovered, Everything holds the
        // base look as values a reader edits, a pinned node wears a thin gray ring (under Selected,
        // which wins), and a finished run's layer lands on top, where the reader sees it. Set
        // before anything loads, so the rows are there from the first frame.
        // The app's run limits for selection steps (design/ui/selection-groups/spec.md, section 6):
        // a run that follows hover or edits starts under 50 ms; one above a second waits for Run.
        session.scope.setOptions({ liveMs: 50, askAboveMs: 1000 });
        const defaults =
            project?.id === startProjectId ||
            (session.config.startingRows && session.config.editableBase && session.config.runPlacement === "top")
                ? Promise.resolve()
                : session.config.set({
                      startingRows: true,
                      editableBase: true,
                      runPlacement: "top",
                      pinnedStyle: PINNED_LOOK,
                  });
        if (opening === null) {
            void defaults.catch(() => undefined);
            return;
        }
        store.set({ opening: null });
        loading.current = true;
        // Focus goes to the graph's heading (or where the opening says) once it is read, so its
        // size is heard, unless the reader went somewhere else meanwhile.
        const focusLater = focusOpenedGraphLater(opening.focus);
        defaults
            .then(() => opening.load(session, host))
            // Each load starts the project's history itself (open.ts passes the element's
            // `history: "start"`; a project file or kept work does so on opening).
            .then(() => {
                focusLater(store.get().page === "panels");
                opening.settle();
            })
            .catch((error: unknown) => {
                focusLater(false);
                opening.settle({ error });
                const notice = { message: notReadSentence(opening.name, error, "opened"), error: true };
                store.set((state) =>
                    state.project?.id === project?.id
                        ? { project: null, page: "panels", inspected: null, dialog: null, renaming: false, notice }
                        : { notice },
                );
            });
    }, [element, store, startProjectId]);
    // This tab's own work (a reload, or a tab the browser discarded and loaded again) reopens
    // straight into the workspace; other work graphty-element kept is offered on the start screen.
    // Asked once per load; the start screen waits for the answer, so it never flashes before a reopen.
    const [checking, setChecking] = useState(() => store.get().autosave && store.get().project === null);
    useEffect(() => {
        if (!checking) {
            return undefined;
        }
        let live = true;
        findKept()
            .then(({ own, recovered }) => {
                if (!live || store.get().project !== null) {
                    return;
                }
                if (own === null) {
                    store.set({ recovered });
                } else {
                    reopenOwn(store, own);
                }
            })
            .catch(() => undefined)
            .finally(() => {
                if (live) {
                    setChecking(false);
                }
            });
        return () => {
            live = false;
        };
    }, [store, checking]);
    // The reader's place is kept for a reload of this tab while autosave keeps the work.
    useEffect(() => (store.get().autosave ? keepPlace(store) : undefined), [store]);
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

    const announcement = useStoreValue(store, (state) => state.announcement);
    const announced = useStoreValue(store, (state) => state.announced);
    // A message is spoken as it is written; the reader's next key or press empties the line, so
    // reading the page later (browse mode) never finds an old message. A message the key itself
    // causes is written after this runs, since it listens first.
    useEffect(() => {
        const empty = (): void => {
            if (store.get().announcement !== "") {
                store.set({ announcement: "" });
            }
        };
        globalThis.addEventListener("keydown", empty, true);
        globalThis.addEventListener("pointerdown", empty, true);
        return () => {
            globalThis.removeEventListener("keydown", empty, true);
            globalThis.removeEventListener("pointerdown", empty, true);
        };
    }, [store]);
    // Focus after the control that held it goes away. The project the workspace started with (a
    // story's, a test's) is left alone; every project opened since (a sample, a file, a recent
    // project, New project) hands focus to the open place's list as its element comes up (the
    // style layers), never the drawing's outline. Its element is keyed by project, so this runs
    // once per project. Closing a project hands focus to the start screen's first way in.
    // Focus never falls to the page, on the start screen or in a project: Tab wraps, and a
    // control that goes while it holds focus hands it on (focus.ts).
    useEffect(() => installFocusGuard(), []);
    useEffect(() => {
        // A project that opens on the Data page (New from data...) keeps focus on that page; one
        // with a sample or file to read takes focus once it is read (focusOpenedGraph).
        const { project, page } = store.get();
        const reads = loading.current || openingFile(store);
        loading.current = false;
        if (element.element !== null && project?.id !== startProjectId && page === "panels" && !reads) {
            focusOpenedGraph();
        }
    }, [element, store, startProjectId]);
    const projectWasOpen = useRef(false);
    useEffect(() => {
        if (projectOpen) {
            projectWasOpen.current = true;
        } else if (projectWasOpen.current && focusIsLost()) {
            firstDoor.current?.focus();
        }
    }, [projectOpen]);

    return (
        <WorkspaceContext.Provider value={value}>
            {projectOpen && Frame !== null ? <Frame onElementReady={onElementReady} /> : null}
            {projectOpen || checking ? null : <StartScreen />}
            {/* A failed open lands on the start screen with its reason: the one notice slot, there too. */}
            {projectOpen || checking ? null : <NoticeSlot returnFocus={firstDoor} />}
            <HelpDialogs />
            <ExportDialog />
            <SettingsDialog />
            <ReportDialog />
            <ProjectDialogs />
            {/* The one status line, outside the start screen, the frame and every surface the Data
                page hides, so it is on the page, empty, before anything is written to it and a
                message is spoken once, politely, as it happens. Each write puts in a new text node,
                so the same words written again are spoken again. */}
            <VisuallyHidden role="status" aria-live="polite">
                <span key={announced}>{announcement}</span>
            </VisuallyHidden>
            <SamplesDialog />
            <NetworkDataDialog />
        </WorkspaceContext.Provider>
    );
}
