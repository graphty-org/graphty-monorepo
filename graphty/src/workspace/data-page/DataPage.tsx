import "./data-page.css";

import {
    DataTable,
    type DataTableColumn,
    FileSource,
    PANEL_GRID,
    pickFiles,
    Popout,
    PopoutManager,
    ResetButton,
    SegmentedControl,
    TargetTooltip,
    useFileDrop,
} from "@graphty/compact-mantine";
import {
    type DraftRow,
    type DraftTable,
    type GraphSession,
    isGraphtyError,
    LOAD_ROLES,
    type LoadDraft,
    type LoadReport,
    type TableMapping,
    type TimeUnit,
} from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Alert,
    Anchor,
    Button,
    Checkbox,
    Group,
    Input,
    Loader,
    Menu,
    NavLink,
    NumberInput,
    Select,
    Stack,
    Text,
    Title,
    Tooltip,
} from "@mantine/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { meaningGloss, weightName } from "../analyze/words";
import { missingNodes, NO_NODE_ROW, noNodeRow } from "../data-place/words";
import { focusIsLost } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { valueWord } from "../inspector/words";
import { openProjectFile } from "../project/actions";
import { replaceWith } from "../replace/commands";
import { writeFileStylesChoice } from "../settings/preferences";
import { readPasted } from "../start/open";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { noticeFileStyles } from "../styles/noticeFileStyles";
import { showNotices } from "../time/timeActions";
import { UNIT_CHOICES } from "../time/timeWords";
import {
    elementRole,
    kindChanged,
    loadChoices,
    offersStyles,
    type PageChoices,
    type PageRole,
    rowsAreOf,
    setRole,
    setRowsAre,
    setTimeUnit,
    setWeightMeaning,
    weightHolder,
} from "./choices";
import { canReplace, rememberLoad, takeDataPageRequest, whileDataPageOpen } from "./request";
import {
    type LoadDraftState,
    type PageSource,
    type RowFilter,
    sourceInput,
    sourceName,
    useLoadDraft,
} from "./useLoadDraft";
import {
    addWords,
    baseName,
    count,
    formatName,
    graphName,
    leftOutWords,
    loadedWords,
    modelWords,
    plural,
    previewCaption,
    READABLE_FORMATS,
    type Refusal,
    refusalFor,
    repeatsWords,
    replacedWords,
    replaceWords,
    roleWords,
    SEPARATORS,
    tooLargeRefusal,
    UNMATCHED_HINTS,
} from "./words";

/** The From a URL pop-out's width. */
const ENTRY_WIDTH = 280;

/** The File settings pop-out's width. */
const SETTINGS_WIDTH = 240;

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

/**
 * The Higher means choices, and the element's meaning each writes (tier2-design.md section 5).
 * "Not set" is the state the weight starts in, drawn as a choice so a reader sees one is made.
 */
const HIGHER_MEANS = [
    { value: "", label: "Not set" },
    { value: "strength", label: "Closer" },
    { value: "distance", label: "Farther" },
    { value: "capacity", label: "Capacity" },
] as const;

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
 * graphty-element's load draft supplies every fact and count. A replace asked for from the page
 * itself starts it over on that request.
 * @returns The page
 */
export function DataPage(): React.JSX.Element {
    const [opened, setOpened] = useState(0);
    return (
        <DataPageView
            key={opened}
            onRestart={() => {
                setOpened((value) => value + 1);
            }}
        />
    );
}

/**
 * What the graph holds before a replacing load: its size, its first source's name and the
 * meaning of its loaded weight.
 * @param session - the graph session.
 * @param replacing - whether the load replaces the graph.
 * @returns the graph before the load, or null when the load does not replace one.
 */
function graphBefore(
    session: GraphSession | null,
    replacing: boolean,
): { nodes: number; edges: number; name: string; meaning: LoadedMeaning } | null {
    if (session === null || !replacing) {
        return null;
    }
    const { nodeCount, edgeCount } = session.data.statistics();
    return {
        nodes: nodeCount,
        edges: edgeCount,
        name: session.data.sources()[0]?.name ?? "The data",
        meaning: session.data.loadedWeight()?.meaning ?? null,
    };
}

/**
 * The one file chosen or dropped on the page when the element says it is a saved project (or
 * another graphty document), not data to load: it refuses to read it as data
 * (`E_PROJECT_FILE_AS_DATA`), or its draft names what it is.
 * @param page - the page's load draft.
 * @returns the file, or undefined.
 */
function documentFileOf(page: LoadDraftState): File | undefined {
    const isDocument =
        page.draft?.graphtyDocument !== undefined ||
        (isGraphtyError(page.readError) && page.readError.code === "E_PROJECT_FILE_AS_DATA");
    return isDocument && page.source?.kind === "files" && page.source.files.length === 1
        ? page.source.files[0]
        : undefined;
}

/**
 * One visit of the Data page, on the request it opened with.
 * @param props - Component props
 * @param props.onRestart - Opens the page again on the request just made
 * @returns The page
 */
