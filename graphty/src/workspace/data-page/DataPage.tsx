import "./data-page.css";

import { DataTable, type DataTableColumn, SegmentedControl, StyleSelect } from "@graphty/compact-mantine";
import type { DraftRow, DraftTable, LoadDraft, LoadReport } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Alert,
    Anchor,
    Button,
    Group,
    Input,
    Loader,
    Menu,
    NavLink,
    NumberInput,
    Popover,
    Select,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
    Tooltip,
} from "@mantine/core";
import { CircleCheck, CircleDashed, Plus } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    elementRole,
    kindChanged,
    type PageChoices,
    type PageRole,
    roleOf,
    ROLES_BY_KIND,
    rowsAreOf,
    setRole,
    setRowsAre,
} from "./choices";
import { takeDataPageRequest } from "./request";
import { type LoadDraftState, type PageSource, type RowFilter, sourceName, useLoadDraft } from "./useLoadDraft";
import {
    baseName,
    count,
    formatName,
    plural,
    READABLE_FORMATS,
    type Refusal,
    refusalFor,
    roleWords,
    SEPARATORS,
    tooLargeRefusal,
} from "./words";

/** An open menu, list or popover keeps its own Esc. */
const OPEN_OVERLAY = '[role="menu"], [role="dialog"], [role="listbox"]';

/**
 * Whether a menu, list or popover is showing. A closed Select keeps its listbox in the page,
 * hidden, so only a visible one counts.
 * @returns true when one is open.
 */
function overlayOpen(): boolean {
    return [...document.querySelectorAll(OPEN_OVERLAY)].some((overlay) => overlay.checkVisibility());
}

/** The Direction menu's values and what each writes to `LoadChoices.directed`. */
const DIRECTIONS = { auto: "auto", directed: true, undirected: false } as const;

/** Words for a column's type, read-only beside its role (section 2.10, "Sample grid"). */
const TYPE_WORDS: Readonly<Record<string, string>> = {
    string: "text",
    number: "number",
    integer: "whole number",
    boolean: "yes / no",
    time: "time",
    category: "category",
    mixed: "mixed",
};

/**
 * The Data page (tier1-design.md section 2.10): every data door opens it. The reader sees the
 * file's tables, the role of each column and what the load will make before anything is loaded;
 * graphty-element's load draft supplies every fact and count.
 * @returns The page
 */
export function DataPage(): React.JSX.Element {
    const workspace = useWorkspace();
    const { store, session } = workspace;
    const [request] = useState(() => takeDataPageRequest(store));
    const projectName = useWorkspaceState((state) => state.project?.name ?? "Untitled");
    const initial: PageSource | null =
        request.files !== undefined && request.files.length > 0 ? { kind: "files", files: request.files } : null;
    const page = useLoadDraft(session, request.intent === "add" ? "merge" : "replace", initial);
    const fileInput = useRef<HTMLInputElement>(null);

    const title = request.intent === "add" ? `Add to ${projectName}` : "Open as a new graph";

    const cancel = useCallback((): void => {
        store.set(request.intent === "add" ? { page: "panels" } : { project: null, page: "panels" });
    }, [store, request]);

    // Esc returns to where the reader came from, wherever focus is on the page, unless a menu,
    // list or popover is open (it takes its own Esc first). It listens in the capture phase, so it
    // runs before the workspace's key map and the map's Esc (Clear selection) does not.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !event.defaultPrevented && !overlayOpen()) {
                event.preventDefault();
                cancel();
            }
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
        };
    }, [cancel]);

    const load = async (): Promise<void> => {
        const { source } = page;
        // A refused load stays on the page, its problem block shown and Load disabled (T5).
        if (!(await page.load())) {
            return;
        }
        // A loaded new graph is named after its file; inside a project nothing is renamed.
        store.set((state) => ({
            page: "panels",
            place: "graph",
            project:
                request.intent === "new" && state.project !== null && source?.kind === "files"
                    ? { ...state.project, name: baseName(source.files[0].name) }
                    : state.project,
        }));
    };

    /** Whether the next chosen files join the table on the page (Tables "+") or replace the source. */
    const joining = useRef(false);

    const chooseFiles = (join: boolean): void => {
        joining.current = join;
        fileInput.current?.click();
    };

    const addFiles = (files: readonly File[], join: boolean): void => {
        // One file beside one table the reader can change (a CSV) lands as the second table
        // (section 2.10, "Tables"); anything else replaces the source. Whether the new file can
        // be that table is the element's call (#930).
        const held =
            join &&
            files.length === 1 &&
            page.source?.kind === "files" &&
            page.draft?.tables.length === 1 &&
            !page.draft.tables[0].fixed
                ? page.source.files
                : [];
        const next = [...held, ...files];
        if (next.length === 0) {
            return;
        }
        if (next.length > 2) {
            store.set({
                notice: {
                    message:
                        "The Data page reads one file, or a node table and an edge table. Choose at most two files.",
                },
            });
            return;
        }
        page.setSource({ kind: "files", files: next });
    };

    return (
        <div
            className="dp"
            role="region"
            aria-label="Data page"
            onDragOver={(event) => {
                event.preventDefault();
            }}
            onDrop={(event) => {
                event.preventDefault();
                addFiles([...event.dataTransfer.files], true);
            }}
        >
            <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                data-testid="data-page-file-input"
                onChange={(event) => {
                    addFiles([...(event.currentTarget.files ?? [])], joining.current);
                    event.currentTarget.value = "";
                }}
            />
            <header className="dp-header">
                <Title order={1} size="h4">
                    {title}
                </Title>
            </header>
            <div className="dp-body">
                <TablesList
                    page={page}
                    onChooseFiles={() => {
                        chooseFiles(true);
                    }}
                />
                <section className="dp-main" aria-label="Table">
                    <MainView
                        page={page}
                        onChooseFiles={() => {
                            chooseFiles(false);
                        }}
                    />
                </section>
            </div>
            <MatchReport page={page} />
            <Footer
                page={page}
                onCancel={cancel}
                onLoad={() => {
                    void load();
                }}
            />
        </div>
    );
}

