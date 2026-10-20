import { EntityChip, MenuCheckItem, ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { ExportLoss, ExportResult } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Alert, Badge, Button, Group, Input, Menu, Select, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useAsyncValue } from "../inspector/hooks";
import { formatNumber } from "../inspector/words";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type DataChoices, dataExportOptions, type DataScope, fileName, saveBlob } from "./choices";
import { isStyleLoss, layersBackWords, listedStyleLosses, type LossRow, lossRows } from "./lossWords";

/** How many lines of the file the preview shows. */
const PREVIEW_LINES = 6;

/** Why a file was not written: the export's refusals (its E_ losses) as rows, else a label from its error code. */
type Failure = readonly LossRow[] | string;

/**
 * Why a file was not written (graphty-element's messages are for developers).
 * @param error - what the export threw.
 * @param losses - the export's losses, when it got that far; its refusals (E_ codes) say why.
 * @returns the refusals' rows, or a label.
 */
function failureOf(error: unknown, losses: readonly ExportLoss[] = []): Failure {
    const refused = lossRows(losses.filter((loss) => loss.code.startsWith("E_")));
    if (refused.length > 0) {
        return refused;
    }
    const code = (error as { code?: unknown } | null)?.code;
    return code === "E_UNSUPPORTED" ? "Format cannot hold this graph" : "Write failed";
}

/**
 * A loss row's count: a node or edge chip for nodes or edges; a plain number for anything else,
 * unless the row's column chips already say how many.
 * @param props - Component props
 * @param props.row - the row.
 * @returns the count, or nothing.
 */
function LossCount({ row }: Readonly<{ row: LossRow }>): React.JSX.Element | null {
    if (row.count === null) {
        return null;
    }
    if (row.kind !== null) {
        return <EntityChip kind={row.kind}>{formatNumber(row.count)}</EntityChip>;
    }
    return row.columns.length > 0 ? null : (
        <Text size="xs" c="dimmed" span>
            {formatNumber(row.count)}
        </Text>
    );
}

/**
 * What a file cannot hold, one compact row per loss: what is lost, the columns it is about as
 * chips, and how many nodes or edges (as a node or edge chip).
 * @param props - Component props
 * @param props.rows - the rows.
 * @returns the list.
 */
function LossList({ rows }: Readonly<{ rows: readonly LossRow[] }>): React.JSX.Element {
    return (
        <ul className="ws-export-losses">
            {rows.map((row) => (
                <li key={`${row.what}|${String(row.kind)}`}>
                    <Text size="xs" span>
                        {row.what}
                    </Text>
                    {row.columns.map((column) => (
                        <Badge key={column} size="xs" variant="default" tt="none">
                            {column}
                        </Badge>
                    ))}
                    <LossCount row={row} />
                </li>
            ))}
        </ul>
    );
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
 * and each kept set that holds a node.
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
        ...sets
            .filter(({ count }) => count.nodes > 0)
            .map(({ set, count }) => ({
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
    const [preview, setPreview] = useState<{ lines: string; notes: readonly LossRow[] } | null>(null);
    const [failure, setFailure] = useState<Failure | null>(null);
    const [busy, setBusy] = useState(false);
    /** The style losses of the export the reader asked to save, until they save anyway or choose again. */
    const [styleLosses, setStyleLosses] = useState<readonly ExportLoss[] | null>(null);
    const formatField = useRef<HTMLInputElement>(null);

    const formats = (session?.catalog.formats() ?? [])
        .filter((format) => format.canExport)
        .sort((a, b) => Number(b.id === "csv") - Number(a.id === "csv"));
    const format = formats.find((entry) => entry.id === choices.format);
    const csv = choices.format === "csv";
    // A graph without edges has no edge table to offer: the toggle is not shown and the node table is written.
    const hasEdges = (session?.data.statistics().edgeCount ?? 0) > 0;
    const table = hasEdges ? choices.table : "nodes";
    const extension = format?.extensions[0]?.replace(/^\./, "") ?? choices.format;
    const name = fileName(project, csv ? table : "graph", extension);
    const binary = format?.binary === true;
    const formatName = format?.plainName ?? choices.format;

    const kinds: ("node" | "edge")[] = csv ? [table === "edges" ? "edge" : "node"] : ["node", "edge"];
    const columns = session === null ? [] : exportColumns(session, kinds);
    const chosen = choices.columns ?? columns.filter((column) => !column.hidden).map((column) => column.name);
    // Every column is written when none is left out, so the export keeps what this list cannot name.
    const written = chosen.length === columns.length ? undefined : chosen;
    const scopes = useAsyncValue(() => (session === null ? null : scopeOptions(session)), session === null ? 0 : 1);
    const scope = scopes?.find((option) => option.value === choices.scope);
    const total = scopes?.[0]?.nodes;
    const options = dataExportOptions({ ...choices, table }, written);
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
                    setPreview({ lines, notes: lossRows(result.losses) });
                    setFailure(null);
                }
            })
            .catch((error: unknown) => {
                if (live) {
                    setFailure(failureOf(error, losses));
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
                setFailure(failureOf(undefined, losses));
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
            setFailure(failureOf(error, losses));
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
                    {csv && hasEdges ? (
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
                    <Alert color="red" title="Not written" role="alert">
                        {typeof failure === "string" ? failure : <LossList rows={failure} />}
                    </Alert>
                ) : null}
                {failure === null && styleLosses !== null ? (
                    <Alert color="orange" role="alertdialog" title={`Styles lost in ${formatName}`}>
                        <LossList rows={lossRows(listedStyleLosses(format, styleLosses))} />
                        <Text size="xs" c="dimmed">
                            {layersBackWords(format, styleLosses)}
                        </Text>
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
                    <Alert color="yellow" role="note" title={`Lost in ${formatName}`}>
                        <LossList rows={preview.notes} />
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
