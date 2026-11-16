/**
 * The Export dialog's Report: a Markdown document laid out from what graphty-element publishes --
 * `data.statistics`, `notes.list`, `data.issues`, each run's `record` and the record pages -- with
 * the reader's own title, summary and findings. The facts are the element's; the words, the order
 * and the layout are the app's. Also the validation report and the cleaning steps on their own, as
 * JSON (the element's issues as they are) or CSV. No React, so the rules are tested on their own.
 */

import type { DataIssue, GraphSession, RunRecord } from "@graphty/graphty-element/session";

import { targetWords } from "../notes/words";
import { runName } from "../runWords";
import { formatNumber } from "../settings/numberFormat";
import { columnChoices, fixDone, issueLabel, type RecordKind } from "../table/columns";

/** A section the reader can put in the report or leave out. */
export type ReportSection = "notes" | "validation" | "changes" | "methods" | "tables";

/** The sections, in the report's order, with the checklist's names. */
export const REPORT_SECTIONS: readonly { readonly id: ReportSection; readonly name: string }[] = [
    { id: "notes", name: "Notes" },
    { id: "validation", name: "Validation report" },
    { id: "changes", name: "Data changes" },
    { id: "methods", name: "Methods" },
    { id: "tables", name: "Data tables" },
];

/** The Report output's choices. */
export interface ReportChoices {
    readonly title: string;
    /** The most rows each data table shows. */
    readonly rowCap: number;
    readonly sections: readonly ReportSection[];
    /** The reader's own words, put in as written; left out when blank. */
    readonly summary: string;
    readonly findings: string;
}

/** Every section, the first 20 rows of each table, and no prose yet. */
export const DEFAULT_REPORT: ReportChoices = {
    title: "",
    rowCap: 20,
    sections: REPORT_SECTIONS.map((section) => section.id),
    summary: "",
    findings: "",
};

/**
 * The validation report: the issues still standing, the ignored ones too.
 * @param session - the element's session.
 * @returns the issues.
 */
export function validationIssues(session: GraphSession): readonly DataIssue[] {
    return session.data.issues({ includeIgnored: true });
}

/**
 * The cleaning steps: the issues a fix settled, as they stood then.
 * @param session - the element's session.
 * @returns the issues.
 */
export function cleaningSteps(session: GraphSession): readonly DataIssue[] {
    return session.data.issues({ includeFixed: true }).filter((issue) => issue.status === "fixed");
}

/**
 * The runs a report's Methods describes: those that finished.
 * @param session - the element's session.
 * @returns their records.
 */
function finishedRuns(session: GraphSession): readonly RunRecord[] {
    return session.runs
        .list()
        .map((run) => run.record)
        .filter((record) => record.status === "succeeded");
}

/**
 * How many things each section holds, for the checklist.
 * @param session - the element's session.
 * @returns the counts by section.
 */
export function sectionCounts(session: GraphSession): Readonly<Record<ReportSection, number>> {
    const { nodes, edges } = session.data.count();
    return {
        notes: session.notes.list().length,
        validation: validationIssues(session).length,
        changes: cleaningSteps(session).length,
        methods: finishedRuns(session).length,
        tables: (nodes > 0 ? 1 : 0) + (edges > 0 ? 1 : 0),
    };
}

/**
 * A value in one Markdown table cell: on one line, its pipes escaped.
 * @param value - the value.
 * @returns the cell's text.
 */
function cell(value: unknown): string {
    let text: string;
    if (value === undefined || value === null) {
        text = "";
    } else if (typeof value === "string") {
        text = value;
    } else if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        text = String(value);
    } else {
        text = JSON.stringify(value);
    }
    return text.replaceAll("|", String.raw`\|`).replaceAll(/\r?\n/g, " ");
}

/**
 * A Markdown table.
 * @param header - the column headers.
 * @param rows - the rows, each as long as the header.
 * @returns the table's lines.
 */
