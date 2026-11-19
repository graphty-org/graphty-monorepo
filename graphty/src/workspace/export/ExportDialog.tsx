import "./export.css";

import { PageList } from "@graphty/compact-mantine";
import { Modal, Text } from "@mantine/core";
import React, { lazy, Suspense, useEffect, useRef, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { CameraImageOutput } from "./CameraImageOutput";
import {
    type CameraImageChoices,
    type DataChoices,
    DEFAULT_CAMERA_IMAGE,
    DEFAULT_DATA,
    DEFAULT_REPORT,
    DEFAULT_TOUR_VIDEO,
    type OutputId,
    type RecentExport,
    type ReportChoices,
    type TourVideoChoices,
} from "./choices";
import { DataOutput } from "./DataOutput";
import { DocumentOutput } from "./DocumentOutput";
import { TourVideoOutput } from "./TourVideoOutput";

/** The Report's own chunk: its table and notes words are loaded when Report is chosen, not with the start page. */
const ReportOutput = lazy(() => import("./ReportOutput").then((module) => ({ default: module.ReportOutput })));

/** The outputs Export... lists, in the list's order. Image and Video are a camera's and a tour's own Export. */
const OUTPUTS: readonly { id: OutputId; name: string }[] = [
    { id: "data", name: "Data" },
    { id: "report", name: "Report" },
    { id: "styles", name: "Styles" },
    { id: "recipe", name: "Recipe" },
    { id: "project", name: "Project" },
];

/** How many files Recent lists. */
const RECENT_MAX = 5;

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
 * Image and Video are not listed: a camera's Export image... (`exportView`) and a tour's Export
 * video... open the dialog on that output alone.
 * @returns The dialog
 */
export function ExportDialog(): React.JSX.Element {
    const { store, session, element } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "export");
    const exportOn = useWorkspaceState((state) => state.exportOn);
    const exportSource = useWorkspaceState((state) => state.exportSource);
    const exportTour = useWorkspaceState((state) => state.exportTour);
    const exportView = useWorkspaceState((state) => state.exportView);
    const [recording, setRecording] = useState(false);
    const [output, setOutput] = useState<OutputId>("image");
    const [cameraImage, setCameraImage] = useState<CameraImageChoices>(DEFAULT_CAMERA_IMAGE);
    const [tourVideo, setTourVideo] = useState<TourVideoChoices>(DEFAULT_TOUR_VIDEO);
    const [data, setData] = useState<DataChoices>(DEFAULT_DATA);
    const [report, setReport] = useState<ReportChoices>(DEFAULT_REPORT);
    const [recent, setRecent] = useState<readonly RecentExport[]>([]);

    useEffect(() => {
        if (!opened) {
            return;
        }
        // Every opening writes the whole graph, but a source row's own Export..., which writes
        // that source's records for this opening only (when there is more than one to tell apart).
        const several = (session?.data.sources().length ?? 0) > 1;
        const scope: DataChoices["scope"] = exportSource !== null && several ? `source:${exportSource}` : "all";
        if (exportOn === "image" || exportOn === "video") {
            setOutput(exportOn);
            if (exportOn === "video" && exportTour !== null) {
                // A tour's Export video...: Video with that tour chosen.
                setTourVideo((choices) => ({ ...choices, camera: "tour", tour: exportTour }));
            }
            if (exportOn === "image" && exportView !== null) {
                // A camera's Export image...: Image from that camera.
                setCameraImage((choices) => ({ ...choices, view: exportView }));
            }
            setData((choices) => ({ ...choices, scope }));
        } else {
            setOutput("data");
            // A table is showing, or a source row asked: the plain CSV of the table.
            setData((choices) => ({
                ...choices,
                format: "csv",
                variant: "csv",
                values: { ...choices.values, table: exportOn },
                scope,
            }));
        }
    }, [opened, exportOn, exportSource, exportTour, exportView, session]);

    const close = (): void => {
        store.set({ dialog: null });
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
            setRecent((list) =>
                [{ output, name: file, choices }, ...list.filter((entry) => entry.name !== file)].slice(0, RECENT_MAX),
            );
        }
        store.set({ dialog: null, notice: { message } });
    };

    const reopen = (index: number): void => {
        const entry = recent[index];
        setOutput(entry.output);
        if (entry.output === "image") {
            setCameraImage(entry.choices as CameraImageChoices);
        } else if (entry.output === "video") {
            setTourVideo(entry.choices as TourVideoChoices);
        } else if (entry.output === "data") {
            setData(entry.choices as DataChoices);
        }
    };

    // Image and Video are a camera's and a tour's own Export: opened on one, the dialog is that
    // output alone; the generic Export lists the rest.
    const single = output === "image" || output === "video";
    const recentShown = recent
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.output !== "image" && entry.output !== "video");
    let title = "Export";
    if (single) {
        title = output === "image" ? "Export image" : "Export video";
    }

    const body = (() => {
        switch (output) {
            case "image":
                return (
                    <CameraImageOutput choices={cameraImage} onChange={setCameraImage} onCancel={close} onDone={done} />
                );
            case "video":
                return (
                    <TourVideoOutput
                        choices={tourVideo}
                        onChange={setTourVideo}
                        onCancel={close}
                        onDone={done}
                        onRecording={setRecording}
                    />
                );
            case "data":
                return (
                    <DataOutput
                        choices={data}
                        onChange={setData}
                        onCancel={close}
                        onSettingsOpen={setSettingsOpen}
                        onDone={done}
                    />
                );
            case "report":
                return (
                    <Suspense fallback={null}>
                        <ReportOutput choices={report} onChange={setReport} onCancel={close} onDone={done} />
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
                            setOutput(id as OutputId);
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
