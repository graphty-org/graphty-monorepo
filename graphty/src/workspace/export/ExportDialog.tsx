import "./export.css";

import { PageList } from "@graphty/compact-mantine";
import { Modal, Text } from "@mantine/core";
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import type { WorkspaceState, WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { CameraImageOutput } from "./CameraImageOutput";
import {
    type CameraImageChoices,
    type DataChoices,
    EXPORT_START,
    type ExportDraft,
    type OutputId,
    type RecentExport,
    type TourVideoChoices,
} from "./choices";
import { DataOutput } from "./DataOutput";
import { DocumentOutput } from "./DocumentOutput";
import { TourVideoOutput } from "./TourVideoOutput";

/** The Report's own chunk: its table and notes words are loaded when Report is chosen, not with the start page. */
const ReportOutput = lazy(() => import("./ReportOutput").then((module) => ({ default: module.ReportOutput })));

/** The outputs Export... lists, in the list's order. Video is a tour's own Export. */
const OUTPUTS: readonly { id: OutputId; name: string }[] = [
    { id: "data", name: "Data" },
    { id: "image", name: "Image" },
    { id: "report", name: "Report" },
    { id: "styles", name: "Styles" },
    { id: "recipe", name: "Recipe" },
    { id: "project", name: "Project" },
];

/** How many files Recent lists. */
const RECENT_MAX = 5;

/** A setter of one part of the kept draft: it takes a value, or a change to the value. */
type DraftSetter<K extends keyof ExportDraft> = (
    next: ExportDraft[K] | ((now: ExportDraft[K]) => ExportDraft[K]),
) => void;

/**
 * The setters of each part of the workspace's kept exportDraft.
 * @param store - the workspace store.
 * @returns a setter per part.
 */
function draftSetters(store: WorkspaceStore): { readonly [K in keyof ExportDraft]: DraftSetter<K> } {
    const keep =
        <K extends keyof ExportDraft>(key: K): DraftSetter<K> =>
        (next) => {
            store.set((state) => {
                const now = state.exportDraft ?? EXPORT_START;
                const value = typeof next === "function" ? next(now[key]) : next;
                return { exportDraft: { ...now, [key]: value } };
            });
        };
    return {
        output: keep("output"),
        cameraImage: keep("cameraImage"),
        tourVideo: keep("tourVideo"),
        data: keep("data"),
        report: keep("report"),
        recent: keep("recent"),
        opening: keep("opening"),
    };
}

/**
 * Closes the dialog: the next opening sets it up again.
 * @param state - the workspace state.
 * @returns the change.
 */
function closed(state: WorkspaceState): Partial<WorkspaceState> {
    return { dialog: null, exportDraft: state.exportDraft && { ...state.exportDraft, opening: null } };
}

/**
 * The app's one Export dialog: Image (`captureScreenshot`), Video (`captureAnimation`), Data
 * (`exportGraph` with a format, scope and columns), Report (a Markdown write-up of the
 * graph's notes, data issues, runs and tables, with the reader's summary and findings), Styles (`styles.toFile`), Recipe
 * (`session.recipe`) and Project (`downloadProject`), with the files exported in this visit under
 * Recent, each opening its output again with the choices it was made with. Open while the
 * workspace dialog is "export"; it opens on Image or Video as the store's `exportOn` says (Video with
 * the tour `exportTour` names, for a tour's Record...), or on Data with CSV and the table the store's
 * `exportOn` names (whenever a table is showing), scoped to the whole graph, or to the source `exportSource`
 * names for a Sources row's Export... (that opening only), and keeps each output's choices while the workspace is mounted.
 * Video is not listed: a tour's Export video... opens the dialog on it alone, and a camera's
 * Export image... (`exportView`) on Image alone.
 * @returns The dialog
 */
export function ExportDialog(): React.JSX.Element {
    const { store, session, element } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "export");
    const exportOn = useWorkspaceState((state) => state.exportOn);
    const exportSource = useWorkspaceState((state) => state.exportSource);
    const exportTour = useWorkspaceState((state) => state.exportTour);
    const exportView = useWorkspaceState((state) => state.exportView);
    // on reload: fresh: in flight: a video recording, which a reload ends
    const [recording, setRecording] = useState(false);
    // The output and every output's choices live in the workspace's kept exportDraft, so a reload
    // reopens the dialog on what the reader picked and typed.
    const draft = useWorkspaceState((state) => state.exportDraft) ?? EXPORT_START;
    const { output, cameraImage, tourVideo, data, report, recent } = draft;
    const set = useMemo(() => draftSetters(store), [store]);
    useEffect(() => {
        if (!opened) {
            return;
        }
        // Each opening sets the dialog up once. A dialog a reload reopens was set up for its
        // opening already: the kept draft names it.
        const opening = JSON.stringify([exportOn, exportSource, exportTour, exportView]);
        if (store.get().exportDraft?.opening === opening) {
            return;
        }
        set.opening(opening);
        // Every opening writes the whole graph, but a source row's own Export..., which writes
        // that source's records for this opening only (when there is more than one to tell apart).
        const several = (session?.data.sources().length ?? 0) > 1;
        const scope: DataChoices["scope"] = exportSource !== null && several ? `source:${exportSource}` : "all";
        if (exportOn === "image" || exportOn === "video") {
            set.output(exportOn);
            if (exportOn === "video" && exportTour !== null) {
                // A tour's Export video...: Video with that tour chosen.
                set.tourVideo((choices) => ({ ...choices, camera: "tour", tour: exportTour }));
            }
            if (exportOn === "image" && exportView !== null) {
                // A camera's Export image...: Image from that camera.
                set.cameraImage((choices) => ({ ...choices, view: exportView }));
            }
            set.data((choices) => ({ ...choices, scope }));
        } else {
            set.output("data");
            // A table is showing, or a source row asked: the plain CSV of the table.
            set.data((choices) => ({
                ...choices,
                format: "csv",
                variant: "csv",
                values: { ...choices.values, table: exportOn },
                scope,
            }));
        }
    }, [opened, exportOn, exportSource, exportTour, exportView, session, store, set]);

    const close = (): void => {
        store.set(closed);
    };
    // While a video records, Escape and the close button stop it and the dialog stays open; the
    // next one closes it.
    const closeOrStop = (): void => {
        if (recording) {
            element?.cancelAnimationCapture();
        } else {
            close();
        }
    };
    // A recording flies each flight as authored; when motion is reduced an opaque overlay covers
    // the moving canvas.
    const covered = recording && element?.isMotionReduced() === true;

    /**
     * Closes with a notice and, for a file, lists it first under Recent with this output's choices.
     * @param message - the notice.
     * @param file - the file's name, when a file was saved.
     */
    // on reload: fresh: pointer: a settings popover opened for a look
    const [settingsOpen, setSettingsOpen] = useState(false);
    // A press outside closes the settings on its way down, so the click it ends in is judged by what
    // was open when it began: one click on the backdrop closes the settings alone.
    const settingsAtPress = useRef(false);
    // The choices as they are when a file is done, not as they were when its output last drew: a
    // recording names its tour as it starts and ends seconds later.
    const latest = useRef<{ image: RecentExport["choices"]; video: RecentExport["choices"]; data: DataChoices }>({
        image: cameraImage,
        video: tourVideo,
        data,
    });
    latest.current = { image: cameraImage, video: tourVideo, data };
    const done = (message: string, file?: string): void => {
        if (file !== undefined) {
            const choices = latest.current[output as "image" | "video" | "data"];
            set.recent((list) =>
                [{ output, name: file, choices }, ...list.filter((entry) => entry.name !== file)].slice(0, RECENT_MAX),
            );
        }
        store.set((state) => ({ ...closed(state), notice: { message } }));
    };

    const reopen = (index: number): void => {
        const entry = recent[index];
        set.output(entry.output);
        if (entry.output === "image") {
            set.cameraImage(entry.choices as CameraImageChoices);
        } else if (entry.output === "video") {
            set.tourVideo(entry.choices as TourVideoChoices);
        } else if (entry.output === "data") {
            set.data(entry.choices as DataChoices);
        }
    };

    // A camera's Export image... and a tour's Export video... open the dialog on that output
    // alone; the generic Export lists the rest, Image among them.
    const single = exportOn === "image" || exportOn === "video";
    const recentShown = recent
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.output !== "video");
    let title = "Export";
    if (single) {
        title = output === "image" ? "Export image" : "Export video";
    }

    const body = (() => {
        switch (output) {
            case "image":
                return (
                    <CameraImageOutput
                        choices={cameraImage}
                        onChange={set.cameraImage}
                        onCancel={close}
                        onDone={done}
                        heading={!single}
                    />
                );
            case "video":
                return (
                    <TourVideoOutput
                        choices={tourVideo}
                        onChange={set.tourVideo}
                        onCancel={close}
                        onDone={done}
                        onRecording={setRecording}
                    />
                );
            case "data":
                return (
                    <DataOutput
                        choices={data}
                        onChange={set.data}
                        onCancel={close}
                        onSettingsOpen={setSettingsOpen}
                        onDone={done}
                    />
                );
            case "report":
                return (
                    <Suspense fallback={null}>
                        <ReportOutput choices={report} onChange={set.report} onCancel={close} onDone={done} />
                    </Suspense>
                );
            default:
                return <DocumentOutput key={output} kind={output} onCancel={close} onDone={done} />;
        }
    })();

    return (
        <Modal
            opened={opened}
            onClose={closeOrStop}
            // Mantine's modal sees Escape before anything inside it: a settings popover closes alone.
            closeOnEscape={!settingsOpen}
            closeOnClickOutside={false}
            overlayProps={{
                ...(covered ? { backgroundOpacity: 1, color: "var(--mantine-color-body)" } : {}),
                onPointerDown: () => {
                    settingsAtPress.current = settingsOpen;
                },
                onClick: () => {
                    // Closing under a recording cancels it (the Video output does on closing).
                    if (!settingsAtPress.current) {
                        close();
                    }
                },
            }}
            title={title}
            size="lg"
            classNames={{ body: single ? "ws-export-single" : "ws-dialog-columns ws-export-body" }}
        >
            {single ? null : (
                <div className="ws-export-list">
                    <PageList
                        items={OUTPUTS}
                        current={output}
                        label="What to export"
                        onCurrentChange={(id) => {
                            set.output(id as OutputId);
                        }}
                    />
                    {recentShown.length > 0 ? (
                        <div className="ws-export-recent">
                            <Text size="xs" c="dimmed" fw={550}>
                                Recent
                            </Text>
                            <PageList
                                items={recentShown.map(({ entry, index }) => ({ id: String(index), name: entry.name }))}
                                label="Recent exports"
                                onCurrentChange={(id) => {
                                    reopen(Number(id));
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            )}
            {opened ? body : null}
        </Modal>
    );
}
