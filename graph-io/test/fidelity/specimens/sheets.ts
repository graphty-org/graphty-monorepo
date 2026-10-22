/**
 * Style specimen sheets: small synthetic files, one setting per element at a fixed position, that sweep a file
 * format's documented style vocabulary so the comparator can judge graphty-element's drawing of every setting
 * against the real program's own SVG of the same sheet. Every format has the same ten sheet categories; a format
 * that cannot express one declares it absent, with the documentation that says so. `README.md` beside this file
 * gives the rules a sheet follows.
 *
 * Each format keeps its own registry in `<format>/registry.ts`, so adding a sheet touches only that format's files.
 */
import type { FidelitySample } from "../samples.js";

/** The sheet categories every format folder shows, in story order. */
export const SHEET_CATEGORIES = [
    "specimen-node-shapes",
    "specimen-node-fills-borders",
    "specimen-node-sizes-opacity",
    "specimen-labels",
    "specimen-edges-lines",
    "specimen-arrows",
    "specimen-edge-labels",
    "specimen-groups",
    "specimen-images-charts",
    "specimen-mappings-bypass",
] as const;

export type SheetCategory = (typeof SHEET_CATEGORIES)[number];

/** The formats with a specimen folder: one per file format, never per file extension. */
export type SpecimenFormatId =
    | "cytoscapejs"
    | "vis-network"
    | "graphology"
    | "gephi-json"
    | "dot"
    | "gexf"
    | "yed-graphml"
    | "yed-live-graphml"
    | "gml"
    | "pajek"
    | "xgmml"
    | "cx"
    | "cx2"
    | "cys";

/** One sheet file: a category's page. */
export interface SpecimenSheet {
    /** The category, or the category with a page suffix: `specimen-node-shapes`, `specimen-node-shapes-p2`. */
    id: string;
    /** The file's name in `specimens/<format>/`. */
    file: string;
    /** Reference-scene routes (usually none: specimens are judged against oracle SVGs only). */
    routes?: FidelitySample["routes"];
}

/** A category the format has no setting for, and the documentation that shows it. */
export interface AbsentCategory {
    /** One sentence, for the placeholder story: what the format lacks. */
    reason: string;
    /** The documentation URL that lists the format's vocabulary. */
    doc: string;
}

export interface SpecimenFormat {
    id: SpecimenFormatId;
    /** The Storybook folder under "Style Fidelity/". */
    title: string;
    /** graph-io's format name, as `session.data.import({ type })` takes it. */
    graphIoFormat: string;
    /** The specimen family (one agent and one oracle route) that builds this format's sheets. */
    family: string;
    sheets: readonly SpecimenSheet[];
    absent: Partial<Record<SheetCategory, AbsentCategory>>;
    /** Categories not built yet; empty when the format is done. */
    pending: readonly SheetCategory[];
}

/**
 * The category a sheet id belongs to.
 * @param sheetId - `specimen-<category>` with an optional `-p<N>` page suffix
 * @returns the category, or undefined when the id names none
 */
export function categoryOf(sheetId: string): SheetCategory | undefined {
    const base = sheetId.replace(/-p\d+$/, "");
    return SHEET_CATEGORIES.find((c) => c === base);
}

/**
 * The fidelity sample id of a sheet: `<format>-<sheet>`, which is also its oracle's name in `oracles/`.
 * @param format - the format
 * @param sheetId - the sheet
 * @returns the id
 */
export const specimenSampleId = (format: SpecimenFormatId, sheetId: string): string => `${format}-${sheetId}`;

/**
 * A format's sheets as fidelity samples, so the oracle tests and the Storybook find them like any sample.
 * @param format - the format
 * @returns its samples
 */
export function specimenSamples(format: SpecimenFormat): FidelitySample[] {
    return format.sheets.map((s) => ({
        id: specimenSampleId(format.id, s.id),
        format: format.graphIoFormat,
        file: `fidelity/specimens/${format.id}/${s.file}`,
        license: "MIT (generated)",
        routes: s.routes ?? [],
    }));
}
