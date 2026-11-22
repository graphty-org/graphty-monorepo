/**
 * Saved report configurations: a report's shape -- its title, row cap and sections -- under a
 * name, kept in this browser so it loads onto any graph, and written to or read from a JSON file to
 * carry it to another browser. A configuration holds no graph content (no notes, results, image or
 * prose), so loading one over another graph lays out that graph's own content.
 */

import { REPORT_SECTIONS, type ReportChoices, type ReportSection } from "./choices";

/** One saved report configuration. */
export interface ReportConfig {
    readonly name: string;
    readonly title: string;
    readonly rowCap: number;
    readonly sections: readonly ReportSection[];
}

/** Where the configurations are kept in this browser. */
const REPORT_CONFIGS_KEY = "graphty.reportConfigs.v1";

/** What a report configuration file says it is, so another JSON file is not read as one. */
const FILE_KIND = "graphty-report";

/**
 * One configuration from what a file or the browser held, its unknown sections left out.
 * @param value - the parsed JSON.
 * @returns the configuration, or undefined when it is not one.
 */
function configOf(value: unknown): ReportConfig | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }
    const { name, title, rowCap, sections } = value as Record<string, unknown>;
    if (typeof name !== "string" || name.trim() === "" || !Array.isArray(sections)) {
        return undefined;
    }
    const known = new Set<unknown>(sections);
    return {
        name: name.trim(),
        title: typeof title === "string" ? title : "",
        rowCap: typeof rowCap === "number" && Number.isInteger(rowCap) && rowCap >= 0 ? rowCap : 20,
        sections: REPORT_SECTIONS.map((each) => each.id).filter((id) => known.has(id)),
    };
}

/**
 * The configuration of the report as the reader has it now.
 * @param name - the name to keep it under.
 * @param choices - the report's choices.
 * @returns the configuration.
 */
export function configFromChoices(name: string, choices: ReportChoices): ReportConfig {
    return { name: name.trim(), title: choices.title, rowCap: choices.rowCap, sections: choices.sections };
}

/**
 * The report's choices with a configuration loaded: its title, row cap and sections; the reader's
 * summary and findings stay.
 * @param choices - the report's choices.
 * @param config - the configuration.
 * @returns the new choices.
 */
export function choicesWithConfig(choices: ReportChoices, config: ReportConfig): ReportChoices {
    return { ...choices, title: config.title, rowCap: config.rowCap, sections: config.sections };
}

/**
 * Reads the saved configurations.
 * @returns them, in the order saved; empty when storage is blocked or holds something unknown.
 */
export function readReportConfigs(): readonly ReportConfig[] {
    try {
        const stored: unknown = JSON.parse(localStorage.getItem(REPORT_CONFIGS_KEY) ?? "[]");
        return Array.isArray(stored) ? stored.flatMap((each) => configOf(each) ?? []) : [];
    } catch {
        return [];
    }
}

/**
 * Keeps one configuration, in place of any saved under the same name.
 * @param config - the configuration.
 * @returns the saved configurations now.
 */
export function saveReportConfig(config: ReportConfig): readonly ReportConfig[] {
    const all = readReportConfigs();
    const at = all.findIndex((each) => each.name === config.name);
    const next = at === -1 ? [...all, config] : all.map((each, i) => (i === at ? config : each));
    writeAll(next);
    return next;
}

/**
 * Forgets one configuration.
 * @param name - its name.
 * @returns the saved configurations now.
 */
export function deleteReportConfig(name: string): readonly ReportConfig[] {
    const next = readReportConfigs().filter((each) => each.name !== name);
    writeAll(next);
    return next;
}

/**
 * Writes the whole list.
 * @param configs - the configurations.
 */
function writeAll(configs: readonly ReportConfig[]): void {
    try {
        localStorage.setItem(REPORT_CONFIGS_KEY, JSON.stringify(configs));
    } catch {
        // Storage blocked: the list holds for this page view only.
    }
}

/**
 * A configuration as a file's text.
 * @param config - the configuration.
 * @returns the JSON text.
 */
export function reportConfigFile(config: ReportConfig): string {
    return `${JSON.stringify({ kind: FILE_KIND, version: 1, ...config }, null, 2)}\n`;
}

/**
 * Reads a report configuration file.
 * @param text - the file's text.
 * @returns the configuration, or undefined when the file is not one.
 */
export function parseReportConfigFile(text: string): ReportConfig | undefined {
    try {
        const parsed: unknown = JSON.parse(text);
        return typeof parsed === "object" && parsed !== null && (parsed as { kind?: unknown }).kind === FILE_KIND
            ? configOf(parsed)
            : undefined;
    } catch {
        return undefined;
    }
}
