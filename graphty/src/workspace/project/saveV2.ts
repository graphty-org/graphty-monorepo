/**
 * Version 2 save files in the app (the "save-files-v2" experiment): the questions the Save as and
 * Open dialogs ask, and the report shown after. graphty-element says what a save would write
 * (`project.describe`), what a file holds before it opens (`project.inspect`) and what each save
 * or open reported; this file only holds the reader's answers and hands them to the element.
 */

import type {
    DocumentSection,
    GraphSession,
    ProjectFileFacts,
    ProjectOpenOptions,
    ProjectProblem,
    SourceStorage,
} from "@graphty/graphty-element/session";

import type { WorkspaceStore } from "../state/store";
import { type ReportLine, reportLines } from "./saveV2Words";

/** The dialog ids this file opens in the workspace's one dialog slot. */
export const OPEN_V2_DIALOG = "open-v2";
export const REPORT_V2_DIALOG = "report-v2";

/** What the reader chose in the version 2 Save as dialog. */
export interface SaveV2Choices {
    readonly sections: readonly DocumentSection[];
    readonly form: "full" | "section";
    /** Copy or reference, per source record id. */
    readonly embed: Readonly<Record<string, SourceStorage>>;
}

/** An open waiting on the reader: the file, what graphty-element read of it, and the answer. */
export interface OpenQuestion {
    readonly file: File;
    readonly fileName: string;
    readonly facts: ProjectFileFacts;
    readonly answer: (options: ProjectOpenOptions | null) => void;
}

/** The report a save or open shows: its title and its lines. */
export interface ReportV2 {
    readonly title: string;
    readonly lines: readonly ReportLine[];
}

const openQuestions = new WeakMap<WorkspaceStore, OpenQuestion>();
const reports = new WeakMap<WorkspaceStore, ReportV2>();

/**
 * The open waiting on the reader, for the dialog that asks.
 * @param store - the workspace store.
 * @returns the question, or undefined.
 */
export function openQuestion(store: WorkspaceStore): OpenQuestion | undefined {
    return openQuestions.get(store);
}

/**
 * The report on show, for its dialog.
 * @param store - the workspace store.
 * @returns the report, or undefined.
 */
export function shownReport(store: WorkspaceStore): ReportV2 | undefined {
    return reports.get(store);
}

/**
 * Asks how to open a version 2 file: which sections, each run rerun or restored, whether to fetch
 * its referenced sources (a click, never on open), the files for referenced local files, and
 * whether to bind sections written on other data. A file graphty-element does not read as version
 * 2 (a data file, a version 1 project) is not asked about.
 * @param store - the workspace store.
 * @param session - the session it opens in.
 * @param file - the file.
 * @returns the open's options and what the file names, `{}` for a file not asked about, or null
 *     when the reader canceled.
 */
export async function askOpenV2(
    store: WorkspaceStore,
    session: GraphSession,
    file: File,
): Promise<{ options: ProjectOpenOptions; facts?: ProjectFileFacts } | null> {
    // A file the element cannot read says why when it opens.
    const facts = await session.project.inspect(file).catch(() => undefined);
    if (facts === undefined) {
        return { options: {} };
    }
    if (openQuestions.has(store)) {
        // An open asked while another is asked about: the open question stays the one answered.
        return null;
    }
    const options = await new Promise<ProjectOpenOptions | null>((resolve) => {
        openQuestions.set(store, {
            file,
            fileName: file.name,
            facts,
            answer: (given) => {
                openQuestions.delete(store);
                resolve(given);
            },
        });
        store.set({ dialog: OPEN_V2_DIALOG });
    });
    return options === null ? null : { options, facts };
}

/**
 * Shows what a version 2 save or open reported, when it reported anything the reader should see.
 * @param store - the workspace store.
 * @param session - the session.
 * @param title - the dialog's title.
 * @param facts - what graphty-element reported.
 * @param sources - each source's name by record id.
 */
export function showReport(
    store: WorkspaceStore,
    session: GraphSession,
    title: string,
    facts: readonly ProjectProblem[],
    sources: ReadonlyMap<string, string>,
): void {
    // Model codes keep their own words in the notice; a recipe kept, not applied, is the open's
    // choice the Open dialog already showed.
    const shown = facts.filter((fact) => !/^[EW]_MODEL_/.test(fact.code) && fact.code !== "W_RECIPE_NOT_APPLIED");
    const lines = reportLines(shown, { session, sources });
    if (lines.length === 0) {
        return;
    }
    reports.set(store, { title, lines });
    store.set({ dialog: REPORT_V2_DIALOG });
}
