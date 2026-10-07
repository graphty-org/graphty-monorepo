import { ModalFooter } from "@graphty/compact-mantine";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import { projectFileName } from "@graphty/graphty-element/session";
import { Alert, Button, Select, Text } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { OptionsForm } from "../options/OptionsForm";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    type DataChoices,
    failureWords,
    fileName,
    formatRows,
    previewOf,
    SAVED_LOCALLY,
    writerOptions,
} from "./choices";
import { columnWords, type LossFacts, lossLines } from "./lossWords";

/** Props for DataOutput. */
interface DataOutputProps {
    choices: DataChoices;
    onChange: (choices: DataChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice. */
    onDone: (message: string) => void;
}

/** What a table row of a CSV holds. */
const SUMMARIES: Readonly<Record<string, string>> = {
    nodes: "One row per node, with every computed value",
    edges: "One row per edge, with every edge attribute and computed value",
    adjacency: "One row per node, listing its neighbors",
};

/**
 * A writer option's words: the element's plain name and its choices' labels.
 * @param option - the option.
 * @returns the label and the choice words.
 */
function optionWords(option: OptionDescriptor): { label: string; choice: (value: string) => string } {
    return {
        label: option.plainName,
        choice: (value) => option.values?.find((entry) => entry.value === value)?.label ?? value,
    };
}

/** A failure and the step it stopped. */
interface Failure {
    readonly title: string;
    readonly words: string;
}

/**
 * The Data output: one Format row per file type graphty-element writes (Graphty JSON first), the
 * row's key options (a CSV's table) and the rest behind an Advanced fold, what the format cannot
 * hold (the export's loss notes), and a preview of the file's first lines. Every run's results
 * are columns headed by their result path, so a readable run id reads as a readable header.
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
    const [preview, setPreview] = useState<{ lines: string; losses: readonly LossFacts[] } | null>(null);
    const [failure, setFailure] = useState<Failure | null>(null);
    const [busy, setBusy] = useState(false);

    const rows = formatRows(session?.catalog.formats() ?? []);
    const rowId = choices.variant === undefined ? choices.format : `${choices.format}/${choices.variant}`;
    const row = rows.find((entry) => entry.id === rowId);
    const options = row === undefined ? {} : writerOptions(row, choices.values);
    const optionsKey = JSON.stringify(options);
    // Before the catalog is in, the choices' own table names the summary.
    const shown = row === undefined ? choices.values : options;
    const table = typeof shown.table === "string" ? shown.table : undefined;
    const extension = row?.extensions[0]?.replace(/^\./, "") ?? choices.format;
    const name =
        choices.format === "graphty"
            ? projectFileName(project)
            : fileName(project, table ?? (typeof options.part === "string" ? options.part : "graph"), extension);

    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        setPreview(null);
        setFailure(null);
        element
            .exportGraph(choices.format, JSON.parse(optionsKey) as Record<string, unknown>)
            .then(async (result) => {
                const lines = await previewOf(result);
                if (live) {
                    // Only the coded facts: the notes' English messages never reach the screen.
                    setPreview({
                        lines,
                        losses: result.lossNotes.map(({ code, column, count }) => ({ code, column, count })),
                    });
                }
            })
            .catch((error: unknown) => {
                if (live) {
                    setFailure({ title: "The preview could not be made", words: failureWords(error) });
                }
            });
        return () => {
            live = false;
        };
    }, [element, choices.format, optionsKey]);

    const save = async (): Promise<void> => {
        if (element === null) {
            return;
        }
        setBusy(true);
        try {
            await element.downloadGraph(choices.format, { ...options, fileName: name });
            onDone(`Exported ${name}`);
        } catch (error) {
            setFailure({ title: "The file was not written", words: failureWords(error) });
        } finally {
            setBusy(false);
        }
    };

    const notes =
        preview === null
            ? []
            : lossLines(preview.losses, (column) => (session === null ? null : columnWords(session, column)));

    const summary =
        choices.format === "graphty"
            ? "The whole project: graph, styles, results and layout"
            : (SUMMARIES[table ?? ""] ?? "Every node and edge, with every attribute and computed value");

    return (
        <>
            <section className="ws-export-main" aria-label="Data">
                <div>
                    <Text fw={550} size="md" role="heading" aria-level={3}>
                        Data
                    </Text>
                    <Text size="sm" c="dimmed">
                        {summary} - {row?.plainName ?? choices.format}
                    </Text>
                </div>
                <div className="ws-export-fields">
                    <Select
                        label="Format"
                        data={rows.map((entry) => ({ value: entry.id, label: entry.plainName }))}
                        value={rowId}
                        allowDeselect={false}
                        onChange={(id) => {
                            const picked = rows.find((entry) => entry.id === id);
                            if (picked !== undefined) {
                                onChange({ ...choices, format: picked.format, variant: picked.variant });
                            }
                        }}
                    />
                    {row === undefined || session === null ? null : (
                        <OptionsForm
                            // A new row starts with its Advanced fold closed.
                            key={row.id}
                            session={session}
                            options={row.options}
                            values={options}
                            words={optionWords}
                            onChange={(option, value) => {
                                onChange({ ...choices, values: { ...choices.values, [option]: value } });
                            }}
                        />
                    )}
                </div>
                {failure === null ? null : (
                    <Alert color="red" title={failure.title} role="alert">
                        {failure.words}
                    </Alert>
                )}
                {failure === null && notes.length > 0 ? (
                    <Alert
                        color="yellow"
                        role="note"
                        title={`${row?.plainName ?? choices.format} cannot hold everything`}
                    >
                        <ul className="ws-export-notes">
                            {notes.map((note) => (
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
            </section>
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
