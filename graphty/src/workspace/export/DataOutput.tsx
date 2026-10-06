import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { ExportResult } from "@graphty/graphty-element";
import { Alert, Button, Input, Select, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type DataChoices, fileName, SAVED_LOCALLY } from "./choices";

/** How many lines of the file the preview shows. */
const PREVIEW_LINES = 6;

/** Props for DataOutput. */
interface DataOutputProps {
    choices: DataChoices;
    onChange: (choices: DataChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice. */
    onDone: (message: string) => void;
}

/**
 * The first lines of an export, read from its first chunks only.
 * @param result - the export.
 * @returns up to PREVIEW_LINES lines.
 */
async function firstLines(result: ExportResult): Promise<string> {
    const decoder = new TextDecoder();
    let text = "";
    for await (const chunk of result.bytes) {
        text += decoder.decode(chunk, { stream: true });
        if (text.split("\n").length > PREVIEW_LINES) {
            break;
        }
    }
    return text.split("\n").slice(0, PREVIEW_LINES).join("\n");
}

/**
 * Hands the reader a file.
 * @param text - the file's text.
 * @param name - its name.
 * @param type - its media type.
 */
function download(text: string, name: string, type: string): void {
    // graphty-element's exportGraph returns text only; it has no download destination as
    // captureScreenshot does (gap recorded with the Export dialog package).
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * The Data output: the format from graphty-element's catalog (CSV first), the table a CSV file
 * holds, what the format cannot hold (the export's loss notes), and a preview of the file's first
 * lines. Every run's results are columns headed by their result path, so a readable run id
 * reads as a readable header.
 * @param props - Component props
 * @param props.choices - The data choices
 * @param props.onChange - Called with new choices
 * @param props.onCancel - Closes the dialog
 * @param props.onDone - Closes the dialog with a notice
 * @returns The output's body and footer
 */
export function DataOutput({ choices, onChange, onCancel, onDone }: Readonly<DataOutputProps>): React.JSX.Element {
    const { element, session } = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const [preview, setPreview] = useState<{ lines: string; notes: readonly string[] } | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const formats = (session?.catalog.formats() ?? [])
        .filter((format) => format.canExport)
        .sort((a, b) => Number(b.id === "csv") - Number(a.id === "csv"));
    const format = formats.find((entry) => entry.id === choices.format);
    const csv = choices.format === "csv";
    const options = csv ? { table: choices.table } : {};
    const extension = format?.extensions[0]?.replace(/^\./, "") ?? choices.format;
    const name = fileName(project, csv ? choices.table : "graph", extension);

    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        setPreview(null);
        element
            .exportGraph(choices.format, csv ? { table: choices.table } : {})
            .then(async (result) => {
                const lines = await firstLines(result);
                if (live) {
                    // ponytail: the element's own sentences; the app words them once LossNote
                    // carries neutral facts only (gap recorded with the Export dialog package).
                    setPreview({ lines, notes: result.lossNotes.map((note) => note.message) });
                    setFailure(null);
                }
            })
            .catch((error: unknown) => {
                if (live) {
                    setFailure(error instanceof Error ? error.message : String(error));
                }
            });
        return () => {
            live = false;
        };
    }, [element, choices.format, choices.table, csv]);

    const save = async (): Promise<void> => {
        if (element === null) {
            return;
        }
        setBusy(true);
        try {
            const result = await element.exportGraph(choices.format, options);
            download(await result.text(), name, format?.mimeTypes[0] ?? "text/plain");
            onDone(`Exported ${name}`);
        } catch (error) {
            setFailure(error instanceof Error ? error.message : String(error));
        } finally {
            setBusy(false);
        }
    };

    const SUMMARIES = {
        nodes: "One row per node, with every computed value",
        edges: "One row per edge, with every edge attribute and computed value",
    };
    const summary = csv ? SUMMARIES[choices.table] : "Every node and edge, with every attribute and computed value";

    return (
        <>
            <div className="ws-export-main">
                <div>
                    <Text fw={550} size="md" role="heading" aria-level={3}>
                        Data
                    </Text>
                    <Text size="sm" c="dimmed">
                        {summary} - {format?.plainName ?? choices.format}
                    </Text>
                </div>
                <div className="ws-export-fields">
                    <Select
                        label="Format"
                        data={formats.map((entry) => ({ value: entry.id, label: entry.plainName }))}
                        value={choices.format}
                        allowDeselect={false}
                        onChange={(id) => {
                            onChange({ ...choices, format: id ?? "csv" });
                        }}
                    />
                    {csv ? (
                        <Input.Wrapper size="xs" label="Table">
                            <SegmentedControl
                                fullWidth
                                value={choices.table}
                                data={[
                                    { value: "nodes", label: "Nodes" },
                                    { value: "edges", label: "Edges" },
                                ]}
                                onChange={(table) => {
                                    onChange({ ...choices, table: table === "edges" ? "edges" : "nodes" });
                                }}
                            />
                        </Input.Wrapper>
                    ) : null}
                </div>
                {failure !== null ? (
                    <Alert color="red" title="The file was not written" role="alert">
                        {failure}
                    </Alert>
                ) : null}
                {failure === null && preview !== null && preview.notes.length > 0 ? (
                    <Alert
                        color="yellow"
                        role="note"
                        title={`${format?.plainName ?? choices.format} cannot hold everything`}
                    >
                        <ul className="ws-export-notes">
                            {preview.notes.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </Alert>
                ) : null}
                <pre
                    className="ws-export-text"
                    tabIndex={0} // NOSONAR(S6845): a scrolling region must take focus so a keyboard can scroll it
                    aria-label="Preview of the exported data"
                >
                    {preview?.lines ?? "Writing the preview..."}
                </pre>
            </div>
            <ModalFooter className="ws-export-footer">
                <Text size="sm" c="dimmed" className="ws-export-note">
                    {SAVED_LOCALLY}
                </Text>
                <Button variant="default" onClick={onCancel}>
                    Cancel
                </Button>
                <Button disabled={busy || element === null} onClick={() => void save()}>
                    Export
                </Button>
            </ModalFooter>
        </>
    );
}