function table(header: readonly string[], rows: readonly (readonly unknown[])[]): string[] {
    return [
        `| ${header.map((each) => cell(each)).join(" | ")} |`,
        `| ${header.map(() => "---").join(" | ")} |`,
        ...rows.map((row) => `| ${row.map((each) => cell(each)).join(" | ")} |`),
    ];
}

/**
 * The column an issue is in, as the report names it.
 * @param issue - the issue.
 * @returns the column's name, or the kind of row.
 */
function issueColumn(issue: DataIssue): string {
    return issue.column === undefined ? "" : `${issue.column.kind} ${issue.column.name}`;
}

/** What each issue status reads as in the report. */
const STATUS_WORDS: Readonly<Record<DataIssue["status"], string>> = {
    open: "Open",
    ignored: "Ignored",
    fixed: "Fixed",
};

/**
 * A parameter list as one line: "dampingFactor 0.85, maxIterations 100".
 * @param params - the run's parameters.
 * @returns the line, or "defaults".
 */
function paramsWords(params: Readonly<Record<string, unknown>>): string {
    const entries = Object.entries(params);
    return entries.length === 0 ? "defaults" : entries.map(([name, value]) => `${name} ${cell(value)}`).join(", ");
}

/**
 * One run's methods: what ran, how, over what and with which versions.
 * @param session - the element's session.
 * @param record - the run's record.
 * @returns its lines.
 */
function methodLines(session: GraphSession, record: RunRecord): string[] {
    const { engine, scope } = record;
    const plugins = Object.entries(engine.plugins ?? {}).map(([key, version]) => `, ${key} ${version}`);
    return [
        `### ${runName(session, record)}`,
        "",
        `- Algorithm: ${record.algorithm}`,
        `- Parameters: ${paramsWords(record.params)}`,
        ...(record.seed === null ? [] : [`- Seed: ${String(record.seed)}`]),
        `- Over: ${formatNumber(scope.nodes)} nodes, ${formatNumber(scope.edges)} edges`,
        ...(record.startedAt === null ? [] : [`- Started: ${record.startedAt}`]),
        ...(record.durationMs === null ? [] : [`- Took: ${formatNumber(Math.round(record.durationMs))} ms`]),
        ...(record.partial ? ["- Stopped early"] : []),
        ...(record.stale === null ? [] : ["- The data has changed since"]),
        `- Versions: graphty-element ${engine.element}, algorithms ${engine.algorithms}, layout ${engine.layout}${plugins.join("")}`,
        "",
    ];
}

/**
 * One data table: the first `rowCap` records with their key and loaded columns, hidden ones left out.
 * @param session - the element's session.
 * @param kind - nodes or edges.
 * @param rowCap - the most rows.
 * @returns its lines, none when there are no records.
 */
function tableLines(session: GraphSession, kind: RecordKind, rowCap: number): string[] {
    const options = { limit: Math.max(0, rowCap) };
    const page = kind === "node" ? session.data.nodePage(options) : session.data.edgePage(options);
    if (page.total === 0) {
        return [];
    }
    const columns = columnChoices(session, kind).filter(
        (column) => column.group !== "result" && column.hidden !== true,
    );
    const rows = page.records.map((record) =>
        columns.map((column) => (record as Readonly<Record<string, unknown>>)[column.attribute ?? column.id]),
    );
    const noun = kind === "node" ? "Nodes" : "Edges";
    const shown =
        page.records.length < page.total
            ? ` (first ${formatNumber(page.records.length)} of ${formatNumber(page.total)})`
            : "";
    return [
        `### ${noun}${shown}`,
        "",
        ...table(
            columns.map((column) => column.header),
            rows,
        ),
        "",
    ];
}

/**
 * A section's heading and lines, or nothing when it holds nothing.
 * @param heading - the heading.
 * @param body - its lines.
 * @returns the lines.
 */