/** Props shared by the page's parts. */
interface PartProps {
    readonly page: LoadDraftState;
}

/**
 * Tables (section 2.10, item 1): one row per table with its row count and check, and "+".
 * @param props - Component props
 * @param props.page - The page state
 * @param props.onChooseFiles - Opens the file picker
 * @returns The list
 */
function TablesList({ page, onChooseFiles }: PartProps & { onChooseFiles: () => void }): React.JSX.Element {
    const [entry, setEntry] = useState<"url" | "paste" | null>(null);
    const { draft } = page;
    return (
        <section className="dp-tables" aria-label="Tables">
            <Group justify="space-between" wrap="nowrap" className="dp-section-head">
                <Text size="xs" fw={600}>
                    Tables
                </Text>
                <Popover
                    opened={entry !== null}
                    onChange={(open) => {
                        if (!open) {
                            setEntry(null);
                        }
                    }}
                    position="right-start"
                >
                    <Popover.Target>
                        <span>
                            <Menu position="bottom-start">
                                <Menu.Target>
                                    <Tooltip label="Add a table">
                                        <ActionIcon variant="subtle" size="sm" aria-label="Add a table">
                                            <Plus size={14} aria-hidden />
                                        </ActionIcon>
                                    </Tooltip>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Item onClick={onChooseFiles}>File...</Menu.Item>
                                    <Menu.Item
                                        onClick={() => {
                                            setEntry("url");
                                        }}
                                    >
                                        From a URL...
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() => {
                                            setEntry("paste");
                                        }}
                                    >
                                        Paste...
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </span>
                    </Popover.Target>
                    <Popover.Dropdown>
                        {entry === null ? null : (
                            <EntryForm
                                kind={entry}
                                onDone={(source) => {
                                    setEntry(null);
                                    page.setSource(source);
                                }}
                            />
                        )}
                    </Popover.Dropdown>
                </Popover>
            </Group>
            {draft === null || page.source === null ? null : <TableRows page={page} draft={draft} />}
        </section>
    );
}

/**
 * The table rows. A graph file is one row, named after the file, that expands to its node and
 * edge tables (section 2.10, item 1); CSV tables are a row each.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.draft - The draft
 * @returns The rows
 */
