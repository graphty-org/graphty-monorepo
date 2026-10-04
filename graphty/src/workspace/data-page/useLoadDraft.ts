/**
 * The Data page's one conversation with graphty-element: `session.data.prepare()` reads the
 * source once into a draft, `draft.report(choices)` says what a load with the reader's choices
 * would do, and `draft.rows()` pages the rows shown in the grid. Every count on the page comes
 * from these three calls.
 */

import type {
    DataSourceInput,
    DraftRow,
    GraphSession,
    LoadDraft,
    LoadReport,
    RecordPage,
} from "@graphty/graphty-element/session";
import { useCallback, useEffect, useRef, useState } from "react";

import { INITIAL_CHOICES, loadChoices, type PageChoices } from "./choices";

/** What the reader handed over. */
export type PageSource =
    | { readonly kind: "files"; readonly files: readonly File[] }
    | { readonly kind: "url"; readonly url: string }
    | { readonly kind: "text"; readonly text: string };

/** File settings the reader set; absent means the element detects it. */
interface ReadSettings {
    /** A format id from the element's catalog. */
    readonly type?: string;
    /** A CSV separator. */
    readonly delimiter?: string;
    /** How many bad rows the source reads past before it stops. */
    readonly errorLimit?: number;
}

/** How many rows the sample grid shows. */
const SAMPLE_ROWS = 50;

/**
 * What the reader calls a source: its file names, its address, or "Pasted text".
 * @param source - the source.
 * @returns the name.
 */
export function sourceName(source: PageSource): string {
    switch (source.kind) {
        case "files":
            return source.files.map((file) => file.name).join(" and ");
        case "url":
            return source.url;
        default:
            return "Pasted text";
    }
}

/**
 * The `DataSourceInput` for a source: one file, a node file and an edge file, a URL, or text.
 * @param source - the source.
 * @param settings - the reader's file settings.
 * @returns what `prepare` takes.
 */
function sourceInput(source: PageSource, settings: ReadSettings): DataSourceInput {
    const extra = {
        ...(settings.delimiter === undefined ? {} : { delimiter: settings.delimiter }),
        ...(settings.errorLimit === undefined ? {} : { errorLimit: settings.errorLimit }),
    };
    const type = settings.type === undefined ? {} : { type: settings.type };
    switch (source.kind) {
        case "files": {
            const [first, second] = source.files;
            // Pick order decides which file is read as nodes until the element guesses it (#911).
            const config = second === undefined ? { file: first } : { nodeFile: first, edgeFile: second };
            return { ...type, config: { ...config, ...extra }, name: second === undefined ? first.name : undefined };
        }
        case "url":
            return { ...type, config: { url: source.url, ...extra } };
        default:
            return { ...type, config: { data: source.text, ...extra }, name: "Pasted text" };
    }
}

/** Which rows the grid shows. */
export type RowFilter = "all" | "unmatched" | "rejected";

/** What the page reads. */
export interface LoadDraftState {
    readonly source: PageSource | null;
    readonly settings: ReadSettings;
    /** Reading the source. */
    readonly reading: boolean;
    readonly draft: LoadDraft | null;
    /** What `prepare` refused with. */
    readonly readError: unknown;
    readonly choices: PageChoices;
    readonly report: LoadReport | null;
    /** What `report` refused with for these choices. */
    readonly reportError: unknown;
    /** The grid's table, by draft table id. */
    readonly tableId: string | null;
    readonly filter: RowFilter;
    readonly rows: RecordPage<DraftRow> | null;
    readonly loading: boolean;
    /** What the last `load` refused with, until the reader changes a choice or the source. */
    readonly loadError: unknown;
    setSource: (source: PageSource | null) => void;
    setSettings: (settings: ReadSettings) => void;
    setChoices: (choices: PageChoices) => void;
    setTableId: (id: string) => void;
    setFilter: (filter: RowFilter) => void;
    /**
     * Loads the draft with the reader's choices.
     * @returns true once the rows are in the graph; false when the element refused the load,
     *     which `loadError` then holds.
     */
    load: () => Promise<boolean>;
}

/**
 * Holds one draft for the page and keeps its report and sample rows current.
 * @param session - the element's session, or null before it has come up.
 * @param mode - "replace" for a new graph, "merge" to add to the open project.
 * @param initial - the source a door handed over, if any.
 * @returns the page's state and setters.
 */
