import { EntityChip, MenuCheckItem, ModalFooter } from "@graphty/compact-mantine";
import type { ExportLoss } from "@graphty/graphty-element";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import { type GraphSession, projectFileName } from "@graphty/graphty-element/session";
import { Alert, Badge, Button, Group, Input, Menu, Select, Text } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { useAsyncValue } from "../inspector/hooks";
import { formatNumber } from "../inspector/words";
import { OptionsForm } from "../options/OptionsForm";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    type DataChoices,
    dataExportOptions,
    type DataScope,
    failureWords,
    fileName,
    formatRows,
    previewOf,
} from "./choices";
import { isStyleLoss, layersBackWords, listedStyleLosses, type LossRow, lossRows } from "./lossWords";

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
    // Worded by its code, as the image's failures are; an unknown code shows as itself.
    return code === "E_UNSUPPORTED" ? "Format cannot hold this graph" : failureWords(error);
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
 * The part an export writes, for its file name: the part named in its options, or the graph.
 * @param part - the options' part.
 * @returns the part's name.
 */
function partName(part: unknown): string {
    return typeof part === "string" ? part : "graph";
}

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

/**
 * The Data output: one Format row per file type graphty-element writes (each format's export
 * variants, such as CSV's tables), the row's key options and the rest behind an Advanced fold, the
 * scope and the columns written, what the format cannot hold (the export's losses, as compact
 * rows), and a preview of the file's first lines. Every run's results are columns headed by their result path, so a readable run id
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

    const formats = session?.catalog.formats() ?? [];
    const rows = formatRows(formats);
    const format = formats.find((entry) => entry.id === choices.format);
    const rowId = choices.variant === undefined ? choices.format : `${choices.format}/${choices.variant}`;
    const row = rows.find((entry) => entry.id === rowId);
    const keyed = row === undefined ? {} : dataExportOptions(row, { ...choices, columns: undefined });
    // A CSV's table, from its variant or its options: what the file holds, and its name.
    const table = typeof keyed.table === "string" ? keyed.table : undefined;
    const extension = row?.extensions[0]?.replace(/^\./, "") ?? choices.format;
    const name =
        choices.format === "graphty"
            ? projectFileName(project)
            : fileName(project, table ?? partName(keyed.part), extension);
    const binary = format?.binary === true;
    const formatName = row?.plainName ?? format?.plainName ?? choices.format;

    let kinds: ("node" | "edge")[] = ["node", "edge"];
    if (table !== undefined) {
        kinds = table === "edges" ? ["edge"] : ["node"];
    }
    const columns = session === null ? [] : exportColumns(session, kinds);
    const chosen = choices.columns ?? columns.filter((column) => !column.hidden).map((column) => column.name);
    // Every column is written when none is left out, so the export keeps what this list cannot name.
    const written = chosen.length === columns.length ? undefined : chosen;
    const scopes = useAsyncValue(() => (session === null ? null : scopeOptions(session)), session === null ? 0 : 1);
    const scope = scopes?.find((option) => option.value === choices.scope);
    const total = scopes?.[0]?.nodes;
    const options = row === undefined ? {} : dataExportOptions(row, choices, written);
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
                const lines = binary ? `${formatName}: no preview` : await previewOf(result);
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
            await element.downloadGraph(choices.format, { ...options, fileName: name });
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
                        data={rows.map((entry) => ({
                            value: entry.id,
                            label:
                                formats.find((each) => each.id === entry.format)?.styles?.write === "rules"
                                    ? `${entry.plainName} (keeps style layers)`
                                    : entry.plainName,
                        }))}
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
                            // With no edges there is only the node table to write: no Table choice.
                            options={
                                session.data.statistics().edgeCount === 0
                                    ? row.options.filter((option) => option.name !== "table")
                                    : row.options
                            }
                            values={keyed}
                            words={optionWords}
                            onChange={(option, value) => {
                                onChange({ ...choices, values: { ...choices.values, [option]: value } });
                            }}
                        />
                    )}
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