function TableRows({ page, draft }: PartProps & { draft: LoadDraft }): React.JSX.Element {
    const rows = draft.tables.map((table) => <TableRow key={table.id} page={page} draft={draft} table={table} />);
    if (page.source === null || !draft.tables.every((table) => table.fixed)) {
        return <>{rows}</>;
    }
    return (
        <NavLink
            label={sourceName(page.source)}
            description={formatName(draft.type)}
            rightSection={<ReadyMark ready={tablesReady(page)} />}
            defaultOpened
        >
            {rows}
        </NavLink>
    );
}

/**
 * Whether the element's report says the tables can load: it was computed, refused nothing and is
 * not too large. Which table a refusal concerns, and which roles each table still needs, the
 * element does not say yet (#926), so every table's check follows the whole report.
 * @param page - The page state
 * @returns true when green
 */
function tablesReady(page: LoadDraftState): boolean {
    return page.report !== null && page.reportError === null && page.report.tooLarge === null;
}

/**
 * A table's check: green when ready, a gray dashed circle when not.
 * @param props - Component props
 * @param props.ready - Whether it is ready
 * @returns The mark
 */
function ReadyMark({ ready }: { ready: boolean }): React.JSX.Element {
    return ready ? (
        <CircleCheck size={14} color="var(--mantine-color-green-6)" role="img" aria-label="Ready" />
    ) : (
        <CircleDashed size={14} role="img" aria-label="Not ready" />
    );
}

/**
 * One table's row: kind, name, row count and its check.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.draft - The draft
 * @param props.table - The table
 * @returns The row
 */
function TableRow({ page, draft, table }: PartProps & { draft: LoadDraft; table: DraftTable }): React.JSX.Element {
    const kind = rowsAreOf(draft, table, page.choices) === "nodes" ? "Nodes" : "Edges";
    return (
        <NavLink
            component="button"
            label={table.fixed ? kind : `${kind}: ${table.name}`}
            description={plural(table.rowCount, "row")}
            active={page.tableId === table.id}
            aria-current={page.tableId === table.id ? "true" : undefined}
            rightSection={<ReadyMark ready={tablesReady(page)} />}
            onClick={() => {
                page.setTableId(table.id);
                page.setFilter("all");
            }}
        />
    );
}

/**
 * The URL or paste entry under "+".
 * @param props - Component props
 * @param props.kind - Which entry
 * @param props.onDone - Called with the source
 * @returns The form
 */
function EntryForm({
    kind,
    onDone,
}: {
    kind: "url" | "paste";
    onDone: (source: PageSource) => void;
}): React.JSX.Element {
    const [value, setValue] = useState("");
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (value.trim() !== "") {
                    onDone(kind === "url" ? { kind: "url", url: value.trim() } : { kind: "text", text: value });
                }
            }}
        >
            <Stack gap="xs" w={280}>
                {kind === "url" ? (
                    <TextInput
                        label="Address"
                        size="xs"
                        data-autofocus
                        value={value}
                        onChange={(event) => {
                            setValue(event.currentTarget.value);
                        }}
                    />
                ) : (
                    <Textarea
                        label="Data"
                        size="xs"
                        autosize
                        minRows={4}
                        data-autofocus
                        value={value}
                        onChange={(event) => {
                            setValue(event.currentTarget.value);
                        }}
                    />
                )}
                <Group justify="flex-end">
                    <Button type="submit" size="xs">
                        Read
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}

/**
 * The problem block (section 4, "Problem"): what happened, what to do, at most one action.
 * @param props - Component props
 * @param props.refusal - The words
 * @param props.onChooseFiles - Choose another file..., the primary action when no setting fixes it
 * @returns The block
 */
function ProblemBlock({ refusal, onChooseFiles }: { refusal: Refusal; onChooseFiles: () => void }): React.JSX.Element {
    return (
        <Alert color="red" variant="light" title={refusal.what} role="alert">
            <Stack gap="xs" align="flex-start">
                <Text size="xs">{refusal.todo}</Text>
                {refusal.fixable ? null : (
                    <Button size="xs" onClick={onChooseFiles}>
                        Choose another file...
                    </Button>
                )}
            </Stack>
        </Alert>
    );
}

/**
 * The selected table: model strip, header strip, roles and the sample grid; or the empty, reading
 * and refused states.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.onChooseFiles - Opens the file picker
 * @returns The view
 */