function DataPageView({ onRestart }: { readonly onRestart: () => void }): React.JSX.Element {
    const workspace = useWorkspace();
    const { store, session } = workspace;
    const [request] = useState(() => takeDataPageRequest(store));
    const projectName = useWorkspaceState((state) => state.project?.name ?? "Untitled");
    const [initial] = useState<PageSource | null>(() =>
        request.files !== undefined && request.files.length > 0 ? { kind: "files", files: request.files } : null,
    );
    const page = useLoadDraft(session, request.intent === "add" ? "merge" : "replace", initial, request.choices);
    // A read the reader starts on the open page (another file, a file setting) is said; the read
    // the page opens on is not, and its rows are said by the grid once they arrive.
    useAnnounceChange(page.reading && page.source !== null ? `Reading ${sourceName(page.source)}` : null);
    // The door that opened the page (New from data... on the start screen) goes with the start
    // screen; focus goes to the page's first ask, "Choose a file...", or its first control.
    const pageRef = useRef<HTMLElement>(null);
    useEffect(() => {
        if (focusIsLost()) {
            const ask = pageRef.current?.querySelector<HTMLElement>(".dp-main button");
            (ask ?? pageRef.current?.querySelector<HTMLElement>("button"))?.focus();
        }
    }, []);

    const replacing = request.intent === "replace";
    // What the graph held before a replacing load, for its before-and-after line and status line.
    const [was] = useState(() => graphBefore(session, replacing));
    useCarriedMeaning(page, was?.meaning ?? null);
    // The graph an addition joins, so the summary gives it and the file each their own counts.
    const [joins] = useState(() => {
        if (session === null || request.intent !== "add") {
            return null;
        }
        const { nodeCount, edgeCount } = session.data.statistics();
        return { name: projectName, nodes: nodeCount, edges: edgeCount };
    });

    const titles = {
        new: "Open as a new graph",
        add: `Add to ${projectName}`,
        replace: `Replace: ${page.source === null ? (was?.name ?? "") : sourceName(page.source)}`,
    };
    const title = titles[request.intent];

    // A saved project (or another graphty document) chosen or dropped here is no data to load:
    // the element says what it is, and it opens the way Open project or file... opens it.
    const documentFile = documentFileOf(page);
    const openedDocument = useRef<File | null>(null);
    useEffect(() => {
        if (documentFile !== undefined && openedDocument.current !== documentFile) {
            openedDocument.current = documentFile;
            store.set({ page: "panels" });
            void openProjectFile(workspace, documentFile);
        }
    }, [documentFile, store, workspace]);

    const cancel = useCallback((): void => {
        store.set(request.intent === "new" ? { project: null, page: "panels" } : { page: "panels" });
    }, [store, request]);

    // Esc returns to where the reader came from, wherever focus is on the page, unless a menu,
    // list or popover is open (it takes its own Esc first), and only while the page holds nothing
    // the reader chose: once a file is chosen, one stray Esc would throw it and its roles away, so
    // Cancel is the way out. It listens in the capture phase, so it runs before the workspace's
    // key map and the map's Esc (Clear selection) does not.
    const chosen = page.source !== null;
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !event.defaultPrevented && !overlayOpen()) {
                event.preventDefault();
                if (!chosen) {
                    cancel();
                }
            }
        };
        globalThis.addEventListener("keydown", onKeyDown, true);
        return () => {
            globalThis.removeEventListener("keydown", onKeyDown, true);
        };
    }, [cancel, chosen]);

    const load = async (): Promise<void> => {
        const { source } = page;
        // A refused load stays on the page, its problem block shown and Load disabled (T5). A new
        // graph starts its history; data added to an open graph stays undoable.
        if (!(await page.load(request.intent === "new" ? "start" : undefined))) {
            return;
        }
        if (session !== null && source?.kind === "files") {
            rememberLoad(session, { files: source.files, choices: page.choices });
        }
        // A loaded new graph is named after every file it read; inside a project nothing is renamed.
        const named = session === null ? undefined : graphName(session.data.sources());
        // The inspector shows the graph just loaded, and focus lands on its heading (Frame).
        store.set((state) => ({
            page: "panels",
            place: "graph",
            inspected: null,
            project:
                request.intent === "new" && state.project !== null && source?.kind === "files"
                    ? { ...state.project, name: named ?? baseName(source.files[0].name) }
                    : state.project,
        }));
        if (session === null) {
            return;
        }
        noticeFileStyles(store, session);
        // A time field marked at import says what its values held, as Set as time does.
        if (session.time.field !== null) {
            showNotices(session, store, session.time.notices());
        }
        // The status line, written once the place is showing and the header has its name: the
        // graph as the header names it, its size and the rows the load left out. Nothing reruns
        // by itself after a replace, so that line says how many runs now need it.
        const { nodeCount, edgeCount } = session.data.statistics();
        const now = { nodes: nodeCount, edges: edgeCount };
        const outOfDate = session.runs.list().filter((run) => run.status === "succeeded" && run.stale !== null);
        const leftOut = session.data.sources().at(-1)?.leftOut?.rows ?? 0;
        store.set((state) => ({
            announcement:
                was === null
                    ? loadedWords(state.project?.name ?? "Untitled", now, leftOut)
                    : replacedWords(was.name, now, outOfDate.length),
        }));
    };

    // A table the reader just added is the one the preview shows once the files are read again,
    // not the first table: the view follows the reader's own action.
    const added = useRef<string | null>(null);
    const { draft, setTableId } = page;
    useEffect(() => {
        const table = draft?.tables.find((each) => each.name === added.current);
        if (table !== undefined) {
            added.current = null;
            setTableId(table.id);
        }
    }, [draft, setTableId]);

    const chooseFiles = (join: boolean): void => {
        void pickFiles({ multiple: true }).then((files) => {
            addFiles(files, join);
        });
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
        added.current = held.length > 0 ? (files[0]?.name ?? null) : null;
        page.setSource({ kind: "files", files: next });
    };

    // A file opened while the page is open (Open project or file..., Control+O) lands as a drop.
    const addFilesRef = useRef(addFiles);
    useEffect(() => {
        addFilesRef.current = addFiles;
    });
    // The whole page takes a drop, which joins the table on the page as Tables "+" does.
    const onDrop = useCallback((files: File[]) => {
        addFilesRef.current(files, true);
    }, []);
    useFileDrop(pageRef, onDrop);
    useEffect(
        () =>
            whileDataPageOpen(store, (next) => {
                if (next.intent === "replace") {
                    onRestart();
                    return;
                }
                addFilesRef.current(next.files ?? [], true);
            }),
        [store, onRestart],
    );

    // An addition whose edges repeat the graph's says so, and offers the source menu's Replace
    // with this file beside Load, when the graph's one source can be replaced. When every edge
    // in the file repeats, Load would only double the graph's edges, so Replace is the primary.
    // Replace replaces at once, as opening a copy of the source does, with a receipt and Undo:
    // the page already showed the file, and a load can be undone, so nothing asks again. The file
    // is read as the page read it, with the reader's file settings and column roles.
    const repeats = request.intent === "add" ? (page.report?.repeated.seen ?? 0) : 0;
    const sources = repeats > 0 && session !== null ? session.data.sources() : [];
    const file = page.source?.kind === "files" && page.source.files.length === 1 ? page.source.files[0] : undefined;
    const replace =
        file !== undefined && canReplace(sources)
            ? {
                  label: `Replace ${sources[0].name ?? "the data"}`,
                  primary: repeats >= (page.report?.counts.edgeRecords ?? Infinity),
                  run: () => {
                      const { draft, source, settings, choices } = page;
                      if (session === null || draft === null || source === null) {
                          return;
                      }
                      store.set({ page: "panels" });
                      const incoming = { name: file.name, source: sourceInput(source, settings) };
                      void replaceWith(store, session, sources[0].key, incoming, loadChoices(draft, choices, "merge"))
                          .then(() => {
                              rememberLoad(session, { files: [file], choices });
                          })
                          .catch(() => {
                              store.set({ notice: { message: "Not replaced" } });
                          });
                  },
              }
            : null;

    return (
        <PopoutManager>
            <section ref={pageRef} className="dp-page" aria-label="Data page">
                <header className="dp-header">
                    <Title order={1} size="h4">
                        {title}
                    </Title>
                    {was === null || page.report === null ? null : (
                        <Text size="sm" data-testid="replace-report">
                            {replaceWords(was, page.report.counts)}
                        </Text>
                    )}
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
                            joins={joins}
                            onChooseFiles={() => {
                                chooseFiles(false);
                            }}
                            onFiles={(files) => {
                                addFiles(files, false);
                            }}
                        />
                    </section>
                </div>
                <MatchReport page={page} />
                {repeats > 0 ? (
                    <Group gap={6} wrap="nowrap" className="dp-repeats">
                        <GLYPHS.warning size={14} color="var(--cm-text-danger)" aria-hidden />
                        <Text size="sm" id="dp-repeats" data-testid="repeats">
                            {repeatsWords(repeats, projectName)}
                        </Text>
                    </Group>
                ) : null}
                <Footer
                    page={page}
                    repeats={repeats > 0}
                    replace={replace}
                    action={request.intent === "replace" ? "Replace" : "Load"}
                    onCancel={cancel}
                    onLoad={() => {
                        void load();
                    }}
                />
            </section>
        </PopoutManager>
    );
}

