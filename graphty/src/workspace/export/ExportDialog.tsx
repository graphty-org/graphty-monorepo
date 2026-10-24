import "./export.css";

import { PageList } from "@graphty/compact-mantine";
import { Modal, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    type DataChoices,
    DEFAULT_DATA,
    DEFAULT_IMAGE,
    DEFAULT_VIDEO,
    type ImageChoices,
    type OutputId,
    type RecentExport,
    type VideoChoices,
} from "./choices";
import { DataOutput } from "./DataOutput";
import { DocumentOutput } from "./DocumentOutput";
import { ImageOutput } from "./ImageOutput";
import { VideoOutput } from "./VideoOutput";

/** The outputs, in the list's order. */
const OUTPUTS: readonly { id: OutputId; name: string }[] = [
    { id: "image", name: "Image" },
    { id: "video", name: "Video" },
    { id: "data", name: "Data" },
    { id: "styles", name: "Styles" },
    { id: "recipe", name: "Recipe" },
    { id: "project", name: "Project" },
];

/** How many files Recent lists. */
const RECENT_MAX = 5;

/**
 * The app's one Export dialog: Image (`captureScreenshot`), Video (`captureAnimation`), Data
 * (`exportGraph` with a format, scope and columns), Styles (`styles.toFile`), Recipe
 * (`session.recipe`) and Project (`downloadProject`), with the files exported in this visit under
 * Recent, each opening its output again with the choices it was made with. Open while the
 * workspace dialog is "export"; it opens on Image, or on Data with CSV and the table the store's
 * `exportOn` names (the table dock's Export...), and keeps each output's choices while the
 * workspace is mounted.
 * @returns The dialog
 */
export function ExportDialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "export");
    const exportOn = useWorkspaceState((state) => state.exportOn);
    const [output, setOutput] = useState<OutputId>("image");
    const [image, setImage] = useState<ImageChoices>(DEFAULT_IMAGE);
    const [video, setVideo] = useState<VideoChoices>(DEFAULT_VIDEO);
    const [data, setData] = useState<DataChoices>(DEFAULT_DATA);
    const [recent, setRecent] = useState<readonly RecentExport[]>([]);

    useEffect(() => {
        if (!opened) {
            return;
        }
        if (exportOn === "image") {
            setOutput("image");
        } else {
            setOutput("data");
            // The table dock asked for its table: the plain CSV of it.
            setData((choices) => ({
                ...choices,
                format: "csv",
                variant: "csv",
                values: { ...choices.values, table: exportOn },
            }));
        }
    }, [opened, exportOn]);

    const close = (): void => {
        store.set({ dialog: null });
    };

    /**
     * Closes with a notice and, for a file, lists it first under Recent with this output's choices.
     * @param message - the notice.
     * @param file - the file's name, when a file was saved.
     */
    const done = (message: string, file?: string): void => {
        if (file !== undefined) {
            const choices = { image, video, data }[output as "image" | "video" | "data"] as RecentExport["choices"];
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
            setImage(entry.choices as ImageChoices);
        } else if (entry.output === "video") {
            setVideo(entry.choices as VideoChoices);
        } else if (entry.output === "data") {
            setData(entry.choices as DataChoices);
        }
    };

    const body = (() => {
        switch (output) {
            case "image":
                return <ImageOutput choices={image} onChange={setImage} onCancel={close} onDone={done} />;
            case "video":
                return <VideoOutput choices={video} onChange={setVideo} onCancel={close} onDone={done} />;
            case "data":
                return <DataOutput choices={data} onChange={setData} onCancel={close} onDone={done} />;
            default:
                return <DocumentOutput key={output} kind={output} onCancel={close} onDone={done} />;
        }
    })();

    return (
        <Modal
            opened={opened}
            onClose={close}
            title="Export"
            size="lg"
            classNames={{ body: "ws-dialog-columns ws-export-body" }}
        >
            <div className="ws-export-list">
                <PageList
                    items={OUTPUTS}
                    current={output}
                    label="What to export"
                    onCurrentChange={(id) => {
                        setOutput(id as OutputId);
                    }}
                />
                {recent.length > 0 ? (
                    <div className="ws-export-recent">
                        <Text size="xs" c="dimmed" fw={550}>
                            Recent
                        </Text>
                        <PageList
                            items={recent.map((entry, index) => ({ id: String(index), name: entry.name }))}
                            label="Recent exports"
                            onCurrentChange={(id) => {
                                reopen(Number(id));
                            }}
                        />
                    </div>
                ) : null}
            </div>
            {opened ? body : null}
        </Modal>
    );
}