function MainView({ page, onChooseFiles }: PartProps & { onChooseFiles: () => void }): React.JSX.Element {
    const { draft, source } = page;
    if (source === null) {
        return (
            <Text size="xs" c="dimmed" p="md">
                Drop a file here, or{" "}
                <Anchor component="button" size="xs" onClick={onChooseFiles}>
                    choose a file...
                </Anchor>
            </Text>
        );
    }
    if (page.reading) {
        return (
            <Group gap="xs" p="md" role="status">
                <Loader size="xs" />
                {/* No running row count until prepare() reports progress (#910). */}
                <Text size="xs">Reading {sourceName(source)}</Text>
            </Group>
        );
    }
    if (draft === null) {
        return (
            <Stack p="md" gap="md">
                <ProblemBlock refusal={refusalFor(page.readError, sourceName(source))} onChooseFiles={onChooseFiles} />
                <FileSettings page={page} />
            </Stack>
        );
    }
    const table = draft.tables.find((each) => each.id === page.tableId) ?? draft.tables[0];
    const tooLarge = page.report?.tooLarge ?? null;
    let problem: Refusal | null = tooLarge === null ? null : tooLargeRefusal(tooLarge);
    if (page.reportError !== null) {
        problem = refusalFor(page.reportError, sourceName(source));
    } else if (page.loadError !== null) {
        problem = refusalFor(page.loadError, sourceName(source));
    }
    return (
        <Stack p="md" gap="sm">
            <ModelStrip page={page} draft={draft} />
            {problem === null ? null : <ProblemBlock refusal={problem} onChooseFiles={onChooseFiles} />}
            {table === undefined ? null : <TableView page={page} draft={draft} table={table} />}
        </Stack>
    );
}

/**
 * The model strip (section 2.10, item 2), read-only, from the report's counts.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.draft - The draft
 * @returns The line
 */
function ModelStrip({ page, draft }: PartProps & { draft: LoadDraft }): React.JSX.Element | null {
    const { report, source } = page;
    if (report === null || source === null) {
        return null;
    }
    let text: string;
    if (draft.tables.every((table) => table.fixed)) {
        const name = source.kind === "files" ? baseName(source.files[0].name) : sourceName(source);
        text = `${name}: ${plural(report.counts.nodes, "node")}, ${plural(report.counts.edges, "edge")}`;
    } else {
        const edgeTable = draft.tables.find((table) => rowsAreOf(draft, table, page.choices) === "edges");
        text =
            edgeTable === undefined
                ? `node (${count(report.counts.nodes)})`
                : `node (${count(report.counts.nodes)}) --${baseName(edgeTable.name)} (${count(report.counts.edges)})--> node`;
    }
    return (
        <Text size="sm" fw={600} data-testid="model-strip">
            {text}
        </Text>
    );
}

/**
 * The table header strip, the roles and the sample grid of one table.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.draft - The draft
 * @param props.table - The table
 * @returns The view
 */
function TableView({ page, draft, table }: PartProps & { draft: LoadDraft; table: DraftTable }): React.JSX.Element {
    const kind = rowsAreOf(draft, table, page.choices);
    const change = (next: PageChoices): void => {
        page.setChoices(next);
    };
    return (
        <Stack gap="sm">
            <Group gap="md" align="flex-end" wrap="wrap">
                <Input.Wrapper label="Each row is" description={table.fixed ? "Set by the file" : undefined} size="xs">
                    <SegmentedControl
                        size="xs"
                        disabled={table.fixed}
                        value={kind}
                        data={[
                            { value: "nodes", label: "a node" },
                            { value: "edges", label: "an edge" },
                        ]}
                        onChange={(value) => {
                            change(setRowsAre(draft, table, value === "edges" ? "edges" : "nodes", page.choices));
                        }}
                    />
                </Input.Wrapper>
                <FileSettings page={page} />
            </Group>
            {kind === "edges" && !table.fixed ? <WeightLine page={page} draft={draft} table={table} /> : null}
            <RoleList page={page} draft={draft} table={table} />
            {table.rowCount === 0 ? null : <SampleGrid page={page} table={table} />}
        </Stack>
    );
}

/**
 * The weight line (section 2.10, "The weight line in tier 1").
 * @param props - Component props
 * @param props.page - The page state
 * @param props.draft - The draft
 * @param props.table - The edge table
 * @returns The line
 */