function section(heading: string, body: readonly string[]): string[] {
    return body.length === 0 ? [] : [`## ${heading}`, "", ...body, ""];
}

/**
 * The report as Markdown: the title and the graph's size, then the summary and findings as the
 * reader wrote them, then each chosen section that holds something.
 * @param session - the element's session.
 * @param choices - the reader's choices.
 * @param fallbackTitle - the title when the reader gave none: the project's name.
 * @returns the document.
 */
export function reportMarkdown(session: GraphSession, choices: ReportChoices, fallbackTitle: string): string {
    const chosen = new Set(choices.sections);
    const { nodeCount, edgeCount } = session.data.statistics({ scope: "all" });
    const title = choices.title.trim() === "" ? fallbackTitle : choices.title.trim();
    const prose = (text: string): string[] => (text.trim() === "" ? [] : [text.trim()]);

    const lines = [
        `# ${title}`,
        "",
        `${formatNumber(nodeCount)} nodes, ${formatNumber(edgeCount)} edges`,
        "",
        ...section("Summary", prose(choices.summary)),
        ...section("Findings", prose(choices.findings)),
    ];
    if (chosen.has("notes")) {
        lines.push(
            ...section(
                "Notes",
                session.notes.list().map((note) => {
                    const about = note.targets.map((target) => targetWords(session, target)).join(", ");
                    const by = note.author === undefined ? "" : `, ${note.author}`;
                    return `- ${note.text.replaceAll(/\r?\n/g, " ")} (${about}${by}, ${note.time})`;
                }),
            ),
        );
    }
    if (chosen.has("validation")) {
        const issues = validationIssues(session);
        lines.push(
            ...section(
                "Validation report",
                issues.length === 0
                    ? []
                    : table(
                          ["Issue", "Column", "Status"],
                          issues.map((issue) => [issueLabel(issue), issueColumn(issue), STATUS_WORDS[issue.status]]),
                      ),
            ),
        );
    }
    if (chosen.has("changes")) {
        const steps = cleaningSteps(session);
        lines.push(
            ...section(
                "Data changes",
                steps.length === 0
                    ? []
                    : table(
                          ["Issue", "Column", "Change"],
                          steps.map((issue) => [
                              issueLabel(issue),
                              issueColumn(issue),
                              issue.fixedBy === undefined ? "fixed" : fixDone(issue.fixedBy),
                          ]),
                      ),
            ),
        );
    }
    if (chosen.has("methods")) {
        lines.push(
            ...section(
                "Methods",
                finishedRuns(session).flatMap((record) => methodLines(session, record)),
            ),
        );
    }
    if (chosen.has("tables")) {
        lines.push(
            ...section("Data tables", [
                ...tableLines(session, "node", choices.rowCap),
                ...tableLines(session, "edge", choices.rowCap),
            ]),
        );
    }
    return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * One CSV field, quoted when it must be.
 * @param value - the value.
 * @returns the field.
 */
function csvField(value: unknown): string {
    let text: string;
    if (value === undefined || value === null) {
        text = "";
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        text = String(value);
    } else {
        text = JSON.stringify(value);
    }
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Issues as CSV, one row each: the element's id, code, column, load, count, status and fixes,
 * with the app's label for a reader.
 * @param issues - the issues.
 * @returns the CSV text.
 */
export function issuesCsv(issues: readonly DataIssue[]): string {
    const header = ["id", "code", "label", "kind", "column", "source", "count", "status", "fixedBy", "fixes", "params"];
    const rows = issues.map((issue) => [
        issue.id,
        issue.code,
        issueLabel(issue),
        issue.column?.kind,
        issue.column?.name,
        issue.source,
        issue.count,
        issue.status,
        issue.fixedBy,
        issue.fixes.join(" "),
        issue.params,
    ]);
    return `${[header, ...rows].map((row) => row.map((each) => csvField(each)).join(",")).join("\n")}\n`;
}