export function useLoadDraft(
    session: GraphSession | null,
    mode: "replace" | "merge",
    initial: PageSource | null,
): LoadDraftState {
    const [source, setSourceState] = useState<PageSource | null>(initial);
    const [settings, setSettings] = useState<ReadSettings>({});
    const [draft, setDraft] = useState<LoadDraft | null>(null);
    const [reading, setReading] = useState(false);
    const [readError, setReadError] = useState<unknown>(null);
    const [choices, setChoices] = useState<PageChoices>(INITIAL_CHOICES);
    const [report, setReport] = useState<LoadReport | null>(null);
    const [reportError, setReportError] = useState<unknown>(null);
    const [tableId, setTableId] = useState<string | null>(null);
    const [filter, setFilter] = useState<RowFilter>("all");
    const [rows, setRows] = useState<RecordPage<DraftRow> | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<unknown>(null);
    /** The draft a load was started on: leaving the page must not dispose it mid-load. */
    const loadingDraft = useRef<LoadDraft | null>(null);

    const setSource = useCallback((next: PageSource | null) => {
        setSourceState(next);
        setSettings({});
    }, []);

    // Read the source once per source and file settings; the element drops the draft before.
    useEffect(() => {
        setDraft(null);
        setReport(null);
        setReportError(null);
        setReadError(null);
        setRows(null);
        setChoices(INITIAL_CHOICES);
        setLoadError(null);
        setFilter("all");
        if (session === null || source === null) {
            setReading(false);
            return undefined;
        }
        const abort = new AbortController();
        let held: LoadDraft | null = null;
        setReading(true);
        session.data.prepare(sourceInput(source, settings), { signal: abort.signal }).then(
            (next) => {
                if (abort.signal.aborted) {
                    next.dispose();
                    return;
                }
                held = next;
                setDraft(next);
                setTableId(next.tables[0]?.id ?? null);
                setReading(false);
            },
            (error: unknown) => {
                if (!abort.signal.aborted) {
                    setReadError(error);
                    setReading(false);
                }
            },
        );
        return () => {
            abort.abort();
            if (held !== null && held !== loadingDraft.current) {
                held.dispose();
            }
        };
    }, [session, source, settings]);

    // What a load with these choices would do: recomputed on the held rows, no I/O.
    useEffect(() => {
        if (draft === null) {
            return undefined;
        }
        let stale = false;
        setLoadError(null);
        draft.report(loadChoices(draft, choices, mode)).then(
            (next) => {
                if (!stale) {
                    setReport(next);
                    setReportError(null);
                }
            },
            (error: unknown) => {
                if (!stale) {
                    setReport(null);
                    setReportError(error);
                }
            },
        );
        return () => {
            stale = true;
        };
    }, [draft, choices, mode]);

    // The grid's rows. The element reads the unmatched and rejected filters with the choices of
    // the last report() call (draft.ts filter), so they wait for that report; #927 asks rows() to
    // take the choices itself.
    useEffect(() => {
        if (draft === null || tableId === null || (filter !== "all" && report === null)) {
            return undefined;
        }
        let stale = false;
        const only = filter === "all" ? {} : { only: filter };
        // "Show the 32 unmatched rows" shows all of them, not a sample (round 8).
        const limit = filter === "all" ? SAMPLE_ROWS : Infinity;
        draft.rows(tableId, { limit, ...only }).then(
            (page) => {
                if (!stale) {
                    setRows(page);
                }
            },
            () => {
                // A disposed draft (loaded or replaced) has no rows to show; the next draft reads its own.
            },
        );
        return () => {
            stale = true;
        };
    }, [draft, tableId, filter, report]);

    const load = useCallback(async (): Promise<boolean> => {
        if (draft === null) {
            return false;
        }
        setLoading(true);
        loadingDraft.current = draft;
        try {
            await draft.load(loadChoices(draft, choices, mode));
            return true;
        } catch (error: unknown) {
            setLoadError(error);
            return false;
        } finally {
            // A refused load leaves the draft on the page, which disposes it as usual.
            loadingDraft.current = null;
            setLoading(false);
        }
    }, [draft, choices, mode]);

    return {
        source,
        settings,
        reading,
        draft,
        readError,
        choices,
        report,
        reportError,
        tableId,
        filter,
        rows,
        loading,
        loadError,
        setSource,
        setSettings,
        setChoices,
        setTableId,
        setFilter,
        load,
    };
}