function WeightLine({ page, draft, table }: PartProps & { draft: LoadDraft; table: DraftTable }): React.JSX.Element {
    const weight = table.columns.find((column) => roleOf(draft, table, column.name, page.choices) === "weight");
    if (weight !== undefined) {
        const auto = page.choices.tables[table.id]?.roles[weight.name] === undefined;
        return (
            <Text size="xs">
                Weight: {weight.name}
                {auto ? <span className="dp-auto">auto</span> : null}
            </Text>
        );
    }
    // The design offers one number column as the weight ("value is a number: use it as the
    // weight?"). Which column is a judgment the element makes, and it names none yet (#926).
    return <Text size="xs">Every edge counts 1. To weigh edges, give a number column the Weight role.</Text>;
}

/**
 * File settings (section 2.10, item 3): the format, and a CSV's separator. Changing one reads
 * the source again.
 * @param props - Component props
 * @param props.page - The page state
 * @returns The popover and its trigger
 */
function FileSettings({ page }: PartProps): React.JSX.Element {
    const { draft, settings } = page;
    const type = settings.type ?? draft?.type;
    // The separator the element detected is not reported (#911), so only a chosen one is named.
    const separator = SEPARATORS.find((each) => each.value !== "" && each.value === settings.delimiter)?.label;
    const line =
        type === undefined
            ? "File settings"
            : `${formatName(type)}${type === "csv" && separator !== undefined ? `, ${separator.toLowerCase()}` : ""}`;
    return (
        <Popover position="bottom-start" withinPortal>
            <Popover.Target>
                <Button variant="default" size="xs" aria-label={`File settings: ${line}`}>
                    {line}
                    {settings.type === undefined && draft !== null ? <span className="dp-auto">auto</span> : null}
                </Button>
            </Popover.Target>
            <Popover.Dropdown>
                <Stack gap="xs" w={220}>
                    <Select
                        label="Format"
                        // Its list opens inside the popover, so a pick is not a click outside it.
                        comboboxProps={{ withinPortal: false }}
                        size="xs"
                        data={[{ value: "", label: "Auto" }, ...READABLE_FORMATS]}
                        value={settings.type ?? ""}
                        allowDeselect={false}
                        onChange={(value) => {
                            page.setSettings({ ...settings, type: value === null || value === "" ? undefined : value });
                        }}
                    />
                    {type === "csv" ? (
                        <Select
                            label="Separator"
                            comboboxProps={{ withinPortal: false }}
                            size="xs"
                            data={SEPARATORS.map(({ value, label }) => ({ value, label }))}
                            value={settings.delimiter ?? ""}
                            allowDeselect={false}
                            onChange={(value) => {
                                page.setSettings({
                                    ...settings,
                                    delimiter: value === null || value === "" ? undefined : value,
                                });
                            }}
                        />
                    ) : null}
                    <NumberInput
                        label="Error limit"
                        description="Bad rows read past before the file is refused"
                        size="xs"
                        min={0}
                        allowDecimal={false}
                        placeholder="100"
                        value={settings.errorLimit ?? ""}
                        onChange={(value) => {
                            page.setSettings({
                                ...settings,
                                errorLimit: typeof value === "number" ? value : undefined,
                            });
                        }}
                    />
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}

/**
 * Each column's role (section 2.10, item 4). The grid's header cannot hold a menu, so the roles
 * are listed above it, one per column, in the grid's order.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.draft - The draft
 * @param props.table - The table
 * @returns The list
 */
function RoleList({ page, draft, table }: PartProps & { draft: LoadDraft; table: DraftTable }): React.JSX.Element {
    const kind = rowsAreOf(draft, table, page.choices);
    const changed = kindChanged(draft, table, page.choices);
    const options: { value: string; label: string }[] = [
        ...ROLES_BY_KIND[kind].map((role) => ({ value: role, label: roleWords(role) })),
        { value: "attribute", label: roleWords("attribute") },
        // After a kind change the element's new reading of each role is not reported (#911).
        ...(changed ? [{ value: "auto", label: "Auto" }] : []),
    ];
    return (
        <div className="dp-roles" role="group" aria-label="Column roles">
            {table.columns.map((column) => {
                const own = elementRole(draft, table, column.name, page.choices);
                const chosen = page.choices.tables[table.id]?.roles[column.name];
                return (
                    <div key={column.name} className="dp-role">
                        <StyleSelect
                            label={column.name}
                            value={chosen}
                            defaultValue={own ?? "auto"}
                            options={options}
                            disabled={table.fixed}
                            disabledReason={table.fixed ? "Set by the file." : undefined}
                            onChange={(value) => {
                                const role = value === undefined || value === "auto" ? undefined : (value as PageRole);
                                page.setChoices(setRole(draft, table, column.name, role, page.choices));
                            }}
                        />
                        <Text size="xs" c="dimmed">
                            {TYPE_WORDS[column.type] ?? column.type}
                        </Text>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * The sample grid: the table's first rows, or every unmatched or rejected row.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.table - The table
 * @returns The grid
 */
function SampleGrid({ page, table }: PartProps & { table: DraftTable }): React.JSX.Element {
    const columns = useMemo<DataTableColumn<DraftRow>[]>(
        () => [
            { id: "#line", header: "Line", value: (row) => row.line, align: "end", width: 64 },
            ...table.columns.map((column) => ({
                id: column.name,
                header: column.name,
                value: (row: DraftRow) => {
                    const value = row.values[column.name];
                    return value === null || value === undefined || typeof value === "object"
                        ? null
                        : (value as string);
                },
            })),
        ],
        [table],
    );
    const rows = page.rows?.records ?? [];
    const caption =
        page.filter === "all"
            ? `The first ${plural(rows.length, "row")} of ${count(table.rowCount)}`
            : plural(
                  page.rows?.total ?? 0,
                  page.filter === "unmatched" ? "unmatched row" : "row that could not be read",
              );
    return (
        <Stack gap={4}>
            <Group gap="xs">
                <Text size="xs" c="dimmed">
                    {caption}
                </Text>
                {page.filter === "all" ? null : (
                    <Anchor
                        component="button"
                        size="xs"
                        onClick={() => {
                            page.setFilter("all");
                        }}
                    >
                        Show all rows
                    </Anchor>
                )}
            </Group>
            <DataTable label={`Rows of ${table.name}`} columns={columns} data={rows} height={240} />
        </Stack>
    );
}

/**
 * The match report (section 2.10, item 5), rendered from the element's report; the app counts
 * nothing.
 * @param props - Component props
 * @param props.page - The page state
 * @returns The report
 */
function MatchReport({ page }: PartProps): React.JSX.Element | null {
    const { report, draft } = page;
    if (report === null || draft === null) {
        return null;
    }
    const tableOf = (kind: "nodes" | "edges"): DraftTable | undefined =>
        draft.tables.find((table) => rowsAreOf(draft, table, page.choices) === kind);
    const show = (kind: "nodes" | "edges", filter: RowFilter): void => {
        const table = tableOf(kind);
        if (table !== undefined) {
            page.setTableId(table.id);
        }
        page.setFilter(filter);
    };
    /**
     * A count that shows its table's rows in the grid, or plain text when no table holds them.
     * @param kind - Which table
     * @param words - The count's words
     * @returns The link or text
     */
    const rowsLink = (kind: "nodes" | "edges", words: string): React.ReactNode =>
        tableOf(kind) === undefined ? (
            words
        ) : (
            <Anchor
                component="button"
                size="xs"
                onClick={() => {
                    show(kind, "all");
                }}
            >
                {words}
            </Anchor>
        );
    return (
        <section className="dp-report" aria-label="Match report">
            {/* The nodes and edges made are plain text: the element cannot list them yet (#927). */}
            <Text size="xs">
                {rowsLink("nodes", plural(report.counts.nodeRecords, "node row"))} and{" "}
                {rowsLink("edges", plural(report.counts.edgeRecords, "edge row"))} read; the load makes{" "}
                {plural(report.counts.nodes, "node")} and {plural(report.counts.edges, "edge")}.
            </Text>
            <UnmatchedLine
                page={page}
                report={report}
                onShow={() => {
                    show("edges", "unmatched");
                }}
            />
            {report.counts.rejected > 0 ? (
                <Text size="xs">
                    {plural(report.counts.rejected, "row")} could not be read as an edge.{" "}
                    <Anchor
                        component="button"
                        size="xs"
                        onClick={() => {
                            show("edges", "rejected");
                        }}
                    >
                        Show them
                    </Anchor>
                </Text>
            ) : null}
        </section>
    );
}

/**
 * Unmatched values with Add | Leave out (Leave out is the default).
 * @param props - Component props
 * @param props.page - The page state
 * @param props.report - The report
 * @param props.onShow - Filters the grid to the unmatched rows
 * @returns The line, or null when every end matched
 */
function UnmatchedLine({
    page,
    report,
    onShow,
}: PartProps & { report: LoadReport; onShow: () => void }): React.JSX.Element | null {
    if (report.unmatched.rows === 0) {
        return null;
    }
    return (
        <Group gap="xs">
            <Text size="xs">
                {plural(report.unmatched.rows, "edge row")} name {plural(report.unmatched.values, "node")} no node row
                holds.{" "}
                <Anchor component="button" size="xs" onClick={onShow}>
                    Show the {plural(report.unmatched.rows, "unmatched row")}
                </Anchor>
            </Text>
            <SegmentedControl
                size="xs"
                aria-label="Unmatched ends"
                value={page.choices.unmatched}
                data={[
                    { value: "add", label: "Add" },
                    { value: "leave-out", label: "Leave out" },
                ]}
                onChange={(value) => {
                    page.setChoices({ ...page.choices, unmatched: value === "add" ? "add" : "leave-out" });
                }}
            />
        </Group>
    );
}

/**
 * Why Load cannot run now, or null.
 * @param page - The page state
 * @returns The reason
 */
function loadBlocked(page: LoadDraftState): string | null {
    if (page.source === null) {
        return "Choose a file first";
    }
    if (page.reading) {
        return "Still reading the file";
    }
    if (page.draft === null) {
        return "The file could not be read";
    }
    if (page.reportError !== null) {
        return "Fix the problem above first";
    }
    if (page.report === null) {
        return "Still counting";
    }
    if (page.report.tooLarge !== null) {
        return "Too large to draw";
    }
    if (page.loadError !== null) {
        return "The load was refused; see the problem above";
    }
    return page.loading ? "Loading" : null;
}

/**
 * The footer (section 2.10, item 6): Direction, Cancel and Load.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.onCancel - Returns to where the reader came from
 * @param props.onLoad - Loads
 * @returns The footer
 */
function Footer({
    page,
    onCancel,
    onLoad,
}: PartProps & { onCancel: () => void; onLoad: () => void }): React.JSX.Element {
    const blocked = loadBlocked(page);
    const loadButton = useRef<HTMLButtonElement>(null);
    // A clean file opens with every check green and focus on Load, so a clean drop is one Enter.
    // Decided once per draft, on its first report: a table the reader edits back to ready does
    // not pull focus from the control the reader is on.
    const ready = blocked === null;
    const { draft } = page;
    const counted = page.report !== null || page.reportError !== null;
    const decided = useRef<LoadDraft | null>(null);
    useEffect(() => {
        if (draft === null || !counted || decided.current === draft) {
            return;
        }
        decided.current = draft;
        if (ready) {
            loadButton.current?.focus();
        }
    }, [ready, draft, counted]);
    const direction =
        (Object.keys(DIRECTIONS) as (keyof typeof DIRECTIONS)[]).find(
            (key) => DIRECTIONS[key] === page.choices.directed,
        ) ?? "auto";
    return (
        <footer className="dp-footer">
            <Select
                label="Direction"
                size="xs"
                w={180}
                data={[
                    { value: "auto", label: "As the file says" },
                    { value: "directed", label: "Directed" },
                    { value: "undirected", label: "Undirected" },
                ]}
                value={direction}
                allowDeselect={false}
                onChange={(value) => {
                    page.setChoices({
                        ...page.choices,
                        directed: DIRECTIONS[(value ?? "auto") as keyof typeof DIRECTIONS],
                    });
                }}
            />
            <Group gap="xs" ml="auto" align="center">
                {blocked === null ? null : (
                    <Text size="xs" c="dimmed" id="dp-load-reason">
                        {blocked}
                    </Text>
                )}
                <Button variant="default" size="xs" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    ref={loadButton}
                    size="xs"
                    data-disabled={blocked === null ? undefined : true}
                    aria-disabled={blocked === null ? undefined : true}
                    aria-describedby={blocked === null ? undefined : "dp-load-reason"}
                    onClick={(event) => {
                        if (blocked !== null) {
                            event.preventDefault();
                            return;
                        }
                        onLoad();
                    }}
                >
                    Load
                </Button>
            </Group>
        </footer>
    );
}