/**
 * Carries the replaced load's weight meaning onto the new file's weight column, once per draft,
 * when the reader's carried choices do not already say it (tier2-design.md section 7).
 * @param page - the page state.
 * @param meaning - what the graph's weight meant before the replace, or null.
 */
function useCarriedMeaning(page: LoadDraftState, meaning: LoadedMeaning): void {
    const done = useRef<LoadDraft | null>(null);
    const { draft, choices, setChoices } = page;
    useEffect(() => {
        if (meaning === null || draft === null || done.current === draft) {
            return;
        }
        done.current = draft;
        const table = draft.tables.find((each) => weightHolder(draft, each, choices) !== undefined);
        if (table !== undefined && choices.tables[table.id]?.weightMeaning === undefined) {
            setChoices(setWeightMeaning(table, meaning, choices));
        }
    }, [meaning, draft, choices, setChoices]);
}

/** A loaded weight's meaning, or null. */
type LoadedMeaning = NonNullable<TableMapping["weightMeaning"]> | null;

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
    const { store } = useWorkspace();
    const [entry, setEntry] = useState(false);
    const addButton = useRef<HTMLButtonElement>(null);
    const { draft } = page;
    const paste = async (): Promise<void> => {
        const pasted = await readPasted();
        if (pasted === null) {
            store.set({ notice: { message: "Clipboard empty" } });
        } else {
            page.setSource(pasted);
        }
    };
    return (
        <section className="dp-tables" aria-label="Tables">
            <Group justify="space-between" wrap="nowrap" className="dp-section-head">
                <Text size="xs" fw={600}>
                    Tables
                </Text>
                <Menu position="bottom-start">
                    <Menu.Target>
                        {/* To the left, over empty space: below, it covers the table's "Each row is" label. */}
                        <TargetTooltip label="Add a table" position="left">
                            <ActionIcon ref={addButton} variant="subtle" size="sm" aria-label="Add a table">
                                <GLYPHS.add size={14} aria-hidden />
                            </ActionIcon>
                        </TargetTooltip>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={onChooseFiles}>File...</Menu.Item>
                        <Menu.Item
                            onClick={() => {
                                setEntry(true);
                            }}
                        >
                            From a URL...
                        </Menu.Item>
                        <Menu.Item
                            onClick={() => {
                                void paste();
                            }}
                        >
                            Paste
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
                {/* Opened from the menu, so there is no Popout.Trigger: the panel docks to "+". */}
                <Popout opened={entry} onOpenChange={setEntry}>
                    <Popout.Panel
                        width={ENTRY_WIDTH}
                        header={{ variant: "title", title: "From a URL" }}
                        anchorX={addButton}
                        anchorY={addButton}
                        placement="right"
                    >
                        <Popout.Content>
                            {entry ? (
                                <FileSource
                                    variant="row"
                                    url
                                    multiple
                                    placeholder="Address"
                                    onUrl={(url) => {
                                        setEntry(false);
                                        page.setSource({ kind: "url", url });
                                    }}
                                    onFiles={(files) => {
                                        setEntry(false);
                                        page.setSource({ kind: "files", files });
                                    }}
                                />
                            ) : null}
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
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
            rightSection={<ReadyMark ready={tablesReady(page)} leftOut={leftOutRows(page)} />}
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
 * How many edge rows the load would leave out: the report's unmatched rows while Leave out is
 * chosen, else 0.
 * @param page - The page state
 * @returns The count
 */
function leftOutRows(page: LoadDraftState): number {
    return page.choices.unmatched === "leave-out" ? (page.report?.unmatched.rows ?? 0) : 0;
}

/**
 * A table's check: green when ready, a gray dashed circle when not, and a warning with the count
 * when the load would leave some of its rows out.
 * @param props - Component props
 * @param props.ready - Whether it is ready
 * @param props.leftOut - How many of its rows the load would leave out
 * @returns The mark
 */
function ReadyMark({ ready, leftOut = 0 }: Readonly<{ ready: boolean; leftOut?: number }>): React.JSX.Element {
    if (!ready) {
        return <GLYPHS.empty size={14} role="img" aria-label="Not ready" />;
    }
    if (leftOut > 0) {
        return <GLYPHS.warning size={14} color="var(--cm-text-danger)" role="img" aria-label={leftOutWords(leftOut)} />;
    }
    return <GLYPHS.ready size={14} color="var(--mantine-color-green-6)" role="img" aria-label="Ready" />;
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
    const leftOut = kind === "Edges" ? leftOutRows(page) : 0;
    return (
        <NavLink
            component="button"
            label={table.fixed ? kind : `${kind}: ${table.name}`}
            description={
                leftOut > 0
                    ? `${plural(table.rowCount, "row")}, ${count(leftOut)} left out`
                    : plural(table.rowCount, "row")
            }
            active={page.tableId === table.id}
            aria-current={page.tableId === table.id ? "true" : undefined}
            rightSection={<ReadyMark ready={tablesReady(page)} leftOut={leftOut} />}
            onClick={() => {
                page.setTableId(table.id);
                page.setFilter("all");
            }}
        />
    );
}

/**
 * The problem block (section 4, "Problem"): what happened, what to do, at most one action.
 * @param props - Component props
 * @param props.refusal - The words
 * @param props.onChooseFiles - Choose another file..., the primary action when no setting fixes it
 * @returns The block
 */
function ProblemBlock({
    refusal,
    onChooseFiles,
}: Readonly<{ refusal: Refusal; onChooseFiles: () => void }>): React.JSX.Element {
    return (
        <Alert color="red" variant="light" title={refusal.what} role="alert">
            <Stack gap="xs" align="flex-start">
                <Text size="sm">{refusal.todo}</Text>
                {refusal.fixable ? null : (
                    <Button size="sm" onClick={onChooseFiles}>
                        Choose another file...
                    </Button>
                )}
            </Stack>
        </Alert>
    );
}

/** The graph an addition joins, its name and size; null when the load makes a new graph. */
type Joins = { readonly name: string; readonly nodes: number; readonly edges: number } | null;

/**
 * The selected table: model strip, header strip, roles and the sample grid; or the empty, reading
 * and refused states.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.joins - The graph an addition joins, or null
 * @param props.onChooseFiles - Opens the file picker
 * @param props.onFiles - Reads files dropped or chosen in the empty view
 * @returns The view
 */
function MainView({
    page,
    joins,
    onChooseFiles,
    onFiles,
}: PartProps & { joins: Joins; onChooseFiles: () => void; onFiles: (files: File[]) => void }): React.JSX.Element {
    const { draft, source } = page;
    if (source === null) {
        // The whole page takes a drop; this area says so at the size of the space it fills.
        return (
            <div className="dp-drop">
                <FileSource
                    variant="drop"
                    multiple
                    url
                    onFiles={onFiles}
                    onUrl={(url) => {
                        page.setSource({ kind: "url", url });
                    }}
                />
            </div>
        );
    }
    if (page.reading) {
        return (
            <Group gap="xs" p="md">
                <Loader size="xs" />
                {/* No running row count until prepare() reports progress (#910). */}
                <Text size="sm">Reading {sourceName(source)}</Text>
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
            {/* The file's format sits beside the file's heading, apart from the table's "Each row is". */}
            <Group justify="space-between" align="center" wrap="nowrap">
                <ModelStrip page={page} draft={draft} joins={joins} />
                <FileSettings page={page} />
            </Group>
            {problem === null ? null : <ProblemBlock refusal={problem} onChooseFiles={onChooseFiles} />}
            {table === undefined ? null : <TableView page={page} draft={draft} table={table} />}
        </Stack>
    );
}

/** The model strip's id, for Load's description. */
const MODEL_STRIP_ID = "dp-model";

/**
 * The model strip (section 2.10, item 2), read-only, from the report's counts. An addition gives
 * the graph it joins and the new file each their own counts, never the total under the file's name.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.draft - The draft
 * @param props.joins - The graph an addition joins, or null
 * @returns The line
 */
function ModelStrip({ page, draft, joins }: PartProps & { draft: LoadDraft; joins: Joins }): React.JSX.Element | null {
    const { report, source } = page;
    if (report === null || source === null) {
        return null;
    }
    const fixed = draft.tables.every((table) => table.fixed);
    let names = draft.tables.map((table) => baseName(table.name));
    if (fixed) {
        names = [source.kind === "files" ? baseName(source.files[0].name) : sourceName(source)];
    }
    const edges =
        fixed || draft.tables.some((table) => rowsAreOf(draft, table, page.choices) === "edges")
            ? report.counts.edges
            : null;
    const { nodes } = report.counts;
    const text =
        joins === null
            ? modelWords(names, nodes, edges, page.choices.directed)
            : addWords(
                  joins.name,
                  joins,
                  names,
                  { nodes: nodes - joins.nodes, edges: report.counts.edges - joins.edges },
                  edges !== null,
                  page.choices.directed,
              );
    return (
        // Load's description too, so what the load makes is heard before it is pressed.
        <Text size="sm" fw={600} data-testid="model-strip" id={MODEL_STRIP_ID}>
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
            <Input.Wrapper label="Each row is" description={table.fixed ? "Set by the file" : undefined} size="sm">
                <SegmentedControl
                    size="sm"
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
            <RoleList page={page} draft={draft} table={table} />
            {/* Below the roles, so choosing Weight for a column moves nothing above the pointer. */}
            {kind === "edges" && !table.fixed ? <WeightLine page={page} draft={draft} table={table} /> : null}
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
    const weight = weightHolder(draft, table, page.choices);
    if (weight === undefined) {
        // The design offers one number column as the weight ("value is a number: use it as the
        // weight?"). Which column is a judgment the element makes, and it names none yet (#926).
        return <Text size="sm">Weight: none (each edge counts 1)</Text>;
    }
    const auto = page.choices.tables[table.id]?.roles[weight] === undefined;
    const meaning = page.choices.tables[table.id]?.weightMeaning ?? null;
    return (
        <Stack gap={2}>
            <Text size="sm">
                Weight: {weightName(weight, meaning)}
                {auto ? <span className="dp-auto">auto</span> : null}
            </Text>
            <Input.Wrapper
                label="Higher means"
                description={meaningGloss(meaning)}
                inputWrapperOrder={["label", "input", "description"]}
                size="sm"
            >
                <SegmentedControl
                    size="sm"
                    value={meaning ?? ""}
                    data={[...HIGHER_MEANS]}
                    onChange={(value) => {
                        const picked = HIGHER_MEANS.find((each) => each.value === value);
                        if (picked !== undefined) {
                            page.setChoices(
                                setWeightMeaning(table, picked.value === "" ? undefined : picked.value, page.choices),
                            );
                        }
                    }}
                />
            </Input.Wrapper>
        </Stack>
    );
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
    const named = type === "csv" && separator !== undefined ? `, ${separator.toLowerCase()}` : "";
    const line = type === undefined ? "File settings" : formatName(type) + named;
    return (
        <Group gap="xs" wrap="nowrap">
            {/* Its own visible label, the words the problem block's "Pick its format in File settings" names. */}
            <Text size="xs" fw={600} aria-hidden className="dp-nowrap">
                File settings
            </Text>
            <Popout>
                <Popout.Trigger>
                    <Button variant="default" size="sm" aria-label={`File settings: ${line}`}>
                        {line}
                        {settings.type === undefined && draft !== null ? <span className="dp-auto">auto</span> : null}
                    </Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={SETTINGS_WIDTH}
                    header={{ variant: "title", title: "File settings" }}
                    placement="bottom"
                >
                    <Popout.Content>
                        <Stack gap="xs">
                            <Select
                                label="Format"
                                // Its list opens inside the popover, so a pick is not a click outside it.
                                comboboxProps={{ withinPortal: false }}
                                size="sm"
                                data={[{ value: "", label: "Auto" }, ...READABLE_FORMATS]}
                                value={settings.type ?? ""}
                                allowDeselect={false}
                                onChange={(value) => {
                                    page.setSettings({
                                        ...settings,
                                        type: value === null || value === "" ? undefined : value,
                                    });
                                }}
                            />
                            {type === "csv" ? (
                                <Select
                                    label="Separator"
                                    comboboxProps={{ withinPortal: false }}
                                    size="sm"
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
                                size="sm"
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
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
        </Group>
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
        ...LOAD_ROLES[kind].takes.map((role) => ({ value: role, label: roleWords(role) })),
        { value: "attribute", label: roleWords("attribute") },
        // After a kind change the element's new reading of each role is not reported (#911).
        ...(changed ? [{ value: "auto", label: "Auto" }] : []),
    ];
    const choose = (name: string, value: string | undefined): void => {
        const role = value === undefined || value === "auto" ? undefined : (value as PageRole);
        page.setChoices(setRole(draft, table, name, role, page.choices));
    };
    const list = (
        <fieldset className="dp-roles" aria-label="Column roles">
            {table.columns.map((column) => {
                const own = elementRole(draft, table, column.name, page.choices);
                const chosen = page.choices.tables[table.id]?.roles[column.name];
                const current = chosen ?? own ?? "auto";
                // A role the file sets is a fact, not a choice: plain words, never a box to open.
                if (table.fixed) {
                    return (
                        <div key={column.name} className="dp-role" data-testid="fixed-role">
                            <Text size="xs" fw={500}>
                                {column.name}
                            </Text>
                            <Text size="xs">{options.find((option) => option.value === current)?.label}</Text>
                            <Text size="xs" c="dimmed">
                                {TYPE_WORDS[column.type] ?? column.type}
                            </Text>
                        </div>
                    );
                }
                return (
                    <div key={column.name} className="dp-role">
                        <Group gap={8} wrap="nowrap" align="flex-end">
                            <Select
                                label={column.name}
                                aria-label={`Role of ${column.name}`}
                                value={current}
                                data={options}
                                allowDeselect={false}
                                style={{ flex: 1 }}
                                onChange={(value) => {
                                    choose(column.name, value ?? undefined);
                                }}
                            />
                            {chosen !== undefined && (
                                <ResetButton
                                    label={column.name}
                                    onClick={() => {
                                        choose(column.name, undefined);
                                    }}
                                />
                            )}
                        </Group>
                        <Text size="xs" c="dimmed">
                            {TYPE_WORDS[column.type] ?? column.type}
                        </Text>
                        {/* A number column holding times says how its numbers read: epoch or years. */}
                        {(chosen ?? own) === "time" && (column.type === "number" || column.type === "integer") ? (
                            <Select
                                size="xs"
                                label="Unit"
                                aria-label={`Unit of ${column.name}`}
                                value={page.choices.tables[table.id]?.timeUnit ?? "ms"}
                                data={UNIT_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                                allowDeselect={false}
                                disabled={table.fixed}
                                onChange={(value) => {
                                    if (value !== null) {
                                        page.setChoices(setTimeUnit(table, value as TimeUnit, page.choices));
                                    }
                                }}
                            />
                        ) : null}
                    </div>
                );
            })}
        </fieldset>
    );
    // Roles that cannot change say why where they stand, as "Each row is" does above them.
    return table.fixed ? (
        <Input.Wrapper labelElement="div" label="Column roles" description="Set by the file" size="sm">
            {list}
        </Input.Wrapper>
    ) : (
        list
    );
}

/** The grid's cell text: compact-mantine's body type (11px, weight 450, 0.055px tracking); headers at 600. */
const CELL_FONT = "11px";
const CELL_TRACKING = "0.055px";

/** A cell's padding (12 + 8) and a header's (16 + 32 for its menu), from the DataTable's styles. */
const CELL_PAD = 20;
const HEADER_PAD = 48;

/** The narrowest and widest a column is drawn; a longer value is cut and its tooltip has it whole. */
const COLUMN_MIN = 64;
const COLUMN_MAX = 320;

let measurer: CanvasRenderingContext2D | null = null;

/**
 * How wide a column must be to show its header and every value given, whole.
 * @param header - the column's name.
 * @param values - its shown values.
 * @returns the width in pixels.
 */
function fitWidth(header: string, values: readonly string[]): number {
    measurer ??= document.createElement("canvas").getContext("2d");
    if (measurer === null) {
        return COLUMN_MIN;
    }
    const family = getComputedStyle(document.body).fontFamily;
    measurer.letterSpacing = CELL_TRACKING;
    measurer.font = `600 ${CELL_FONT} ${family}`;
    let widest = measurer.measureText(header).width + HEADER_PAD;
    measurer.font = `450 ${CELL_FONT} ${family}`;
    for (const value of values) {
        widest = Math.max(widest, measurer.measureText(value).width + CELL_PAD);
    }
    // One pixel more: the cell lays text out on subpixels and rounds its own box down.
    return Math.min(COLUMN_MAX, Math.max(COLUMN_MIN, Math.ceil(widest) + 1));
}

/**
 * The sample grid: the table's first rows, or every unmatched or rejected row.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.table - The table
 * @returns The grid
 */
function SampleGrid({ page, table }: PartProps & { table: DraftTable }): React.JSX.Element {
    const rows = useMemo(() => page.rows?.records ?? [], [page.rows]);
    // The columns an unmatched row's ends were read from, so the end that names no node is marked.
    const { draft, choices } = page;
    const endColumns = useMemo(() => {
        if (draft === null || !rows.some((row) => row.missingEnds !== undefined)) {
            return null;
        }
        return draft.resolve(loadChoices(draft, choices, "replace")).tables[table.id] ?? null;
    }, [draft, choices, rows, table]);
    const missingIn = useCallback(
        (row: DraftRow, name: string): boolean =>
            row.missingEnds?.some((end) => endColumns?.[end]?.column === name) === true,
        [endColumns],
    );
    const columns = useMemo<DataTableColumn<DraftRow>[]>(() => {
        // A yes-or-no reads Yes or No, as it does everywhere else once loaded.
        const types = new Map(table.columns.map((column) => [column.name, column.type]));
        const cell = (row: DraftRow, name: string): string | null => {
            const value = row.values[name];
            return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                ? valueWord(value, types.get(name))
                : null;
        };
        return [
            { id: "#line", header: "Line", value: (row) => row.line, align: "end", width: 64 },
            ...table.columns.map((column) => {
                const marks = rows.some((row) => missingIn(row, column.name));
                return {
                    id: column.name,
                    header: column.name,
                    value: (row: DraftRow) => cell(row, column.name),
                    ...(marks
                        ? {
                              cell: (row: DraftRow) => {
                                  const value = cell(row, column.name);
                                  return missingIn(row, column.name) ? (
                                      <span className="dp-missing-end">
                                          <GLYPHS.warning size={12} aria-hidden />
                                          {value} <span className="dp-missing-words">{NO_NODE_ROW}</span>
                                      </span>
                                  ) : (
                                      value
                                  );
                              },
                          }
                        : {}),
                    // Wide enough for its longest shown value, so "Dmitri Volkov" is not cut while
                    // the table has room to spare.
                    width: fitWidth(
                        column.name,
                        rows.map((row) =>
                            missingIn(row, column.name)
                                ? `MM${cell(row, column.name) ?? ""} ${NO_NODE_ROW}`
                                : (cell(row, column.name) ?? ""),
                        ),
                    ),
                };
            }),
        ];
    }, [table, rows, missingIn]);
    const what = page.filter === "unmatched" ? "unmatched row" : "row that could not be read";
    const missingNames = rows.flatMap((row) =>
        (row.missingEnds ?? []).flatMap((end) => {
            const column = endColumns?.[end]?.column;
            const value = column === undefined ? undefined : row.values[column];
            return typeof value === "string" || typeof value === "number" ? [String(value)] : [];
        }),
    );
    const missing = missingNames.length === 0 ? "" : `: ${noNodeRow(missingNames)}`;
    const caption =
        page.filter === "all"
            ? previewCaption(rows.length, table.rowCount)
            : plural(page.rows?.total ?? 0, what) + missing;
    return (
        <Stack gap={4}>
            <Group gap="xs">
                {/* "All 17 rows" is a caption; "1 unmatched row: z has no node row" is a sentence. */}
                <Text size={page.filter === "all" ? "xs" : "sm"} c="dimmed">
                    {caption}
                </Text>
                {page.filter === "all" ? null : (
                    <Anchor
                        component="button"
                        size="sm"
                        onClick={() => {
                            page.setFilter("all");
                        }}
                    >
                        Show all rows
                    </Anchor>
                )}
            </Group>
            {/* As tall as its rows, so every row the caption counts is on screen; the pane
                scrolls when they do not fit, never a box inside it. */}
            <DataTable
                label={`Rows of ${table.name}`}
                // The panel list pitch, not the spreadsheet rows DataTable draws by default.
                rowHeight={PANEL_GRID.ROW_PITCH}
                headerHeight={PANEL_GRID.ROW_PITCH}
                columns={columns}
                data={rows}
                // The grid says the count it is given when its rows change; a preview of the first
                // rows says so, as its caption does, never "50 of 50 rows" for a 331-row table.
                labels={page.filter === "all" ? { rowsShown: () => caption } : undefined}
                // Each row and the header is one pitch plus the table's 1px grid line, plus the
                // table's 1px padding.
                height={(PANEL_GRID.ROW_PITCH + 1) * (Math.max(rows.length, 1) + 1) + 1}
            />
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
                size="sm"
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
            <Text size="sm">
                {/* A kind the load read none of is left out: "41 edge rows read", not "0 node rows and 41". */}
                {report.counts.nodeRecords > 0 || report.counts.edgeRecords === 0
                    ? rowsLink("nodes", plural(report.counts.nodeRecords, "node row"))
                    : null}
                {report.counts.nodeRecords > 0 && report.counts.edgeRecords > 0 ? " and " : null}
                {report.counts.edgeRecords > 0
                    ? rowsLink("edges", plural(report.counts.edgeRecords, "edge row"))
                    : null}
                {` read; the load makes ${plural(report.counts.nodes, "node")} and ${plural(report.counts.edges, "edge")}.`}
            </Text>
            <UnmatchedLine
                page={page}
                report={report}
                onShow={() => {
                    show("edges", "unmatched");
                }}
            />
            {report.counts.rejected > 0 ? (
                <Text size="sm">
                    {plural(report.counts.rejected, "row")} could not be read as an edge.{" "}
                    <Anchor
                        component="button"
                        size="sm"
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
            <Text size="sm">
                {plural(report.unmatched.rows, "edge row")} {report.unmatched.rows === 1 ? "names" : "name"}{" "}
                {missingNodes(report.unmatched.values)}.
            </Text>
            <SegmentedControl
                size="sm"
                aria-label="Unmatched ends"
                value={page.choices.unmatched}
                data={[
                    {
                        value: "add",
                        label: (
                            <Tooltip label={UNMATCHED_HINTS.add}>
                                <span>Add</span>
                            </Tooltip>
                        ),
                    },
                    {
                        value: "leave-out",
                        label: (
                            <Tooltip label={UNMATCHED_HINTS["leave-out"]}>
                                <span>Leave out</span>
                            </Tooltip>
                        ),
                    },
                ]}
                onChange={(value) => {
                    page.setChoices({ ...page.choices, unmatched: value === "add" ? "add" : "leave-out" });
                }}
            />
            {/* After the control, so Add | Leave out stays put when the link goes. While the
                unmatched rows show, only the way back ("Show all rows") is offered. */}
            {page.filter === "unmatched" ? null : (
                <Anchor component="button" size="sm" onClick={onShow}>
                    Show the {plural(report.unmatched.rows, "unmatched row")}
                </Anchor>
            )}
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
 * The footer (section 2.10, item 6): Direction, Import styles (for a file that can carry them),
 * Cancel and Load.
 * @param props - Component props
 * @param props.page - The page state
 * @param props.action - The load button's word: "Replace" on a replace, matching the title
 * @param props.replace - Replaces the graph's source with this file instead, or null; when it is
 *   the primary, it takes Load's filled look and the focus a ready file gets
 * @param props.repeats - Whether the repeated-ties line shows
 * @param props.onCancel - Returns to where the reader came from
 * @param props.onLoad - Loads
 * @returns The footer
 */
function Footer({
    page,
    action,
    replace,
    repeats,
    onCancel,
    onLoad,
}: PartProps & {
    action: "Load" | "Replace";
    /** Whether the repeated-ties line shows, so Load's description carries it beside any blocked reason. */
    repeats: boolean;
    replace: { readonly label: string; readonly primary: boolean; readonly run: () => void } | null;
    onCancel: () => void;
    onLoad: () => void;
}): React.JSX.Element {
    const blocked = loadBlocked(page);
    const loadButton = useRef<HTMLButtonElement>(null);
    const replaceButton = useRef<HTMLButtonElement>(null);
    const replacePrimary = replace?.primary === true;
    // A clean file opens with every check green and focus on Load, so a clean drop is one Enter.
    // Decided once per draft, on its first report: a table the reader edits back to ready does
    // not pull focus from the control the reader is on.
    const ready = blocked === null;
    const { draft } = page;
    const counted = page.report !== null || page.reportError !== null;
    const decided = useRef<LoadDraft | null>(null);
    // The control that chose the file goes as the file is read: focus waits on the primary
    // button, which takes the read's result, rather than falling back to the rail.
    useEffect(() => {
        if (page.reading && focusIsLost()) {
            (replacePrimary ? replaceButton : loadButton).current?.focus();
        }
    }, [page.reading, replacePrimary]);
    useEffect(() => {
        if (draft === null || !counted || decided.current === draft) {
            return;
        }
        decided.current = draft;
        if (ready) {
            (replacePrimary ? replaceButton : loadButton).current?.focus();
        }
    }, [ready, draft, counted, replacePrimary]);
    const direction =
        (Object.keys(DIRECTIONS) as (keyof typeof DIRECTIONS)[]).find(
            (key) => DIRECTIONS[key] === page.choices.directed,
        ) ?? "auto";
    const strip = page.report !== null && page.source !== null;
    return (
        // A named region, named by the line that says what the load makes ("24 nodes, 63 edges"),
        // so a reader who lands on Load and reads around it hears the counts, not only the grid's
        // caption above it.
        <section
            className="dp-footer"
            aria-labelledby={strip ? MODEL_STRIP_ID : undefined}
            aria-label={strip ? undefined : action}
        >
            <Select
                label="Direction"
                size="sm"
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
            {draft !== null && offersStyles(draft) ? (
                <Checkbox
                    label="Import styles from the file"
                    size="xs"
                    checked={page.choices.styles === "file"}
                    onChange={(event) => {
                        const on = event.currentTarget.checked;
                        writeFileStylesChoice(on);
                        page.setChoices({ ...page.choices, styles: on ? "file" : "none" });
                    }}
                />
            ) : null}
            <Group gap="xs" ml="auto" align="center">
                {blocked === null ? null : (
                    <Text size="xs" c="dimmed" id="dp-load-reason">
                        {blocked}
                    </Text>
                )}
                <Button variant="default" size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                {replace === null ? null : (
                    <Button
                        ref={replaceButton}
                        variant={replace.primary ? "filled" : "default"}
                        size="sm"
                        onClick={replace.run}
                    >
                        {replace.label}
                    </Button>
                )}
                <Button
                    ref={loadButton}
                    variant={replacePrimary ? "default" : "filled"}
                    size="sm"
                    data-disabled={blocked === null ? undefined : true}
                    aria-disabled={blocked === null ? undefined : true}
                    aria-describedby={
                        [
                            strip ? MODEL_STRIP_ID : null,
                            blocked === null ? null : "dp-load-reason",
                            repeats ? "dp-repeats" : null,
                        ]
                            .filter((id) => id !== null)
                            .join(" ") || undefined
                    }
                    onClick={(event) => {
                        if (blocked !== null) {
                            event.preventDefault();
                            return;
                        }
                        onLoad();
                    }}
                >
                    {action}
                </Button>
            </Group>
        </section>
    );
}
