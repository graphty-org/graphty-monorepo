import "./export.css";

import { PageList } from "@graphty/compact-mantine";
import { Modal } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type DataChoices, DEFAULT_IMAGE, type ImageChoices } from "./choices";
import { DataOutput } from "./DataOutput";
import { ImageOutput } from "./ImageOutput";

/** The outputs, in the list's order (tier 1: Image and Data). */
const OUTPUTS = [
    { id: "image", name: "Image" },
    { id: "data", name: "Data" },
];

/**
 * The one Export dialog (tier1-design.md section T13): Image (a picture of the drawing, through
 * graphty-element's `captureScreenshot`) and Data (the node or edge table with every run's result
 * columns, through `exportGraph`). Open while the workspace dialog is "export"; it opens on the
 * output and table the store's `exportOn` names, and remembers the last choices per output while
 * the workspace is mounted.
 * @returns The dialog
 */
export function ExportDialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === "export");
    const exportOn = useWorkspaceState((state) => state.exportOn);
    const [output, setOutput] = useState<"image" | "data">("image");
    const [image, setImage] = useState<ImageChoices>(DEFAULT_IMAGE);
    const [data, setData] = useState<DataChoices>({ format: "csv", table: "nodes" });

    useEffect(() => {
        if (!opened) {
            return;
        }
        if (exportOn === "image") {
            setOutput("image");
        } else {
            setOutput("data");
            setData((choices) => ({ ...choices, table: exportOn }));
        }
    }, [opened, exportOn]);

    const close = (): void => {
        store.set({ dialog: null });
    };
    const done = (message: string): void => {
        store.set({ dialog: null, notice: { message } });
    };

    return (
        <Modal opened={opened} onClose={close} title="Export" size={760} classNames={{ body: "ws-export-body" }}>
            <div className="ws-export-list">
                <PageList
                    items={OUTPUTS}
                    current={output}
                    label="What to export"
                    onCurrentChange={(id) => {
                        setOutput(id === "data" ? "data" : "image");
                    }}
                />
            </div>
            {opened && output === "image" ? (
                <ImageOutput choices={image} onChange={setImage} onCancel={close} onDone={done} />
            ) : null}
            {opened && output === "data" ? (
                <DataOutput choices={data} onChange={setData} onCancel={close} onDone={done} />
            ) : null}
        </Modal>
    );
}
