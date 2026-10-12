import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { ExportLoss, ExportResult } from "@graphty/graphty-element";
import { Alert, Button, Group, Input, Select, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type DataChoices, dataExportOptions, fileName, SAVED_LOCALLY } from "./choices";
import { isStyleLoss, layersBackWords, listedStyleLosses, lossWords } from "./lossWords";

/** How many lines of the file the preview shows. */
const PREVIEW_LINES = 6;

/**
 * Why a file was not written, from the export's error code (graphty-element's messages are for developers).
 * @param error - what the export threw.
 * @param losses - the export's losses, when it got that far; its refusals (E_ codes) say why.
 * @returns a sentence.
 */
function failureWords(error: unknown, losses: readonly ExportLoss[] = []): string {
    const refused = [...new Set(losses.filter((loss) => loss.code.startsWith("E_")).map(lossWords))];
    if (refused.length > 0) {
        return refused.join(". ");
    }
    const code = (error as { code?: unknown } | null)?.code;
    return code === "E_UNSUPPORTED"
        ? "This format cannot hold this graph"
        : "Something went wrong while writing the file";
}

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
 * Hands the reader a file, from the export's bytes (a Cytoscape session is a zip file, not text).
 * @param result - the export.
 * @param name - its name.
 * @param type - its media type.
 */
async function download(result: ExportResult, name: string, type: string): Promise<void> {
    // graphty-element's exportGraph has no download destination as captureScreenshot does (gap
    // recorded with the Export dialog package).
    const parts: Uint8Array<ArrayBuffer>[] = [];
    for await (const chunk of result.bytes) {
        parts.push(new Uint8Array(chunk));
    }
    const url = URL.createObjectURL(new Blob(parts, { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
}

/**
 * The Data output: the format from graphty-element's catalog (CSV first), the table a CSV file
 * holds, what the format cannot hold (the export's losses, worded here), and a preview of the file's first
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
    /** The style losses of the export the reader asked to save, until they save anyway or choose again. */
    const [styleLosses, setStyleLosses] = useState<readonly ExportLoss[] | null>(null);
    const formatField = useRef<HTMLInputElement>(null);

    const formats = (session?.catalog.formats() ?? [])
        .filter((format) => format.canExport)
        .sort((a, b) => Number(b.id === "csv") - Number(a.id === "csv"));
    const format = formats.find((entry) => entry.id === choices.format);
    const csv = choices.format === "csv";
    const extension = format?.extensions[0]?.replace(/^\./, "") ?? choices.format;
    const name = fileName(project, csv ? choices.table : "graph", extension);
    const binary = format?.binary === true;
    const formatName = format?.plainName ?? choices.format;

    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        setPreview(null);
        setStyleLosses(null);
        let losses: readonly ExportLoss[] = [];
        element
            .exportGraph(choices.format, dataExportOptions(choices))
            .then(async (result) => {
                ({ losses } = result);
                const lines = binary
                    ? `${formatName} files are not text, so there is no preview.`
                    : await firstLines(result);
                if (live) {
                    setPreview({ lines, notes: [...new Set(result.losses.map(lossWords))] });
                    setFailure(null);
                }
            })
            .catch((error: unknown) => {
                if (live) {
                    setFailure(failureWords(error, losses));
                }
            });
        return () => {
            live = false;
        };
    }, [element, choices, binary, formatName]);

    /**
     * Writes the file and hands it over; first, unless the reader already said to save anyway,
     * stops at a warning when the format loses part of the styles.
     * @param anyway - the reader saw the warning and chose to save.
     */
    const save = async (anyway = false): Promise<void> => {
        if (element === null) {
            return;
        }
        setBusy(true);
        let losses: readonly ExportLoss[] = [];
        try {
            const result = await element.exportGraph(choices.format, dataExportOptions(choices));
            ({ losses } = result);
            const lost = result.losses.filter(isStyleLoss);
            if (!anyway && lost.length > 0) {
                setStyleLosses(lost);
                return;
            }
            setStyleLosses(null);
            await download(result, name, format?.mimeTypes[0] ?? "text/plain");
            onDone(`Exported ${name}`);
        } catch (error) {
            setFailure(failureWords(error, losses));
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
                        ref={formatField}
                        label="Format"
                        data={formats.map((entry) => ({
                            value: entry.id,
                            label:
                                entry.styles?.write === "rules"
                                    ? `${entry.plainName} (keeps style layers)`
                                    : entry.plainName,
                        }))}
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
                {failure === null && styleLosses !== null ? (
                    <Alert
                        color="orange"
                        role="alertdialog"
                        title={`${format?.plainName ?? choices.format} does not keep all of the graph's styles`}
                    >
                        <ul className="ws-export-notes">
                            {[...new Set(listedStyleLosses(format, styleLosses).map(lossWords))].map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                        <Text size="sm">{layersBackWords(format, styleLosses)}</Text>
                        <Group gap="xs" mt="xs">
                            <Button size="xs" disabled={busy} onClick={() => void save(true)}>
                                Save anyway
                            </Button>
                            <Button
                                size="xs"
                                variant="default"
                                onClick={() => {
                                    setStyleLosses(null);
                                    formatField.current?.focus();
                                }}
                            >
                                Choose another format
                            </Button>
                        </Group>
                    </Alert>
                ) : null}
                {failure === null && styleLosses === null && preview !== null && preview.notes.length > 0 ? (
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
