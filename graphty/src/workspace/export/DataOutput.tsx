import { EntityChip, MenuCheckItem, ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { ExportLoss, ExportResult } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Alert, Button, Group, Input, Menu, Select, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useAsyncValue } from "../inspector/hooks";
import { formatNumber } from "../inspector/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type DataChoices, dataExportOptions, type DataScope, fileName, saveBlob } from "./choices";
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
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
}

/** One column a data export can write. */
interface ExportColumn {
    /** What `exportGraph`'s `columns` takes: the attribute's name or the result's path. */
    readonly name: string;
    /** Hidden with `data.setHidden`, so left out unless the reader adds it back. */
    readonly hidden: boolean;
}

/**
 * The columns a data export can write: the records' attributes, then each run's result.
 * @param session - the element's session.
 * @param kinds - the record kinds the file holds.
 * @returns the columns, without repeats.
 */
function exportColumns(session: GraphSession, kinds: readonly ("node" | "edge")[]): ExportColumn[] {
    const columns = new Map<string, ExportColumn>();
    for (const attribute of session.data.attributes()) {
        if (kinds.includes(attribute.kind) && attribute.origin !== "result" && !columns.has(attribute.name)) {
            columns.set(attribute.name, { name: attribute.name, hidden: attribute.hidden === true });
        }
    }
    for (const kind of kinds) {
        for (const column of session.data.resultColumns(kind)) {
            columns.set(column.path, { name: column.path, hidden: false });
        }
    }
    return [...columns.values()];
}

/** One scope the reader can pick, with how many nodes it writes. */
interface ScopeOption {
    readonly value: DataScope;
    readonly label: string;
    readonly nodes: number;
}

/**
 * The scopes on offer and their node counts: All, Shown, Selection (when something is selected)
 * and each kept set.
 * @param session - the element's session.
 * @returns the options.
 */
async function scopeOptions(session: GraphSession): Promise<ScopeOption[]> {
    const total = session.data.statistics().nodeCount;
    const [shown, selected, ...sets] = await Promise.all([
        session.scope.count("visible"),
        session.scope.count("selection"),
        ...session.sets.list().map(async (set) => ({ set, count: await session.scope.count({ set: set.id }) })),
    ]);
    return [
        { value: "all", label: `All ${formatNumber(total)}`, nodes: total },
        {
            value: "shown",
            label: `Shown ${formatNumber(shown.nodes)} of ${formatNumber(total)}`,
            nodes: shown.nodes,
        },
        ...(selected.nodes > 0
            ? [
                  {
                      value: "selection" as const,
                      label: `Selection ${formatNumber(selected.nodes)}`,
                      nodes: selected.nodes,
                  },
              ]
            : []),
        ...sets.map(({ set, count }) => ({
            value: `set:${set.id}` as const,
            label: `${set.name} ${formatNumber(count.nodes)}`,
            nodes: count.nodes,
        })),
    ];
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
    saveBlob(new Blob(parts, { type }), name);
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

    const kinds: ("node" | "edge")[] = csv ? [choices.table === "edges" ? "edge" : "node"] : ["node", "edge"];
    const columns = session === null ? [] : exportColumns(session, kinds);
    const chosen = choices.columns ?? columns.filter((column) => !column.hidden).map((column) => column.name);
    // Every column is written when none is left out, so the export keeps what this list cannot name.
    const written = chosen.length === columns.length ? undefined : chosen;
    const scopes = useAsyncValue(() => (session === null ? null : scopeOptions(session)), session === null ? 0 : 1);
    const scope = scopes?.find((option) => option.value === choices.scope);
    const total = scopes?.[0]?.nodes;
    const options = dataExportOptions(choices, written);
    const optionsKey = JSON.stringify(options);

    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        let live = true;
        setPreview(null);
        setStyleLosses(null);
        let losses: readonly ExportLoss[] = [];
        // The options as a key, since they are a new object every render.
        const asked = JSON.parse(optionsKey) as Readonly<Record<string, unknown>>;
        element
            .exportGraph(choices.format, asked)
            .then(async (result) => {
                ({ losses } = result);
                const lines = binary ? `${formatName}: no preview` : await firstLines(result);
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
    }, [element, choices.format, optionsKey, binary, formatName]);

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
            const result = await element.exportGraph(choices.format, options);
            ({ losses } = result);
            // A refusal (an E_ code) means the file cannot be written: say why, never offer "Save anyway".
            if (losses.some((loss) => loss.code.startsWith("E_"))) {
                setStyleLosses(null);
                setFailure(failureWords(undefined, losses));
                return;
            }
            const lost = result.losses.filter(isStyleLoss);
            if (!anyway && lost.length > 0) {
                setStyleLosses(lost);
                return;
            }
            setStyleLosses(null);
            await download(result, name, format?.mimeTypes[0] ?? "text/plain");
            onDone(`Exported ${name}`, name);
        } catch (error) {
            setFailure(failureWords(error, losses));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className="ws-export-main">
                <Text fw={550} size="md" role="heading" aria-level={3}>
                    Data
                </Text>
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
                    <Select
                        label="Scope"
                        data={(scopes ?? []).map(({ value, label }) => ({ value, label }))}
                        value={scope === undefined ? null : choices.scope}
                        placeholder="--"
                        allowDeselect={false}
                        onChange={(value) => {
                            onChange({ ...choices, scope: (value ?? "all") as DataScope });
                        }}
                    />
                    <Input.Wrapper size="xs" label="Columns">
                        <Group gap={6} wrap="nowrap">
                            <Menu closeOnItemClick={false} position="bottom-start">
                                <Menu.Target>
                                    <Button size="xs" variant="default">
                                        {`${String(chosen.length)} of ${String(columns.length)}`}
                                    </Button>
                                </Menu.Target>
                                <Menu.Dropdown mah={280} style={{ overflow: "auto" }}>
                                    {columns.map((column) => (
                                        <MenuCheckItem
                                            key={column.name}
                                            checked={chosen.includes(column.name)}
                                            onClick={() => {
                                                onChange({
                                                    ...choices,
                                                    columns: chosen.includes(column.name)
                                                        ? chosen.filter((name) => name !== column.name)
                                                        : [...chosen, column.name],
                                                });
                                            }}
                                        >
                                            {column.name}
                                        </MenuCheckItem>
                                    ))}
                                </Menu.Dropdown>
                            </Menu>
                            {scope === undefined || total === undefined ? null : (
                                <EntityChip kind="node">
                                    {scope.nodes === total
                                        ? formatNumber(total)
                                        : `${formatNumber(scope.nodes)} of ${formatNumber(total)}`}
                                </EntityChip>
                            )}
                        </Group>
                    </Input.Wrapper>
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
                <span className="ws-export-note" />
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
